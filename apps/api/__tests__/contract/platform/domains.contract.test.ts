/**
 * Contract Tests — 10. Domains (/api/platform/domains)
 *
 * Tests: #94–#100 from Phase 3A tracker
 * Error pattern: No try/catch → ZodError → 422 (global handler)
 */

import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  buildTestApp,
  teardownTestApp,
  cleanDatabase,
  destroyTestInfra,
} from '../helpers/build-app.js';
import { createPlatformUserAndToken } from '../helpers/auth.js';
import {
  expectSuccess,
  expectPaginated,
  expectError,
  expectUnauthorized,
  withAuth,
} from '../helpers/assertions.js';
import mongoose from 'mongoose';

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

async function seedTenantAndDomain() {
  const Tenant =
    mongoose.models.Tenant ||
    mongoose.model('Tenant', new mongoose.Schema({}, { strict: false, collection: 'tenants' }));
  const Domain =
    mongoose.models.Domain ||
    mongoose.model('Domain', new mongoose.Schema({}, { strict: false, collection: 'domains' }));

  const tenant = await Tenant.create({
    name: { en: 'Domain Clinic' },
    slug: 'domain-clinic',
    ownerId: new mongoose.Types.ObjectId(),
    contact: { email: 'domain@test.com', phone: '+201234567890', address: { country: 'EG' } },
    status: 'active',
    subscription: {
      plan: 'professional',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 365),
    },
  });

  const domain = await Domain.create({
    tenantSlug: 'domain-clinic',
    customDomain: 'clinic.example.com',
    dnsVerified: false,
    sslStatus: 'pending',
    isActive: true,
    requiredRecords: [{ type: 'CNAME', name: 'clinic', value: 'dento.app', verified: false }],
  });

  return { tenant, domain };
}

// ── 1. GET / ────────────────────────────────────────────────

describe('GET /api/platform/domains', () => {
  it('#94 Happy: paginated domain list → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedTenantAndDomain();

    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/platform/domains' }));

    expectPaginated(res);
  });

  it('#95 Auth: no token → 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/platform/domains',
    });

    expectUnauthorized(res);
  });
});

// ── 2. POST / ───────────────────────────────────────────────

describe('POST /api/platform/domains', () => {
  it('#96 Happy: create domain → 201', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    // Seed tenant first
    const Tenant =
      mongoose.models.Tenant ||
      mongoose.model('Tenant', new mongoose.Schema({}, { strict: false, collection: 'tenants' }));
    await Tenant.create({
      name: { en: 'New Domain Clinic' },
      slug: 'new-domain-clinic',
      ownerId: new mongoose.Types.ObjectId(),
      contact: { email: 'nd@test.com', phone: '+201234567890', address: { country: 'EG' } },
      status: 'active',
      subscription: {
        plan: 'professional',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000 * 365),
      },
    });

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/platform/domains',
        payload: {
          tenantSlug: 'new-domain-clinic',
          customDomain: 'custom.example.com',
        },
      }),
    );

    expectSuccess(res, 201);
  });

  it('#97 Validation: missing fields → 422', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/platform/domains',
        payload: {},
      }),
    );

    // No try/catch → ZodError → 422
    expectError(res, 422);
  });
});

// ── 3. GET /:id ─────────────────────────────────────────────

describe('GET /api/platform/domains/:id', () => {
  it('#98 Happy: get domain by ID → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const { domain } = await seedTenantAndDomain();

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: `/api/platform/domains/${domain._id}`,
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 4. PATCH /:id ───────────────────────────────────────────

describe('PATCH /api/platform/domains/:id', () => {
  it('#99 Happy: update domain → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const { domain } = await seedTenantAndDomain();

    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/platform/domains/${domain._id}`,
        payload: { isActive: false },
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 5. DELETE /:id ──────────────────────────────────────────

describe('DELETE /api/platform/domains/:id', () => {
  it('#100 Happy: delete domain → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const { domain } = await seedTenantAndDomain();

    const res = await app.inject(
      withAuth(token, {
        method: 'DELETE',
        url: `/api/platform/domains/${domain._id}`,
      }),
    );

    expectSuccess(res, 200);
  });
});
