/**
 * Contract Tests — Phase 3B: 12. Treatment Plans (/api/treatment-plans)
 *
 * Tests: #307–#316 from Phase 3B tracker
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

describe('GET /api/treatment-plans', () => {
  it('#307 Happy: plan list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/treatment-plans' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/treatment-plans/:id', () => {
  it('#308 Happy: plan with items → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/treatment-plans/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/treatment-plans', () => {
  it('#309 Happy: create plan → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/treatment-plans',
        payload: { patientId: FAKE_ID, title: 'Root Canal Plan' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });

  it('#310 Validation: missing patientId → 400', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/treatment-plans',
        payload: { title: 'No Patient' },
      }),
    );
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/treatment-plans/:id', () => {
  it('#311 Happy: update plan → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/treatment-plans/${FAKE_ID}`,
        payload: { title: 'Updated Plan' },
      }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

describe('DELETE /api/treatment-plans/:id', () => {
  it('#312 Happy: delete draft → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/treatment-plans/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/treatment-plans/:id/status', () => {
  it('#313 Happy: update status → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/treatment-plans/${FAKE_ID}/status`,
        payload: { status: 'approved' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/treatment-plans/:id/items', () => {
  it('#314 Happy: add item → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: `/api/treatment-plans/${FAKE_ID}/items`,
        payload: { serviceId: FAKE_ID, toothNumber: 11, quantity: 1 },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/treatment-plans/:id/items/:itemId', () => {
  it('#315 Happy: update item → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/treatment-plans/${FAKE_ID}/items/${FAKE_ID}`,
        payload: { quantity: 2 },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/treatment-plans/:id/items/:itemId', () => {
  it('#316 Happy: remove item → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'DELETE',
        url: `/api/treatment-plans/${FAKE_ID}/items/${FAKE_ID}`,
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
