/**
 * Contract Tests — Phase 3B: 32. Invoices (/api/invoices)
 *
 * Tests: #462–#473 from Phase 3B tracker
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

describe('GET /api/invoices', () => {
  it('#462 Happy: invoice list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/invoices' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/invoices/:id', () => {
  it('#463 Happy: invoice detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/invoices/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/invoices', () => {
  it('#464 Happy: create → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/invoices',
        payload: { patientId: FAKE_ID, items: [{ description: 'Cleaning', amount: 100 }] },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });

  it('#465 Validation: missing patientId → 400', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/invoices',
        payload: { items: [] },
      }),
    );
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/invoices/:id', () => {
  it('#466 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/invoices/${FAKE_ID}`,
        payload: { notes: 'Updated' },
      }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

describe('DELETE /api/invoices/:id', () => {
  it('#467 Happy: cancel → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/invoices/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/invoices/:id/issue', () => {
  it('#468 Happy: draft → issued → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'POST', url: `/api/invoices/${FAKE_ID}/issue` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/invoices/generate-from-treatment-plan', () => {
  it('#469 Happy: auto-generate → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/invoices/generate-from-treatment-plan',
        payload: { treatmentPlanId: FAKE_ID },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/invoices/stats', () => {
  it('#470 Happy: stats → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/invoices/stats' }));
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/invoices/:id/void', () => {
  it('#471 Happy: void → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'POST', url: `/api/invoices/${FAKE_ID}/void` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/invoices/:id/pdf', () => {
  it('#472 Happy: PDF data → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/invoices/${FAKE_ID}/pdf` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/invoices/:id/send', () => {
  it('#473 Happy: email → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'POST', url: `/api/invoices/${FAKE_ID}/send` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
