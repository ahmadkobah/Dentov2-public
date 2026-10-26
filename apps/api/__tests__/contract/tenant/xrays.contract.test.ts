/**
 * Contract Tests — Phase 3B: 16. X-Rays (/api/xrays)
 *
 * Tests: #340–#349 from Phase 3B tracker
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

describe('GET /api/xrays', () => {
  it('#340 Happy: x-ray list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/xrays' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/xrays/patient/:patientId/timeline', () => {
  it('#341 Happy: imaging timeline → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/xrays/patient/${FAKE_ID}/timeline` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/xrays/patient/:patientId/tooth/:num', () => {
  it('#342 Happy: x-rays by tooth → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/xrays/patient/${FAKE_ID}/tooth/11` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/xrays/patient/:patientId/unlinked', () => {
  it('#343 Happy: unlinked x-rays → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/xrays/patient/${FAKE_ID}/unlinked` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/xrays/:id', () => {
  it('#344 Happy: x-ray detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: `/api/xrays/${FAKE_ID}` }));
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/xrays', () => {
  it('#345 Happy: create → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/xrays',
        payload: { patientId: FAKE_ID, typeId: FAKE_ID, imageUrl: 'https://example.com/xray.jpg' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/xrays/:id', () => {
  it('#346 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/xrays/${FAKE_ID}`,
        payload: { notes: 'Updated notes' },
      }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

describe('DELETE /api/xrays/:id', () => {
  it('#347 Happy: delete → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/xrays/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/xrays/:id/link', () => {
  it('#348 Happy: link to plan → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: `/api/xrays/${FAKE_ID}/link`,
        payload: { treatmentPlanId: FAKE_ID },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/xrays/:id/unlink', () => {
  it('#349 Happy: unlink → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: `/api/xrays/${FAKE_ID}/unlink`,
        payload: { treatmentPlanId: FAKE_ID },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
