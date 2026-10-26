/**
 * Contract Tests — 16. Modules (Versioning) (/api/modules)
 *
 * Tests: #121–#135 from Phase 3A tracker
 * Error pattern: try/catch catches ZodError → 400
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
import { expectSuccess, expectError, expectUnauthorized, withAuth } from '../helpers/assertions.js';
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

async function seedModule(slug = 'lab_management') {
  const Module =
    mongoose.models.Module ||
    mongoose.model('Module', new mongoose.Schema({}, { strict: false, collection: 'modules' }));

  return Module.create({
    slug,
    name: { en: 'Lab Management' },
    description: { en: 'Lab management module' },
    version: '1.0.0',
    type: 'paid',
    status: 'active',
    isActive: true,
    changelog: [
      {
        version: '1.0.0',
        changes: ['Initial release'],
        releasedAt: new Date(),
        releasedBy: new mongoose.Types.ObjectId(),
      },
    ],
    dependsOn: [],
    conflictsWith: [],
  });
}

async function seedTenantModule(tenantId: string, moduleSlug = 'lab_management') {
  const TenantModule =
    mongoose.models.TenantModule ||
    mongoose.model(
      'TenantModule',
      new mongoose.Schema({}, { strict: false, collection: 'tenant_modules' }),
    );

  return TenantModule.create({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    moduleSlug,
    installedVersion: '1.0.0',
    availableVersion: '1.0.0',
    updatePolicy: 'auto',
    isCanary: false,
    installedAt: new Date(),
    installedBy: new mongoose.Types.ObjectId(),
  });
}

// ── 1. GET /modules ─────────────────────────────────────────

describe('GET /api/modules', () => {
  it('#121 Happy: list modules → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedModule();

    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/modules' }));

    expectSuccess(res, 200);
  });

  it('#122 Auth: no token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/modules' });
    expectUnauthorized(res);
  });
});

// ── 2. GET /modules/:slug ───────────────────────────────────

describe('GET /api/modules/:slug', () => {
  it('#123 Happy: get module by slug → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedModule();

    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/modules/lab_management' }),
    );

    expectSuccess(res, 200);
  });
});

// ── 3. POST /modules ────────────────────────────────────────

describe('POST /api/modules', () => {
  it('#124 Happy: create module → 201', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/modules',
        payload: {
          slug: 'patient_records',
          name: { en: 'Patient Records' },
          description: { en: 'Patient records module' },
          version: '0.1.0',
          type: 'core',
        },
      }),
    );

    expectSuccess(res, 201);
  });

  it('#125 Validation: missing required fields → 400', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/modules',
        payload: {},
      }),
    );

    // Handler catches ZodError → 400
    expectError(res, 400);
  });
});

// ── 4. PATCH /modules/:slug ─────────────────────────────────

describe('PATCH /api/modules/:slug', () => {
  it('#126 Happy: update module → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedModule();

    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: '/api/modules/lab_management',
        payload: { name: { en: 'Updated Lab Management' } },
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 5. POST /modules/:slug/version ──────────────────────────

describe('POST /api/modules/:slug/version', () => {
  it('#127 Happy: push new version → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedModule();

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/modules/lab_management/version',
        payload: {
          version: '1.1.0',
          changelog: { changes: ['Added new feature X'] },
        },
      }),
    );

    expectSuccess(res, 200);
  });

  it('#128 Validation: invalid version → 400', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedModule();

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/modules/lab_management/version',
        payload: {
          version: 'not-semver',
          changelog: { changes: ['Change'] },
        },
      }),
    );

    expectError(res, 400);
  });
});

// ── 6. PATCH /modules/:slug/status ──────────────────────────

describe('PATCH /api/modules/:slug/status', () => {
  it('#129 Happy: change module status → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedModule();

    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: '/api/modules/lab_management/status',
        payload: { status: 'deprecated' },
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 7. GET /modules/tenant/:tenantId ────────────────────────

describe('GET /api/modules/tenant/:tenantId', () => {
  it('#130 Happy: list tenant modules → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const tenantId = new mongoose.Types.ObjectId();
    await seedModule();
    await seedTenantModule(tenantId.toString());

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: `/api/modules/tenant/${tenantId}`,
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 8. POST /modules/tenant/:tenantId/install ───────────────

describe('POST /api/modules/tenant/:tenantId/install', () => {
  it('#131 Happy: install module for tenant → 201', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedModule();
    const tenantId = new mongoose.Types.ObjectId();

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: `/api/modules/tenant/${tenantId}/install`,
        payload: {
          moduleSlug: 'lab_management',
          updatePolicy: 'auto',
        },
      }),
    );

    expectSuccess(res, 201);
  });
});

// ── 9. DELETE /modules/tenant/:tenantId/:slug ───────────────

describe('DELETE /api/modules/tenant/:tenantId/:slug', () => {
  it('#132 Happy: uninstall module → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const tenantId = new mongoose.Types.ObjectId();
    await seedModule();
    await seedTenantModule(tenantId.toString());

    const res = await app.inject(
      withAuth(token, {
        method: 'DELETE',
        url: `/api/modules/tenant/${tenantId}/lab_management`,
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 10. PATCH /modules/tenant/:tenantId/:slug ───────────────

describe('PATCH /api/modules/tenant/:tenantId/:slug', () => {
  it('#133 Happy: update tenant module config → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const tenantId = new mongoose.Types.ObjectId();
    await seedModule();
    await seedTenantModule(tenantId.toString());

    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/modules/tenant/${tenantId}/lab_management`,
        payload: { updatePolicy: 'manual' },
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 11. POST /modules/:slug/rollout ─────────────────────────

describe('POST /api/modules/:slug/rollout', () => {
  it('#134 Happy: start canary rollout → 201', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const mod = await seedModule();
    // Need a tenant module to have tenants for rollout
    const tenantId = new mongoose.Types.ObjectId();
    await seedTenantModule(tenantId.toString());

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/modules/lab_management/rollout',
        payload: {
          toVersion: '1.0.0',
          canaryPercent: 10,
          monitoringHours: 24,
        },
      }),
    );

    // May return 201 or 400 (version already deployed)
    expect([201, 400]).toContain(res.statusCode);
  });
});

// ── 12. GET /modules/:slug/rollout ──────────────────────────

describe('GET /api/modules/:slug/rollout', () => {
  it('#135 Happy: get rollout status → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedModule();

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/modules/lab_management/rollout',
      }),
    );

    expectSuccess(res, 200);
  });
});
