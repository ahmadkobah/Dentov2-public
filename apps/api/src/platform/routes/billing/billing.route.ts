import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import {
  getBillingStats,
  listInvoices,
  getInvoiceById,
  sendDunningReminder,
} from '../../services/billing.service.js';

/**
 * Platform Billing Routes — Phase 6 (Gap A4)
 *
 * Per MASTER_PLAN §29 — SaaS Billing Dashboard
 * RBAC Module: platform_billing
 *
 * Billing stats, invoice management, and dunning.
 * Complements existing payment routes (Paymob/Stripe transaction flow).
 *
 *   - GET  /api/platform/billing/stats               — MRR, ARR, revenue breakdown
 *   - GET  /api/platform/billing/invoices             — List invoices
 *   - GET  /api/platform/billing/invoices/:id         — Invoice detail
 *   - POST /api/platform/billing/invoices/:id/remind  — Send dunning reminder
 */

// ── Schemas ─────────────────────────────────────────────────

const objectIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId'),
});

const invoiceQuerySchema = z
  .object({
    tenantId: z.string().optional(),
    status: z.enum(['pending', 'completed', 'failed', 'refunded', 'expired']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

// ── Route Registration ──────────────────────────────────────

export async function billingRoutes(fastify: FastifyInstance) {
  // ── GET /api/platform/billing/stats ───────────────────────
  fastify.get(
    '/stats',
    {
      preHandler: [authGuard, platformGuard('platform_billing', 'read')],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const stats = await getBillingStats();
        return apiResponse(reply, 200, stats);
      } catch {
        return apiError(reply, 500, 'Failed to fetch billing stats');
      }
    },
  );

  // ── GET /api/platform/billing/invoices ────────────────────
  fastify.get(
    '/invoices',
    {
      preHandler: [authGuard, platformGuard('platform_billing', 'read')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const filter = invoiceQuerySchema.parse(request.query);

        const result = await listInvoices({
          tenantId: filter.tenantId,
          status: filter.status,
          startDate: filter.startDate ? new Date(filter.startDate) : undefined,
          endDate: filter.endDate ? new Date(filter.endDate) : undefined,
          search: filter.search,
          page: filter.page,
          limit: filter.limit,
        });

        return apiResponse(reply, 200, result.data, undefined, result.meta);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to list invoices');
      }
    },
  );

  // ── GET /api/platform/billing/invoices/:id ────────────────
  fastify.get(
    '/invoices/:id',
    {
      preHandler: [authGuard, platformGuard('platform_billing', 'read')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = objectIdParamSchema.parse(request.params);
        const invoice = await getInvoiceById(id);
        if (!invoice) return apiError(reply, 404, 'Invoice not found');
        return apiResponse(reply, 200, invoice);
      } catch {
        return apiError(reply, 500, 'Failed to fetch invoice');
      }
    },
  );

  // ── POST /api/platform/billing/invoices/:id/remind ────────
  fastify.post(
    '/invoices/:id/remind',
    {
      preHandler: [authGuard, platformGuard('platform_billing', 'create')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = objectIdParamSchema.parse(request.params);
        const result = await sendDunningReminder(id);
        if (!result) return apiError(reply, 404, 'Invoice not found or not pending');
        return apiResponse(reply, 200, result, 'Reminder sent');
      } catch {
        return apiError(reply, 500, 'Failed to send reminder');
      }
    },
  );
}
