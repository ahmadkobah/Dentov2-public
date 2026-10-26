/**
 * Platform-Level RBAC Types
 *
 * Used by platformGuard middleware and Developer Portal UI.
 * See: PLATFORM_RBAC.md §4-§5
 */

// ── Platform Roles ──────────────────────────────────────────

export type PlatformRole = 'platform_owner' | 'platform_admin' | 'platform_viewer';

export const PLATFORM_ROLES = ['platform_owner', 'platform_admin', 'platform_viewer'] as const;

// ── Platform Actions ────────────────────────────────────────

export type PlatformAction = 'read' | 'create' | 'update' | 'delete' | 'manage';

export const PLATFORM_ACTIONS = ['read', 'create', 'update', 'delete', 'manage'] as const;

// ── Platform Modules ────────────────────────────────────────

export type PlatformModule =
  | 'platform_tenants'
  | 'platform_users'
  | 'platform_billing'
  | 'platform_modules'
  | 'platform_pricing'
  | 'platform_api_keys'
  | 'platform_webhooks'
  | 'platform_backups'
  | 'platform_support'
  | 'platform_settings'
  | 'platform_audit';

export const PLATFORM_MODULES = [
  'platform_tenants',
  'platform_users',
  'platform_billing',
  'platform_modules',
  'platform_pricing',
  'platform_api_keys',
  'platform_webhooks',
  'platform_backups',
  'platform_support',
  'platform_settings',
  'platform_audit',
] as const;

// ── Permission Override (Per-User) ──────────────────────────

export interface PlatformPermissionOverride {
  module: PlatformModule;
  actions: PlatformAction[];
}
