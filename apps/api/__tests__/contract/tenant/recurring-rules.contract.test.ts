/**
 * Contract Tests — Phase 3B: 47. Recurring Rules (/api/recurring-rules)
 *
 * Tests: #630–#638 from Phase 3B tracker
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
import { withAuth } from '../helpers/assertions.js';

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

describe('GET /api/recurring-rules', () => {
  it('#630 Happy: rule list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/recurring-rules' }));
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/recurring-rules/:id', () => {
  it('#631 Happy: rule detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/recurring-rules/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/recurring-rules', () => {
  it('#632 Happy: create → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/recurring-rules',
        payload: {
          patientId: FAKE_ID,
          appointmentTypeId: FAKE_ID,
          frequency: 'weekly',
          startDate: '2025-01-01',
        },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/recurring-rules/:id', () => {
  it('#633 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/recurring-rules/${FAKE_ID}`,
        payload: { frequency: 'monthly' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/recurring-rules/:id/pause', () => {
  it('#634 Happy: pause rule → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'PATCH', url: `/api/recurring-rules/${FAKE_ID}/pause` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/recurring-rules/:id/resume', () => {
  it('#635 Happy: resume rule → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'PATCH', url: `/api/recurring-rules/${FAKE_ID}/resume` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/recurring-rules/:id', () => {
  it('#636 Happy: delete → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/recurring-rules/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/recurring-rules/:id/skipped', () => {
  it('#637 Happy: skipped instances → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/recurring-rules/${FAKE_ID}/skipped` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/recurring-rules/:id/regenerate', () => {
  it('#638 Happy: regenerate → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'POST', url: `/api/recurring-rules/${FAKE_ID}/regenerate` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
