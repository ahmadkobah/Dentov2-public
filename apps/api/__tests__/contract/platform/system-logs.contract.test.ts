/**
 * Contract Tests — 13. System Logs (/api/platform/system-logs)
 *
 * Tests: #111–#112 from Phase 3A tracker
 * Error pattern: try/catch re-throws ZodError → 422 (global handler)
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

// ── 1. GET / ────────────────────────────────────────────────

describe('GET /api/platform/system-logs', () => {
  it('#111 Happy: paginated system logs → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/platform/system-logs' }),
    );

    expectPaginated(res);
  });
});

// ── 2. GET /stats ───────────────────────────────────────────

describe('GET /api/platform/system-logs/stats', () => {
  it('#112 Happy: system log stats → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/system-logs/stats?hours=24',
      }),
    );

    expectSuccess(res, 200);
  });
});
