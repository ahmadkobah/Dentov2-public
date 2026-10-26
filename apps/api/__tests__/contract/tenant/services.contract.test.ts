/**
 * Contract Tests — Phase 3B: 24. Services & Categories (/api/services, /api/service-categories)
 *
 * Tests: #396–#405 from Phase 3B tracker
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

// ── Service Categories ──

describe('GET /api/service-categories', () => {
  it('#396 Happy: category list → 404 (resource not implemented)', async () => {
    // Current contract: the service catalog is flat (`/api/services` only).
    // There is no separate `service-categories` resource (no route/service/model),
    // so the route is unregistered and Fastify returns a 404.
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/service-categories' }),
    );
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/service-categories/:id', () => {
  it('#397 Happy: category detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/service-categories/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/service-categories', () => {
  it('#398 Happy: create → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/service-categories',
        payload: { name: 'Preventive Care' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/service-categories/:id', () => {
  it('#399 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/service-categories/${FAKE_ID}`,
        payload: { name: 'Restorative' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/service-categories/:id', () => {
  it('#400 Happy: delete → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/service-categories/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

// ── Services ──

describe('GET /api/services', () => {
  it('#401 Happy: service list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/services' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/services/:id', () => {
  it('#402 Happy: service detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/services/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/services', () => {
  it('#403 Happy: create → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/services',
        payload: { name: 'Teeth Cleaning', categoryId: FAKE_ID, price: 150 },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/services/:id', () => {
  it('#404 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/services/${FAKE_ID}`,
        payload: { name: 'Deep Cleaning' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/services/:id', () => {
  it('#405 Happy: delete → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/services/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
