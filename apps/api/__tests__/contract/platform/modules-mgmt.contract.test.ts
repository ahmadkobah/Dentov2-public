/**
 * Contract Tests — 20. Module Management (/api/platform/modules)
 *
 * Tests: #152–#155 from Phase 3A tracker
 * Error pattern: try/catch → 404/400/500 (no ZodError, no validation schemas)
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
import { expectSuccess, expectUnauthorized, withAuth } from '../helpers/assertions.js';
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

async function seedModule() {
  const Module =
    mongoose.models.Module ||
    mongoose.model('Module', new mongoose.Schema({}, { strict: false, collection: 'modules' }));

  return Module.create({
    slug: 'patient_records',
    name: { en: 'Patient Records' },
    description: { en: 'Core patient records module' },
    version: '1.0.0',
    type: 'core',
    status: 'active',
    isActive: true,
    changelog: [],
    dependsOn: [],
    conflictsWith: [],
  });
}

// ── 1. GET / ────────────────────────────────────────────────

describe('GET /api/platform/modules', () => {
  it('#152 Happy: list platform modules → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedModule();

    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/platform/modules' }));

    expectSuccess(res, 200);
  });

  it('#153 Auth: no token → 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/platform/modules',
    });

    expectUnauthorized(res);
  });
});

// ── 2. GET /stats ───────────────────────────────────────────

describe('GET /api/platform/modules/stats', () => {
  it('#154 Happy: module stats → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/modules/stats',
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 3. GET /:slug ───────────────────────────────────────────

describe('GET /api/platform/modules/:slug', () => {
  it('#155 Happy: get module detail → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedModule();

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/modules/patient_records',
      }),
    );

    expectSuccess(res, 200);
  });
});
