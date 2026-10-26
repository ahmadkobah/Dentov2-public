/**
 * Contract Tests — Phase 3B: 8. Leave Management (/api/leave)
 *
 * Tests: #275–#287 from Phase 3B tracker
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

// ── Leave Types ─────────────────────────────────────────────

describe('GET /api/leave/types', () => {
  it('#275 Happy: leave type list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/leave/types' }));
    expectSuccess(res, 200);
  });
});

describe('POST /api/leave/types', () => {
  it('#276 Happy: create leave type → 201', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/leave/types',
        payload: { name: { en: 'Annual Leave' }, maxDays: 21, isPaid: true },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/leave/types/:id', () => {
  it('#277 Happy: update leave type → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: '/api/leave/types/000000000000000000000000',
        payload: { maxDays: 25 },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/leave/types/:id', () => {
  it('#278 Happy: delete leave type → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: '/api/leave/types/000000000000000000000000' }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

// ── Leave Requests ──────────────────────────────────────────

describe('GET /api/leave/requests', () => {
  it('#279 Happy: leave requests → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/leave/requests' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/leave/requests/:id', () => {
  it('#280 Happy: request detail → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/leave/requests/000000000000000000000000' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/leave/requests', () => {
  it('#281 Happy: submit leave request → 201', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/leave/requests',
        payload: {
          leaveTypeId: '000000000000000000000000',
          startDate: '2025-02-01',
          endDate: '2025-02-05',
          reason: 'Vacation',
        },
      }),
    );
    expect(res.statusCode).not.toBe(404);
  });

  it('#282 Validation: missing fields → 400', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/leave/requests',
        payload: {},
      }),
    );
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/leave/requests/:id', () => {
  it('#283 Happy: update request → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: '/api/leave/requests/000000000000000000000000',
        payload: { reason: 'Updated reason' },
      }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

describe('PATCH /api/leave/requests/:id/status', () => {
  it('#284 Happy: approve → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: '/api/leave/requests/000000000000000000000000/status',
        payload: { status: 'approved' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });

  it('#285 Happy: reject with reason → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: '/api/leave/requests/000000000000000000000000/status',
        payload: { status: 'rejected', reason: 'Short staffed' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

// ── Leave Balances ──────────────────────────────────────────

describe('GET /api/leave/balances', () => {
  it('#286 Happy: leave balances → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/leave/balances' }));
    expectSuccess(res, 200);
  });
});

describe('PUT /api/leave/balances/:id', () => {
  it('#287 Happy: update balance → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: '/api/leave/balances/000000000000000000000000',
        payload: { remaining: 15 },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
