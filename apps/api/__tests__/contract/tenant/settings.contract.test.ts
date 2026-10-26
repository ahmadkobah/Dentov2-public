/**
 * Contract Tests — Phase 3B: 41. Settings (/api/settings)
 *
 * Tests: #599–#600 from Phase 3B tracker
 */

import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  buildTestApp,
  teardownTestApp,
  cleanDatabase,
  destroyTestInfra,
} from '../helpers/build-app.js';
import { createTenantUserAndToken } from '../helpers/auth.js';
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

describe('GET /api/settings/general', () => {
  it('#599 Happy: general settings → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/settings/general' }));
    expectSuccess(res, 200);
  });
});

describe('PATCH /api/settings/general', () => {
  it('#600 Happy: update settings → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: '/api/settings/general',
        payload: { language: 'en' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
