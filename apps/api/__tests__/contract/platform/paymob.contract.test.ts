/**
 * Contract Tests — 27. Paymob Payments (/api/payments/paymob)
 *
 * Tests: #183–#188 from Phase 3A tracker
 * Error pattern: POST /create → ZodError bubbles to global handler → 422
 *                POST /webhook → try/catch → 400
 *                GET endpoints → Zod query parse bubbles → 422
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
import { expectSuccess, expectError, expectUnauthorized, withAuth } from '../helpers/assertions.js';
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

// Helper: seed a Tenant for payment creation
async function seedTenant() {
  const Tenant =
    mongoose.models.Tenant ||
    mongoose.model('Tenant', new mongoose.Schema({}, { strict: false, collection: 'tenants' }));

  return Tenant.create({
    name: { en: 'PaymobTestClinic' },
    slug: `paymob-clinic-${Date.now()}`,
    status: 'active',
    ownerId: new mongoose.Types.ObjectId(),
    contact: { email: 'paymob@test.com', phone: '+201234567890', address: { country: 'EG' } },
  });
}

// Helper: seed a Paymob payment record
async function seedPaymobPayment(overrides: Record<string, unknown> = {}) {
  const SaaSPayment =
    mongoose.models.SaaSPayment ||
    mongoose.model(
      'SaaSPayment',
      new mongoose.Schema({}, { strict: false, collection: 'saas_payments' }),
    );

  return SaaSPayment.create({
    invoiceId: `inv_pm_${Date.now()}`,
    tenantId: new mongoose.Types.ObjectId(),
    amount: 500,
    currency: 'EGP',
    amountUSD: 0,
    provider: 'paymob',
    providerPaymentId: '',
    providerTransactionId: '',
    method: 'card',
    methodDetails: {},
    status: 'pending',
    providerFee: 15,
    netAmount: 485,
    ...overrides,
  });
}

// ── 1. POST /paymob/create ─────────────────────────────────

describe('POST /api/payments/paymob/create', () => {
  it('#183 Happy: create Paymob payment intent → 201', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const tenant = await seedTenant();

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/payments/paymob/create',
        payload: {
          tenantId: tenant._id.toString(),
          invoiceId: `inv_${Date.now()}`,
          amount: 250,
          method: 'card',
        },
      }),
    );

    expectSuccess(res, 201);
  });

  it('#184 Sad: invalid body → 422', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/payments/paymob/create',
        payload: { amount: -10 },
      }),
    );

    expectError(res, 422);
  });
});

// ── 2. POST /paymob/webhook (PUBLIC) ────────────────────────

describe('POST /api/payments/paymob/webhook', () => {
  it('#185 Happy: valid webhook payload → 200', async () => {
    // The webhook matches a payment deterministically by the Paymob order id
    // (the insecure "newest pending payment" fallback was removed), so the
    // seeded payment must carry providerPaymentId === the webhook's order id.
    await seedPaymobPayment({ providerPaymentId: '67890', status: 'pending' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/payments/paymob/webhook',
      payload: {
        obj: {
          id: 12345,
          order: { id: 67890 },
          success: true,
          amount_cents: 25000,
          currency: 'EGP',
        },
      },
    });

    expectSuccess(res, 200);
  });
});

// ── 3. GET /paymob/payments ─────────────────────────────────

describe('GET /api/payments/paymob/payments', () => {
  it('#186 Happy: list paymob payments → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedPaymobPayment({ status: 'completed' });

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/payments/paymob/payments',
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 4. GET /paymob/payments/:id ─────────────────────────────

describe('GET /api/payments/paymob/payments/:id', () => {
  it('#187 Sad: no auth → 401', async () => {
    const payment = await seedPaymobPayment();

    const res = await app.inject({
      method: 'GET',
      url: `/api/payments/paymob/payments/${payment._id}`,
    });

    expectUnauthorized(res);
  });
});

// ── 5. GET /paymob/stats ────────────────────────────────────

describe('GET /api/payments/paymob/stats', () => {
  it('#188 Happy: payment stats → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/payments/paymob/stats',
      }),
    );

    expectSuccess(res, 200);
  });
});
