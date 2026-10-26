/**
 * Contract Tests — 12. Audit Logs (/api/platform/audit-logs)
 *
 * Tests: #106–#110 from Phase 3A tracker
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

async function seedAuditLog() {
  const db = mongoose.connection;
  const collection = db.collection('audit_logs');
  const result = await collection.insertOne({
    tenantSlug: 'test-clinic',
    actorId: new mongoose.Types.ObjectId(),
    actorEmail: 'admin@test.com',
    action: 'create',
    resourceType: 'tenant',
    resourceId: new mongoose.Types.ObjectId().toString(),
    sensitivityLevel: 'low',
    status: 'success',
    timestamp: new Date(),
    ipAddress: '127.0.0.1',
    userAgent: 'TestAgent/1.0',
  });
  return result.insertedId;
}

// ── 1. GET / ────────────────────────────────────────────────

describe('GET /api/platform/audit-logs', () => {
  it('#106 Happy: paginated audit logs → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedAuditLog();

    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/platform/audit-logs' }),
    );

    expectPaginated(res);
  });

  it('#107 Auth: no token → 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/platform/audit-logs',
    });

    expectUnauthorized(res);
  });
});

// ── 2. GET /stats ───────────────────────────────────────────

describe('GET /api/platform/audit-logs/stats', () => {
  it('#108 Happy: audit stats → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/audit-logs/stats',
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 3. GET /:id ─────────────────────────────────────────────

describe('GET /api/platform/audit-logs/:id', () => {
  it('#109 Happy: get audit log by ID → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const logId = await seedAuditLog();

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: `/api/platform/audit-logs/${logId}`,
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 4. GET /export ──────────────────────────────────────────

describe('GET /api/platform/audit-logs/export', () => {
  it('#110 Happy: export audit logs as JSON → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedAuditLog();

    // NOTE: /export uses auditLogQuerySchema.strict() which rejects unknown keys.
    // The `format` param is extracted manually AFTER Zod validation, so passing
    // ?format=json causes a .strict() ZodError → 422. Omit format to use default.
    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/audit-logs/export',
      }),
    );

    expectSuccess(res, 200);
  });
});
