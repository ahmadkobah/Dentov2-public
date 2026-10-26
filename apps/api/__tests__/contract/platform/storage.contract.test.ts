/**
 * Contract Tests — 19. Storage (/api/platform/storage)
 *
 * Tests: #150–#151 from Phase 3A tracker
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

// ── 1. GET /stats ───────────────────────────────────────────

describe('GET /api/platform/storage/stats', () => {
  it('#150 Happy: storage stats → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/storage/stats',
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 2. GET /tenants ─────────────────────────────────────────

describe('GET /api/platform/storage/tenants', () => {
  it('#151 Happy: storage by tenant → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/storage/tenants',
      }),
    );

    expectSuccess(res, 200);
  });
});
