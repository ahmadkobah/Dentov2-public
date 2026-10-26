/**
 * Contract Tests — Phase 3B: 25. Consent Templates & Forms (/api/consent-templates, /api/consent-forms)
 *
 * Tests: #406–#414 from Phase 3B tracker
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

// ── Consent Templates ──

describe('GET /api/consent-templates', () => {
  it('#406 Happy: template list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/consent-templates' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/consent-templates/:id', () => {
  it('#407 Happy: template detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/consent-templates/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/consent-templates', () => {
  it('#408 Happy: create → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/consent-templates',
        payload: { name: 'General Consent', content: 'I consent to treatment...' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/consent-templates/:id', () => {
  it('#409 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/consent-templates/${FAKE_ID}`,
        payload: { name: 'Updated Consent' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/consent-templates/:id', () => {
  it('#410 Happy: delete → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/consent-templates/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

// ── Consent Forms ──

describe('GET /api/consent-forms', () => {
  it('#411 Happy: form list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/consent-forms' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/consent-forms/:id', () => {
  it('#412 Happy: form detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/consent-forms/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/consent-forms', () => {
  it('#413 Happy: create → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/consent-forms',
        payload: { templateId: FAKE_ID, patientId: FAKE_ID },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/consent-forms/patient/:patientId', () => {
  it('#414 Happy: patient forms → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/consent-forms/patient/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
