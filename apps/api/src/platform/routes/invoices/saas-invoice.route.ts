import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { recordPlatformAuditFromRequest } from '../../services/platform-audit.service.js';
import {
  createInvoice,
  updateInvoice,
  issueInvoice,
  cancelInvoice,
  deleteDraftInvoice,
  listSaaSInvoices,
  getSaaSInvoiceById,
} from '../../services/saas-invoice.service.js';

/**
 * SaaS Invoice Routes — Platform API (Dev Portal)
 *
 * Full CRUD for SaaS invoices with lifecycle management.
 *
 *   - GET    /api/platform/invoices             — List invoices
 *   - GET    /api/platform/invoices/:id         — Invoice detail
 *   - POST   /api/platform/invoices             — Create invoice (draft)
 *   - PATCH  /api/platform/invoices/:id         — Update invoice
 *   - POST   /api/platform/invoices/:id/issue   — Issue invoice (draft → issued)
 *   - POST   /api/platform/invoices/:id/cancel  — Cancel invoice
 *   - DELETE /api/platform/invoices/:id         — Delete draft invoice
 */

// ── Validation Schemas ──────────────────────────────────────

const objectIdParam = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId'),
});

const invoiceItemSchema = z.object({
  type: z.enum(['module', 'extra_storage', 'extra_users', 'extra_branches', 'custom', 'discount']),
  description: z.string().min(1).max(500),
  moduleSlug: z.string().nullable().optional(),
  quantity: z.number().min(0),
  unitPrice: z.number(),
  total: z.number().optional(), // computed by pre-save hook
  couponCode: z.string().nullable().optional(),
});

const createInvoiceSchema = z.object({
  tenantId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid tenant ID'),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  items: z.array(invoiceItemSchema).min(1, 'At least one line item required'),
  currency: z.string().min(3).max(3),
  dueDate: z.string().datetime().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
});

const updateInvoiceSchema = z
  .object({
    items: z.array(invoiceItemSchema).min(1).optional(),
    periodStart: z.string().datetime().optional(),
    periodEnd: z.string().datetime().optional(),
    dueDate: z.string().datetime().optional(),
    taxRate: z.number().min(0).max(100).optional(),
    notes: z.string().max(2000).optional(),
    currency: z.string().min(3).max(3).optional(),
  })
  .strict();

const cancelSchema = z.object({
  reason: z.string().min(1).max(1000),
});

