/**
 * Contract Tests — Phase 3B: 27. Doctors (/api/doctors)
 *
 * Tests: #428–#432 from Phase 3B tracker
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

describe('GET /api/doctors', () => {
  it('#428 Happy: doctor list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/doctors' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/doctors/specializations', () => {
  it('#429 Happy: specialization list → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/doctors/specializations' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/doctors/:id', () => {
  it('#430 Happy: doctor detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/doctors/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/doctors/:id', () => {
  it('#431 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/doctors/${FAKE_ID}`,
        payload: { specialization: 'orthodontics' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/doctors/:id/toggle', () => {
  it('#432 Happy: toggle active → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'PATCH', url: `/api/doctors/${FAKE_ID}/toggle` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
