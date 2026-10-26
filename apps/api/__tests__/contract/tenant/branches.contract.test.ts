/**
 * Contract Tests — Phase 3B: 29. Branches (/api/branches)
 *
 * Tests: #445–#451 from Phase 3B tracker
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

describe('GET /api/branches', () => {
  it('#445 Happy: list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/branches' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/branches/active', () => {
  it('#446 Happy: active branches → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/branches/active' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/branches/:id', () => {
  it('#447 Happy: detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/branches/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/branches', () => {
  it('#448 Happy: create → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/branches',
        payload: { name: 'Test Branch', address: '123 Main St' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/branches/:id', () => {
  it('#449 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/branches/${FAKE_ID}`,
        payload: { name: 'Updated Branch' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/branches/:id/toggle', () => {
  it('#450 Happy: toggle active → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'PATCH', url: `/api/branches/${FAKE_ID}/toggle` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/branches/:id/ramadan', () => {
  it('#451 Happy: ramadan schedule → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/branches/${FAKE_ID}/ramadan`,
        payload: { enabled: true },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
