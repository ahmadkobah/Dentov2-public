/**
 * Contract Tests — Phase 3B: 17. X-Ray Types (/api/xray-types)
 *
 * Tests: #350–#354 from Phase 3B tracker
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

const FAKE_ID = '000000000000000000000000';

describe('GET /api/xray-types', () => {
  it('#350 Happy: type list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/xray-types' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/xray-types/:id', () => {
  it('#351 Happy: type detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/xray-types/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/xray-types', () => {
  it('#352 Happy: create → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/xray-types',
        payload: { name: 'Panoramic', code: 'PAN' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/xray-types/:id', () => {
  it('#353 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/xray-types/${FAKE_ID}`,
        payload: { name: 'Periapical' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/xray-types/:id', () => {
  it('#354 Happy: delete → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/xray-types/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
