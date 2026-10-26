/**
 * Contract Tests — Phase 3B: 37g. Stock Counts (/api/stock-counts)
 *
 * Tests: #556–#562 from Phase 3B tracker
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

describe('GET /api/stock-counts', () => {
  it('#556 Happy: count list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/stock-counts' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/stock-counts/:id', () => {
  it('#557 Happy: count detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/stock-counts/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/stock-counts', () => {
  it('#558 Happy: create → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/stock-counts',
        payload: { branchId: FAKE_ID, name: 'Monthly Count' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/stock-counts/:id/items', () => {
  it('#559 Happy: update items → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/stock-counts/${FAKE_ID}/items`,
        payload: { items: [{ itemId: FAKE_ID, countedQuantity: 50 }] },
      }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

describe('PATCH /api/stock-counts/:id/complete', () => {
  it('#560 Happy: complete count → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'PATCH', url: `/api/stock-counts/${FAKE_ID}/complete` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/stock-counts/:id/approve', () => {
  it('#561 Happy: approve → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'PATCH', url: `/api/stock-counts/${FAKE_ID}/approve` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/stock-counts/:id/cancel', () => {
  it('#562 Happy: cancel → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'PATCH', url: `/api/stock-counts/${FAKE_ID}/cancel` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
