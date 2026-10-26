/**
 * Contract Tests — Phase 3B: 26. Chat (/api/chat)
 *
 * Tests: #415–#427 from Phase 3B tracker
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

// ── Channels ──

describe('GET /api/chat/channels', () => {
  it('#415 Happy: channel list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/chat/channels' }));
    expectSuccess(res, 200);
  });
});

describe('POST /api/chat/channels', () => {
  it('#416 Happy: create channel → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/chat/channels',
        payload: { name: 'General', type: 'group' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('GET /api/chat/channels/:id', () => {
  it('#417 Happy: channel detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/chat/channels/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/chat/channels/:id', () => {
  it('#418 Happy: update channel → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/chat/channels/${FAKE_ID}`,
        payload: { name: 'Updated Channel' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/chat/channels/:id', () => {
  it('#419 Happy: delete channel → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/chat/channels/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/chat/channels/:id/members', () => {
  it('#420 Happy: add member → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: `/api/chat/channels/${FAKE_ID}/members`,
        payload: { userId: FAKE_ID },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/chat/channels/:id/members/:userId', () => {
  it('#421 Happy: remove member → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'DELETE',
        url: `/api/chat/channels/${FAKE_ID}/members/${FAKE_ID}`,
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/chat/channels/:id/read', () => {
  it('#422 Happy: mark read → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'POST', url: `/api/chat/channels/${FAKE_ID}/read` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

// ── Messages ──

describe('GET /api/chat/channels/:id/messages', () => {
  it('#423 Happy: message list → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/chat/channels/${FAKE_ID}/messages` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/chat/channels/:id/messages', () => {
  it('#424 Happy: send message → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: `/api/chat/channels/${FAKE_ID}/messages`,
        payload: { content: 'Hello team!' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/chat/messages/:id', () => {
  it('#425 Happy: edit message → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/chat/messages/${FAKE_ID}`,
        payload: { content: 'Edited message' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('DELETE /api/chat/messages/:id', () => {
  it('#426 Happy: delete message → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/chat/messages/${FAKE_ID}` }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/chat/upload', () => {
  it('#427 Happy: upload attachment → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/chat/upload',
        payload: { fileName: 'photo.jpg', contentType: 'image/jpeg' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});
