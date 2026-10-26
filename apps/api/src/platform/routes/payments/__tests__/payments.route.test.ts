/**
 * Paymob webhook — signature & payment-matching security tests
 *
 * Regression for S3 (webhook forgery). The webhook must:
 *  1. require a valid HMAC whenever a secret is configured (no bypass by
 *     omitting the hmac field),
 *  2. fail closed in production when no secret is configured, and
 *  3. never fall back to marking an unrelated "most-recent pending" payment as
 *     completed — it must match deterministically by the Paymob order id.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    NODE_ENV: 'production' as string,
    PAYMOB_HMAC_SECRET: undefined as string | undefined,
  },
}));

const mockFindOne = vi.fn();

// ── Mocks ──────────────────────────────────────────────────

vi.mock('../../../../config/env.js', () => ({ env: mockEnv }));

vi.mock('../../../models/payment.model.js', () => ({
  SaaSPayment: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('../../../models/tenant.model.js', () => ({
  Tenant: { findById: vi.fn() },
}));

vi.mock('../../../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../../utils/api-response.js', () => ({
  apiResponse: vi.fn((reply: any, statusCode: number, data: unknown) =>
    reply.code(statusCode).send({ success: true, data }),
  ),
  apiError: vi.fn((reply: any, statusCode: number, message: string) =>
    reply.code(statusCode).send({ success: false, error: { message } }),
  ),
}));

vi.mock('../../../../tenant/middleware/index.js', () => ({
  authGuard: vi.fn().mockImplementation(async () => {}),
  tenantDbMiddleware: vi.fn().mockImplementation(async () => {}),
  roleGuard: vi.fn().mockImplementation(() => async () => {}),
}));

vi.mock('../../../../platform/middleware/index.js', () => ({
  platformGuard: vi.fn().mockImplementation(() => async () => {}),
}));

import { paymobPaymentRoutes } from '../payments.route.js';

// ── Helpers ────────────────────────────────────────────────

function webhookBody(overrides: Record<string, unknown> = {}) {
  return {
    type: 'TRANSACTION',
    obj: {
      id: 111,
      order: { id: 999 },
      success: true,
      amount_cents: 10000,
      currency: 'EGP',
    },
    ...overrides,
  };
}

let app: FastifyInstance;

beforeEach(async () => {
  vi.clearAllMocks();
  mockEnv.NODE_ENV = 'production';
  mockEnv.PAYMOB_HMAC_SECRET = undefined;

  app = Fastify();
  await app.register(paymobPaymentRoutes);
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

describe('POST /paymob/webhook — signature enforcement', () => {
  it('rejects an unsigned webhook when a secret is configured (no bypass by omitting hmac)', async () => {
    mockEnv.PAYMOB_HMAC_SECRET = 'top-secret';

    const res = await app.inject({
      method: 'POST',
      url: '/paymob/webhook',
      payload: webhookBody(), // note: no hmac field
    });

    expect(res.statusCode).toBe(400);
    expect(mockFindOne).not.toHaveBeenCalled(); // rejected before touching payments
  });

  it('rejects an invalid signature', async () => {
    mockEnv.PAYMOB_HMAC_SECRET = 'top-secret';

    const res = await app.inject({
      method: 'POST',
      url: '/paymob/webhook',
      payload: webhookBody({ hmac: 'deadbeef' }),
    });

    expect(res.statusCode).toBe(400);
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it('fails closed in production when no secret is configured', async () => {
    mockEnv.PAYMOB_HMAC_SECRET = undefined;
    mockEnv.NODE_ENV = 'production';

    const res = await app.inject({
      method: 'POST',
      url: '/paymob/webhook',
      payload: webhookBody(),
    });

    expect(res.statusCode).toBe(500);
    expect(mockFindOne).not.toHaveBeenCalled();
  });
});

describe('POST /paymob/webhook — deterministic payment matching', () => {
  beforeEach(() => {
    // Unverified path (non-production, no secret) so we can exercise matching.
    mockEnv.NODE_ENV = 'development';
    mockEnv.PAYMOB_HMAC_SECRET = undefined;
  });

  it('returns 404 and touches no other payment when the order id does not match (no pending fallback)', async () => {
    mockFindOne.mockResolvedValueOnce(null);

    const res = await app.inject({
      method: 'POST',
      url: '/paymob/webhook',
      payload: webhookBody(),
    });

    expect(res.statusCode).toBe(404);
    // Exactly one deterministic lookup by providerPaymentId — the dangerous
    // "newest pending payment" fallback query must be gone.
    expect(mockFindOne).toHaveBeenCalledTimes(1);
    expect(mockFindOne).toHaveBeenCalledWith({ providerPaymentId: '999' });
  });

  it('completes only the payment whose order id matches', async () => {
    const payment = {
      _id: 'pay-1',
      status: 'pending',
      methodDetails: {} as Record<string, unknown>,
      save: vi.fn().mockResolvedValue(undefined),
    };
    mockFindOne.mockResolvedValueOnce(payment);

    const res = await app.inject({
      method: 'POST',
      url: '/paymob/webhook',
      payload: webhookBody(),
    });

    expect(res.statusCode).toBe(200);
    expect(payment.status).toBe('completed');
    expect(payment.save).toHaveBeenCalledOnce();
  });
});
