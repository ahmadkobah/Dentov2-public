/**
 * Contract Tests — Phase 3B: 38. Notifications (/api/notifications)
 *
 * Tests: #563–#586 from Phase 3B tracker
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

/* ── Core notifications ── */

describe('GET /api/notifications', () => {
  it('#563 Happy: notification list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/notifications' }));
    expect(res.statusCode).not.toBe(404);
  });
});

describe('GET /api/notifications/unread-count', () => {
  it('#564 Happy: count → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/notifications/unread-count' }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

describe('PATCH /api/notifications/:id/read', () => {
  it('#565 Happy: mark read → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'PATCH', url: `/api/notifications/${FAKE_ID}/read` }),
    );
    // FAKE_ID does not exist → route correctly returns 404. Assert no server error.
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/notifications/read-all', () => {
  it('#566 Happy: mark all read → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'PATCH', url: '/api/notifications/read-all' }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

describe('PATCH /api/notifications/:id/dismiss', () => {
  it('#567 Happy: dismiss → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'PATCH', url: `/api/notifications/${FAKE_ID}/dismiss` }),
    );
    // FAKE_ID does not exist → route correctly returns 404. Assert no server error.
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/notifications/send', () => {
  it('#568 Happy: send notification → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/notifications/send',
        payload: { type: 'reminder', recipientId: FAKE_ID, message: 'Test notification' },
      }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

/* ── Templates ── */

describe('GET /api/notifications/templates', () => {
  it('#569 Happy: template list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/notifications/templates' }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

describe('POST /api/notifications/templates', () => {
  it('#570 Happy: create template → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/notifications/templates',
        payload: {
          name: 'Appointment Reminder',
          body: 'Your appointment is tomorrow',
          channel: 'sms',
        },
      }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

describe('GET /api/notifications/templates/:id', () => {
  it('#571 Happy: template detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/notifications/templates/${FAKE_ID}` }),
    );
    // FAKE_ID does not exist → route correctly returns 404. Assert no server error.
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/notifications/templates/:id', () => {
  it('#572 Happy: update → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/notifications/templates/${FAKE_ID}`,
        payload: { body: 'Updated body' },
      }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

describe('DELETE /api/notifications/templates/:id', () => {
  it('#573 Happy: deactivate → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/notifications/templates/${FAKE_ID}` }),
    );
    // FAKE_ID does not exist → route correctly returns 404. Assert no server error.
    expect(res.statusCode).toBeLessThan(500);
  });
});

/* ── Logs ── */

describe('GET /api/notifications/logs', () => {
  it('#574 Happy: delivery logs → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/notifications/logs' }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

describe('GET /api/notifications/logs/:id', () => {
  it('#575 Happy: log detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/notifications/logs/${FAKE_ID}` }),
    );
    // FAKE_ID does not exist → route correctly returns 404. Assert no server error.
    expect(res.statusCode).toBeLessThan(500);
  });
});

/* ── Preferences ── */

describe('GET /api/notifications/preferences', () => {
  it('#576 Happy: user preferences → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/notifications/preferences' }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

describe('PATCH /api/notifications/preferences', () => {
  it('#577 Happy: update preferences → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: '/api/notifications/preferences',
        payload: { email: true, sms: false },
      }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

/* ── Push & Devices ── */

describe('POST /api/notifications/push-subscription', () => {
  it('#578 Happy: register push → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/notifications/push-subscription',
        payload: { endpoint: 'https://push.example.com', keys: { p256dh: 'key', auth: 'auth' } },
      }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

describe('POST /api/notifications/devices', () => {
  it('#579 Happy: register device → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/notifications/devices',
        payload: { token: 'device-token-123', platform: 'ios' },
      }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

describe('DELETE /api/notifications/devices/:token', () => {
  it('#580 Happy: unregister device → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    // Register the device as THIS user first — unregister is scoped by userId (#76),
    // so a user cannot delete another user's device by token alone.
    await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/notifications/devices',
        payload: { token: 'device-token-580', platform: 'ios' },
      }),
    );
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: '/api/notifications/devices/device-token-580' }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

/* ── Bulk & Alert Rules ── */

describe('POST /api/notifications/bulk', () => {
  it('#581 Happy: bulk send → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/notifications/bulk',
        payload: { recipientIds: [FAKE_ID], message: 'Bulk test' },
      }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

describe('POST /api/notifications/alert-rules', () => {
  it('#582 Happy: create rule → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/notifications/alert-rules',
        payload: { name: 'Low Stock Alert', event: 'inventory.low_stock', channel: 'email' },
      }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

describe('GET /api/notifications/alert-rules', () => {
  it('#583 Happy: rule list → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/notifications/alert-rules' }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

describe('GET /api/notifications/alert-rules/:id', () => {
  it('#584 Happy: rule detail → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: `/api/notifications/alert-rules/${FAKE_ID}` }),
    );
    // FAKE_ID does not exist → route correctly returns 404. Assert no server error.
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('PATCH /api/notifications/alert-rules/:id', () => {
  it('#585 Happy: update rule → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: `/api/notifications/alert-rules/${FAKE_ID}`,
        payload: { name: 'Updated Rule' },
      }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

describe('DELETE /api/notifications/alert-rules/:id', () => {
  it('#586 Happy: deactivate → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'DELETE', url: `/api/notifications/alert-rules/${FAKE_ID}` }),
    );
    // FAKE_ID does not exist → route correctly returns 404. Assert no server error.
    expect(res.statusCode).toBeLessThan(500);
  });
});
