import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Connection } from 'mongoose';
import { ApiError } from '../../utils/api-response.js';
import { getRolePermissionsModel } from '../models/role-permissions.model.js';

/**
 * RBAC (Role-Based Access Control) Middleware
 *
 * Permission Matrix: 28 Modules × 8 Roles
 *
 * Roles (fixed, code-defined):
 * - platform_admin: Full access to platform (Dev Portal)
 * - tenant_admin: Full access to their tenant
 * - dentist: Clinical modules + limited admin
 * - receptionist: Front desk operations
 * - assistant: Clinical assistance
 * - accountant: Financial modules
 * - lab_tech: Lab operations
 * - hygienist: Limited clinical
 */

// ── Types ───────────────────────────────────────────────────

export type UserRole =
  | 'platform_admin'
  | 'tenant_admin'
  | 'dentist'
  | 'receptionist'
  | 'assistant'
  | 'accountant'
  | 'lab_tech'
  | 'hygienist';

export type ModuleSlug =
  | 'dashboard'
  | 'patients'
  | 'appointments'
  | 'daily-operations'
  | 'dental-charts'
  | 'treatment-plans'
  | 'procedure-notes'
  | 'prescriptions'
  | 'xrays'
  | 'cbct'
  | 'lab-orders'
  | 'consent-forms'
  | 'invoices'
  | 'payments'
  | 'insurance'
  | 'installments'
  | 'commissions'
  | 'inventory'
  | 'branches'
  | 'staff'
  | 'doctors'
  | 'schedules'
  | 'leave'
  | 'attendance'
  | 'reports'
  | 'notifications'
  | 'webhooks'
  | 'settings';

export type Permission = 'read' | 'create' | 'update' | 'delete' | 'manage';

// ── Permission Matrix ───────────────────────────────────────

/**
 * Permission matrix defines which roles can access which modules with what permissions.
 * '*' means all permissions for that module.
 */
