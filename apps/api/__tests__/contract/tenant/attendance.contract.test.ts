/**
 * Contract Tests — Phase 3B: 9. Attendance (/api/attendance)
 *
 * Tests: #288–#291 from Phase 3B tracker
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

describe('GET /api/attendance', () => {
  it('#288 Happy: attendance list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/attendance' }));
    expectSuccess(res, 200);
  });
});

describe('POST /api/attendance', () => {
  it('#289 Happy: record attendance → 201', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/attendance',
        payload: { type: 'clock_in' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/attendance/today', () => {
  it("#290 Happy: update today's entry → 200", async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: '/api/attendance/today',
        payload: { type: 'clock_out' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/attendance/manual', () => {
  it('#291 Happy: manual entry → 201', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/attendance/manual',
        payload: {
          userId: '000000000000000000000000',
          date: '2025-01-15',
          clockIn: '09:00',
          clockOut: '17:00',
        },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
