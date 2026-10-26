/**
 * Contract Tests — 26. DB Explorer (/api/db-explorer)
 *
 * Tests: #178–#182 from Phase 3A tracker
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
import { expectSuccess, withAuth } from '../helpers/assertions.js';
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

async function seedTenantWithDb() {
  const Tenant =
    mongoose.models.Tenant ||
    mongoose.model('Tenant', new mongoose.Schema({}, { strict: false, collection: 'tenants' }));

  const tenant = await Tenant.create({
    name: { en: 'Explorer Clinic' },
    slug: 'explorer-clinic',
    ownerId: new mongoose.Types.ObjectId(),
    contact: { email: 'exp@test.com', phone: '+201234567890', address: { country: 'EG' } },
    status: 'active',
    subscription: {
      plan: 'professional',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 365),
    },
  });

  // Create a tenant database with a collection and a doc
  const tenantDb = mongoose.connection.useDb(`tenant_explorer-clinic`);
  const testCollection = tenantDb.collection('patients');
  await testCollection.insertOne({
    firstName: 'Test',
    lastName: 'Patient',
    createdAt: new Date(),
  });

  return tenant;
}

// ── 1. GET /:slug/stats ─────────────────────────────────────

describe('GET /api/db-explorer/:slug/stats', () => {
  it('#178 Happy: tenant DB stats → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedTenantWithDb();

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/db-explorer/explorer-clinic/stats',
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 2. GET /:slug/collections ───────────────────────────────

describe('GET /api/db-explorer/:slug/collections', () => {
  it('#179 Happy: list tenant collections → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedTenantWithDb();

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/db-explorer/explorer-clinic/collections',
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 3. GET /:slug/:collection/documents ─────────────────────

describe('GET /api/db-explorer/:slug/:collection/documents', () => {
  it('#180 Happy: list collection documents → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedTenantWithDb();

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/db-explorer/explorer-clinic/patients/documents',
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 4. GET /:slug/:collection/indexes ───────────────────────

describe('GET /api/db-explorer/:slug/:collection/indexes', () => {
  it('#181 Happy: list collection indexes → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedTenantWithDb();

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/db-explorer/explorer-clinic/patients/indexes',
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 5. GET /:slug/:collection/documents/:documentId ─────────

describe('GET /api/db-explorer/:slug/:collection/documents/:documentId', () => {
  it('#182 Happy: get single document → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedTenantWithDb();

    // Get a document ID from the seeded collection
    const tenantDb = mongoose.connection.useDb('tenant_explorer-clinic');
    const doc = await tenantDb.collection('patients').findOne();

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: `/api/db-explorer/explorer-clinic/patients/documents/${doc!._id}`,
      }),
    );

    expectSuccess(res, 200);
  });
});
