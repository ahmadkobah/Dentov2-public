/**
 * Contract Tests — Phase 3B: 18. CBCT (/api/cbct)
 *
 * Tests: #355–#366 from Phase 3B tracker
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

describe('GET /api/cbct', () => {
  it('#355 Happy: scan list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/cbct' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/cbct/patient/:patientId/timeline', () => {
  it('#356 Happy: CBCT timeline → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/cbct/patient/${FAKE_ID}/timeline` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/cbct/:id', () => {
  it('#357 Happy: scan detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: `/api/cbct/${FAKE_ID}` }));
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/cbct', () => {
  it('#358 Happy: create scan → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/cbct',
        payload: { patientId: FAKE_ID, regionId: FAKE_ID },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/cbct/:id', () => {
  it('#359 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/cbct/${FAKE_ID}`,
        payload: { notes: 'Updated scan notes' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/cbct/:id', () => {
  it('#360 Happy: delete → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/cbct/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/cbct/:id/status', () => {
  it('#361 Happy: update status → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/cbct/${FAKE_ID}/status`,
        payload: { status: 'completed' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/cbct/:id/scan', () => {
  it('#362 Happy: update scan data → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/cbct/${FAKE_ID}/scan`,
        payload: { scanData: { fov: '8x8' } },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/cbct/:id/report', () => {
  it('#363 Happy: update report → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/cbct/${FAKE_ID}/report`,
        payload: { report: 'No abnormalities found' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/cbct/patient/:patientId/unlinked', () => {
  it('#364 Happy: unlinked CBCTs → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/cbct/patient/${FAKE_ID}/unlinked` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/cbct/:id/link', () => {
  it('#365 Happy: link to plan → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: `/api/cbct/${FAKE_ID}/link`,
        payload: { treatmentPlanId: FAKE_ID },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/cbct/:id/unlink', () => {
  it('#366 Happy: unlink → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: `/api/cbct/${FAKE_ID}/unlink`,
        payload: { treatmentPlanId: FAKE_ID },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
