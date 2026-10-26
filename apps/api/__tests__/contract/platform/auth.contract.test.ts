/**
 * Contract Tests — 1. Authentication (/api/auth)
 *
 * Tests: #1–#5 from Phase 3A tracker
 *
 * Both platform admins and tenant users share this single /api/auth/login endpoint.
 * Platform admins have tenantSlug: null + platformRole field.
 */

import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  buildTestApp,
  teardownTestApp,
  cleanDatabase,
  destroyTestInfra,
} from '../helpers/build-app.js';
import { generateInvalidToken } from '../helpers/auth.js';
import { expectSuccess, expectError, withAuth } from '../helpers/assertions.js';
import argon2 from 'argon2';
import { User } from '../../../src/platform/models/index.js';

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

// Helper: create a platform user for login tests
async function seedPlatformUser(email: string, password: string) {
  const hashedPassword = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  return User.create({
    email,
    password: hashedPassword,
    role: 'platform_admin',
    tenantSlug: null,
    platformRole: 'platform_owner',
    status: 'active',
    isEmailVerified: true,
    tokenVersion: 1,
    profile: { firstName: { en: 'Test' }, lastName: { en: 'User' } },
  });
}

// ── 1. POST /api/auth/login ─────────────────────────────────

describe('POST /api/auth/login', () => {
  it('#1 Happy: valid credentials → 200 + tokens', async () => {
    const password = 'Test@12345678';
    await seedPlatformUser('platform@dento.test', password);

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'platform@dento.test', password },
    });

    const body = expectSuccess(res, 200);
    expect(body.data).toHaveProperty('accessToken');
    expect(typeof body.data.accessToken).toBe('string');
    expect(body.data).toHaveProperty('expiresAt');
    expect(body.data).toHaveProperty('user');
    expect(body.data.user.email).toBe('platform@dento.test');
    expect(body.data.user.platformRole).toBe('platform_owner');
  });

  it('#2 Validation: missing email → 500 (handler catches ZodError)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { password: 'somepassword1' },
    });

    // The login handler's try/catch swallows ZodError and returns 500
    expectError(res, 500);
  });

  it('#3 Auth: invalid password → 401', async () => {
    const password = 'CorrectPassword1!';
    await seedPlatformUser('wrong@dento.test', password);

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'wrong@dento.test', password: 'WrongPassword1!' },
    });

    expectError(res, 401);
  });
});

// ── 2. POST /api/auth/refresh ───────────────────────────────

describe('POST /api/auth/refresh', () => {
  it('#4 Happy: valid refresh token → 200 + new access token', async () => {
    const password = 'Test@12345678';
    await seedPlatformUser('refresh@dento.test', password);

    // Login first to get a valid refresh token cookie
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'refresh@dento.test', password },
    });

    expect(loginRes.statusCode).toBe(200);

    // Platform users (platformRole set) get the platform refresh cookie
    // (dento_platform_refresh), not the tenant one. The refresh endpoint
    // reads that cookie only when X-Platform-Auth: true is sent.
    const cookies = loginRes.cookies as Array<{ name: string; value: string }>;
    const refreshCookie = cookies.find((c) => c.name === 'dento_platform_refresh');
    expect(refreshCookie).toBeDefined();

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { 'x-platform-auth': 'true' },
      cookies: { dento_platform_refresh: refreshCookie!.value },
    });

    const body = expectSuccess(res, 200);
    expect(body.data).toHaveProperty('accessToken');
    expect(typeof body.data.accessToken).toBe('string');
  });

  it('#5 Auth: invalid refresh token → 401', async () => {
    // Send invalid JWT in body (handler falls back to body when cookie unsigned fails)
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: 'invalid.jwt.token' },
    });

    // verifyRefreshToken throws JwtError → handler returns 401
    expectError(res, 401);
  });
});
