/**
 * Contract Tests — Phase 3B: 37b. Inventory Items (/api/inventory-items)
 *
 * Tests: #515–#525 from Phase 3B tracker
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

describe('GET /api/inventory-items', () => {
  it('#515 Happy: item list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/inventory-items' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/inventory-items/low-stock', () => {
  it('#516 Happy: low stock items → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/inventory-items/low-stock' }),
    );
    expectSuccess(res, 200);
  });
});

describe('GET /api/inventory-items/:id', () => {
  it('#517 Happy: item detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/inventory-items/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/inventory-items', () => {
  it('#518 Happy: create → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/inventory-items',
        payload: { name: 'Dental Gloves', sku: 'DG-001', categoryId: FAKE_ID },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/inventory-items/:id', () => {
  it('#519 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/inventory-items/${FAKE_ID}`,
        payload: { name: 'Updated Gloves' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/inventory-items/:id', () => {
  it('#520 Happy: delete → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/inventory-items/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/inventory-items/:id/restore', () => {
  it('#521 Happy: restore → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'PATCH', url: `/api/inventory-items/${FAKE_ID}/restore` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/inventory-items/:id/stock', () => {
  it('#522 Happy: stock levels → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/inventory-items/${FAKE_ID}/stock` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/inventory-items/:id/stock/adjust', () => {
  it('#523 Happy: adjust stock → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: `/api/inventory-items/${FAKE_ID}/stock/adjust`,
        payload: { quantity: 10, reason: 'Restock', branchId: FAKE_ID },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/inventory-items/barcode/search', () => {
  it('#524 Happy: barcode search → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/inventory-items/barcode/search',
        payload: { barcode: '1234567890' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/inventory-items/:id/movements', () => {
  it('#525 Happy: stock movements → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/inventory-items/${FAKE_ID}/movements` }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});
