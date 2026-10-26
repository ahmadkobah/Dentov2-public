import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import {
  authGuard,
  tenantDbMiddleware,
  optionalTenantMiddleware,
  requireAdmin,
} from '../../middleware/index.js';
import { getRolePermissionsModel } from '../../models/role-permissions.model.js';
import {
  PERMISSION_MATRIX,
  clearPermissionCache,
  type UserRole,
  type ModuleSlug,
} from '../../middleware/role-guard.js';

// ── Helpers ─────────────────────────────────────────────────

function getTenantDb(request: unknown): Connection | null {
  return ((request as unknown as Record<string, unknown>).tenantDb as Connection) ?? null;
}

function getUser(request: unknown): { id: string; role: string } {
  return (request as unknown as Record<string, unknown>).user as { id: string; role: string };
}

function getTenantSlug(request: unknown): string | undefined {
  return (request as unknown as Record<string, unknown>).tenantSlug as string | undefined;
}

/** Non-admin roles that can be customized */
const CUSTOMIZABLE_ROLES: UserRole[] = [
  'dentist',
  'receptionist',
  'assistant',
  'accountant',
  'lab_tech',
  'hygienist',
];

/** All module slugs from the permission matrix */
const ALL_MODULES = Object.keys(PERMISSION_MATRIX) as ModuleSlug[];

/**
 * Build the effective permission map for a role by merging
 * hardcoded defaults with tenant-specific DB overrides.
 */
function buildEffectivePermissions(
  role: UserRole,
  dbOverrides?: { module: string; permissions: string[] }[],
) {
  const result: Record<string, string[]> = {};

  for (const mod of ALL_MODULES) {
    const defaultPerms = PERMISSION_MATRIX[mod]?.[role];
    if (defaultPerms === '*') {
      result[mod] = ['read', 'create', 'update', 'delete'];
    } else if (Array.isArray(defaultPerms)) {
      result[mod] = [...defaultPerms];
    } else {
      result[mod] = [];
    }
  }

  // Apply DB overrides — admin can both restrict and expand permissions
  if (dbOverrides) {
    const validPerms = ['read', 'create', 'update', 'delete'];
    for (const override of dbOverrides) {
      const mod = override.module as ModuleSlug;
      if (!ALL_MODULES.includes(mod)) continue;
      result[mod] = override.permissions.filter((p) => validPerms.includes(p));
    }
  }

  return result;
}

// ── Routes ──────────────────────────────────────────────────

