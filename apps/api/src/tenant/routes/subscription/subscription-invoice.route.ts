import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware } from '../../middleware/index.js';
import {
  listSaaSInvoices,
  getSaaSInvoiceById,
} from '../../../platform/services/saas-invoice.service.js';

/**
 * Subscription Invoice Routes — Tenant API (Admin Portal)
 *
 * Tenant-scoped read-only endpoints so clinic admins can view their own SaaS invoices.
 *
 *   - GET /api/subscription/invoices          — List invoices for this tenant
 *   - GET /api/subscription/invoices/:id      — Get single invoice detail
 */

function getTenantId(request: unknown): string | undefined {
  const tenant = (request as unknown as Record<string, unknown>).tenant as
    | { id?: string; _id?: string }
    | undefined;
  return tenant?.id ?? tenant?._id;
}

const listQuerySchema = z.object({
  status: z
    .enum(['draft', 'issued', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded'])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

const idParam = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID'),
});

export async function subscriptionInvoiceRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // ─── LIST OWN INVOICES ────────────────────────────────────
  fastify.get('/', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = getTenantId(request);
      if (!tenantId) return apiError(reply, 401, 'Tenant context required');

      const query = listQuerySchema.parse(request.query);
      const result = await listSaaSInvoices(
        {
          status: query.status,
          page: query.page,
          limit: query.limit,
        },
        { kind: 'tenant', tenantId },
      );

      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof z.ZodError) return apiError(reply, 400, 'Invalid query');
      return apiError(reply, 500, 'Failed to list invoices');
    }
  });

  // ─── GET SINGLE INVOICE ───────────────────────────────────
  fastify.get('/:id', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = getTenantId(request);
      if (!tenantId) return apiError(reply, 401, 'Tenant context required');

      const { id } = idParam.parse(request.params);
      // Service-layer scope filter guarantees the invoice belongs to this tenant.
      // A wrong tenant returns null → 404 (avoids existence oracle).
      const invoice = await getSaaSInvoiceById(id, { kind: 'tenant', tenantId });

      if (!invoice) return apiError(reply, 404, 'Invoice not found');

      return apiResponse(reply, 200, invoice);
    } catch (err) {
      if (err instanceof z.ZodError) return apiError(reply, 400, 'Invalid ID');
      return apiError(reply, 500, 'Failed to fetch invoice');
    }
  });
}
