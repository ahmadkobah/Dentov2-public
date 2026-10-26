/**
 * Contract Tests — Phase 3B: 37c. Inventory Stock (/api/inventory-stock)
 *
 * Tests: #526–#536 from Phase 3B tracker
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

describe('GET /api/inventory-stock/branch/:branchId', () => {
  it('#526 Happy: branch stock → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/inventory-stock/branch/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/inventory-stock/item/:itemId', () => {
  it('#527 Happy: item stock → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/inventory-stock/item/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/inventory-stock/branch/:branchId/summary', () => {
  it('#528 Happy: branch summary → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/inventory-stock/branch/${FAKE_ID}/summary` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/inventory-stock/branch/:branchId/expiry-dashboard', () => {
  it('#529 Happy: expiry dashboard → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: `/api/inventory-stock/branch/${FAKE_ID}/expiry-dashboard`,
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/inventory-stock/expiring', () => {
  it('#530 Happy: all expiring → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/inventory-stock/expiring' }),
    );
    expectSuccess(res, 200);
  });
});

describe('POST /api/inventory-stock/:stockId/dispose/:batchNumber', () => {
  it('#531 Happy: dispose batch → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: `/api/inventory-stock/${FAKE_ID}/dispose/BATCH001`,
        payload: { reason: 'Expired' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/inventory-stock/bulk-dispose', () => {
  it('#532 Happy: bulk dispose → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/inventory-stock/bulk-dispose',
        payload: { items: [{ stockId: FAKE_ID, batchNumber: 'BATCH001', reason: 'Expired' }] },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/inventory-stock/reserve', () => {
  it('#533 Happy: reserve stock → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/inventory-stock/reserve',
        payload: { stockId: FAKE_ID, quantity: 5 },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/inventory-stock/unreserve', () => {
  it('#534 Happy: unreserve stock → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/inventory-stock/unreserve',
        payload: { stockId: FAKE_ID, quantity: 5 },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/inventory-stock/:stockId/recalculate', () => {
  it('#535 Happy: recalculate → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'POST', url: `/api/inventory-stock/${FAKE_ID}/recalculate` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/inventory-stock/branch/:branchId/report', () => {
  it('#536 Happy: stock report → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/inventory-stock/branch/${FAKE_ID}/report` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
