/**
 * Contract Tests — Phase 3B: 13. Procedure Notes (/api/procedure-notes)
 *
 * Tests: #317–#326 from Phase 3B tracker
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

// ── Templates ──

describe('GET /api/procedure-notes/templates', () => {
  it('#317 Happy: template list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/procedure-notes/templates' }),
    );
    expectSuccess(res, 200);
  });
});

describe('GET /api/procedure-notes/templates/:id', () => {
  it('#318 Happy: template detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/procedure-notes/templates/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/procedure-notes/templates', () => {
  it('#319 Happy: create template → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/procedure-notes/templates',
        payload: { name: 'Root Canal Template', content: 'Procedure steps...' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/procedure-notes/templates/:id', () => {
  it('#320 Happy: update template → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/procedure-notes/templates/${FAKE_ID}`,
        payload: { name: 'Updated Template' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/procedure-notes/templates/:id', () => {
  it('#321 Happy: delete template → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/procedure-notes/templates/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

// ── Notes CRUD ──

describe('GET /api/procedure-notes', () => {
  it('#322 Happy: note list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/procedure-notes' }));
    expectSuccess(res, 200);
  });
});

describe('GET /api/procedure-notes/:id', () => {
  it('#323 Happy: note detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/procedure-notes/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/procedure-notes', () => {
  it('#324 Happy: create note → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/procedure-notes',
        payload: {
          patientId: FAKE_ID,
          appointmentId: FAKE_ID,
          content: 'Performed extraction of tooth 36',
        },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PUT /api/procedure-notes/:id', () => {
  it('#325 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PUT',
        url: `/api/procedure-notes/${FAKE_ID}`,
        payload: { content: 'Updated note content' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/procedure-notes/:id', () => {
  it('#326 Happy: delete → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/procedure-notes/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
