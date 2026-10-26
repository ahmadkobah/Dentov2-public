/**
 * Contract Tests — Phase 3B: 48b. Reports (/api/reports)
 *
 * Tests: #641–#657 from Phase 3B tracker
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

// ── Report Catalog ──────────────────────────────────────────────

describe('GET /api/reports/catalog', () => {
  it('#641 Happy: report catalog → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/reports/catalog' }));
    expectSuccess(res, 200);
  });
});

// ── Report Data ─────────────────────────────────────────────────

describe('GET /api/reports/financial/:type', () => {
  it('#642 Happy: financial report → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/reports/financial/revenue' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/reports/patients/:type', () => {
  it('#643 Happy: patient report → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/reports/patients/demographics' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/reports/appointments/:type', () => {
  it('#644 Happy: appointment report → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/reports/appointments/summary' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/reports/clinical/:type', () => {
  it('#645 Happy: clinical report → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/reports/clinical/procedures' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/reports/operational/:type', () => {
  it('#646 Happy: operational report → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/reports/operational/utilization' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/reports/inventory/:type', () => {
  it('#647 Happy: inventory report → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/reports/inventory/usage' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/reports/export', () => {
  it('#648 Happy: export report → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/reports/export',
        payload: { reportType: 'financial', type: 'revenue', format: 'csv' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

// ── Saved Reports ───────────────────────────────────────────────

describe('GET /api/reports/saved', () => {
  it('#649 Happy: saved report list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/reports/saved' }));
    expectSuccess(res, 200);
  });
});

describe('POST /api/reports/saved', () => {
  it('#650 Happy: save report → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/reports/saved',
        payload: { name: 'Monthly Revenue', reportType: 'financial', type: 'revenue', filters: {} },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/reports/saved/:id', () => {
  it('#651 Happy: delete saved → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/reports/saved/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

// ── Scheduled Reports ───────────────────────────────────────────

describe('GET /api/reports/scheduled', () => {
  it('#652 Happy: scheduled list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/reports/scheduled' }));
    expectSuccess(res, 200);
  });
});

describe('POST /api/reports/scheduled', () => {
  it('#653 Happy: create schedule → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/reports/scheduled',
        payload: {
          name: 'Weekly Revenue',
          reportType: 'financial',
          type: 'revenue',
          schedule: 'weekly',
          recipients: ['admin@clinic.com'],
        },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/reports/scheduled/:id', () => {
  it('#654 Happy: update schedule → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/reports/scheduled/${FAKE_ID}`,
        payload: { schedule: 'monthly' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/reports/scheduled/:id', () => {
  it('#655 Happy: delete schedule → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/reports/scheduled/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/reports/scheduled/:id/run', () => {
  it('#656 Happy: run scheduled → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'POST', url: `/api/reports/scheduled/${FAKE_ID}/run` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

// ── Report History ──────────────────────────────────────────────

describe('GET /api/reports/history', () => {
  it('#657 Happy: report history → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/reports/history' }));
    expectSuccess(res, 200);
  });
});
