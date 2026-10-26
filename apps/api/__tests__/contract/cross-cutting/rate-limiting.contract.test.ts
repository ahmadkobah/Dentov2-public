/**
 * Contract Tests — Cross-Cutting: Rate Limiting
 *
 * Tests: #674–#675 from Phase 3C tracker
 * Verifies rate-limit management routes exist and respond correctly.
 *
 * Note: The actual rate-limit plugin is NOT registered in the test app
 * (see build-app.ts header). These tests verify the rate-limit management
 * CRUD routes exist and respond, not the actual throttling behavior.
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

describe('Cross-Cutting: Rate Limiting', () => {
  // #674 — Rate limit management routes exist for mutation endpoints
  it('#674 rate-limit config CRUD routes are registered and respond', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    // GET /api/rate-limits — list rate limit configs
    const listRes = await app.inject(withAuth(token, { method: 'GET', url: '/api/rate-limits' }));
    expect(listRes.statusCode).not.toBe(404);
    expect(listRes.statusCode).toBeLessThan(500);

    // POST /api/rate-limits/check — check rate limit status for a key
    const checkRes = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/rate-limits/check',
        payload: { key: 'test-ip-127.0.0.1' },
      }),
    );
    expect(checkRes.statusCode).not.toBe(404);
    expect(checkRes.statusCode).toBeLessThan(500);
  });

  // #675 — Rate limit analytics routes differentiate read vs write
  it('#675 rate-limit analytics routes are accessible', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    // GET /api/platform/analytics/rate-limits — analytics for rate limits
    const analyticsRes = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/analytics/rate-limits',
      }),
    );
    expect(analyticsRes.statusCode).not.toBe(404);
    expect(analyticsRes.statusCode).toBeLessThan(500);

    // PATCH /api/rate-limits/:key — update a rate limit config
    const patchRes = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: '/api/rate-limits/login',
        payload: { maxRequests: 100, windowMs: 60000 },
      }),
    );
    expect(patchRes.statusCode).not.toBe(404);
    expect(patchRes.statusCode).toBeLessThan(500);
  });
});
