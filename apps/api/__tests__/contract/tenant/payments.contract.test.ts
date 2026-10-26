/**
 * Contract Tests — Phase 3B: 33. Payments (/api/tenant-payments)
 *
 * Tests: #474–#480 from Phase 3B tracker
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

describe('GET /api/tenant-payments', () => {
  it('#474 Happy: payment list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/tenant-payments' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/tenant-payments/:id', () => {
  it('#475 Happy: payment detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/tenant-payments/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/tenant-payments', () => {
  it('#476 Happy: record payment → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/tenant-payments',
        payload: { invoiceId: FAKE_ID, amount: 100, method: 'cash' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/tenant-payments/:id/refund', () => {
  it('#477 Happy: refund → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: `/api/tenant-payments/${FAKE_ID}/refund`,
        payload: { amount: 50, reason: 'Overcharge' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/tenant-payments/reconciliation', () => {
  it('#478 Happy: reconciliation list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/tenant-payments/reconciliation' }),
    );
    expectSuccess(res, 200);
  });
});

describe('POST /api/tenant-payments/reconciliation', () => {
  it('#479 Happy: open reconciliation → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/tenant-payments/reconciliation',
        payload: { date: '2025-01-01' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/tenant-payments/reconciliation/:id', () => {
  it('#480 Happy: close → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/tenant-payments/reconciliation/${FAKE_ID}`,
        payload: { status: 'closed' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
