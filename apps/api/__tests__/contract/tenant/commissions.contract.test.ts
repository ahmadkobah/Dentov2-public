/**
 * Contract Tests — Phase 3B: 36. Commissions (/api/commissions)
 *
 * Tests: #502–#508 from Phase 3B tracker
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

describe('GET /api/commissions', () => {
  it('#502 Happy: commission list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/commissions' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/commissions/payouts', () => {
  it('#503 Happy: payout list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/commissions/payouts' }),
    );
    expectSuccess(res, 200);
  });
});

describe('GET /api/commissions/summary/:doctorId', () => {
  it('#504 Happy: doctor summary → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/commissions/summary/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/commissions/:id', () => {
  it('#505 Happy: commission detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/commissions/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/commissions/calculate/:invoiceId', () => {
  it('#506 Happy: calculate commission → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'POST', url: `/api/commissions/calculate/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/commissions/approve', () => {
  it('#507 Happy: approve commissions → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: '/api/commissions/approve',
        payload: { commissionIds: [FAKE_ID] },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/commissions/payouts', () => {
  it('#508 Happy: create payout → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/commissions/payouts',
        payload: { doctorId: FAKE_ID, commissionIds: [FAKE_ID] },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
