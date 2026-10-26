/**
 * Contract Tests — Phase 3B: 39. Tenant Settings (/api/tenant-settings)
 *
 * Tests: #587–#595 from Phase 3B tracker
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

describe('GET /api/tenant-settings', () => {
  it('#587 Happy: all settings → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/tenant-settings' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/tenant-settings/:key', () => {
  it('#588 Happy: setting by key → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/tenant-settings/general' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/tenant-settings/:key', () => {
  it('#589 Happy: update setting → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: '/api/tenant-settings/general',
        payload: { value: { timezone: 'Asia/Riyadh' } },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/tenant-settings/:key/reset', () => {
  it('#590 Happy: reset to default → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'POST', url: '/api/tenant-settings/general/reset' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/tenant-settings/seed', () => {
  it('#591 Happy: seed defaults → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'POST', url: '/api/tenant-settings/seed' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/tenant-settings/providers', () => {
  it('#592 Happy: provider list → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/tenant-settings/providers' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/tenant-settings/providers/:channel', () => {
  it('#593 Happy: provider detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/tenant-settings/providers/sms' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/tenant-settings/providers/:channel', () => {
  it('#594 Happy: update provider → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: '/api/tenant-settings/providers/sms',
        payload: { enabled: true },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/tenant-settings/providers/:channel/test', () => {
  it('#595 Happy: test provider → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/tenant-settings/providers/sms/test',
        payload: { to: '+1234567890' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
