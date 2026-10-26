import type { FastifyRequest, FastifyReply } from 'fastify';
import { ApiError } from '../../utils/api-response.js';
import type {
  PlatformRole,
  PlatformAction,
  PlatformModule,
  PlatformPermissionOverride,
} from '@dento/shared';

/**
 * Platform-Level RBAC Middleware
 *
 * Parallel to tenant-level roleGuard, but for Platform-scope operations.
 * Replaces ~44 inline `role !== 'platform_admin'` checks across 12 route files.
 *
 * Chain: authGuard → platformGuard(module, action) → handler
 *
 * See: PLATFORM_RBAC.md §8
 */

// ── Permission Matrix (Code-defined, NOT in DB) ─────────────

const PLATFORM_PERMISSIONS: Record<PlatformModule, Record<PlatformRole, PlatformAction[] | '*'>> = {
  platform_tenants: {
    platform_owner: '*',
    platform_admin: ['read', 'create', 'update'],
    platform_viewer: ['read'],
  },
  platform_users: {
    platform_owner: '*',
    platform_admin: ['read'],
    platform_viewer: ['read'],
  },
  platform_billing: {
    platform_owner: '*',
    platform_admin: ['read'],
    platform_viewer: ['read'],
  },
  platform_modules: {
    platform_owner: '*',
    platform_admin: ['read', 'create', 'update'],
    platform_viewer: ['read'],
  },
  platform_pricing: {
    platform_owner: '*',
    platform_admin: ['read'],
    platform_viewer: ['read'],
  },
  platform_api_keys: {
    platform_owner: '*',
    platform_admin: ['read', 'create', 'delete'],
    platform_viewer: ['read'],
  },
  platform_webhooks: {
    platform_owner: '*',
    platform_admin: ['read', 'create', 'update', 'delete'],
    platform_viewer: ['read'],
  },
  platform_backups: {
    platform_owner: '*',
    platform_admin: ['read', 'create'],
    platform_viewer: ['read'],
  },
  platform_support: {
    platform_owner: '*',
    platform_admin: ['read', 'create', 'update'],
    platform_viewer: ['read'],
  },
  platform_settings: {
    platform_owner: '*',
    platform_admin: ['read'],
    platform_viewer: [],
  },
  platform_audit: {
    platform_owner: '*',
    platform_admin: ['read'],
    platform_viewer: ['read'],
  },
} as const;

// ── Helper Functions ────────────────────────────────────────

/**
 * Check if a platform role has permission for a module action,
 * considering optional per-user overrides.
 */
export function hasPlatformPermission(
  role: PlatformRole,
  module: PlatformModule,
  action: PlatformAction,
  overrides?: PlatformPermissionOverride[],
): boolean {
  // Phase 2: Check per-user overrides first
  if (overrides?.length) {
    const override = overrides.find((o) => o.module === module);
    if (override) return override.actions.includes(action);
  }

  // Default: Check role matrix
  const permissions = PLATFORM_PERMISSIONS[module]?.[role];
  if (!permissions) return false;
  if (permissions === '*') return true;
  return (permissions as PlatformAction[]).includes(action);
}

/**
 * Resolve all permissions for a platform role into a flat array.
 * Used for JWT payload: ['platform_tenants.*', 'platform_users.read', ...]
 */
export function resolvePlatformPermissions(
  role: PlatformRole,
  overrides: PlatformPermissionOverride[] = [],
): string[] {
  const resolved: string[] = [];

  for (const [module, rolePerms] of Object.entries(PLATFORM_PERMISSIONS)) {
    const override = overrides.find((o) => o.module === module);

    if (override) {
      // Override wins
      for (const action of override.actions) {
        resolved.push(`${module}.${action}`);
      }
    } else {
      // Default from matrix
      const perms = rolePerms[role];
      if (!perms) continue;
      if (perms === '*') {
        resolved.push(`${module}.*`);
      } else {
        for (const action of perms) {
          resolved.push(`${module}.${action}`);
        }
      }
    }
  }

  return resolved;
}

// ── Middleware Factory ───────────────────────────────────────

/**
 * Platform Guard Middleware Factory
 *
 * Usage:
 *   fastify.get('/platform/users', {
 *     preHandler: [authGuard, platformGuard('platform_users', 'read')]
 *   }, handler)
 */
export function platformGuard(module: PlatformModule, action: PlatformAction) {
  return async function (request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!request.user) {
      throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication required');
    }

    // Platform-User must have platformRole
    const platformRole = request.user.platformRole as PlatformRole | undefined;
    if (!platformRole) {
      throw new ApiError(
        403,
        'PLATFORM_ACCESS_DENIED',
        'Platform access denied — no platform role assigned',
      );
    }

    // Check permission (overrides not yet in JWT — will be resolved server-side in Phase 2)
    if (!hasPlatformPermission(platformRole, module, action)) {
      throw new ApiError(
        403,
        'INSUFFICIENT_PLATFORM_PERMISSIONS',
        `Insufficient permissions: ${module}.${action} requires higher platform role`,
      );
    }
  };
}

// ── Convenience Exports ─────────────────────────────────────

/** Require platform_owner role (for user management) */
export const requirePlatformOwner = platformGuard('platform_users', 'manage');

/** Export the permission matrix for testing */
export { PLATFORM_PERMISSIONS };
