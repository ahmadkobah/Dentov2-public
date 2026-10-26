/**
 * Contract Tests — 23. Rate Limits (/api/platform/rate-limits)
 *
 * Tests: #170–#174 from Phase 3A tracker
 * Error pattern: No try/catch → ZodError → 422
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
import { expectSuccess, expectError, withAuth } from '../helpers/assertions.js';

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

// ── 1. GET / ────────────────────────────────────────────────

describe('GET /api/rate-limits', () => {
  it('#170 Happy: list rate limit tiers → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/rate-limits',
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 2. PATCH /:tier ─────────────────────────────────────────

describe('PATCH /api/rate-limits/:tier', () => {
  it('#171 Happy: update rate limit tier → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: '/api/rate-limits/global',
        payload: {
          max: 200,
          timeWindow: '1 minute',
        },
      }),
    );

    expectSuccess(res, 200);
  });

  it('#172 Validation: invalid tier → 422', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: '/api/rate-limits/invalid-tier',
        payload: {
          max: 200,
          timeWindow: '1 minute',
        },
      }),
    );

    // ZodError on tier enum → 422
    expectError(res, 422);
  });
});

// ── 3. POST /check ──────────────────────────────────────────

describe('POST /api/rate-limits/check', () => {
  it('#173 Happy: check rate limit status → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/rate-limits/check',
        payload: { key: '127.0.0.1' },
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 4. GET /stats ───────────────────────────────────────────

describe('GET /api/rate-limits/stats', () => {
  it('#174 Happy: rate limit stats → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/rate-limits/stats',
      }),
    );

    expectSuccess(res, 200);
  });
});
