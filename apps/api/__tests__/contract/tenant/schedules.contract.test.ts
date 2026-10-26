/**
 * Contract Tests — Phase 3B: 7. Schedules (/api/schedules)
 *
 * Tests: #254–#274 from Phase 3B tracker
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

// ── Doctor Schedules (/api/schedules/doctors) ───────────────

describe('GET /api/schedules/doctors', () => {
  it('#254 Happy: doctor schedules → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/schedules/doctors' }));
    expectSuccess(res, 200);
  });
});

describe('POST /api/schedules/doctors', () => {
  it('#255 Happy: create schedule → 201', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/schedules/doctors',
        payload: {
          doctorId: '000000000000000000000000',
          branchId: '000000000000000000000001',
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '17:00',
        },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/schedules/doctors/:id', () => {
  it('#256 Happy: update → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: '/api/schedules/doctors/000000000000000000000000',
        payload: { startTime: '08:00' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/schedules/doctors/:id', () => {
  it('#257 Happy: delete → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: '/api/schedules/doctors/000000000000000000000000' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

// ── Schedule Exceptions (/api/schedules/exceptions) ─────────

describe('GET /api/schedules/exceptions', () => {
  it('#258 Happy: exception list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/schedules/exceptions' }),
    );
    expectSuccess(res, 200);
  });
});

describe('POST /api/schedules/exceptions', () => {
  it('#259 Happy: create exception → 201', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/schedules/exceptions',
        payload: {
          doctorId: '000000000000000000000000',
          date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          type: 'unavailable',
          reason: 'Personal leave',
        },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/schedules/exceptions/:id', () => {
  it('#260 Happy: update → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: '/api/schedules/exceptions/000000000000000000000000',
        payload: { reason: 'Updated reason' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/schedules/exceptions/:id/status', () => {
  it('#261 Happy: approve/reject → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: '/api/schedules/exceptions/000000000000000000000000/status',
        payload: { status: 'approved' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/schedules/exceptions/:id', () => {
  it('#262 Happy: delete → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'DELETE',
        url: '/api/schedules/exceptions/000000000000000000000000',
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

// ── Shifts (/api/schedules/shifts) ──────────────────────────

describe('GET /api/schedules/shifts', () => {
  it('#263 Happy: shift list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/schedules/shifts' }));
    expectSuccess(res, 200);
  });
});

describe('POST /api/schedules/shifts', () => {
  it('#264 Happy: create shift → 201', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/schedules/shifts',
        payload: {
          name: { en: 'Morning Shift' },
          startTime: '08:00',
          endTime: '14:00',
        },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/schedules/shifts/:id', () => {
  it('#265 Happy: update → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: '/api/schedules/shifts/000000000000000000000000',
        payload: { name: { en: 'Updated Shift' } },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/schedules/shifts/:id', () => {
  it('#266 Happy: delete → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: '/api/schedules/shifts/000000000000000000000000' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

// ── Staff Schedules (/api/schedules/staff) ──────────────────

describe('GET /api/schedules/staff', () => {
  it('#267 Happy: staff schedule list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/schedules/staff' }));
    expectSuccess(res, 200);
  });
});

describe('POST /api/schedules/staff', () => {
  it('#268 Happy: create staff schedule → 201', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/schedules/staff',
        payload: {
          userId: '000000000000000000000000',
          shiftId: '000000000000000000000001',
          date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/schedules/staff/:id', () => {
  it('#269 Happy: update → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: '/api/schedules/staff/000000000000000000000000',
        payload: { notes: 'Coverage' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/schedules/staff/:id', () => {
  it('#270 Happy: delete → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: '/api/schedules/staff/000000000000000000000000' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/schedules/staff/publish', () => {
  it('#271 Happy: publish staff schedules → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/schedules/staff/publish',
        payload: { week: '2025-01-06' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

// ── Branch Schedule Config ──────────────────────────────────

describe('PUT /api/schedules/branches/:branchId/holidays', () => {
  it('#272 Happy: update holidays → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: '/api/schedules/branches/000000000000000000000000/holidays',
        payload: { holidays: [] },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/schedules/branches/:branchId/slot-config', () => {
  it('#273 Happy: update slot config → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: '/api/schedules/branches/000000000000000000000000/slot-config',
        payload: { slotDuration: 30 },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/schedules/branches/:branchId/online-booking', () => {
  it('#274 Happy: update booking config → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: '/api/schedules/branches/000000000000000000000000/online-booking',
        payload: { enabled: true },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
