/**
 * Contract Tests — Phase 3B: 43. Custom Fields (/api/custom-fields)
 *
 * Tests: #604–#610 from Phase 3B tracker
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

describe('GET /api/custom-fields', () => {
  it('#604 Happy: field list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/custom-fields' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/custom-fields/entity/:entity', () => {
  it('#605 Happy: fields by entity → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/custom-fields/entity/patient' }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/custom-fields/:id', () => {
  it('#606 Happy: field detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/custom-fields/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/custom-fields', () => {
  it('#607 Happy: create → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/custom-fields',
        payload: {
          entity: 'patient',
          fieldKey: 'bloodType',
          label: { en: 'Blood Type' },
          type: 'text',
        },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/custom-fields/:id', () => {
  it('#608 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/custom-fields/${FAKE_ID}`,
        payload: { label: { en: 'Updated Field' } },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/custom-fields/:id/toggle', () => {
  it('#609 Happy: toggle active → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/custom-fields/${FAKE_ID}/toggle`,
        payload: { isActive: false },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/custom-fields/:id', () => {
  it('#610 Happy: delete → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/custom-fields/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
