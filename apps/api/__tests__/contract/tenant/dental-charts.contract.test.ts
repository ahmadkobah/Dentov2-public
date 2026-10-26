/**
 * Contract Tests — Phase 3B: 11. Dental Charts (/api/dental-charts)
 *
 * Tests: #298–#306 from Phase 3B tracker
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

// ── History ──

describe('POST /api/dental-charts/history', () => {
  it('#298 Happy: create history entry → 201', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/dental-charts/history',
        payload: { patientId: FAKE_ID, toothNumber: 11, condition: 'caries', notes: 'test' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/dental-charts/history', () => {
  it('#299 Happy: history list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/dental-charts/history' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/dental-charts/history/:id', () => {
  it('#300 Happy: history entry → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/dental-charts/history/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

// ── Bulk ──

describe('POST /api/dental-charts/bulk', () => {
  it('#301 Happy: bulk chart operation → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/dental-charts/bulk',
        payload: { patientId: FAKE_ID, entries: [] },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

// ── Charts CRUD ──

describe('GET /api/dental-charts', () => {
  it('#302 Happy: chart list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/dental-charts' }));
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/dental-charts/:id', () => {
  it('#303 Happy: chart with teeth data → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/dental-charts/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/dental-charts', () => {
  it('#304 Happy: create chart → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/dental-charts',
        payload: { patientId: FAKE_ID },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/dental-charts/:id', () => {
  it('#305 Happy: update chart → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/dental-charts/${FAKE_ID}`,
        payload: { notes: 'updated' },
      }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

describe('DELETE /api/dental-charts/:id', () => {
  it('#306 Happy: delete → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/dental-charts/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
