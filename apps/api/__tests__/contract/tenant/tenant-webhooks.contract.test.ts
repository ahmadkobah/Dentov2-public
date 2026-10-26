/**
 * Contract Tests — Phase 3B: 45. Tenant Webhooks (/api/tenant-webhooks)
 *
 * Tests: #619–#625 from Phase 3B tracker
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

describe('GET /api/tenant-webhooks', () => {
  it('#619 Happy: webhook list → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/tenant-webhooks' }));
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/tenant-webhooks/:id', () => {
  it('#620 Happy: webhook detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/tenant-webhooks/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/tenant-webhooks', () => {
  it('#621 Happy: create → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/tenant-webhooks',
        payload: {
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          events: ['patient.created'],
          secret: 'webhook-secret-123',
        },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/tenant-webhooks/:id', () => {
  it('#622 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/tenant-webhooks/${FAKE_ID}`,
        payload: { url: 'https://example.com/updated-webhook' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/tenant-webhooks/:id', () => {
  it('#623 Happy: delete → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/tenant-webhooks/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/tenant-webhooks/:id/test', () => {
  it('#624 Happy: send test → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'POST', url: `/api/tenant-webhooks/${FAKE_ID}/test` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/tenant-webhooks/:id/deliveries', () => {
  it('#625 Happy: delivery history → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/tenant-webhooks/${FAKE_ID}/deliveries` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