export const PERMISSION_MATRIX: Record<ModuleSlug, Record<UserRole, Permission[] | '*'>> = {
  // ── Core ──
  dashboard: {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: ['read'],
    receptionist: ['read'],
    assistant: ['read'],
    accountant: ['read'],
    lab_tech: ['read'],
    hygienist: ['read'],
  },
  patients: {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: '*',
    receptionist: ['read', 'create', 'update'],
    assistant: ['read', 'update'],
    accountant: ['read'],
    lab_tech: ['read'],
    hygienist: ['read', 'update'],
  },
  appointments: {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: ['read', 'create', 'update'],
    receptionist: '*',
    assistant: ['read'],
    accountant: ['read'],
    lab_tech: [],
    hygienist: ['read'],
  },
  'daily-operations': {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: ['read', 'update'],
    receptionist: '*',
    assistant: ['read'],
    accountant: [],
    lab_tech: [],
    hygienist: [],
  },

  // ── Clinical ──
  'dental-charts': {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: '*',
    receptionist: ['read'],
    assistant: ['read'],
    accountant: [],
    lab_tech: [],
    hygienist: ['read', 'create', 'update'],
  },
  'treatment-plans': {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: '*',
    receptionist: ['read'],
    assistant: ['read'],
    accountant: ['read'],
    lab_tech: [],
    hygienist: [],
  },
  'procedure-notes': {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: '*',
    receptionist: ['read'],
    assistant: ['read', 'create'],
    accountant: [],
    lab_tech: [],
    hygienist: ['read', 'create'],
  },
  prescriptions: {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: '*',
    receptionist: ['read'],
    assistant: ['read'],
    accountant: [],
    lab_tech: [],
    hygienist: [],
  },
  xrays: {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: '*',
    receptionist: ['read'],
    assistant: ['read', 'create'],
    accountant: [],
    lab_tech: ['read'],
    hygienist: ['read'],
  },
  cbct: {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: '*',
    receptionist: ['read'],
    assistant: ['read'],
    accountant: [],
    lab_tech: ['read'],
    hygienist: [],
  },
  'lab-orders': {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: ['read', 'create', 'update'],
    receptionist: ['read'],
    assistant: ['read'],
    accountant: [],
    lab_tech: '*',
    hygienist: [],
  },
  'consent-forms': {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: ['read', 'create'],
    receptionist: ['read', 'create'],
    assistant: ['read'],
    accountant: [],
    lab_tech: [],
    hygienist: [],
  },

  // ── Financial ──
  invoices: {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: ['read'],
    receptionist: ['read', 'create'],
    assistant: [],
    accountant: '*',
    lab_tech: [],
    hygienist: [],
  },
  payments: {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: ['read'],
    receptionist: ['read', 'create'],
    assistant: [],
    accountant: '*',
    lab_tech: [],
    hygienist: [],
  },
  insurance: {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: ['read'],
    receptionist: ['read'],
    assistant: [],
    accountant: '*',
    lab_tech: [],
    hygienist: [],
  },
  installments: {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: [],
    receptionist: ['read'],
    assistant: [],
    accountant: '*',
    lab_tech: [],
    hygienist: [],
  },
  commissions: {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: ['read'],
    receptionist: [],
    assistant: [],
    accountant: ['read'],
    lab_tech: [],
    hygienist: [],
  },

  // ── Operations ──
  inventory: {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: ['read'],
    receptionist: [],
    assistant: ['read', 'create', 'update'],
    accountant: ['read'],
    lab_tech: ['read'],
    hygienist: [],
  },
  branches: {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: ['read'],
    receptionist: ['read'],
    assistant: [],
    accountant: [],
    lab_tech: [],
    hygienist: [],
  },
  staff: {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: ['read'],
    receptionist: ['read'],
    assistant: [],
    accountant: [],
    lab_tech: [],
    hygienist: [],
  },
  doctors: {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: ['read', 'update'],
    receptionist: ['read'],
    assistant: ['read'],
    accountant: [],
    lab_tech: [],
    hygienist: [],
  },
  schedules: {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: ['read', 'update'],
    receptionist: ['read', 'create', 'update'],
    assistant: ['read'],
    accountant: [],
    lab_tech: [],
    hygienist: ['read'],
  },
  leave: {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: ['read', 'create'],
    receptionist: ['read', 'create'],
    assistant: ['read', 'create'],
    accountant: ['read', 'create'],
    lab_tech: ['read', 'create'],
    hygienist: ['read', 'create'],
  },
  attendance: {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: ['read', 'create'],
    receptionist: ['read', 'create'],
    assistant: ['read', 'create'],
    accountant: ['read', 'create'],
    lab_tech: ['read', 'create'],
    hygienist: ['read', 'create'],
  },
  reports: {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: ['read'],
    receptionist: [],
    assistant: [],
    accountant: ['read'],
    lab_tech: [],
    hygienist: [],
  },
  notifications: {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: ['read'],
    receptionist: ['read'],
    assistant: ['read'],
    accountant: ['read'],
    lab_tech: ['read'],
    hygienist: ['read'],
  },
  webhooks: {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: [],
    receptionist: [],
    assistant: [],
    accountant: [],
    lab_tech: [],
    hygienist: [],
  },
  settings: {
    platform_admin: '*',
    tenant_admin: '*',
    dentist: ['read'],
    receptionist: ['read'],
    assistant: [],
    accountant: [],
    lab_tech: [],
    hygienist: [],
  },
};

// ── Helper Functions ────────────────────────────────────────

/**
 * Check if a role has a specific permission for a module
 */
export function hasPermission(role: UserRole, module: ModuleSlug, permission: Permission): boolean {
  const modulePermissions = PERMISSION_MATRIX[module]?.[role];

  if (!modulePermissions) return false;
  if (modulePermissions === '*') return true;
  return modulePermissions.includes(permission);
}

/**
 * Get all permissions for a role on a module
 */
export function getPermissions(role: UserRole, module: ModuleSlug): Permission[] {
  const modulePermissions = PERMISSION_MATRIX[module]?.[role];

  if (!modulePermissions) return [];
  if (modulePermissions === '*') return ['read', 'create', 'update', 'delete', 'manage'];
  return modulePermissions;
}

/**
 * Get all modules a role has access to
 */
export function getAccessibleModules(role: UserRole): ModuleSlug[] {
  return Object.entries(PERMISSION_MATRIX)
    .filter(([_, rolePerms]) => {
      const perms = rolePerms[role];
      return perms === '*' || (Array.isArray(perms) && perms.length > 0);
    })
    .map(([module]) => module as ModuleSlug);
}

