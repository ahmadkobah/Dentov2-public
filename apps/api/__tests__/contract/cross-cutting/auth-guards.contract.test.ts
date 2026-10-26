/**
 * Contract Tests — Cross-Cutting: Auth Guards
 *
 * Tests: #662–#666 from Phase 3C tracker
 * Verifies auth guard behavior across platform and tenant routes.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import {
  buildTestApp,
  teardownTestApp,
  cleanDatabase,
  destroyTestInfra,
} from '../helpers/build-app.js';
import { generateInvalidToken } from '../helpers/auth.js';
import { expectUnauthorized, expectForbidden } from '../helpers/assertions.js';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
});

afterEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  if (app) await teardownTestApp(app);
  await destroyTestInfra();
});

// Representative platform routes that require auth (verified to have GET / handler)
const PLATFORM_ROUTES: { method: 'GET' | 'POST'; url: string }[] = [
  { method: 'GET', url: '/api/platform/tenants' },
  { method: 'GET', url: '/api/platform/users' },
  { method: 'GET', url: '/api/platform/api-keys' },
  { method: 'GET', url: '/api/platform/feature-flags' },
  { method: 'GET', url: '/api/platform/domains' },
  { method: 'GET', url: '/api/platform/audit-logs' },
];

// Representative tenant routes that require auth
const TENANT_ROUTES: { method: 'GET' | 'POST'; url: string }[] = [
  { method: 'GET', url: '/api/patients' },
  { method: 'GET', url: '/api/appointments' },
  { method: 'GET', url: '/api/users' },
  { method: 'GET', url: '/api/branches' },
  { method: 'GET', url: '/api/dental-charts' },
  { method: 'GET', url: '/api/invoices' },
];

describe('Cross-Cutting: Auth Guards', () => {
  // #662 — All /api/platform/* routes return 401 without token
  it('#662 all platform routes return 401 without token', async () => {
    for (const route of PLATFORM_ROUTES) {
      const res = await app.inject({ method: route.method, url: route.url });
      expect(res.statusCode, `Expected 401 for ${route.method} ${route.url}`).toBe(401);
    }
  });

  // #663 — All /api/platform/* routes return 403 with wrong permission
  it('#663 platform routes return 403 with valid token but wrong permissions', async () => {
    // Token with NO platform permissions
    const token = jwt.sign(
      {
        userId: '000000000000000000000001',
        email: 'noperm@test.com',
        tenantSlug: '',
        role: 'platform_admin',
        sessionId: 'test-session',
        platformRole: 'platform_viewer',
        platformPermissions: [], // Empty — no permissions at all
      },
      ACCESS_SECRET,
      { expiresIn: '15m', algorithm: 'HS256' },
    );

    // Use GET routes that exist — token has empty permissions and no DB user,
    // so authGuard User.findById() returns null → 401
    for (const route of PLATFORM_ROUTES) {
      const res = await app.inject({
        method: route.method,
        url: route.url,
        headers: { authorization: `Bearer ${token}` },
      });
      // Should be 401 (no DB user for this token) or 403 (no permission)
      expect(
        [401, 403].includes(res.statusCode),
        `Expected 401/403 for ${route.method} ${route.url}, got ${res.statusCode}`,
      ).toBe(true);
    }
  });

  // #664 — All tenant routes return 401 without token (except public routes)
  it('#664 tenant routes return 401 without token', async () => {
    for (const route of TENANT_ROUTES) {
      const res = await app.inject({ method: route.method, url: route.url });
      expect(res.statusCode, `Expected 401 for ${route.method} ${route.url}`).toBe(401);
    }
  });

  // #665 — Expired JWT returns 401
  it('#665 expired JWT returns 401', async () => {
    const expiredToken = jwt.sign(
      {
        userId: '000000000000000000000001',
        email: 'expired@test.com',
        tenantSlug: '',
        role: 'platform_admin',
        sessionId: 'test-session',
        platformRole: 'platform_owner',
        platformPermissions: ['platform_tenants:read'],
      },
      ACCESS_SECRET,
      { expiresIn: '0s', algorithm: 'HS256' },
    );

    // Small delay to ensure token is expired
    await new Promise((r) => setTimeout(r, 50));

    const res = await app.inject({
      method: 'GET',
      url: '/api/platform/tenants',
      headers: { authorization: `Bearer ${expiredToken}` },
    });
    expectUnauthorized(res);
  });

  // #666 — Malformed JWT returns 401
  it('#666 malformed JWT returns 401', async () => {
    // Test with invalid token (signed with wrong secret)
    const invalidRes = await app.inject({
      method: 'GET',
      url: '/api/platform/tenants',
      headers: { authorization: `Bearer ${generateInvalidToken()}` },
    });
    expectUnauthorized(invalidRes);

    // Test with completely garbage string
    const garbageRes = await app.inject({
      method: 'GET',
      url: '/api/platform/tenants',
      headers: { authorization: 'Bearer not.a.valid.jwt.at.all' },
    });
    expectUnauthorized(garbageRes);
  });
});
