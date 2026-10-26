/**
 * Payment Routes — Tenant-level payments for patient invoices
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 (#9 Payments)
 * Per V2_DATABASE.md §5.8 — payments collection
 * Per V2_DATABASE.md §5.9 — reconciliation collection
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 *
 * IMPORTANT: These are tenant-level patient invoice payments.
 * NOT the same as platform SaaS subscription payments at /api/payments/paymob|stripe.
 *
 * Endpoints:
 *   - GET    /api/tenant-payments                         — List payments
 *   - GET    /api/tenant-payments/:id                     — Get single payment
 *   - POST   /api/tenant-payments                         — Record a payment
 *   - POST   /api/tenant-payments/:id/refund              — Refund a payment
 *   - GET    /api/tenant-payments/reconciliation           — List reconciliations
 *   - POST   /api/tenant-payments/reconciliation           — Open reconciliation
 *   - PUT    /api/tenant-payments/reconciliation/:id       — Close/review reconciliation
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createPaymentSchema,
  paymentQuerySchema,
  refundPaymentSchema,
  createReconciliationSchema,
  updateReconciliationSchema,
  reconciliationQuerySchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { PaymentService } from '../../services/payment.service.js';
import { RATE_LIMITS } from '../../../config/constants.js';

// ── Helper to extract tenant context from request ───────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

// ── Route Registration ──────────────────────────────────────

export async function tenantPaymentRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];
  const readGuard = [...preHandler, roleGuard('payments', 'read')];

  // GET /tenant-payments — List payments (paginated, filterable)
  fastify.get('/', { preHandler: readGuard }, async (request, reply) => {
    try {
      const query = paymentQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new PaymentService(tenantDb);
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list payments');
    }
  });

  // GET /tenant-payments/:id — Get single payment
  fastify.get('/:id', { preHandler: readGuard }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const service = new PaymentService(tenantDb);
      const payment = await service.getById(id);
      return apiResponse(reply, 200, { payment });
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to fetch payment');
    }
  });

  // POST /tenant-payments — Record a payment against an invoice
  fastify.post(
    '/',
    {
      preHandler: [...preHandler, roleGuard('payments', 'create')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const data = createPaymentSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new PaymentService(tenantDb);
        const payment = await service.create(data, userId);
        return apiResponse(reply, 201, { payment }, 'Payment recorded');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to record payment');
      }
    },
  );

  // POST /tenant-payments/:id/refund — Refund a payment
  fastify.post(
    '/:id/refund',
    {
      preHandler: [...preHandler, roleGuard('payments', 'update')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = refundPaymentSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new PaymentService(tenantDb);
        const payment = await service.refund(id, data, userId);
        return apiResponse(reply, 200, { payment }, 'Payment refunded');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to refund payment');
      }
    },
  );

  // ── Reconciliation Endpoints ──────────────────────────────

  // GET /tenant-payments/reconciliation — List reconciliations
  fastify.get('/reconciliation', { preHandler: readGuard }, async (request, reply) => {
    try {
      const query = reconciliationQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new PaymentService(tenantDb);
      const result = await service.listReconciliations(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list reconciliations');
    }
  });

  // POST /tenant-payments/reconciliation — Open a new day's reconciliation
  fastify.post(
    '/reconciliation',
    {
      preHandler: [...preHandler, roleGuard('payments', 'create')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const data = createReconciliationSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new PaymentService(tenantDb);
        const reconciliation = await service.openReconciliation(data, userId);
        return apiResponse(reply, 201, { reconciliation }, 'Reconciliation opened');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to open reconciliation');
      }
    },
  );

  // PUT /tenant-payments/reconciliation/:id — Close/review reconciliation
  fastify.put(
    '/reconciliation/:id',
    {
      preHandler: [...preHandler, roleGuard('payments', 'update')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateReconciliationSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new PaymentService(tenantDb);
        const reconciliation = await service.updateReconciliation(id, data, userId);
        return apiResponse(reply, 200, { reconciliation }, 'Reconciliation updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to update reconciliation');
      }
    },
  );
}
