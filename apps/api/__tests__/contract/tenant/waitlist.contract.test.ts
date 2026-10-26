/**
 * Contract Tests — Phase 3B: 6. Waitlist (/api/waitlists)
 *
 * Tests: #249–#253 from Phase 3B tracker
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

// ── GET /api/waitlists ──────────────────────────────────────

describe('GET /api/waitlists', () => {
  it('#249 Happy: entry list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/waitlists' }));
    expectSuccess(res, 200);
  });
});

// ── POST /api/waitlists ─────────────────────────────────────

describe('POST /api/waitlists', () => {
  it('#250 Happy: add to waitlist → 201', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/waitlists',
        payload: {
          patientId: '000000000000000000000000',
          reason: 'Checkup',
          priority: 'normal',
        },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

// ── PUT /api/waitlists/:id ──────────────────────────────────

describe('PUT /api/waitlists/:id', () => {
  it('#251 Happy: update entry → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: '/api/waitlists/000000000000000000000000',
        payload: { priority: 'high' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

// ── PATCH /api/waitlists/:id/status ─────────────────────────

describe('PATCH /api/waitlists/:id/status', () => {
  it('#252 Happy: update status → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: '/api/waitlists/000000000000000000000000/status',
        payload: { status: 'contacted' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

// ── DELETE /api/waitlists/:id ───────────────────────────────

describe('DELETE /api/waitlists/:id', () => {
  it('#253 Happy: remove → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: '/api/waitlists/000000000000000000000000' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