export async function rolePermissionRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware, requireAdmin];
  const preHandlerReadOnly = [authGuard, optionalTenantMiddleware, requireAdmin];
  const preHandlerAuth = [authGuard, optionalTenantMiddleware];

  /**
   * GET /me — Get effective permissions for the current user's role.
   * Available to all authenticated users (not admin-only).
   * Uses optional tenant middleware — works for platform_admin without tenant.
   */
  fastify.get('/me', { preHandler: preHandlerAuth }, async (request, reply) => {
    try {
      const user = getUser(request);
      const role = user.role as UserRole;

      // Admins always have full access
      if (role === 'platform_admin' || role === 'tenant_admin') {
        const result: Record<string, string[]> = {};
        for (const mod of ALL_MODULES) {
          result[mod] = ['read', 'create', 'update', 'delete'];
        }
        return apiResponse(reply, 200, { role, permissions: result });
      }

      // Non-admin roles need tenant context for DB lookup
      const tenantDb = getTenantDb(request);
      if (!tenantDb) {
        return apiError(reply, 400, 'Tenant context is required');
      }

      const RolePermissions = getRolePermissionsModel(tenantDb);
      const override = await RolePermissions.findOne({ role }).lean();
      const permissions = buildEffectivePermissions(
        role,
        override?.modules as { module: string; permissions: string[] }[] | undefined,
      );

      return apiResponse(reply, 200, { role, permissions });
    } catch (err) {
      if (err instanceof Error && 'statusCode' in err) throw err;
      return apiError(reply, 500, 'Failed to fetch permissions');
    }
  });

  /**
   * GET / — Get effective permissions for all customizable roles
   * Returns the merged (defaults + overrides) permission map.
   */
  fastify.get('/', { preHandler }, async (request, reply) => {
    try {
      const RolePermissions = getRolePermissionsModel(getTenantDb(request)!);
      const allOverrides = await RolePermissions.find({}).lean();

      const overrideMap = new Map(allOverrides.map((o) => [o.role, o.modules]));

      const result: Record<string, Record<string, string[]>> = {};
      for (const role of CUSTOMIZABLE_ROLES) {
        result[role] = buildEffectivePermissions(
          role,
          overrideMap.get(role) as { module: string; permissions: string[] }[] | undefined,
        );
      }

      return apiResponse(reply, 200, {
        permissions: result,
        modules: ALL_MODULES,
        roles: CUSTOMIZABLE_ROLES,
      });
    } catch (err) {
      if (err instanceof Error && 'statusCode' in err) throw err;
      return apiError(reply, 500, 'Failed to fetch role permissions');
    }
  });

  /**
   * GET /:role — Get effective permissions for a single role.
   * Uses optional tenant middleware — if no tenant context, returns hardcoded defaults only.
   */
  fastify.get('/:role', { preHandler: preHandlerReadOnly }, async (request, reply) => {
    try {
      const { role } = request.params as { role: string };
      if (!CUSTOMIZABLE_ROLES.includes(role as UserRole)) {
        return apiError(reply, 400, `Invalid role: ${role}`);
      }

      // Build defaults from hardcoded PERMISSION_MATRIX
      const defaults: Record<string, string[]> = {};
      for (const mod of ALL_MODULES) {
        const perms = PERMISSION_MATRIX[mod]?.[role as UserRole];
        defaults[mod] = perms === '*' ? ['read', 'create', 'update', 'delete'] : (perms ?? []);
      }

      // If tenant context exists, look up DB overrides
      const tenantDb = getTenantDb(request);
      let effective: Record<string, string[]>;
      if (tenantDb) {
        const RolePermissions = getRolePermissionsModel(tenantDb);
        const override = await RolePermissions.findOne({ role }).lean();
        effective = buildEffectivePermissions(
          role as UserRole,
          override?.modules as { module: string; permissions: string[] }[] | undefined,
        );
      } else {
        // No tenant context — return hardcoded defaults as effective
        effective = { ...defaults };
      }

      return apiResponse(reply, 200, { role, effective, defaults, hasTenantContext: !!tenantDb });
    } catch (err) {
      if (err instanceof Error && 'statusCode' in err) throw err;
      return apiError(reply, 500, 'Failed to fetch role permissions');
    }
  });

  /**
   * PUT /:role — Update permissions for a role (admin only)
   * Body: { modules: [{ module: "patients", permissions: ["read", "create"] }, ...] }
   *
   * Validates that no permission exceeds the hardcoded default maximum.
   */
  fastify.put('/:role', { preHandler }, async (request, reply) => {
    try {
      const { role } = request.params as { role: string };
      if (!CUSTOMIZABLE_ROLES.includes(role as UserRole)) {
        return apiError(reply, 400, `Invalid role: ${role}`);
      }

      const body = request.body as {
        modules: { module: string; permissions: string[] }[];
      };

      if (!body?.modules || !Array.isArray(body.modules)) {
        return apiError(reply, 400, 'modules array is required');
      }

      // Validate module slugs and permission values
      const validPermissions = ['read', 'create', 'update', 'delete'];
      for (const entry of body.modules) {
        const mod = entry.module as ModuleSlug;
        if (!ALL_MODULES.includes(mod)) {
          return apiError(reply, 400, `Invalid module: ${entry.module}`);
        }
        for (const p of entry.permissions) {
          if (!validPermissions.includes(p)) {
            return apiError(reply, 400, `Invalid permission: ${p}`);
          }
        }
      }

      const user = getUser(request);
      const RolePermissions = getRolePermissionsModel(getTenantDb(request)!);

      await RolePermissions.findOneAndUpdate(
        { role },
        {
          role,
          modules: body.modules,
          updatedBy: user.id,
        },
        { upsert: true, new: true },
      );

      // Clear in-memory permission cache for this tenant
      const tenantSlug = getTenantSlug(request);
      if (tenantSlug) clearPermissionCache(tenantSlug);

      // Return the effective permissions
      const effective = buildEffectivePermissions(
        role as UserRole,
        body.modules as { module: string; permissions: string[] }[],
      );

      return apiResponse(reply, 200, { role, effective, message: 'Permissions updated' });
    } catch (err) {
      if (err instanceof Error && 'statusCode' in err) throw err;
      return apiError(reply, 500, 'Failed to update role permissions');
    }
  });

  /**
   * DELETE /:role — Reset a role to system defaults (remove overrides)
   */
  fastify.delete('/:role', { preHandler }, async (request, reply) => {
    try {
      const { role } = request.params as { role: string };
      if (!CUSTOMIZABLE_ROLES.includes(role as UserRole)) {
        return apiError(reply, 400, `Invalid role: ${role}`);
      }

      const RolePermissions = getRolePermissionsModel(getTenantDb(request)!);
      await RolePermissions.deleteOne({ role });

      // Clear in-memory permission cache for this tenant
      const tenantSlug = getTenantSlug(request);
      if (tenantSlug) clearPermissionCache(tenantSlug);

      const defaults = buildEffectivePermissions(role as UserRole);
      return apiResponse(reply, 200, { role, effective: defaults, message: 'Reset to defaults' });
    } catch (err) {
      if (err instanceof Error && 'statusCode' in err) throw err;
      return apiError(reply, 500, 'Failed to reset role permissions');
    }
  });
}
