/**
 * Invoice Routes — Full CRUD + issue + generate from treatment plan
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 (#8 Invoices)
 * Per V2_DATABASE.md §5.7 — invoices collection
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 * Per BUILD_RULES §3.5 — Relative paths, prefix set in server.ts
 *
 * Endpoints:
 *   - GET    /api/invoices                                — List (paginated, filterable)
 *   - GET    /api/invoices/:id                            — Get single invoice
 *   - POST   /api/invoices                                — Create invoice
 *   - PUT    /api/invoices/:id                            — Update invoice (draft only)
 *   - DELETE /api/invoices/:id                            — Cancel invoice (soft)
 *   - POST   /api/invoices/:id/issue                      — Issue invoice (draft → issued)
 *   - POST   /api/invoices/generate-from-treatment-plan   — Auto-generate from plan
 *   - GET    /api/invoices/stats                         — Invoice statistics
 *   - POST   /api/invoices/:id/void                      — Void invoice
 *   - GET    /api/invoices/:id/pdf                       — Get PDF data
 *   - POST   /api/invoices/:id/send                      — Send invoice
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import { z } from 'zod';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  invoiceQuerySchema,
  generateInvoiceFromPlanSchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { InvoiceService } from '../../services/invoice.service.js';
import { RATE_LIMITS } from '../../../config/constants.js';

// Phase 7.3 — refund body schema
const refundInvoiceSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().min(1).max(500),
});

// ── Helper to extract tenant context from request ───────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

// ── Route Registration ──────────────────────────────────────

export async function invoiceRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];
  const readGuard = [...preHandler, roleGuard('invoices', 'read')];

  // GET /invoices — List invoices (paginated, filterable)
  fastify.get('/', { preHandler: readGuard }, async (request, reply) => {
    try {
      const query = invoiceQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new InvoiceService(tenantDb);
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list invoices');
    }
  });

  // GET /invoices/:id — Get single invoice
  fastify.get('/:id', { preHandler: readGuard }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const service = new InvoiceService(tenantDb);
      const invoice = await service.getById(id);
      return apiResponse(reply, 200, { invoice });
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to fetch invoice');
    }
  });

  // POST /invoices — Create new invoice
  fastify.post(
    '/',
    {
      preHandler: [...preHandler, roleGuard('invoices', 'create')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const data = createInvoiceSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InvoiceService(tenantDb);
        const invoice = await service.create(data, userId);
        return apiResponse(reply, 201, { invoice }, 'Invoice created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to create invoice');
      }
    },
  );

  // PUT /invoices/:id — Update invoice (draft only)
  fastify.put(
    '/:id',
    {
      preHandler: [...preHandler, roleGuard('invoices', 'update')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateInvoiceSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InvoiceService(tenantDb);
        const invoice = await service.update(id, data, userId);
        return apiResponse(reply, 200, { invoice }, 'Invoice updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update invoice');
      }
    },
  );

  // DELETE /invoices/:id — Cancel invoice (soft — set status = cancelled)
  fastify.delete(
    '/:id',
    {
      preHandler: [...preHandler, roleGuard('invoices', 'delete')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InvoiceService(tenantDb);
        const invoice = await service.cancel(id, userId);
        return apiResponse(reply, 200, { invoice }, 'Invoice cancelled');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to cancel invoice');
      }
    },
  );

  // POST /invoices/:id/issue — Issue invoice (draft → issued)
  fastify.post(
    '/:id/issue',
    {
      preHandler: [...preHandler, roleGuard('invoices', 'update')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InvoiceService(tenantDb);
        const invoice = await service.issue(id, userId);
        return apiResponse(reply, 200, { invoice }, 'Invoice issued');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to issue invoice');
      }
    },
  );

  // POST /invoices/generate-from-treatment-plan — Auto-generate from plan
  fastify.post(
    '/generate-from-treatment-plan',
    {
      preHandler: [...preHandler, roleGuard('invoices', 'create')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const data = generateInvoiceFromPlanSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InvoiceService(tenantDb);
        const invoice = await service.generateFromTreatmentPlan(data, userId);
        return apiResponse(reply, 201, { invoice }, 'Invoice generated from treatment plan');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to generate invoice from treatment plan');
      }
    },
  );

  // GET /invoices/stats — Invoice statistics / dashboard metrics
  fastify.get('/stats', { preHandler: readGuard }, async (request, reply) => {
    try {
      const { branchId } = (request.query || {}) as { branchId?: string };
      const tenantDb = getTenantDb(request);
      const service = new InvoiceService(tenantDb);
      const stats = await service.getStats(branchId);
      return apiResponse(reply, 200, { stats });
    } catch (err) {
      return apiError(reply, 500, 'Failed to fetch invoice stats');
    }
  });

  // POST /invoices/:id/void — Void an invoice
  fastify.post(
    '/:id/void',
    {
      preHandler: [...preHandler, roleGuard('invoices', 'delete')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InvoiceService(tenantDb);
        const invoice = await service.void(id, userId);
        return apiResponse(reply, 200, { invoice }, 'Invoice voided');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to void invoice');
      }
    },
  );

  // POST /invoices/:id/refund — Refund an invoice (Phase 7.3)
  fastify.post(
    '/:id/refund',
    {
      preHandler: [...preHandler, roleGuard('invoices', 'update')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = refundInvoiceSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InvoiceService(tenantDb);
        const result = await service.refundInvoice(id, body.amount, body.reason, userId);
        return apiResponse(reply, 200, result, 'Refund processed');
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || err.name === 'ApiError')) throw err;
        return apiError(reply, 500, 'Failed to refund invoice');
      }
    },
  );

  // GET /invoices/:id/pdf — Get structured PDF data for client-side rendering
  fastify.get('/:id/pdf', { preHandler: readGuard }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const service = new InvoiceService(tenantDb);
      const data = await service.getPdfData(id);
      return apiResponse(reply, 200, data);
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to get invoice PDF data');
    }
  });

  // POST /invoices/:id/send — Send / email invoice
  fastify.post(
    '/:id/send',
    {
      preHandler: [...preHandler, roleGuard('invoices', 'update')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InvoiceService(tenantDb);
        const invoice = await service.send(id, userId);
        return apiResponse(reply, 200, { invoice }, 'Invoice sent');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to send invoice');
      }
    },
  );
}
