/**
 * Contract Tests — 15. Billing (/api/platform/billing)
 *
 * Tests: #117–#120 from Phase 3A tracker
 * Error pattern: GET /invoices re-throws ZodError → 422; others catch {} → 500
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

async function seedSaaSPayment() {
  const SaaSPayment =
    mongoose.models.SaaSPayment ||
    mongoose.model(
      'SaaSPayment',
      new mongoose.Schema({}, { strict: false, collection: 'saas_payments' }),
    );

  return SaaSPayment.create({
    invoiceId: `inv_${Date.now()}`,
    tenantId: new mongoose.Types.ObjectId(),
    amount: 99.99,
    currency: 'USD',
    amountUSD: 99.99,
    provider: 'stripe',
    providerPaymentId: `pi_${Date.now()}`,
    providerTransactionId: `txn_${Date.now()}`,
    method: 'card',
    status: 'completed',
    paidAt: new Date(),
  });
}

// ── 1. GET /stats ───────────────────────────────────────────

describe('GET /api/platform/billing/stats', () => {
  it('#117 Happy: billing stats → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/billing/stats',
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 2. GET /invoices ────────────────────────────────────────

describe('GET /api/platform/billing/invoices', () => {
  it('#118 Happy: paginated invoice list → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedSaaSPayment();

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/billing/invoices',
      }),
    );

    expectPaginated(res);
  });
});

// ── 3. GET /invoices/:id ────────────────────────────────────

describe('GET /api/platform/billing/invoices/:id', () => {
  it('#119 Happy: get invoice by ID → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const payment = await seedSaaSPayment();

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: `/api/platform/billing/invoices/${payment._id}`,
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 4. POST /invoices/:id/remind ────────────────────────────

async function seedPendingPayment() {
  const SaaSPayment =
    mongoose.models.SaaSPayment ||
    mongoose.model(
      'SaaSPayment',
      new mongoose.Schema({}, { strict: false, collection: 'saas_payments' }),
    );

  return SaaSPayment.create({
    invoiceId: `inv_${Date.now()}`,
    tenantId: new mongoose.Types.ObjectId(),
    amount: 49.99,
    currency: 'USD',
    amountUSD: 49.99,
    provider: 'stripe',
    providerPaymentId: `pi_${Date.now()}`,
    providerTransactionId: `txn_${Date.now()}`,
    method: 'card',
    status: 'pending',
  });
}

describe('POST /api/platform/billing/invoices/:id/remind', () => {
  it('#120 Happy: send invoice reminder → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    const payment = await seedPendingPayment();

    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: `/api/platform/billing/invoices/${payment._id}/remind`,
      }),
    );

    expectSuccess(res, 200);
  });
});
