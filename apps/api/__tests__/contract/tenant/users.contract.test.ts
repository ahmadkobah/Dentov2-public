/**
 * Contract Tests — Phase 3B: 28. Users — Tenant Staff (/api/users)
 *
 * Tests: #433–#444 from Phase 3B tracker
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

describe('GET /api/users', () => {
  it('#433 Happy: user list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/users' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/users/stats', () => {
  it('#434 Happy: role/status stats → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/users/stats' }));
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/users/:id', () => {
  it('#435 Happy: user detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: `/api/users/${FAKE_ID}` }));
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/users/invite', () => {
  it('#436 Happy: invite user → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/users/invite',
        payload: {
          email: 'invite@example.com',
          role: 'receptionist',
          firstName: 'Test',
          lastName: 'User',
        },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });

  it('#437 Validation: missing email → 400', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/users/invite',
        payload: { role: 'receptionist' },
      }),
    );
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/users/:id', () => {
  it('#438 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/users/${FAKE_ID}`,
        payload: { firstName: 'Updated' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/users/:id/suspend', () => {
  it('#439 Happy: suspend → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'PATCH', url: `/api/users/${FAKE_ID}/suspend` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/users/:id/deactivate', () => {
  it('#440 Happy: deactivate → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'PATCH', url: `/api/users/${FAKE_ID}/deactivate` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/users/:id/reactivate', () => {
  it('#441 Happy: reactivate → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'PATCH', url: `/api/users/${FAKE_ID}/reactivate` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/users/:id/sessions', () => {
  it('#442 Happy: active sessions → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/users/${FAKE_ID}/sessions` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/users/:id/sessions', () => {
  it('#443 Happy: revoke all → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/users/${FAKE_ID}/sessions` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/users/:id/force-reset-password', () => {
  it('#444 Happy: force reset password → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'POST', url: `/api/users/${FAKE_ID}/force-reset-password` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
