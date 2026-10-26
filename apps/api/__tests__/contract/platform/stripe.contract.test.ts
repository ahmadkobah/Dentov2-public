/**
 * Contract Tests — 28. Stripe Payments (/api/payments/stripe)
 *
 * Tests: #189–#195 from Phase 3A tracker
 * Error pattern: POST /create, POST /setup-autopay → ZodError bubbles → 422
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

// Helper: seed a Tenant
async function seedTenant() {
  const Tenant =
    mongoose.models.Tenant ||
    mongoose.model('Tenant', new mongoose.Schema({}, { strict: false, collection: 'tenants' }));

  return Tenant.create({
    name: { en: 'StripeTestClinic' },
    slug: `stripe-clinic-${Date.now()}`,
    status: 'active',
    ownerId: new mongoose.Types.ObjectId(),
    contact: { email: 'stripe@test.com', phone: '+201234567890', address: { country: 'US' } },
  });
}

// Helper: seed a Stripe payment record
async function seedStripePayment(overrides: Record<string, unknown> = {}) {
  const SaaSPayment =
    mongoose.models.SaaSPayment ||
    mongoose.model(
      'SaaSPayment',
      new mongoose.Schema({}, { strict: false, collection: 'saas_payments' }),
    );

  return SaaSPayment.create({
    invoiceId: `inv_st_${Date.now()}`,
    tenantId: new mongoose.Types.ObjectId(),
    amount: 49.99,
    currency: 'USD',
    amountUSD: 49.99,
    provider: 'stripe',
    providerPaymentId: `pi_${Date.now()}`,
    providerTransactionId: '',
    method: 'card',
    methodDetails: {},
    status: 'pending',
    providerFee: 1.75,
    netAmount: 48.24,
    ...overrides,
  });
}

// ── 1. POST /stripe/create ──────────────────────────────────

describe('POST /api/payments/stripe/create', () => {
  it('#189 Happy: create Stripe payment intent → 201', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const tenant = await seedTenant();

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/payments/stripe/create',
        payload: {
          tenantId: tenant._id.toString(),
          invoiceId: `inv_${Date.now()}`,
          amount: 99.99,
          method: 'card',
        },
      }),
    );

    expectSuccess(res, 201);
  });

  it('#190 Sad: invalid body → 422', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/payments/stripe/create',
        payload: { method: 'invalid_method' },
      }),
    );

    expectError(res, 422);
  });
});

// ── 2. POST /stripe/webhook (PUBLIC) ────────────────────────

describe('POST /api/payments/stripe/webhook', () => {
  it('#191 Happy: valid webhook event → 200', async () => {
    // Seed a pending payment so webhook can find it
    const payment = await seedStripePayment({ status: 'pending', providerPaymentId: 'pi_test123' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/payments/stripe/webhook',
      payload: {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
            status: 'succeeded',
            amount: 9999,
            currency: 'usd',
            metadata: { paymentId: payment._id.toString() },
          },
        },
      },
    });

    expectSuccess(res, 200);
  });
});

// ── 3. GET /stripe/payments ─────────────────────────────────

describe('GET /api/payments/stripe/payments', () => {
  it('#192 Happy: list Stripe payments → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedStripePayment({ status: 'completed' });

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/payments/stripe/payments',
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 4. GET /stripe/payments/:id ─────────────────────────────

describe('GET /api/payments/stripe/payments/:id', () => {
  it('#193 Sad: no auth → 401', async () => {
    const payment = await seedStripePayment();

    const res = await app.inject({
      method: 'GET',
      url: `/api/payments/stripe/payments/${payment._id}`,
    });

    expectUnauthorized(res);
  });
});

// ── 5. POST /stripe/setup-autopay ───────────────────────────

describe('POST /api/payments/stripe/setup-autopay', () => {
  it('#194 Happy: setup auto-pay → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const tenant = await seedTenant();

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/payments/stripe/setup-autopay',
        payload: {
          tenantId: tenant._id.toString(),
          paymentMethodId: 'pm_test_visa',
        },
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 6. GET /stripe/stats ────────────────────────────────────

describe('GET /api/payments/stripe/stats', () => {
  it('#195 Happy: Stripe payment stats → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/payments/stripe/stats',
      }),
    );

    expectSuccess(res, 200);
  });
});
