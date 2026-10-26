/**
 * Contract Tests — Phase 3B: 34. Insurance (/api/insurance-companies, /api/insurance-claims)
 *
 * Tests: #481–#493 from Phase 3B tracker
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

/* ── Insurance Companies ── */

describe('GET /api/insurance-companies', () => {
  it('#481 Happy: company list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/insurance-companies' }),
    );
    expectSuccess(res, 200);
  });
});

describe('GET /api/insurance-companies/:id', () => {
  it('#482 Happy: company detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/insurance-companies/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/insurance-companies/:id/stats', () => {
  it('#483 Happy: stats → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/insurance-companies/${FAKE_ID}/stats` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/insurance-companies', () => {
  it('#484 Happy: create → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/insurance-companies',
        payload: { name: 'Test Insurance Co', code: 'TIC-001' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/insurance-companies/:id', () => {
  it('#485 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/insurance-companies/${FAKE_ID}`,
        payload: { name: 'Updated Insurance' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/insurance-companies/:id', () => {
  it('#486 Happy: deactivate → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/insurance-companies/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

/* ── Insurance Claims ── */

describe('GET /api/insurance-claims', () => {
  it('#487 Happy: claim list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/insurance-claims' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/insurance-claims/aging', () => {
  it('#488 Happy: aging report → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/insurance-claims/aging' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/insurance-claims/:id', () => {
  it('#489 Happy: claim detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/insurance-claims/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/insurance-claims', () => {
  it('#490 Happy: create claim → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/insurance-claims',
        payload: { patientId: FAKE_ID, invoiceId: FAKE_ID, companyId: FAKE_ID, amount: 500 },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/insurance-claims/:id/status', () => {
  it('#491 Happy: update status → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/insurance-claims/${FAKE_ID}/status`,
        payload: { status: 'approved' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/insurance-claims/:id/documents', () => {
  it('#492 Happy: attach document → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: `/api/insurance-claims/${FAKE_ID}/documents`,
        payload: { name: 'claim.pdf', url: 'https://storage.example.com/claim.pdf' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/insurance-claims/:id/documents/:docId', () => {
  it('#493 Happy: remove document → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'DELETE',
        url: `/api/insurance-claims/${FAKE_ID}/documents/${FAKE_ID}`,
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
