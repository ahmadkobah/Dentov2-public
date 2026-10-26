/**
 * Contract Tests — Phase 3B: 35. Installments (/api/installments)
 *
 * Tests: #494–#501 from Phase 3B tracker
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

describe('GET /api/installments', () => {
  it('#494 Happy: list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/installments' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/installments/overdue', () => {
  it('#495 Happy: overdue list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/installments/overdue' }),
    );
    expectSuccess(res, 200);
  });
});

describe('GET /api/installments/:id', () => {
  it('#496 Happy: detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/installments/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/installments', () => {
  it('#497 Happy: create → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/installments',
        payload: { patientId: FAKE_ID, invoiceId: FAKE_ID, totalAmount: 1000, numberOfPayments: 4 },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/installments/:id', () => {
  it('#498 Happy: update plan → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/installments/${FAKE_ID}`,
        payload: { numberOfPayments: 6 },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/installments/:id/payments/:number', () => {
  it('#499 Happy: make payment → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: `/api/installments/${FAKE_ID}/payments/1`,
        payload: { amount: 250, method: 'cash' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/installments/:id/payments/:number/waive', () => {
  it('#500 Happy: waive payment → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/installments/${FAKE_ID}/payments/1/waive`,
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/installments/:id/cancel', () => {
  it('#501 Happy: cancel plan → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/installments/${FAKE_ID}/cancel`,
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
