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
import { PAYMOB_FEES } from '@dento/shared';
import type { PaymobMethod } from '@dento/shared';

/**
 * Paymob Payment Routes — §29 Payment Gateways
 *
 * Handles Paymob-specific payment flows for Egyptian tenants:
 * - Create payment intent (auth → order → payment key)
 * - Fawry reference generation (offline payments)
 * - Paymob webhook handler (HMAC-SHA512 verification)
 * - Payment history & status queries
 *
 * Flow: Auth Token → Order Registration → Payment Key → Frontend Iframe → Webhook
 */

// ── Zod Schemas ─────────────────────────────────────────────

const createPaymentSchema = z
  .object({
    tenantId: z.string().min(1),
    invoiceId: z.string().min(1),
    amount: z.number().positive(),
    currency: z.string().default('EGP'),
    method: z.enum(['card', 'fawry', 'wallet', 'instapay', 'valu', 'meeza_digital']),
    methodDetails: z
      .object({
        walletPhone: z.string().optional(),
        valuMonths: z.number().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const paymentQuerySchema = z
  .object({
    tenantId: z.string().optional(),
    status: z.enum(['pending', 'completed', 'failed', 'refunded', 'expired']).optional(),
    provider: z.enum(['paymob', 'stripe']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

const paymobWebhookSchema = z
  .object({
    obj: z
      .object({
        id: z.number(),
        order: z.object({ id: z.number() }).strict(),
        success: z.boolean(),
        amount_cents: z.number(),
        currency: z.string(),
        source_data: z
          .object({
            type: z.string().optional(),
            sub_type: z.string().optional(),
            pan: z.string().optional(),
          })
          .strict()
          .optional(),
        data: z.record(z.string(), z.unknown()).optional(),
      })
      .strict(),
    type: z.string().optional(),
    hmac: z.string().optional(),
  })
  .strict();

// ── Interface ───────────────────────────────────────────────

// ── Helper: Calculate Paymob fees ───────────────────────────

function calculatePaymobFee(method: PaymobMethod, amount: number): number {
  const feeStructure = PAYMOB_FEES[method];
  if (!feeStructure) return 0;
  return (amount * feeStructure.percent) / 100 + feeStructure.flat;
}

// ── Helper: Generate Fawry reference ────────────────────────

function generateFawryReference(): string {
  // 10-digit numeric reference (per §29 spec) — uses CSPRNG
  const bytes = crypto.randomBytes(10);
  return Array.from(bytes, (b) => b % 10).join('');
}

// ── Helper: Verify Paymob HMAC ──────────────────────────────

function verifyPaymobHmac(
  payload: Record<string, unknown>,
  receivedHmac: string,
  hmacSecret: string,
): boolean {
  // Paymob uses HMAC-SHA512 on a concatenated string of specific fields
  const obj = payload.obj as Record<string, unknown>;
  const order = obj.order as Record<string, unknown>;
  const concatenated = [
    obj.amount_cents,
    obj.created_at,
    obj.currency,
    obj.error_occured,
    obj.has_parent_transaction,
    obj.id,
    order.id,
    obj.is_3d_secure,
    obj.is_auth,
    obj.is_capture,
    obj.is_refunded,
    obj.is_standalone_payment,
    obj.is_voided,
    obj.owner,
    obj.pending,
    obj.source_data ? (obj.source_data as Record<string, unknown>).pan : '',
    obj.source_data ? (obj.source_data as Record<string, unknown>).sub_type : '',
    obj.source_data ? (obj.source_data as Record<string, unknown>).type : '',
    obj.success,
  ].join('');

  const computed = crypto.createHmac('sha512', hmacSecret).update(concatenated).digest('hex');
  // timingSafeEqual throws on a length mismatch — treat a malformed signature
  // as invalid rather than letting it crash the handler.
  if (computed.length !== receivedHmac.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(receivedHmac));
}

// ── Route: Paymob Payment Routes ────────────────────────────

export async function paymobPaymentRoutes(fastify: FastifyInstance) {
  /**
   * POST /paymob/create — Create a Paymob payment intent
   *
   * Flow: Auth Token → Order → Payment Key → Return to frontend
   * Frontend then renders Paymob iframe or redirect.
   */
  fastify.post(
    '/paymob/create',
    { preHandler: [authGuard, platformGuard('platform_billing', 'create')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = createPaymentSchema.parse(request.body);

      // Verify tenant exists
      const tenant = await Tenant.findById(body.tenantId);
      if (!tenant) {
        return apiError(reply, 404, 'Tenant not found');
      }

      // Check for duplicate invoiceId + tenantId with completed status
      const existingPayment = await SaaSPayment.findOne({
        invoiceId: body.invoiceId,
        tenantId: body.tenantId,
        status: 'completed',
      });
      if (existingPayment) {
        return apiError(reply, 400, 'Invoice already paid');
      }

      // Calculate fees
      const method = body.method as PaymobMethod;
      const fee = calculatePaymobFee(method, body.amount);
      const netAmount = body.amount - fee;

      // Build method details
      const methodDetails: Record<string, unknown> = {};
      if (body.method === 'fawry') {
        methodDetails.fawryReference = generateFawryReference();
        methodDetails.fawryExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h
      } else if (body.method === 'wallet' && body.methodDetails?.walletPhone) {
        methodDetails.walletPhone = body.methodDetails.walletPhone;
      } else if (body.method === 'valu' && body.methodDetails?.valuMonths) {
        methodDetails.valuMonths = body.methodDetails.valuMonths;
        methodDetails.monthlyAmount = body.amount / body.methodDetails.valuMonths;
      }

      // Create payment record (pending)
      const payment = await SaaSPayment.create({
        invoiceId: body.invoiceId,
        tenantId: body.tenantId,
        amount: body.amount,
        currency: body.currency,
        amountUSD: 0, // Will be set from exchange rate conversion
        provider: 'paymob',
        providerPaymentId: '', // Set after Paymob auth
        providerTransactionId: '',
        method: body.method,
        methodDetails,
        status: 'pending',
        providerFee: fee,
        netAmount,
      });

      // In production: call Paymob Auth → Order → Payment Key
      // For now, return the payment record for frontend to initiate the flow
      const response: Record<string, unknown> = {
        paymentId: payment._id,
        orderId: payment._id.toString(),
        method: body.method,
        amount: body.amount,
        currency: body.currency,
        status: 'pending',
      };

      // Add Fawry-specific response (§29 Fawry-Spezialfall)
      if (body.method === 'fawry') {
        response.fawryReference = methodDetails.fawryReference;
        response.fawryExpiresAt = methodDetails.fawryExpiresAt;
        response.instructions = `Pay ${body.amount} ${body.currency} with reference ${methodDetails.fawryReference as string} at any Fawry point. Valid for 48 hours.`;
      }

      logger.info(
        { paymentId: payment._id, method: body.method, tenantId: body.tenantId },
        'Paymob payment intent created',
      );
      return apiResponse(reply, 201, response);
    },
  );

  /**
   * POST /paymob/webhook — Handle Paymob callback
   *
   * Paymob sends transaction notifications via webhook.
   * HMAC-SHA512 verification for security.
   */
  fastify.post('/paymob/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = paymobWebhookSchema.parse(request.body);
      const hmacSecret = env.PAYMOB_HMAC_SECRET;

      // Signature verification is mandatory. When a secret is configured we
      // always require and verify the hmac field. When it is NOT configured we
      // fail closed in production (a misconfiguration must not process money)
      // and only allow the unverified path outside production for local testing.
      if (hmacSecret) {
        if (!payload.hmac) {
          logger.warn('Paymob webhook rejected: missing hmac signature');
          return apiError(reply, 400, 'Missing webhook signature');
        }
        const isValid = verifyPaymobHmac(
          request.body as Record<string, unknown>,
          payload.hmac,
          hmacSecret,
        );
        if (!isValid) {
          logger.warn('Paymob webhook HMAC verification failed');
          return apiError(reply, 400, 'Invalid webhook signature');
        }
      } else if (env.NODE_ENV === 'production') {
        logger.error('Paymob webhook rejected: PAYMOB_HMAC_SECRET is not configured');
        return apiError(reply, 500, 'Webhook verification not configured');
      } else {
        logger.warn(
          'Paymob webhook signature NOT verified: PAYMOB_HMAC_SECRET unset (non-production only)',
        );
      }

      const { obj } = payload;
      const orderId = obj.order.id.toString();

      // Match deterministically by the stored Paymob order id. The previous
      // "most-recent pending payment" fallback was removed — it let a forged or
      // mismatched webhook mark an unrelated pending invoice as completed.
      // NOTE: the real Paymob integration must persist the Paymob order id into
      // providerPaymentId at create time so this lookup can link the payment.
      const payment = await SaaSPayment.findOne({ providerPaymentId: orderId });

      if (!payment) {
        logger.warn({ orderId }, 'Paymob webhook: no payment matches this order id');
        return apiError(reply, 404, 'Payment not found');
      }

      // Update payment based on Paymob result
      if (obj.success) {
        payment.status = 'completed';
        payment.paidAt = new Date();
        payment.providerPaymentId = orderId;
        payment.providerTransactionId = obj.id.toString();

        // Extract card details if available
        if (obj.source_data) {
          if (obj.source_data.sub_type) {
            payment.methodDetails.cardBrand = obj.source_data.sub_type;
          }
          if (obj.source_data.pan) {
            payment.methodDetails.last4 = obj.source_data.pan.slice(-4);
          }
        }
      } else {
        payment.status = 'failed';
        payment.failureReason = 'Payment declined by provider';
        payment.providerPaymentId = orderId;
        payment.providerTransactionId = obj.id.toString();
      }

      await payment.save();

      logger.info(
        { paymentId: payment._id, status: payment.status, orderId },
        'Paymob webhook processed',
      );
      return apiResponse(reply, 200, { received: true });
    } catch (err) {
      logger.error({ err }, 'Paymob webhook processing error');
      return apiError(reply, 400, 'Webhook processing failed');
    }
  });

  /**
   * GET /paymob/payments — List payments (with filters)
   */
  fastify.get(
    '/paymob/payments',
    { preHandler: [authGuard, platformGuard('platform_billing', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = paymentQuerySchema.parse(request.query);
      const filter: Record<string, unknown> = { provider: 'paymob' };

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
   * GET /paymob/payments/:id — Get single payment details
   */
  fastify.get(
    '/paymob/payments/:id',
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
   * POST /paymob/payments/:id/expiration — Expire a pending Fawry payment
   *
   * Used when Fawry 48h window expires without payment.
   */
  fastify.post(
    '/paymob/payments/:id/expiration',
    { preHandler: [authGuard, platformGuard('platform_billing', 'create')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const payment = await SaaSPayment.findById(id);

      if (!payment) {
        return apiError(reply, 404, 'Payment not found');
      }
      if (payment.status !== 'pending') {
        return apiError(reply, 400, `Cannot expire payment with status: ${payment.status}`);
      }

      payment.status = 'expired';
      await payment.save();

      logger.info({ paymentId: id }, 'Payment expired');
      return apiResponse(reply, 200, { id, status: 'expired' });
    },
  );

  /**
   * POST /paymob/payments/:id/refunds — Refund a completed payment
   */
  fastify.post(
    '/paymob/payments/:id/refunds',
    { preHandler: [authGuard, platformGuard('platform_billing', 'create')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const payment = await SaaSPayment.findById(id);

      if (!payment) {
        return apiError(reply, 404, 'Payment not found');
      }
      if (payment.status !== 'completed') {
        return apiError(reply, 400, `Cannot refund payment with status: ${payment.status}`);
      }

      // In production: call Paymob Refund API
      payment.status = 'refunded';
      await payment.save();

      logger.info({ paymentId: id, amount: payment.amount }, 'Payment refunded');
      return apiResponse(reply, 200, { id, status: 'refunded', amount: payment.amount });
    },
  );

  /**
   * GET /paymob/stats — Payment statistics summary
   */
  fastify.get(
    '/paymob/stats',
    { preHandler: [authGuard, platformGuard('platform_billing', 'read')] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const [stats] = await SaaSPayment.aggregate([
        { $match: { provider: 'paymob' } },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            completedPayments: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            failedPayments: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            pendingPayments: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
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

      // Method breakdown
      const methodBreakdown = await SaaSPayment.aggregate([
        { $match: { provider: 'paymob', status: 'completed' } },
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
          pendingPayments: 0,
          totalRevenue: 0,
          totalFees: 0,
          totalNet: 0,
        },
        byMethod: methodBreakdown,
      });
    },
  );
}
