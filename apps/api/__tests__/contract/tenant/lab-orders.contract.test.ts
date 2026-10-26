/**
 * Contract Tests — Phase 3B: 21. Lab Orders (/api/lab-orders)
 *
 * Tests: #379–#384 from Phase 3B tracker
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

describe('GET /api/lab-orders', () => {
  it('#379 Happy: order list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/lab-orders' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/lab-orders/stats', () => {
  it('#380 Happy: stats → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/lab-orders/stats' }));
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/lab-orders/:id', () => {
  it('#381 Happy: order detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/lab-orders/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/lab-orders', () => {
  it('#382 Happy: create → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/lab-orders',
        payload: {
          patientId: FAKE_ID,
          labId: FAKE_ID,
          typeId: FAKE_ID,
          description: 'Crown fabrication',
        },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/lab-orders/:id', () => {
  it('#383 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/lab-orders/${FAKE_ID}`,
        payload: { description: 'Updated description' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/lab-orders/:id/status', () => {
  it('#384 Happy: update status → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/lab-orders/${FAKE_ID}/status`,
        payload: { status: 'in_progress' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
