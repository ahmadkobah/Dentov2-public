/**
 * Contract Tests — Phase 3B: 10. Online Booking (/api/booking)
 *
 * Tests: #292–#297 from Phase 3B tracker
 * NOTE: #292-295 are PUBLIC endpoints (no auth required)
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

// ── Public endpoints (no auth) ──

describe('GET /api/booking/branches', () => {
  it('#292 Happy: list public branches → <500', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/booking/branches' });
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/booking/doctors', () => {
  it('#293 Happy: list public doctors → <500', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/booking/doctors' });
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/booking/slots', () => {
  it('#294 Happy: list available slots → <500', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/booking/slots' });
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/booking', () => {
  it('#295 Happy: create public booking → <500', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/booking',
      payload: {
        patientName: 'Test Patient',
        phone: '+201001234567',
        branchId: '000000000000000000000000',
        doctorId: '000000000000000000000001',
        date: '2025-03-01',
        time: '10:00',
      },
    });
    expect(res.statusCode).toBeLessThan(500);
  });
});

// ── Authenticated management endpoints ──

describe('GET /api/booking/management', () => {
  it('#296 Happy: list bookings (admin) → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/booking/management' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/booking/management/:id', () => {
  it('#297 Happy: update booking status → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: '/api/booking/management/000000000000000000000000',
        payload: { status: 'confirmed' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
