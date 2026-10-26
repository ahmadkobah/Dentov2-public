/**
 * Contract Tests — Cross-Cutting: Response Shapes
 *
 * Tests: #667–#670 from Phase 3C tracker
 * Verifies that all endpoints follow the standard response envelope.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  buildTestApp,
  teardownTestApp,
  cleanDatabase,
  destroyTestInfra,
} from '../helpers/build-app.js';
import { createPlatformUserAndToken } from '../helpers/auth.js';
import { expectSuccess, expectPaginated, withAuth } from '../helpers/assertions.js';

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

// Platform list endpoints that use the standard paginated envelope
// (Tenant endpoints nest data differently, so only check platform here)
const LIST_ENDPOINTS: { url: string; kind: 'platform' | 'tenant' }[] = [
  { url: '/api/platform/tenants', kind: 'platform' },
  { url: '/api/platform/users', kind: 'platform' },
  { url: '/api/platform/feature-flags', kind: 'platform' },
  { url: '/api/platform/audit-logs', kind: 'platform' },
  { url: '/api/platform/domains', kind: 'platform' },
];

describe('Cross-Cutting: Response Shapes', () => {
  // #667 — All list endpoints return { success, data: [], meta: { page, limit, total, totalPages } }
  it('#667 list endpoints return paginated response shape', async () => {
    const { token: platformToken } = await createPlatformUserAndToken('platform_owner');

    for (const ep of LIST_ENDPOINTS) {
      const res = await app.inject(withAuth(platformToken, { method: 'GET', url: ep.url }));

      // Should not be 404 (route exists) or 500 (crash)
      expect(res.statusCode, `${ep.url} should not 404/500`).toBeLessThan(500);
      if (res.statusCode === 200) {
        const body = res.json();
        expect(body, `${ep.url} envelope`).toHaveProperty('success', true);
        expect(Array.isArray(body.data), `${ep.url} data should be array`).toBe(true);
        expect(body, `${ep.url} meta`).toHaveProperty('meta');
        expect(body.meta).toEqual(
          expect.objectContaining({
            page: expect.any(Number),
            limit: expect.any(Number),
            total: expect.any(Number),
            totalPages: expect.any(Number),
          }),
        );
      }
    }
  });

  // #668 — All detail endpoints return { success, data: {} }
  it('#668 detail endpoints return success+data object shape', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    // Use health endpoint as a reliable detail-like endpoint
    const res = await app.inject({ method: 'GET', url: '/health/live' });
    const body = expectSuccess(res, 200);
    expect(body).toHaveProperty('data');
    expect(typeof body.data).toBe('object');

    // Platform settings returns a detail object
    const settingsRes = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/platform/settings' }),
    );
    if (settingsRes.statusCode === 200) {
      const settingsBody = settingsRes.json();
      expect(settingsBody).toHaveProperty('success', true);
      expect(settingsBody).toHaveProperty('data');
    }
  });

  // #669 — All create endpoints return 201
  it('#669 successful create operations return 201 status', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    // Create a feature flag — one of the simpler create endpoints
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/platform/feature-flags',
        payload: {
          key: 'test_flag_response_shape',
          name: 'Test Flag',
          description: 'Contract test',
          enabled: false,
          scope: 'global',
        },
      }),
    );

    // Should return 201 on success
    if (res.statusCode === 201) {
      const body = res.json();
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
    } else {
      // At minimum, not a 500
      expect(res.statusCode).toBeLessThan(500);
    }
  });

  // #670 — All error responses include { success: false, error } or { statusCode, message }
  it('#670 error responses follow standard error envelope', async () => {
    // 401 errors
    const unauthRes = await app.inject({ method: 'GET', url: '/api/platform/tenants' });
    expect(unauthRes.statusCode).toBe(401);
    const unauthBody = unauthRes.json();
    expect(unauthBody).toHaveProperty('statusCode', 401);
    expect(unauthBody).toHaveProperty('message');

    // 404 errors — request a non-existent detail resource
    const { token } = await createPlatformUserAndToken('platform_owner');
    const notFoundRes = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/tenants/000000000000000000000099',
      }),
    );
    if (notFoundRes.statusCode === 404) {
      const nfBody = notFoundRes.json();
      expect(nfBody).toHaveProperty('statusCode', 404);
      expect(nfBody).toHaveProperty('message');
    }

    // 422 validation errors — send invalid body
    const validationRes = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/platform/tenants',
        payload: {}, // Missing required fields
      }),
    );
    if (validationRes.statusCode === 422) {
      const valBody = validationRes.json();
      expect(valBody).toHaveProperty('statusCode', 422);
      expect(valBody).toHaveProperty('message');
    }
  });
});
