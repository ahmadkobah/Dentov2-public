/**
 * Contract Tests — Phase 3B: 49. Imaging Requirements (/api/imaging-requirements)
 *
 * Tests: #658–#659 from Phase 3B tracker
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
import { withAuth } from '../helpers/assertions.js';

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

describe('GET /api/imaging-requirements/:serviceId', () => {
  it('#658 Happy: requirements for service → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/imaging-requirements/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/imaging-requirements/:id/waive', () => {
  it('#659 Happy: waive requirement → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'POST', url: `/api/imaging-requirements/${FAKE_ID}/waive` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
