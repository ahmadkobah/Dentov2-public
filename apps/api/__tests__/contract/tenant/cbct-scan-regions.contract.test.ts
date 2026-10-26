/**
 * Contract Tests — Phase 3B: 19. CBCT Scan Regions (/api/cbct-scan-regions)
 *
 * Tests: #367–#371 from Phase 3B tracker
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

describe('GET /api/cbct-scan-regions', () => {
  it('#367 Happy: region list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/cbct-scan-regions' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/cbct-scan-regions/:id', () => {
  it('#368 Happy: region detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/cbct-scan-regions/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/cbct-scan-regions', () => {
  it('#369 Happy: create → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/cbct-scan-regions',
        payload: { name: 'Full Arch', code: 'FA' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/cbct-scan-regions/:id', () => {
  it('#370 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/cbct-scan-regions/${FAKE_ID}`,
        payload: { name: 'Quadrant' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/cbct-scan-regions/:id', () => {
  it('#371 Happy: delete → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/cbct-scan-regions/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
