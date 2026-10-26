/**
 * Auth helpers for contract tests.
 *
 * Generates JWT tokens for various platform/tenant roles
 * using jsonwebtoken directly with test secrets from env.
 */

import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import mongoose from 'mongoose';
import { User, Tenant } from '../../../src/platform/models/index.js';
import type { AccessTokenPayload } from '../../../src/utils/jwt.js';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

// ── Platform RBAC permissions (mirrors platform-guard.ts) ───
const PLATFORM_PERMISSIONS_BY_ROLE: Record<string, string[]> = {
  platform_owner: [
    'platform_tenants:read',
    'platform_tenants:write',
    'platform_tenants:delete',
    'platform_users:read',
    'platform_users:write',
    'platform_users:delete',
    'platform_billing:read',
    'platform_billing:write',
    'platform_settings:read',
    'platform_settings:write',
    'platform_modules:read',
    'platform_modules:write',
    'platform_modules:delete',
    'platform_api_keys:read',
    'platform_api_keys:write',
    'platform_api_keys:delete',
    'platform_webhooks:read',
    'platform_webhooks:write',
    'platform_webhooks:delete',
    'platform_support:read',
    'platform_support:write',
    'platform_backups:read',
    'platform_backups:write',
    'platform_backups:delete',
    'platform_impersonation:read',
    'platform_impersonation:write',
    'platform_logs:read',
    'platform_logs:write',
    'platform_deployments:read',
    'platform_deployments:write',
    'platform_domains:read',
    'platform_domains:write',
    'platform_domains:delete',
    'platform_feature_flags:read',
    'platform_feature_flags:write',
    'platform_feature_flags:delete',
    'platform_pricing:read',
    'platform_pricing:write',
    'platform_storage:read',
  ],
  platform_admin: [
    'platform_tenants:read',
    'platform_tenants:write',
    'platform_users:read',
    'platform_users:write',
    'platform_billing:read',
    'platform_settings:read',
    'platform_modules:read',
    'platform_modules:write',
    'platform_api_keys:read',
    'platform_api_keys:write',
    'platform_webhooks:read',
    'platform_webhooks:write',
    'platform_support:read',
    'platform_support:write',
    'platform_backups:read',
    'platform_backups:write',
    'platform_impersonation:read',
    'platform_impersonation:write',
    'platform_logs:read',
    'platform_deployments:read',
    'platform_domains:read',
    'platform_domains:write',
    'platform_feature_flags:read',
    'platform_feature_flags:write',
    'platform_pricing:read',
    'platform_storage:read',
  ],
  platform_viewer: [
    'platform_tenants:read',
    'platform_users:read',
    'platform_billing:read',
    'platform_settings:read',
    'platform_modules:read',
    'platform_api_keys:read',
    'platform_webhooks:read',
    'platform_support:read',
    'platform_backups:read',
    'platform_logs:read',
    'platform_deployments:read',
    'platform_domains:read',
    'platform_feature_flags:read',
    'platform_pricing:read',
    'platform_storage:read',
  ],
};

export interface TestUser {
  _id: string;
  email: string;
  role: string;
  tenantSlug: string | null;
  platformRole?: string;
}

/**
 * Create a platform user document in the database and return their access token.
 * The user document is needed because authGuard does User.findById().
 */
export async function createPlatformUserAndToken(
  platformRole: 'platform_owner' | 'platform_admin' | 'platform_viewer' = 'platform_owner',
): Promise<{ token: string; user: TestUser }> {
  const userId = new mongoose.Types.ObjectId().toString();
  const sessionId = nanoid(16);
  const email = `test-${platformRole}-${nanoid(6)}@dento.test`;

  // Insert user document so authGuard's User.findById() succeeds
  await User.create({
    _id: userId,
    email,
    password: '$argon2id$v=19$m=65536,t=3,p=4$placeholder-hash', // Not used in token auth
    role: 'platform_admin',
    tenantSlug: null, // Platform users have no tenantSlug
    platformRole,
    status: 'active',
    tokenVersion: 1,
    profile: { firstName: { en: 'Test' }, lastName: { en: platformRole } },
  });

  const payload: AccessTokenPayload = {
    userId,
    email,
    tenantSlug: '',
    role: 'platform_admin',
    sessionId,
    platformRole,
    platformPermissions: PLATFORM_PERMISSIONS_BY_ROLE[platformRole] ?? [],
  };

  const token = jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: '15m',
    algorithm: 'HS256',
  });

  return {
    token,
    user: { _id: userId, email, role: 'platform_admin', tenantSlug: null, platformRole },
  };
}