const listQuerySchema = z
  .object({
    tenantId: z.string().optional(),
    status: z
      .enum(['draft', 'issued', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded'])
      .optional(),
    source: z.enum(['manual', 'auto']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

// ── Helper ──────────────────────────────────────────────────

function getUserId(request: FastifyRequest): string | undefined {
  return (request as unknown as { user?: { _id?: string } }).user?._id;
}
/**
 * All handlers in this file run behind `platformGuard`, so the caller is a
 * platform user with a valid platform role. We pass the explicit `platform`
 * scope to the service so the data-layer skips the tenant filter.
 */
function platformScope(request: FastifyRequest): { kind: 'platform'; actorId?: string } {
  return { kind: 'platform', actorId: getUserId(request) };
}
// ── Route Registration ──────────────────────────────────────

export async function saasInvoiceRoutes(fastify: FastifyInstance) {
  // ── List Invoices ─────────────────────────────────────────
  fastify.get(
    '/',
    { preHandler: [authGuard, platformGuard('platform_billing', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = listQuerySchema.parse(request.query);
        const result = await listSaaSInvoices(
          {
            tenantId: query.tenantId,
            status: query.status,
            source: query.source,
            startDate: query.startDate ? new Date(query.startDate) : undefined,
            endDate: query.endDate ? new Date(query.endDate) : undefined,
            search: query.search,
            page: query.page,
            limit: query.limit,
          },
          platformScope(request),
        );
        const r = result as {
          data: unknown;
          meta: { page: number; limit: number; total: number; totalPages: number };
        };
        return apiResponse(reply, 200, r.data, undefined, r.meta);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to list invoices');
      }
    },
  );

  // ── Get Invoice Detail ────────────────────────────────────
  fastify.get(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_billing', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = objectIdParam.parse(request.params);
        const invoice = (await getSaaSInvoiceById(id, platformScope(request))) as {
          tenantId?: string;
        } | null;
        if (!invoice) return apiError(reply, 404, 'Invoice not found');
        await recordPlatformAuditFromRequest(request, {
          action: 'platform.invoice.read',
          targetType: 'SaaSInvoice',
          targetId: id,
          tenantId: invoice.tenantId,
        });
        return apiResponse(reply, 200, invoice);
      } catch {
        return apiError(reply, 500, 'Failed to fetch invoice');
      }
    },
  );

  // ── Create Invoice ────────────────────────────────────────
  fastify.post(
    '/',
    { preHandler: [authGuard, platformGuard('platform_billing', 'create')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = createInvoiceSchema.parse(request.body);
        const invoice = await createInvoice(
          body as unknown as Parameters<typeof createInvoice>[0],
          getUserId(request),
        );
        await recordPlatformAuditFromRequest(request, {
          action: 'platform.invoice.create',
          targetType: 'SaaSInvoice',
          targetId: String(invoice._id),
          tenantId: body.tenantId,
          metadata: { invoiceNumber: invoice.invoiceNumber },
        });
        return apiResponse(reply, 201, invoice, 'Invoice created as draft');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        const msg = err instanceof Error ? err.message : 'Failed to create invoice';
        return apiError(reply, 400, msg);
      }
    },
  );

  // ── Update Invoice ────────────────────────────────────────
  fastify.patch(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_billing', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = objectIdParam.parse(request.params);
        const body = updateInvoiceSchema.parse(request.body);
        const invoice = await updateInvoice(
          id,
          body as unknown as Parameters<typeof updateInvoice>[1],
          platformScope(request),
          getUserId(request),
        );
        await recordPlatformAuditFromRequest(request, {
          action: 'platform.invoice.update',
          targetType: 'SaaSInvoice',
          targetId: id,
          tenantId: invoice.tenantId,
        });
        return apiResponse(reply, 200, invoice, 'Invoice updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        const msg = err instanceof Error ? err.message : 'Failed to update invoice';
        return apiError(reply, 400, msg);
      }
    },
  );

  // ── Issue Invoice ─────────────────────────────────────────
  fastify.post(
    '/:id/issue',
    { preHandler: [authGuard, platformGuard('platform_billing', 'create')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = objectIdParam.parse(request.params);
        const invoice = await issueInvoice(id, platformScope(request), getUserId(request));
        await recordPlatformAuditFromRequest(request, {
          action: 'platform.invoice.issue',
          targetType: 'SaaSInvoice',
          targetId: id,
          tenantId: invoice.tenantId,
        });
        return apiResponse(reply, 200, invoice, 'Invoice issued');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to issue invoice';
        return apiError(reply, 400, msg);
      }
    },
  );

  // ── Cancel Invoice ────────────────────────────────────────
  fastify.post(
    '/:id/cancel',
    { preHandler: [authGuard, platformGuard('platform_billing', 'create')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = objectIdParam.parse(request.params);
        const { reason } = cancelSchema.parse(request.body);
        const invoice = await cancelInvoice(id, reason, platformScope(request), getUserId(request));
        await recordPlatformAuditFromRequest(request, {
          action: 'platform.invoice.cancel',
          targetType: 'SaaSInvoice',
          targetId: id,
          tenantId: invoice.tenantId,
          metadata: { reason },
        });
        return apiResponse(reply, 200, invoice, 'Invoice cancelled');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        const msg = err instanceof Error ? err.message : 'Failed to cancel invoice';
        return apiError(reply, 400, msg);
      }
    },
  );

  // ── Delete Draft Invoice ──────────────────────────────────
  fastify.delete(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_billing', 'delete')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = objectIdParam.parse(request.params);
        const result = await deleteDraftInvoice(id, platformScope(request));
        await recordPlatformAuditFromRequest(request, {
          action: 'platform.invoice.delete',
          targetType: 'SaaSInvoice',
          targetId: id,
          metadata: { invoiceNumber: result.invoiceNumber },
        });
        return apiResponse(reply, 200, result, 'Draft invoice deleted');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to delete invoice';
        return apiError(reply, 400, msg);
      }
    },
  );
}
