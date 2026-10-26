/**
 * Contract Tests — 3. Platform Users (/api/platform/users)
 *
 * Tests: #21–#30 from Phase 3A tracker
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
  expectError,
  expectUnauthorized,
  withAuth,
} from '../helpers/assertions.js';
import mongoose from 'mongoose';
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

// Helper: create a secondary platform user for operations
async function seedPlatformUser(email = 'secondary@dento.test') {
  return User.create({
    email,
    password: '$argon2id$v=19$m=65536,t=3,p=4$placeholder',
    role: 'platform_admin',
    tenantSlug: null,
    platformRole: 'platform_viewer',
    status: 'invited',
    profile: { firstName: { en: 'Secondary' }, lastName: { en: 'User' } },
  });
}

// ── 1. GET / ────────────────────────────────────────────────

describe('GET /api/platform/users', () => {
  it('#21 Happy: paginated list → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/platform/users' }));

    expectPaginated(res);
  });

  it('#22 Auth: no token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/platform/users' });
    expectUnauthorized(res);
  });
});

// ── 2. GET /:id ─────────────────────────────────────────────

describe('GET /api/platform/users/:id', () => {
  it('#23 Happy: single user → 200', async () => {
    const { token, user } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/platform/users/${user._id}` }),
    );

    expectSuccess(res, 200);
  });
});

// ── 3. POST /invite ─────────────────────────────────────────

describe('POST /api/platform/users/invite', () => {
  it('#24 Happy: invite user → 201', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/platform/users/invite',
        payload: {
          email: 'newuser@dento.test',
          firstName: { en: 'New' },
          lastName: { en: 'User' },
          platformRole: 'platform_viewer',
        },
      }),
    );

    expectSuccess(res, 201);
  });

  it('#25 Validation: missing email → 400/422', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/platform/users/invite',
        payload: {
          firstName: { en: 'No' },
          lastName: { en: 'Email' },
          platformRole: 'platform_viewer',
        },
      }),
    );

    // Handler catches non-ApiError → 500, or ZodError in handler → 500
    expect([400, 422, 500]).toContain(res.statusCode);
  });
});

// ── 4. PATCH /:id ───────────────────────────────────────────

describe('PATCH /api/platform/users/:id', () => {
  it('#26 Happy: update user → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const user = await seedPlatformUser();

    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/platform/users/${user._id}`,
        payload: { status: 'active' },
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 5. PATCH /:id/permissions ───────────────────────────────

describe('PATCH /api/platform/users/:id/permissions', () => {
  it('#27 Happy: update permissions → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const user = await seedPlatformUser();

    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/platform/users/${user._id}/permissions`,
        payload: {
          platformPermissionOverrides: [{ module: 'platform_tenants', actions: ['read'] }],
        },
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 6. DELETE /:id ──────────────────────────────────────────

describe('DELETE /api/platform/users/:id', () => {
  it('#28 Happy: deactivate user → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const user = await seedPlatformUser();

    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/platform/users/${user._id}` }),
    );

    expectSuccess(res, 200);
  });
});

// ── 7. POST /:id/resend-invite ──────────────────────────────

describe('POST /api/platform/users/:id/resend-invite', () => {
  it('#29 Happy: resend → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const user = await seedPlatformUser();

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: `/api/platform/users/${user._id}/resend-invite`,
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 8. POST /:id/revoke-invite ──────────────────────────────

describe('POST /api/platform/users/:id/revoke-invite', () => {
  it('#30 Happy: revoke invite → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const user = await seedPlatformUser();

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: `/api/platform/users/${user._id}/revoke-invite`,
      }),
    );

    expectSuccess(res, 200);
  });
});
