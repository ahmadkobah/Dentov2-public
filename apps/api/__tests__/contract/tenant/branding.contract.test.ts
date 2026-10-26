/**
 * Contract Tests — Phase 3B: 40. Branding (/api/branding)
 *
 * Tests: #596–#598 from Phase 3B tracker
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

describe('GET /api/branding', () => {
  it('#596 Happy: branding → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/branding' }));
    expectSuccess(res, 200);
  });
});

describe('PATCH /api/branding', () => {
  it('#597 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: '/api/branding',
        payload: { primaryColor: '#007bff', clinicName: 'Test Clinic' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/branding', () => {
  it('#598 Happy: delete brand → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'DELETE', url: '/api/branding' }));
    expect(res.statusCode).toBeLessThan(500);
  });
});
