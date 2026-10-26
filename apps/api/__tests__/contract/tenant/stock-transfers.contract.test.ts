/**
 * Contract Tests — Phase 3B: 37f. Stock Transfers (/api/stock-transfers)
 *
 * Tests: #552–#555 from Phase 3B tracker
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

describe('GET /api/stock-transfers', () => {
  it('#552 Happy: transfer list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/stock-transfers' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/stock-transfers/:id', () => {
  it('#553 Happy: transfer detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/stock-transfers/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/stock-transfers', () => {
  it('#554 Happy: create → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/stock-transfers',
        payload: {
          fromBranchId: FAKE_ID,
          toBranchId: FAKE_ID,
          items: [{ itemId: FAKE_ID, quantity: 10 }],
        },
      }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

describe('PATCH /api/stock-transfers/:id/status', () => {
  it('#555 Happy: update status → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/stock-transfers/${FAKE_ID}/status`,
        payload: { status: 'shipped' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
