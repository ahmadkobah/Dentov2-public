/**
 * Contract Tests — 14. Deployments (/api/platform/deployments)
 *
 * Tests: #113–#116 from Phase 3A tracker
 * Error pattern: GET /, try/catch re-throw ZodError → 422; others catch {} → 500
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

async function seedDeployment() {
  const Deployment =
    mongoose.models.Deployment ||
    mongoose.model(
      'Deployment',
      new mongoose.Schema({}, { strict: false, collection: 'deployments' }),
    );

  return Deployment.create({
    app: 'api',
    version: '1.0.0',
    commitSha: 'abc123def456',
    branch: 'main',
    status: 'success',
    triggeredBy: new mongoose.Types.ObjectId(),
    provider: 'railway',
    environment: 'production',
    startedAt: new Date(Date.now() - 60000),
    completedAt: new Date(),
    duration: 60000,
  });
}

// ── 1. GET / ────────────────────────────────────────────────

describe('GET /api/platform/deployments', () => {
  it('#113 Happy: paginated deployment list → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedDeployment();

    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/platform/deployments' }),
    );

    expectPaginated(res);
  });
});

// ── 2. GET /stats ───────────────────────────────────────────

describe('GET /api/platform/deployments/stats', () => {
  it('#114 Happy: deployment stats → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/deployments/stats',
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 3. GET /:id ─────────────────────────────────────────────

describe('GET /api/platform/deployments/:id', () => {
  it('#115 Happy: get deployment by ID → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const deployment = await seedDeployment();

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: `/api/platform/deployments/${deployment._id}`,
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 4. POST /:id/rollback ──────────────────────────────────

describe('POST /api/platform/deployments/:id/rollback', () => {
  it('#116 Happy: rollback deployment → 201', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const deployment = await seedDeployment();

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: `/api/platform/deployments/${deployment._id}/rollback`,
      }),
    );

    expectSuccess(res, 201);
  });
});