/**
 * Generate an access token string (skips DB user creation).
 * Useful for auth guard tests where the token just needs to be valid JWT format
 * but the user doesn't need to exist.
 */
export function generateTokenForRole(
  platformRole: 'platform_owner' | 'platform_admin' | 'platform_viewer',
): string {
  const payload: AccessTokenPayload = {
    userId: new mongoose.Types.ObjectId().toString(),
    email: `${platformRole}@dento.test`,
    tenantSlug: '',
    role: 'platform_admin',
    sessionId: nanoid(16),
    platformRole,
    platformPermissions: PLATFORM_PERMISSIONS_BY_ROLE[platformRole] ?? [],
  };

  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: '15m',
    algorithm: 'HS256',
  });
}

/** Generate a refresh token. */
export function generateRefreshToken(userId: string, sessionId: string): string {
  return jwt.sign({ userId, sessionId, tokenVersion: 1 }, REFRESH_SECRET, {
    expiresIn: '7d',
    algorithm: 'HS256',
    jwtid: nanoid(32),
  });
}

/** Generate a token with wrong secret (for negative tests). */
export function generateInvalidToken(): string {
  return jwt.sign(
    {
      userId: 'fake',
      email: 'fake@test.com',
      tenantSlug: '',
      role: 'platform_admin',
      sessionId: 'x',
    },
    'wrong-secret-that-does-not-match',
    { expiresIn: '15m', algorithm: 'HS256' },
  );
}

// ── Tenant Auth Helpers (Phase 3B) ──────────────────────────

export type TenantRole =
  | 'tenant_admin'
  | 'dentist'
  | 'receptionist'
  | 'assistant'
  | 'accountant'
  | 'lab_tech'
  | 'hygienist';

const TEST_TENANT_SLUG = 'test-clinic';

/**
 * Seed a Tenant document so tenantDbMiddleware can find it.
 * Idempotent — skips if already exists.
 */
export async function seedTestTenant(slug = TEST_TENANT_SLUG): Promise<string> {
  const existing = await Tenant.findOne({ slug }).lean();
  if (existing) return existing._id.toString();

  const tenant = await Tenant.create({
    name: { en: 'Test Clinic', ar: 'عيادة تجريبية' },
    slug,
    status: 'active',
    maxUsers: 50,
    maxBranches: 5,
    storageUsedMB: 0,
    storageLimitMB: 5120,
    contact: {
      email: 'info@test-clinic.com',
      phone: '+201000000000',
      address: { country: 'EG' },
    },
    branding: { primaryColor: '#4f46e5', accentColor: '#10b981' },
    settings: {
      timezone: 'Africa/Cairo',
      locale: 'en',
      currency: 'EGP',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      weekStartsOn: 0,
    },
    enabledModules: [],
    ownerId: new mongoose.Types.ObjectId(),
    isActive: true,
  });

  return tenant._id.toString();
}

/**
 * Create a tenant user document in the database and return their access token.
 * Also seeds the tenant if it doesn't exist yet.
 */
export async function createTenantUserAndToken(
  role: TenantRole = 'tenant_admin',
  tenantSlug = TEST_TENANT_SLUG,
): Promise<{ token: string; user: TestUser; tenantSlug: string }> {
  await seedTestTenant(tenantSlug);

  const userId = new mongoose.Types.ObjectId().toString();
  const sessionId = nanoid(16);
  const email = `test-${role}-${nanoid(6)}@${tenantSlug}.test`;

  await User.create({
    _id: userId,
    email,
    password: '$argon2id$v=19$m=65536,t=3,p=4$placeholder-hash',
    role,
    tenantSlug,
    status: 'active',
    tokenVersion: 1,
    profile: { firstName: { en: 'Test' }, lastName: { en: role } },
  });

  const payload: AccessTokenPayload = {
    userId,
    email,
    tenantSlug,
    role,
    sessionId,
  };

  const token = jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: '15m',
    algorithm: 'HS256',
  });

  return {
    token,
    user: { _id: userId, email, role, tenantSlug },
    tenantSlug,
  };
}
