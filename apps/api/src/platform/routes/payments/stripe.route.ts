import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { SaaSPayment } from '../../models/payment.model.js';
import { Tenant } from '../../models/tenant.model.js';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { logger } from '../../../utils/logger.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { env } from '../../../config/env.js';

/**
 * Stripe Payment Routes — §29 Payment Gateways
 *
 * Handles Stripe-specific payment flows for international tenants:
 * - Create Stripe PaymentIntent / Checkout Session
 * - Stripe webhook handler (signature verification)
 * - SEPA Direct Debit, Bank Transfer, Cards
 * - Subscription management for auto-pay tenants
 *
 * Used for all tenants outside Egypt (per §29 country-based routing).
 */

// ── Zod Schemas ─────────────────────────────────────────────

const createStripePaymentSchema = z
  .object({
    tenantId: z.string().min(1),
    invoiceId: z.string().min(1),
    amount: z.number().positive(),
    currency: z.string().default('USD'),
    method: z.enum(['card', 'sepa', 'bank_transfer']),
    returnUrl: z.string().url().optional(),
  })
  .strict();

const stripePaymentQuerySchema = z
  .object({
    tenantId: z.string().optional(),
    status: z.enum(['pending', 'completed', 'failed', 'refunded', 'expired']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

const setupAutoPaySchema = z
  .object({
    tenantId: z.string().min(1),
    paymentMethodId: z.string().min(1), // Stripe PaymentMethod ID
  })
  .strict();

// ── Interface ───────────────────────────────────────────────

// ── Stripe Fee Estimation ───────────────────────────────────

const STRIPE_FEES: Record<string, { percent: number; flat: number }> = {
  card: { percent: 2.9, flat: 0.3 }, // Standard Stripe card
  sepa: { percent: 0.8, flat: 0 }, // SEPA capped at €5
  bank_transfer: { percent: 0, flat: 0 }, // No Stripe fee (wire)
};

function calculateStripeFee(method: string, amount: number): number {
  const fee = STRIPE_FEES[method];
  if (!fee) return 0;
  return (amount * fee.percent) / 100 + fee.flat;
}

// ── Helper: Verify Stripe Webhook Signature ─────────────────

// Reject events whose signed timestamp is more than this far from now (replay
// protection). Matches Stripe's own recommended default tolerance of 5 minutes.
const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  webhookSecret: string,
  toleranceSeconds: number = STRIPE_SIGNATURE_TOLERANCE_SECONDS,
): boolean {
  // Stripe signature header format: t=timestamp,v1=signature[,v1=signature...]
  const parts = signatureHeader.split(',');
  const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2);
  // A rolled/rotated secret can produce multiple v1 entries — accept a match on any.
  const signatures = parts.filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));

  if (!timestamp || signatures.length === 0) return false;

  // Replay protection: reject events whose timestamp is outside the tolerance
  // window (too old OR too far in the future).
  const timestampSeconds = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(timestampSeconds)) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > toleranceSeconds) return false;

  // HMAC is computed over the RAW request bytes prefixed with the timestamp.
  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');
  const expectedBuf = Buffer.from(expected);

  return signatures.some((sig) => {
    const sigBuf = Buffer.from(sig);
    // timingSafeEqual throws on a length mismatch — treat as invalid.
    if (sigBuf.length !== expectedBuf.length) return false;
    try {
      return crypto.timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  });
}

// ── Routes ──────────────────────────────────────────────────

