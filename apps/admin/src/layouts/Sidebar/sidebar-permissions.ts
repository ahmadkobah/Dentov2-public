/**
 * Sidebar RBAC Permissions
 *
 * Client-side mirror of the API's role-permission matrix (role-guard.ts).
 * Determines which sidebar items are visible for each user role.
 *
 * Supports two modes:
 * 1. API-fetched permissions (from /api/role-permissions/me) — used when available.
 * 2. Hardcoded fallback — used before the API data loads or if the fetch fails.
 *
 * A module is visible if the role has ANY permission (even 'read') for it.
 * platform_admin and tenant_admin see everything.
 */

type UserRole =
  | 'platform_admin'
  | 'tenant_admin'
  | 'dentist'
  | 'receptionist'
  | 'assistant'
  | 'accountant'
  | 'lab_tech'
  | 'hygienist';

// ── API-Fetched Permissions Store ───────────────────────────

/**
 * Cached permission map from the API (set by useMyPermissions on login).
 * Keys are module slugs (hyphenated, e.g. "dental-charts"),
 * values are permission arrays (e.g. ["read", "create"]).
 * A module with at least one permission is visible in the sidebar.
 */
let apiPermissions: Record<string, string[]> | null = null;

/** Called by the permissions provider after fetching /api/role-permissions/me. */
export function setApiPermissions(perms: Record<string, string[]> | null) {
  apiPermissions = perms;
}

/** Get the stored API permissions (null if not yet fetched). */
export function getApiPermissions() {
  return apiPermissions;
}

// ── Hardcoded Fallback ──────────────────────────────────────

/**
 * Modules each role can see in the sidebar (hardcoded fallback).
 * Used before API permissions load or if the fetch fails.
 */
const ROLE_VISIBLE_MODULES: Record<UserRole, Set<string>> = {
  platform_admin: new Set(['*']),
  tenant_admin: new Set(['*']),

  dentist: new Set([
    'dashboard',
    'patients',
    'appointments',
    'dental_charts',
    'treatment_plans',
    'procedure_notes',
    'prescriptions',
    'xrays',
    'cbct',
    'lab_orders',
    'consent',
    'invoices',
    'payments',
    'insurance',
    'commissions',
    'doctors',
    'schedules',
    'leave',
    'attendance',
    'reports',
    'notifications',
  ]),

  receptionist: new Set([
    'dashboard',
    'patients',
    'appointments',
    'dental_charts',
    'treatment_plans',
    'prescriptions',
    'xrays',
    'lab_orders',
    'consent',
    'invoices',
    'payments',
    'insurance',
    'installments',
    'doctors',
    'schedules',
    'leave',
    'attendance',
    'notifications',
  ]),

  assistant: new Set([
    'dashboard',
    'patients',
    'dental_charts',
    'treatment_plans',
    'prescriptions',
    'xrays',
    'lab_orders',
    'consent',
    'inventory',
    'leave',
    'attendance',
    'notifications',
  ]),

  accountant: new Set([
    'dashboard',
    'patients',
    'appointments',
    'treatment_plans',
    'invoices',
    'payments',
    'insurance',
    'installments',
    'commissions',
    'inventory',
    'leave',
    'attendance',
    'reports',
    'notifications',
  ]),

  lab_tech: new Set([
    'dashboard',
    'patients',
    'xrays',
    'lab_orders',
    'inventory',
    'leave',
    'attendance',
    'notifications',
  ]),

  hygienist: new Set([
    'dashboard',
    'patients',
    'appointments',
    'dental_charts',
    'schedules',
    'leave',
    'attendance',
    'notifications',
  ]),
};

// ── Slug Normalizer ─────────────────────────────────────────

/**
 * Sidebar items may use underscores (e.g. "dental_charts") while the API
 * uses hyphens (e.g. "dental-charts"). Normalize for comparison.
 */
function normalizeSlug(slug: string): string {
  return slug.replace(/_/g, '-');
}

// ── Main Check Function ─────────────────────────────────────

/**
 * Check if a user role can see a specific sidebar module.
 * Uses API-fetched permissions when available, falls back to hardcoded sets.
 */
export function canAccessModule(role: string | undefined, moduleSlug: string | undefined): boolean {
  if (!moduleSlug) return true;
  if (!role) return false;

  // Admins always see everything
  if (role === 'platform_admin' || role === 'tenant_admin') return true;

  // Use API permissions if available
  if (apiPermissions) {
    const normalized = normalizeSlug(moduleSlug);
    const perms = apiPermissions[normalized];
    return !!perms && perms.length > 0;
  }

  // Fallback to hardcoded
  const visibleModules = ROLE_VISIBLE_MODULES[role as UserRole];
  if (!visibleModules) return false;
  if (visibleModules.has('*')) return true;
  return visibleModules.has(moduleSlug);
}
