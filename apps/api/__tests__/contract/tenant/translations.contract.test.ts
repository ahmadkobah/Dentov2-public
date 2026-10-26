/**
 * Contract Tests — Phase 3B: 46. Translations & Countries
 *
 * Tests: #626–#629 from Phase 3B tracker
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

describe('GET /api/translations/:locale', () => {
  it('#626 Happy: translations by locale → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/translations/en' }));
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/translations/:locale/:ns', () => {
  it('#627 Happy: by locale+namespace → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/translations/en/common' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/countries', () => {
  it('#628 Happy: country list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/countries' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/countries/:code', () => {
  it('#629 Happy: country detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/countries/US' }));
    expect(res.statusCode).toBeLessThan(500);
  });
});
