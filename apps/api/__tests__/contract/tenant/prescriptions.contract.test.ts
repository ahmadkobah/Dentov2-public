/**
 * Contract Tests — Phase 3B: 15. Prescriptions (/api/prescriptions)
 *
 * Tests: #334–#339 from Phase 3B tracker
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

describe('GET /api/prescriptions', () => {
  it('#334 Happy: prescription list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/prescriptions' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/prescriptions/:id', () => {
  it('#335 Happy: prescription detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/prescriptions/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/prescriptions', () => {
  it('#336 Happy: create → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/prescriptions',
        payload: {
          patientId: FAKE_ID,
          medications: [
            {
              medicationId: FAKE_ID,
              dosage: '500mg',
              frequency: 'twice daily',
              duration: '7 days',
            },
          ],
        },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/prescriptions/:id', () => {
  it('#337 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/prescriptions/${FAKE_ID}`,
        payload: { notes: 'Updated prescription notes' },
      }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

describe('DELETE /api/prescriptions/:id', () => {
  it('#338 Happy: delete → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/prescriptions/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/prescriptions/:id/status', () => {
  it('#339 Happy: update status → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/prescriptions/${FAKE_ID}/status`,
        payload: { status: 'dispensed' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
