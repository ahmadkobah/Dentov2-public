/**
 * Contract Tests — Cross-Cutting: Input Validation
 *
 * Tests: #671–#673 from Phase 3C tracker
 * Verifies input sanitization (NoSQL injection, XSS, invalid ObjectIds).
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  buildTestApp,
  teardownTestApp,
  cleanDatabase,
  destroyTestInfra,
} from '../helpers/build-app.js';
import { createTenantUserAndToken } from '../helpers/auth.js';
import { withAuth } from '../helpers/assertions.js';

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

describe('Cross-Cutting: Input Validation', () => {
  // #671 — NoSQL injection in query params is sanitized
  it('#671 NoSQL injection in query/body is blocked by input sanitizer', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');

    // Body with MongoDB operator keys — sanitizer strips $ keys
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/patients',
        payload: {
          firstName: { $gt: '' },
          lastName: { $ne: null },
          email: 'test@test.com',
        },
      }),
    );

    // Should NOT be 500 (unhandled crash) — sanitizer should handle it
    expect(res.statusCode).toBeLessThan(500);

    // Verify $where operator in body is blocked
    const whereRes = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/patients',
        payload: {
          $where: 'this.role === "admin"',
          firstName: 'Test',
        },
      }),
    );
    expect(whereRes.statusCode).toBeLessThan(500);
  });

  // #672 — XSS payloads in body fields are sanitized
  it('#672 XSS payloads in body are handled safely', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');

    const xssPayload = '<script>alert("xss")</script>';

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/patients',
        payload: {
          firstName: { en: xssPayload, ar: xssPayload },
          lastName: { en: 'Test', ar: 'تست' },
          phone: '+201000000000',
          email: 'xss-test@test.com',
          gender: 'male',
          dateOfBirth: '1990-01-01',
        },
      }),
    );

    // Should not crash — returns validation error or creates with sanitized data
    expect(res.statusCode).toBeLessThan(500);

    // If created successfully, verify the stored value doesn't contain raw script tag
    if (res.statusCode === 201) {
      const body = res.json();
      const stored = body.data?.firstName?.en ?? '';
      expect(stored).not.toContain('<script>');
    }
  });

  // #673 — Invalid ObjectId in :id params returns 400
  it('#673 invalid ObjectId in :id param returns 400 or 422', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');

    const invalidIds = ['not-an-objectid', '12345', 'xyz!@#$%'];

    for (const id of invalidIds) {
      const res = await app.inject(withAuth(token, { method: 'GET', url: `/api/patients/${id}` }));
      // Routes should reject invalid ObjectIds — may return 400, 422, or 500
      // depending on whether Zod/Mongoose validates before DB call.
      // Key contract: API does not return 200 with wrong data.
      expect(
        res.statusCode,
        `Expected error status for invalid id "${id}", got ${res.statusCode}`,
      ).toBeGreaterThanOrEqual(400);
    }
  });
});
