// Additional types (Zod-inferred types are exported from schemas)

// ── Socket.io Types ─────────────────────────────────────────
export * from './socket.types.js';

// ── Notification Types ──────────────────────────────────────
export * from './notification.types.js';

// ── Recurring Appointments Types ────────────────────────────
export * from './recurring.types.js';

// ── Reports & Analytics Types ───────────────────────────────
export * from './report.types.js';

// ── Branding & Logo Propagation Types (§14) ─────────────────
export * from './branding.types.js';

// ── Module Versioning Types (§24) ───────────────────────────
export * from './versioning.types.js';

// ── Webhook System Types (§23) ─────────────────────────────
export * from './webhook.types.js';

// ── Pricing System Types (§28) ─────────────────────────────
export * from './pricing.types.js';

// ── Payment Gateway Types (§29) ────────────────────────────
export * from './payment.types.js';
// ── Backup Types (§34) ─────────────────────────────────────────
export * from './backup.types.js';

// ── Country Configuration Types ─────────────────────────────────
export * from './country.types.js';

// ── Rate Limit Types (§23) ─────────────────────────────────────
export * from './ratelimit.types.js';

// ── API Key Types (§23) ───────────────────────────────────────
export * from './apikey.types.js';

// ── DB Explorer Types (§7/§8) ─────────────────────────────────
export * from './db-explorer.types.js';

// ── Support Ticket Types (§9) ────────────────────────────────
export * from './support-ticket.types.js';

// ── Support Session / Impersonation Types (§9) ───────────────
export * from './support-session.types.js';
// ── Domain / Custom DNS Types (§12) ─────────────────────────
export * from './domain.types.js';

// ── Migration Types (§7) ────────────────────────────────────
export * from './migration.types.js';
// ── Platform RBAC Types (PLATFORM_RBAC.md §4-§5) ───────────
export * from './platform.types.js';

// ── Error Log Types (Phase 6 Monitoring) ────────────────────
export * from './error-log.types.js';

// ── Audit Log Types (Phase 6 Security) ─────────────────────
export * from './audit-log.types.js';

// ── Custom Field Types (Phase 7) ───────────────────────────
export * from './custom-field.types.js';

// ── Platform System Settings Types (Phase 7) ───────────────
export * from './system-settings.types.js';

// ── Feature Flag Types (Phase 7) ───────────────────────────
export * from './feature-flag.types.js';

// ── Deployment Types (Phase 6 Infrastructure) ──────────────
export * from './deployment.types.js';

// ── Billing Types (Phase 6 SaaS) ───────────────────────────
export * from './billing.types.js';

// ── System Log Types (Phase 6 Observability) ───────────────
export * from './system-log.types.js';

// ── User Session Types (Phase 6 Security) ──────────────────
export * from './user-session.types.js';

// ── Health Check Types (Phase 6 Monitoring) ────────────────
export * from './health-check.types.js';

// ── Storage Types (Phase 7) ────────────────────────────────
export * from './storage.types.js';

// ── Auth Types (Additional) ─────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  tenantId?: string;
  tenantSlug?: string;
}

// ── Tenant Types (Additional) ───────────────────────────────

export type TenantStatus = 'active' | 'suspended' | 'cancelled' | 'trial';

// ── Role Types ──────────────────────────────────────────────

export type Role =
  | 'platform_admin'
  | 'tenant_admin'
  | 'dentist'
  | 'receptionist'
  | 'assistant'
  | 'accountant'
  | 'lab_tech'
  | 'hygienist';

// ── API Response Types ──────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/** Lightweight pagination metadata returned by list endpoints. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
