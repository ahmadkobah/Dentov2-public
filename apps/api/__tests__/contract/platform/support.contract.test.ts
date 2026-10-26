/**
 * Contract Tests — 21. Support Tickets (/api/support)
 *
 * Tests: #156–#165 from Phase 3A tracker
 * Error pattern: try/catch catches ZodError → 400
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

async function seedSupportTicket() {
  const SupportTicket =
    mongoose.models.SupportTicket ||
    mongoose.model(
      'SupportTicket',
      new mongoose.Schema({}, { strict: false, collection: 'support_tickets' }),
    );

  return SupportTicket.create({
    ticketNumber: `TKT-${Date.now()}`,
    tenantId: new mongoose.Types.ObjectId().toString(),
    subject: 'Cannot access billing page',
    description: 'When I click on billing, I see a blank white page with no content loading.',
    category: 'bug',
    priority: 'high',
    status: 'open',
    messages: [
      {
        sender: {
          userId: new mongoose.Types.ObjectId().toString(),
          email: 'admin@clinic.com',
          name: 'Admin User',
          role: 'admin',
        },
        message: 'When I click on billing, I see a blank white page with no content loading.',
        isInternal: false,
      },
    ],
    createdBy: {
      userId: new mongoose.Types.ObjectId().toString(),
      email: 'admin@clinic.com',
      name: 'Admin User',
      role: 'admin',
    },
  });
}

// ── 1. GET /tickets ─────────────────────────────────────────

describe('GET /api/support/tickets', () => {
  it('#156 Happy: paginated ticket list → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedSupportTicket();

    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/support/tickets' }));

    expectSuccess(res, 200);
  });

  it('#157 Auth: no token → 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/support/tickets',
    });

    expectUnauthorized(res);
  });
});

// ── 2. GET /tickets/stats ───────────────────────────────────

describe('GET /api/support/tickets/stats', () => {
  it('#158 Happy: ticket stats → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/support/tickets/stats',
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 3. GET /tickets/:id ─────────────────────────────────────

describe('GET /api/support/tickets/:id', () => {
  it('#159 Happy: get ticket by ID → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const ticket = await seedSupportTicket();

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: `/api/support/tickets/${ticket._id}`,
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 4. POST /tickets ────────────────────────────────────────

describe('POST /api/support/tickets', () => {
  it('#160 Happy: create ticket → 201', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/support/tickets',
        payload: {
          tenantId: new mongoose.Types.ObjectId().toString(),
          subject: 'Login issues after update',
          description:
            'Users are reporting that they cannot log in after the latest platform update.',
          category: 'bug',
          priority: 'urgent',
        },
      }),
    );

    expectSuccess(res, 201);
  });

  it('#161 Validation: missing required fields → 400', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/support/tickets',
        payload: {},
      }),
    );

    // Handler catches ZodError → apiError(400)
    expectError(res, 400);
  });
});

// ── 5. PATCH /tickets/:id ───────────────────────────────────

describe('PATCH /api/support/tickets/:id', () => {
  it('#162 Happy: update ticket → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const ticket = await seedSupportTicket();

    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/support/tickets/${ticket._id}`,
        payload: { status: 'in_progress', priority: 'urgent' },
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 6. DELETE /tickets/:id ──────────────────────────────────

describe('DELETE /api/support/tickets/:id', () => {
  it('#163 Happy: delete ticket → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const ticket = await seedSupportTicket();

    const res = await app.inject(
      withAuth(token, {
        method: 'DELETE',
        url: `/api/support/tickets/${ticket._id}`,
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 7. POST /tickets/:id/messages ───────────────────────────

describe('POST /api/support/tickets/:id/messages', () => {
  it('#164 Happy: add message to ticket → 201', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const ticket = await seedSupportTicket();

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: `/api/support/tickets/${ticket._id}/messages`,
        payload: {
          message: 'We are investigating this issue. Will update shortly.',
          isInternal: false,
        },
      }),
    );

    expectSuccess(res, 201);
  });
});

// ── 8. PATCH /tickets/:id/assign ────────────────────────────

describe('PATCH /api/support/tickets/:id/assign', () => {
  it('#165 Happy: assign ticket → 200', async () => {
    const { token, user } = await createPlatformUserAndToken('platform_owner');
    const ticket = await seedSupportTicket();

    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/support/tickets/${ticket._id}/assign`,
        payload: {
          userId: user._id.toString(),
          name: 'Support Agent',
        },
      }),
    );

    expectSuccess(res, 200);
  });
});
