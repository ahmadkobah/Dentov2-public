/**
 * Contract Tests — Phase 3B: 14. Medications (/api/medications)
 *
 * Tests: #327–#333 from Phase 3B tracker
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

describe('GET /api/medications', () => {
  it('#327 Happy: medication list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/medications' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/medications/autocomplete', () => {
  it('#328 Happy: autocomplete search → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/medications/autocomplete?q=amox' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/medications/:id', () => {
  it('#329 Happy: medication detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/medications/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/medications', () => {
  it('#330 Happy: create → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/medications',
        payload: { name: 'Amoxicillin', dosageForm: 'capsule', strength: '500mg' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/medications/:id', () => {
  it('#331 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/medications/${FAKE_ID}`,
        payload: { name: 'Amoxicillin Updated' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/medications/:id', () => {
  it('#332 Happy: delete → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/medications/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/medications/:id/activation', () => {
  it('#333 Happy: toggle activation → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/medications/${FAKE_ID}/activation`,
        payload: { isActive: false },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
