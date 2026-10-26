/**
 * Contract Tests — Phase 3B: 31. Walk-in Queue (/api/walk-in-queue)
 *
 * Tests: #453–#461 from Phase 3B tracker
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

describe('POST /api/walk-in-queue', () => {
  it('#453 Happy: register walk-in → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/walk-in-queue',
        payload: { patientId: FAKE_ID, reason: 'Toothache' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/walk-in-queue', () => {
  it('#454 Happy: queue list → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/walk-in-queue' }));
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/walk-in-queue/stats', () => {
  it('#455 Happy: queue stats → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/walk-in-queue/stats' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/walk-in-queue/:id', () => {
  it('#456 Happy: entry detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/walk-in-queue/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/walk-in-queue/:id/call', () => {
  it('#457 Happy: call patient → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'PATCH', url: `/api/walk-in-queue/${FAKE_ID}/call` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/walk-in-queue/:id/start', () => {
  it('#458 Happy: start treatment → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'PATCH', url: `/api/walk-in-queue/${FAKE_ID}/start` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/walk-in-queue/:id/complete', () => {
  it('#459 Happy: complete → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'PATCH', url: `/api/walk-in-queue/${FAKE_ID}/complete` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/walk-in-queue/:id/no-show', () => {
  it('#460 Happy: mark no-show → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'PATCH', url: `/api/walk-in-queue/${FAKE_ID}/no-show` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/walk-in-queue/:id/cancel', () => {
  it('#461 Happy: cancel → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'PATCH', url: `/api/walk-in-queue/${FAKE_ID}/cancel` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