// ── Tenant Override Cache ───────────────────────────────────

/**
 * In-memory cache of tenant permission overrides.
 * Key: `${tenantSlug}:${role}:${module}` → Permission[] | null
 * Cleared on PUT /api/role-permissions/:role.
 * TTL: entries expire after 5 minutes via lazy check.
 */
const overrideCache = new Map<string, { perms: Permission[] | null; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function clearPermissionCache(tenantSlug: string) {
  for (const key of overrideCache.keys()) {
    if (key.startsWith(`${tenantSlug}:`)) overrideCache.delete(key);
  }
}

async function getTenantOverride(
  tenantDb: Connection | undefined,
  tenantSlug: string | undefined,
  role: UserRole,
  module: ModuleSlug,
): Promise<Permission[] | null> {
  if (!tenantDb || !tenantSlug) return null;

  const cacheKey = `${tenantSlug}:${role}:${module}`;
  const cached = overrideCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.perms;

  try {
    const RolePermissions = getRolePermissionsModel(tenantDb);
    const doc = await RolePermissions.findOne({ role }).lean();
    if (!doc) {
      overrideCache.set(cacheKey, { perms: null, ts: Date.now() });
      return null;
    }
    const entry = doc.modules.find((m: { module: string }) => m.module === module);
    const perms = entry ? (entry.permissions as Permission[]) : null;
    overrideCache.set(cacheKey, { perms, ts: Date.now() });
    return perms;
  } catch {
    // Fail CLOSED: a DB error must NOT silently fall back to the (more
    // permissive) hardcoded defaults — that would restore broader-than-intended
    // permissions on a transient outage (#47). Surface it so roleGuard denies
    // with 503 instead of granting access. `null` is reserved for the legitimate
    // "no override configured → use defaults" case only.
    throw new ApiError(
      503,
      'PERMISSION_LOOKUP_FAILED',
      'Unable to verify permissions right now. Please retry.',
    );
  }
}

// ── Middleware Factory ──────────────────────────────────────

/**
 * Create a role guard middleware for specific module and permission.
 * Checks tenant-specific overrides first, falls back to hardcoded defaults.
 *
 * Usage:
 *   fastify.get('/patients', { preHandler: [authGuard, roleGuard('patients', 'read')] }, handler)
 */
export function roleGuard(module: ModuleSlug, permission: Permission) {
  return async function (request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!request.user) {
      throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication is required');
    }

    const role = request.user.role as UserRole;

    // Platform admin and tenant admin always have full access
    if (role === 'platform_admin' || role === 'tenant_admin') {
      return;
    }

    // Check tenant-specific overrides (if tenant context available)
    const tenantDb = (request as unknown as Record<string, unknown>).tenantDb as
      Connection | undefined;
    const tenantSlug = (request as unknown as Record<string, unknown>).tenantSlug as
      string | undefined;
    const override = await getTenantOverride(tenantDb, tenantSlug, role, module);

    if (override !== null) {
      // Tenant has custom permissions for this role+module
      if (!override.includes(permission)) {
        throw new ApiError(
          403,
          'INSUFFICIENT_PERMISSIONS',
          `You don't have ${permission} permission for ${module}`,
        );
      }
      return;
    }

    // Fall back to hardcoded defaults
    if (!hasPermission(role, module, permission)) {
      throw new ApiError(
        403,
        'INSUFFICIENT_PERMISSIONS',
        `You don't have ${permission} permission for ${module}`,
      );
    }
  };
}

/**
 * Require specific roles (any of the listed roles)
 *
 * Usage:
 *   fastify.delete('/users/:id', { preHandler: [authGuard, requireRoles('tenant_admin', 'platform_admin')] }, handler)
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  return async function (request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!request.user) {
      throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication is required');
    }

    const role = request.user.role as UserRole;

    if (!allowedRoles.includes(role)) {
      throw new ApiError(
        403,
        'ROLE_NOT_ALLOWED',
        `This action requires one of: ${allowedRoles.join(', ')}`,
      );
    }
  };
}

/**
 * Require tenant admin or platform admin
 */
export const requireAdmin = requireRoles('tenant_admin', 'platform_admin');

/**
 * Require platform admin only
 */
export const requirePlatformAdmin = requireRoles('platform_admin');
