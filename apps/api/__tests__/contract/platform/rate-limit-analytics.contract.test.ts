/**
 * Contract Tests — 24. Rate Limit Analytics
 *
 * Tests: #175–#176 from Phase 3A tracker
 *
 * Rate-limit analytics routes are at /api/platform/analytics/rate-limits.
 * DELETE /rate-limits (clear) is at /api/rate-limits.
 */

import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  buildTestApp,
  teardownTestApp,
  cleanDatabase,
  destroyTestInfra,
} from '../helpers/build-app.js';
import { createPlatformUserAndToken } from '../helpers/auth.js';
import { expectSuccess, withAuth } from '../helpers/assertions.js';

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

// ── 1. GET /api/platform/analytics/rate-limits ──────────────

describe('GET /api/platform/analytics/rate-limits', () => {
  it('#175 Happy: rate limit analytics dashboard → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/analytics/rate-limits',
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 2. GET /api/platform/analytics/rate-limits/violations ───

describe('GET /api/platform/analytics/rate-limits/violations', () => {
  it('#176 Happy: rate limit violations → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/analytics/rate-limits/violations',
      }),
    );

    expectSuccess(res, 200);
  });
});
