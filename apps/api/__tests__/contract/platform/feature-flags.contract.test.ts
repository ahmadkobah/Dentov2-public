/**
 * Contract Tests — 18. Feature Flags (/api/platform/feature-flags)
 *
 * Tests: #143–#149 from Phase 3A tracker
 * Error pattern: try/catch re-throws ZodError → 422
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
import { expectSuccess, expectError, expectUnauthorized, withAuth } from '../helpers/assertions.js';
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

async function seedFeatureFlag() {
  const FeatureFlag =
    mongoose.models.FeatureFlag ||
    mongoose.model(
      'FeatureFlag',
      new mongoose.Schema({}, { strict: false, collection: 'feature_flags' }),
    );

  return FeatureFlag.create({
    key: 'new_dashboard_ui',
    name: 'New Dashboard UI',
    description: 'Enable the redesigned dashboard',
    enabled: false,
    percentageRollout: null,
    tenantId: null,
    userIds: null,
    conditions: null,
    value: null,
  });
}

// ── 1. GET / ────────────────────────────────────────────────

describe('GET /api/platform/feature-flags', () => {
  it('#143 Happy: paginated feature flags → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedFeatureFlag();

    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/platform/feature-flags' }),
    );

    expectSuccess(res, 200);
  });

  it('#144 Auth: no token → 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/platform/feature-flags',
    });

    expectUnauthorized(res);
  });
});

// ── 2. POST / ───────────────────────────────────────────────

describe('POST /api/platform/feature-flags', () => {
  it('#145 Happy: create feature flag → 201', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/platform/feature-flags',
        payload: {
          key: 'beta_reports',
          name: 'Beta Reports',
          description: 'Enable beta reporting features',
          enabled: false,
        },
      }),
    );

    expectSuccess(res, 201);
  });

  it('#146 Validation: invalid key format → 422', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/platform/feature-flags',
        payload: {
          key: 'Invalid-KEY!',
          name: 'Bad Flag',
        },
      }),
    );

    // ZodError re-thrown → 422
    expectError(res, 422);
  });
});

// ── 3. PATCH /:id ───────────────────────────────────────────

describe('PATCH /api/platform/feature-flags/:id', () => {
  it('#147 Happy: update feature flag → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const flag = await seedFeatureFlag();

    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/platform/feature-flags/${flag._id}`,
        payload: { name: 'Updated Dashboard UI', enabled: true },
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 4. PATCH /:id/toggle ───────────────────────────────────

describe('PATCH /api/platform/feature-flags/:id/toggle', () => {
  it('#148 Happy: toggle feature flag → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const flag = await seedFeatureFlag();

    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/platform/feature-flags/${flag._id}/toggle`,
        payload: { enabled: true },
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 5. DELETE /:id ──────────────────────────────────────────

describe('DELETE /api/platform/feature-flags/:id', () => {
  it('#149 Happy: delete feature flag → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const flag = await seedFeatureFlag();

    const res = await app.inject(
      withAuth(token, {
        method: 'DELETE',
        url: `/api/platform/feature-flags/${flag._id}`,
      }),
    );

    expectSuccess(res, 200);
  });
});
