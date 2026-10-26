/**
 * Contract Tests — Phase 3B: 44. Workflows (/api/workflows)
 *
 * Tests: #611–#618 from Phase 3B tracker
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

describe('GET /api/workflows', () => {
  it('#611 Happy: workflow list → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/workflows' }));
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/workflows/:id', () => {
  it('#612 Happy: workflow detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/workflows/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/workflows', () => {
  it('#613 Happy: create → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/workflows',
        payload: {
          name: { en: 'Patient Onboarding' },
          trigger: 'patient.created',
          actions: [{ type: 'send_notification', config: {} }],
        },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/workflows/:id', () => {
  it('#614 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/workflows/${FAKE_ID}`,
        payload: { name: { en: 'Updated Workflow' } },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/workflows/:id/toggle', () => {
  it('#615 Happy: toggle active → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/workflows/${FAKE_ID}/toggle`,
        payload: { isActive: false },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/workflows/:id', () => {
  it('#616 Happy: delete → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/workflows/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/workflows/executions', () => {
  it('#617 Happy: execution history → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/workflows/executions' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/workflows/:id/executions', () => {
  it('#618 Happy: per-workflow history → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/workflows/${FAKE_ID}/executions` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
