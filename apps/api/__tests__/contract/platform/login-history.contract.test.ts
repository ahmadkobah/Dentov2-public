/**
 * Contract Tests — 22. Login History (/api/platform/login-history)
 *
 * Tests: #166–#169 from Phase 3A tracker
 * Error pattern: No try/catch → ZodError → 422
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
import { expectSuccess, expectPaginated, withAuth } from '../helpers/assertions.js';
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

async function seedLoginAttempt() {
  const LoginAttempt =
    mongoose.models.LoginAttempt ||
    mongoose.model(
      'LoginAttempt',
      new mongoose.Schema({}, { strict: false, collection: 'login_attempts' }),
    );

  return LoginAttempt.create({
    email: 'user@clinic.com',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0',
    success: true,
    tenantSlug: 'test-clinic',
    timestamp: new Date(),
  });
}

// ── 1. GET / ────────────────────────────────────────────────

describe('GET /api/platform/login-history', () => {
  it('#166 Happy: paginated login history → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedLoginAttempt();

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/login-history',
      }),
    );

    expectPaginated(res);
  });

  it('#167 Filters: query params → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedLoginAttempt();

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/login-history?email=user@clinic.com&success=true&page=1&limit=10',
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 2. GET /blocked-ips ─────────────────────────────────────

describe('GET /api/platform/login-history/blocked-ips', () => {
  it('#168 Happy: list blocked IPs → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/login-history/blocked-ips',
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 3. DELETE /ip-block/:ip ─────────────────────────────────

describe('DELETE /api/platform/login-history/ip-block/:ip', () => {
  it('#169 Happy: unblock IP → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'DELETE',
        url: '/api/platform/login-history/ip-block/192.168.1.100',
      }),
    );

    expectSuccess(res, 200);
  });
});
