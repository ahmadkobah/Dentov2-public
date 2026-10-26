/**
 * Contract Tests — Phase 3B: 42. Audit Logs — Tenant (/api/audit-logs)
 *
 * Tests: #601–#603 from Phase 3B tracker
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

describe('GET /api/audit-logs', () => {
  it('#601 Happy: paginated list → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/audit-logs' }));
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/audit-logs/stats', () => {
  it('#602 Happy: stats → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/audit-logs/stats' }));
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/audit-logs/:id', () => {
  it('#603 Happy: log detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/audit-logs/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
