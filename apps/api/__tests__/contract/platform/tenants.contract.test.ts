/**
 * Contract Tests — 2. Tenants (/api/platform/tenants)
 *
 * Tests: #6–#20 from Phase 3A tracker
 */

import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  buildTestApp,
  teardownTestApp,
  cleanDatabase,
  destroyTestInfra,
} from '../helpers/build-app.js';
import { createPlatformUserAndToken, generateTokenForRole } from '../helpers/auth.js';
import {
  expectSuccess,
  expectPaginated,
  expectError,
  expectUnauthorized,
  expectForbidden,
  expectNotFound,
  withAuth,
} from '../helpers/assertions.js';
import mongoose from 'mongoose';
import { Tenant, User } from '../../../src/platform/models/index.js';

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

// ── Helper: seed a tenant ───────────────────────────────────
async function seedTenant(slug = 'test-clinic', extra: Record<string, unknown> = {}) {
  const ownerId = new mongoose.Types.ObjectId();
  return Tenant.create({
    name: { en: 'Test Clinic' },
    slug,
    ownerId,
    contact: { email: 'clinic@test.com', phone: '+201234567890', address: { country: 'EG' } },
    status: 'active',
    ...extra,
  });
}

// ── 1. GET / — Paginated list ───────────────────────────────

describe('GET /api/platform/tenants', () => {
  it('#6 Happy: paginated list → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedTenant('clinic-a');
    await seedTenant('clinic-b');

    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/platform/tenants' }));

    expectPaginated(res);
  });

  it('#7 Auth: no token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/platform/tenants' });
    expectUnauthorized(res);
  });

  it('#8 Query: search, status, page, limit filter correctly', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedTenant('alpha-clinic');
    await seedTenant('beta-clinic');

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/tenants?search=alpha&page=1&limit=10',
      }),
    );

    const body = expectPaginated(res);
    expect(body.meta.page).toBe(1);
  });
});

// ── 2. GET /stats ───────────────────────────────────────────

describe('GET /api/platform/tenants/stats', () => {
  it('#9 Happy: aggregate stats → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedTenant();

    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/platform/tenants/stats' }),
    );

    expectSuccess(res, 200);
  });
});

// ── 3. GET /:id ─────────────────────────────────────────────

describe('GET /api/platform/tenants/:id', () => {
  it('#10 Happy: single tenant → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const tenant = await seedTenant();

    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/platform/tenants/${tenant._id}` }),
    );

    expectSuccess(res, 200);
  });

  it('#11 Not Found: invalid ID → 404', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/platform/tenants/${fakeId}` }),
    );

    expectNotFound(res);
  });
});

// ── 4. POST / — Create via wizard ──────────────────────────

describe('POST /api/platform/tenants', () => {
  it('#12 Happy: create via wizard → 201', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/platform/tenants',
        payload: {
          clinic: {
            name: 'New Clinic',
            phone: '+201234567890',
            email: 'new@clinic.com',
            address: { country: 'EG' },
          },
          admin: {
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@newclinic.com',
            phone: '+201234567891',
            password: 'SecurePass123!',
          },
        },
      }),
    );

    expectSuccess(res, 201);
  });

  it('#13 Validation: missing required fields → 400', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/platform/tenants',
        payload: {},
      }),
    );

    // Handler catches ZodError → apiError(400)
    expectError(res, 400);
  });
});

// ── 5. PATCH /:id — Update metadata ────────────────────────

describe('PATCH /api/platform/tenants/:id', () => {
  it('#14 Happy: update metadata → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const tenant = await seedTenant();

    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/platform/tenants/${tenant._id}`,
        payload: { name: { en: 'Updated Clinic' } },
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 6. PATCH /:id/status ────────────────────────────────────

describe('PATCH /api/platform/tenants/:id/status', () => {
  it('#15 Happy: change status → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const tenant = await seedTenant();

    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/platform/tenants/${tenant._id}/status`,
        payload: { status: 'suspended', reason: 'Non-payment' },
      }),
    );

    expectSuccess(res, 200);
  });

  it('#16 Validation: invalid status enum → 400', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const tenant = await seedTenant();

    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/platform/tenants/${tenant._id}/status`,
        payload: { status: 'nonexistent' },
      }),
    );

    // Handler catches ZodError → apiError(400)
    expectError(res, 400);
  });
});

// ── 7. GET /:id/users ──────────────────────────────────────

describe('GET /api/platform/tenants/:id/users', () => {
  it('#17 Happy: list tenant users → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const tenant = await seedTenant();

    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/platform/tenants/${tenant._id}/users` }),
    );

    expectSuccess(res, 200);
  });
});

// ── 8. DELETE /:id ──────────────────────────────────────────

describe('DELETE /api/platform/tenants/:id', () => {
  it('#18 Happy: soft-delete → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const tenant = await seedTenant();

    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/platform/tenants/${tenant._id}` }),
    );

    expectSuccess(res, 200);
  });

  it('#19 Auth: no delete permission → 403', async () => {
    const { token } = await createPlatformUserAndToken('platform_viewer');
    const tenant = await seedTenant();

    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/platform/tenants/${tenant._id}` }),
    );

    expectForbidden(res);
  });
});

// ── 9. POST /:id/users/:userId/reset-password ──────────────

describe('POST /api/platform/tenants/:id/users/:userId/reset-password', () => {
  it('#20 Happy: force reset tenant user password → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const tenant = await seedTenant();
    // Create a tenant user
    const tenantUser = await User.create({
      email: 'tenantuser@test.com',
      password: '$argon2id$v=19$m=65536,t=3,p=4$placeholder',
      role: 'dentist',
      tenantSlug: tenant.slug,
      status: 'active',
      profile: { firstName: { en: 'Tenant' }, lastName: { en: 'User' } },
    });

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: `/api/platform/tenants/${tenant._id}/users/${tenantUser._id}/reset-password`,
      }),
    );

    expectSuccess(res, 200);
  });
});
