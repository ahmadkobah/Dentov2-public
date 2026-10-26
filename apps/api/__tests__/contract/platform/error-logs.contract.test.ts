/**
 * Contract Tests — 9. Error Logs (/api/platform/error-logs)
 *
 * Tests: #86–#93 from Phase 3A tracker
 * Error pattern: No try/catch → ZodError → 422 (global handler)
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
import {
  expectSuccess,
  expectPaginated,
  expectError,
  expectUnauthorized,
  withAuth,
} from '../helpers/assertions.js';
import mongoose from 'mongoose';

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

async function seedErrorLog() {
  const ErrorLog =
    mongoose.models.ErrorLog ||
    mongoose.model(
      'ErrorLog',
      new mongoose.Schema({}, { strict: false, collection: 'error_logs' }),
    );

  return ErrorLog.create({
    fingerprint: `fp_${Date.now()}`,
    level: 'error',
    message: 'Test error message',
    source: 'api',
    occurrences: 1,
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    resolved: false,
  });
}

// ── 1. GET / ────────────────────────────────────────────────

describe('GET /api/platform/error-logs', () => {
  it('#86 Happy: paginated list → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedErrorLog();

    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/platform/error-logs' }),
    );

    expectPaginated(res);
  });

  it('#87 Auth: no token → 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/platform/error-logs',
    });

    expectUnauthorized(res);
  });

  it('#88 Filters: query params → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/error-logs?source=api&level=error&resolved=false&page=1&limit=10',
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 2. GET /stats ───────────────────────────────────────────

describe('GET /api/platform/error-logs/stats', () => {
  it('#89 Happy: stats with hours param → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/error-logs/stats?hours=48',
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 3. POST / (ingest) ─────────────────────────────────────

describe('POST /api/platform/error-logs', () => {
  it('#90 Happy: ingest error log → 201', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/platform/error-logs',
        payload: {
          level: 'error',
          message: 'Unexpected null reference in patient module',
          source: 'api',
        },
      }),
    );

    expectSuccess(res, 201);
  });

  it('#91 Validation: missing required fields → 422', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/platform/error-logs',
        payload: {},
      }),
    );

    // No try/catch → ZodError → global handler → 422
    expectError(res, 422);
  });
});

// ── 4. GET /:id ─────────────────────────────────────────────

describe('GET /api/platform/error-logs/:id', () => {
  it('#92 Happy: get error log by ID → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const log = await seedErrorLog();

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: `/api/platform/error-logs/${log._id}`,
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 5. PATCH /:id/resolve ───────────────────────────────────

describe('PATCH /api/platform/error-logs/:id/resolve', () => {
  it('#93 Happy: resolve error log → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const log = await seedErrorLog();

    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/platform/error-logs/${log._id}/resolve`,
      }),
    );

    expectSuccess(res, 200);
  });
});
