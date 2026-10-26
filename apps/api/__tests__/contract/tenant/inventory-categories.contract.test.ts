/**
 * Contract Tests — Phase 3B: 37a. Inventory Categories (/api/inventory-categories)
 *
 * Tests: #509–#514 from Phase 3B tracker
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

describe('GET /api/inventory-categories', () => {
  it('#509 Happy: category list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/inventory-categories' }),
    );
    expectSuccess(res, 200);
  });
});

describe('GET /api/inventory-categories/:id', () => {
  it('#510 Happy: category detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/inventory-categories/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/inventory-categories', () => {
  it('#511 Happy: create → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/inventory-categories',
        payload: { name: 'Dental Supplies' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/inventory-categories/:id', () => {
  it('#512 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/inventory-categories/${FAKE_ID}`,
        payload: { name: 'Updated Category' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/inventory-categories/:id', () => {
  it('#513 Happy: delete → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/inventory-categories/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/inventory-categories/:id/restore', () => {
  it('#514 Happy: restore → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'PATCH', url: `/api/inventory-categories/${FAKE_ID}/restore` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