export async function stripePaymentRoutes(fastify: FastifyInstance) {
  // Capture the raw JSON body so the Stripe webhook can verify the
  // Stripe-Signature HMAC over the exact bytes Stripe signed. This parser is
  // scoped to this (encapsulated) plugin only, so it does not affect the sibling
  // Paymob plugin registered at the same prefix. Mirrors the WhatsApp bot route.
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    (req as FastifyRequest & { rawBody?: string }).rawBody =
      typeof body === 'string' ? body : body.toString();
    try {
      done(null, body ? JSON.parse(body as string) : {});
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  /**
   * POST /stripe/create — Create a Stripe payment
   *
   * In production: creates a Stripe PaymentIntent or Checkout Session.
   * Returns clientSecret for frontend to complete with Stripe.js.
   */
  fastify.post(
    '/stripe/create',
    { preHandler: [authGuard, platformGuard('platform_billing', 'create')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = createStripePaymentSchema.parse(request.body);

      // Verify tenant
      const tenant = await Tenant.findById(body.tenantId);
      if (!tenant) {
        return apiError(reply, 404, 'Tenant not found');
      }

      // Duplicate check
      const existing = await SaaSPayment.findOne({
        invoiceId: body.invoiceId,
        tenantId: body.tenantId,
        status: 'completed',
      });
      if (existing) {
        return apiError(reply, 400, 'Invoice already paid');
      }

      // Calculate fees
      const fee = calculateStripeFee(body.method, body.amount);
      const netAmount = body.amount - fee;

      // Create pending payment record
      const payment = await SaaSPayment.create({
        invoiceId: body.invoiceId,
        tenantId: body.tenantId,
        amount: body.amount,
        currency: body.currency,
        amountUSD: body.currency === 'USD' ? body.amount : 0, // Set from conversion
        provider: 'stripe',
        providerPaymentId: '', // Set after Stripe creates PaymentIntent
        providerTransactionId: '',
        method: body.method,
        methodDetails: {},
        status: 'pending',
        providerFee: fee,
        netAmount,
      });

      // In production: call Stripe API to create PaymentIntent
      // const paymentIntent = await stripe.paymentIntents.create({
      //   amount: Math.round(body.amount * 100), // Stripe uses cents
      //   currency: body.currency.toLowerCase(),
      //   payment_method_types: [body.method === 'card' ? 'card' : body.method],
      //   metadata: { paymentId: payment._id.toString(), tenantId: body.tenantId },
      // });
      // payment.providerPaymentId = paymentIntent.id;
      // await payment.save();

      const response = {
        paymentId: payment._id,
        // clientSecret: paymentIntent.client_secret, // For Stripe.js
        method: body.method,
        amount: body.amount,
        currency: body.currency,
        status: 'pending',
      };

      logger.info(
        { paymentId: payment._id, method: body.method, tenantId: body.tenantId },
        'Stripe payment intent created',
      );
      return apiResponse(reply, 201, response);
    },
  );

  /**
   * POST /stripe/webhook — Handle Stripe webhook events
   *
   * Verifies signature (Stripe-Signature header) and processes:
   * - payment_intent.succeeded
   * - payment_intent.payment_failed
   * - charge.refunded
   */
  fastify.post('/stripe/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const signatureHeader = request.headers['stripe-signature'] as string | undefined;
      const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
      const rawBody = (request as FastifyRequest & { rawBody?: string }).rawBody ?? '';

      // Signature verification is mandatory (mirrors the Paymob webhook). When a
      // secret is configured we always require and verify the signature over the
      // RAW bytes. When it is NOT configured we fail closed in production (money
      // must never be processed unverified) and only allow the unverified path
      // outside production for local testing.
      if (webhookSecret) {
        if (!signatureHeader) {
          logger.warn('Stripe webhook rejected: missing stripe-signature header');
          return apiError(reply, 400, 'Missing webhook signature');
        }
        const isValid = verifyStripeSignature(rawBody, signatureHeader, webhookSecret);
        if (!isValid) {
          logger.warn('Stripe webhook signature verification failed');
          return apiError(reply, 400, 'Invalid webhook signature');
        }
      } else if (env.NODE_ENV === 'production') {
        logger.error('Stripe webhook rejected: STRIPE_WEBHOOK_SECRET is not configured');
        return apiError(reply, 500, 'Webhook verification not configured');
      } else {
        logger.warn(
          'Stripe webhook signature NOT verified: STRIPE_WEBHOOK_SECRET unset (non-production only)',
        );
      }

      const event = request.body as {
        type: string;
        data: {
          object: {
            id: string;
            status: string;
            amount: number;
            currency: string;
            payment_method_details?: {
              type?: string;
              card?: { brand?: string; last4?: string };
              sepa_debit?: { last4?: string };
            };
            metadata?: { paymentId?: string; tenantId?: string };
            last_payment_error?: { message?: string };
          };
        };
      };

      const paymentIntent = event.data.object;
      const paymentId = paymentIntent.metadata?.paymentId;

      // Find payment record
      let payment = paymentId ? await SaaSPayment.findById(paymentId) : null;
      if (!payment) {
        payment = await SaaSPayment.findOne({
          providerPaymentId: paymentIntent.id,
        });
      }

      if (!payment) {
        logger.warn({ stripeId: paymentIntent.id }, 'Stripe webhook: payment not found');
        // Return 200 to acknowledge — Stripe requires this
        return apiResponse(reply, 200, { received: true });
      }

      switch (event.type) {
        case 'payment_intent.succeeded': {
          payment.status = 'completed';
          payment.paidAt = new Date();
          payment.providerPaymentId = paymentIntent.id;

          // Extract card/SEPA details
          const details = paymentIntent.payment_method_details;
          if (details?.card) {
            payment.methodDetails.cardBrand = details.card.brand || null;
            payment.methodDetails.last4 = details.card.last4 || null;
          }

          await payment.save();
          logger.info({ paymentId: payment._id }, 'Stripe payment succeeded');
          break;
        }

        case 'payment_intent.payment_failed': {
          payment.status = 'failed';
          payment.failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
          payment.providerPaymentId = paymentIntent.id;
          await payment.save();
          logger.info({ paymentId: payment._id }, 'Stripe payment failed');
          break;
        }

        case 'charge.refunded': {
          payment.status = 'refunded';
          await payment.save();
          logger.info({ paymentId: payment._id }, 'Stripe payment refunded');
          break;
        }

        default:
          logger.debug({ type: event.type }, 'Unhandled Stripe event');
      }

      return apiResponse(reply, 200, { received: true });
    } catch (err) {
      logger.error({ err }, 'Stripe webhook processing error');
      return apiError(reply, 400, 'Webhook processing failed');
    }
  });

  /**
   * GET /stripe/payments — List Stripe payments
   */
  fastify.get(
    '/stripe/payments',
    { preHandler: [authGuard, platformGuard('platform_billing', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = stripePaymentQuerySchema.parse(request.query);
      const filter: Record<string, unknown> = { provider: 'stripe' };

      if (query.tenantId) {
        filter.tenantId = query.tenantId;
      }

      if (query.status) filter.status = query.status;

      const skip = (query.page - 1) * query.limit;
      const [payments, total] = await Promise.all([
        SaaSPayment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean(),
        SaaSPayment.countDocuments(filter),
      ]);

      return apiResponse(reply, 200, {
        payments,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      });
    },
  );

  /**
   * GET /stripe/payments/:id — Get single Stripe payment
   */
  fastify.get(
    '/stripe/payments/:id',
    { preHandler: [authGuard, platformGuard('platform_billing', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const payment = await SaaSPayment.findById(id).lean();

      if (!payment) {
        return apiError(reply, 404, 'Payment not found');
      }

      return apiResponse(reply, 200, payment);
    },
  );

  /**
   * POST /stripe/payments/:id/refunds — Refund a Stripe payment
   */
  fastify.post(
    '/stripe/payments/:id/refunds',
    { preHandler: [authGuard, platformGuard('platform_billing', 'create')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const payment = await SaaSPayment.findById(id);

      if (!payment) {
        return apiError(reply, 404, 'Payment not found');
      }
      if (payment.provider !== 'stripe') {
        return apiError(reply, 400, 'Not a Stripe payment');
      }
      if (payment.status !== 'completed') {
        return apiError(reply, 400, `Cannot refund payment with status: ${payment.status}`);
      }

      // In production: call stripe.refunds.create({ payment_intent: payment.providerPaymentId })
      payment.status = 'refunded';
      await payment.save();

      logger.info({ paymentId: id, amount: payment.amount }, 'Stripe payment refunded');
      return apiResponse(reply, 200, { id, status: 'refunded', amount: payment.amount });
    },
  );

  /**
   * POST /stripe/setup-autopay — Setup automatic recurring payments
   *
   * Stores a Stripe PaymentMethod for future recurring charges.
   */
  fastify.post(
    '/stripe/setup-autopay',
    { preHandler: [authGuard, platformGuard('platform_billing', 'create')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = setupAutoPaySchema.parse(request.body);

      const tenant = await Tenant.findById(body.tenantId);
      if (!tenant) {
        return apiError(reply, 404, 'Tenant not found');
      }

      // In production: attach PaymentMethod to Stripe Customer
      // const customer = await stripe.customers.retrieve(tenant.stripeCustomerId);
      // await stripe.paymentMethods.attach(body.paymentMethodId, { customer: customer.id });
      // await stripe.customers.update(customer.id, {
      //   invoice_settings: { default_payment_method: body.paymentMethodId },
      // });

      logger.info(
        { tenantId: body.tenantId, paymentMethodId: body.paymentMethodId },
        'Auto-pay setup initiated',
      );
      return apiResponse(reply, 200, {
        tenantId: body.tenantId,
        autoPay: true,
        status: 'configured',
      });
    },
  );

  /**
   * GET /stripe/stats — Stripe payment statistics
   */
  fastify.get(
    '/stripe/stats',
    { preHandler: [authGuard, platformGuard('platform_billing', 'read')] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const [stats] = await SaaSPayment.aggregate([
        { $match: { provider: 'stripe' } },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            completedPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            failedPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
            },
            totalRevenue: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] },
            },
            totalFees: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$providerFee', 0] },
            },
            totalNet: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$netAmount', 0] },
            },
          },
        },
      ]);

      const methodBreakdown = await SaaSPayment.aggregate([
        { $match: { provider: 'stripe', status: 'completed' } },
        {
          $group: {
            _id: '$method',
            count: { $sum: 1 },
            total: { $sum: '$amount' },
            fees: { $sum: '$providerFee' },
          },
        },
        { $sort: { total: -1 } },
      ]);

      return apiResponse(reply, 200, {
        overview: stats || {
          totalPayments: 0,
          completedPayments: 0,
          failedPayments: 0,
          totalRevenue: 0,
          totalFees: 0,
          totalNet: 0,
        },
        byMethod: methodBreakdown,
      });
    },
  );
}
