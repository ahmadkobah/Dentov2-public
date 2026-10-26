/**
 * Contract Tests — 11. Sessions (/api/platform/user-sessions)
 *
 * Tests: #101–#105 from Phase 3A tracker
 * Error pattern: No try/catch → ZodError → 422 (global handler)
 */

import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
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
import crypto from 'crypto';
import { User } from '../../../src/platform/models/user.model.js';

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

async function seedUserSession(overrides: Record<string, unknown> = {}) {
  const UserSession =
    mongoose.models.UserSession ||
    mongoose.model(
      'UserSession',
      new mongoose.Schema({}, { strict: false, collection: 'user_sessions' }),
    );

  const userId = overrides.userId ?? new mongoose.Types.ObjectId();
  return UserSession.create({
    userId,
    sessionId: crypto.randomUUID(),
    refreshTokenJti: crypto.randomUUID(),
    deviceType: 'desktop',
    isActive: true,
    lastActivityAt: new Date(),
    expiresAt: new Date(Date.now() + 86400000 * 7),
    ipAddress: '127.0.0.1',
    userAgent: 'TestAgent/1.0',
    ...overrides,
  });
}

async function seedSessionUser(firstName: string, lastName: string, email: string) {
  return User.create({
    email,
    password: '$argon2id$v=19$m=65536,t=3,p=4$placeholder-hash',
    role: 'platform_admin',
    tenantSlug: null,
    platformRole: 'platform_viewer',
    status: 'active',
    tokenVersion: 1,
    profile: { firstName: { en: firstName }, lastName: { en: lastName } },
  });
}

// ── 1. GET / ────────────────────────────────────────────────

describe('GET /api/platform/user-sessions', () => {
  it('#101 Happy: paginated session list → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedUserSession();

    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/platform/user-sessions' }),
    );

    expectPaginated(res);
  });

  it('#102 Auth: no token → 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/platform/user-sessions',
    });

    expectUnauthorized(res);
  });

  it('filters sessions by populated user name/email search → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const targetUser = await seedSessionUser('Alice', 'Sessions', 'alice.sessions@dento.test');
    const otherUser = await seedSessionUser('Bob', 'Sessions', 'bob.sessions@dento.test');
    await seedUserSession({ userId: targetUser._id });
    await seedUserSession({ userId: otherUser._id });

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/user-sessions?search=Alice',
      }),
    );

    const body = expectPaginated(res);
    expect(body.meta.total).toBe(1);
    expect(body.data[0]).toEqual(
      expect.objectContaining({
        email: 'alice.sessions@dento.test',
        userName: 'Alice Sessions',
      }),
    );
  });

  it('treats search input as literal text instead of raw regex → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedUserSession();

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/user-sessions?search=(',
      }),
    );

    const body = expectPaginated(res);
    expect(body.meta.total).toBe(0);
  });

  it('filters sessions by computed status → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedUserSession({ isActive: true, expiresAt: new Date(Date.now() + 86400000) });
    await seedUserSession({ isActive: true, expiresAt: new Date(Date.now() - 86400000) });
    await seedUserSession({ isActive: false, expiresAt: new Date(Date.now() + 86400000) });

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/user-sessions?status=expired',
      }),
    );

    const body = expectPaginated(res);
    expect(body.meta.total).toBe(1);
    expect(body.data[0].status).toBe('expired');
  });
});

// ── 2. GET /stats ───────────────────────────────────────────

describe('GET /api/platform/user-sessions/stats', () => {
  it('#103 Happy: session stats → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/user-sessions/stats',
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 3. DELETE /:id ──────────────────────────────────────────

describe('DELETE /api/platform/user-sessions/:id', () => {
  it('#104 Happy: terminate session → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const session = await seedUserSession();

    const res = await app.inject(
      withAuth(token, {
        method: 'DELETE',
        url: `/api/platform/user-sessions/${session._id}`,
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 4. DELETE /user/:userId ─────────────────────────────────

describe('DELETE /api/platform/user-sessions/user/:userId', () => {
  it('#105 Happy: terminate all sessions for user → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const session = await seedUserSession();

    const res = await app.inject(
      withAuth(token, {
        method: 'DELETE',
        url: `/api/platform/user-sessions/user/${session.userId}`,
      }),
    );

    expectSuccess(res, 200);
  });
});
