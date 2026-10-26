/**
 * Installment Plan Routes — CRUD + payment recording + overdue tracking
 *
 * Per V2_DATABASE.md §7.4 — installment_plans collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#9 Installments)
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 *
 * Endpoints:
 *   - GET    /api/installments                           — List plans (paginated)
 *   - GET    /api/installments/overdue                   — List overdue installments
 *   - GET    /api/installments/:id                       — Get plan by ID
 *   - POST   /api/installments                           — Create plan for invoice
 *   - PUT    /api/installments/:id                       — Update plan (notes/frequency)
 *   - POST   /api/installments/:id/payments/:number      — Record installment payment
 *   - PATCH  /api/installments/:id/payments/:number/waive — Waive installment
 *   - PATCH  /api/installments/:id/cancel                — Cancel plan
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createInstallmentPlanSchema,
  updateInstallmentPlanSchema,
  recordInstallmentPaymentSchema,
  installmentQuerySchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { InstallmentService } from '../../services/installment.service.js';
import { RATE_LIMITS } from '../../../config/constants.js';

// ── Helper to extract tenant context from request ───────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

// ── Route Registration ──────────────────────────────────────

export async function installmentRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];
  const readGuard = [...preHandler, roleGuard('installments', 'read')];

  // GET /installments — List plans (paginated)
  fastify.get('/', { preHandler: readGuard }, async (request, reply) => {
    try {
      const query = installmentQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new InstallmentService(tenantDb);
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list installment plans');
    }
  });

  // GET /installments/overdue — List overdue installments
  fastify.get('/overdue', { preHandler: readGuard }, async (request, reply) => {
    try {
      const tenantDb = getTenantDb(request);
      const service = new InstallmentService(tenantDb);
      const result = await service.listOverdue();
      return apiResponse(reply, 200, result);
    } catch (err) {
      return apiError(reply, 500, 'Failed to list overdue installments');
    }
  });

  // GET /installments/:id — Get plan by ID
  fastify.get('/:id', { preHandler: readGuard }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const service = new InstallmentService(tenantDb);
      const plan = await service.getById(id);
      return apiResponse(reply, 200, { plan });
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to fetch installment plan');
    }
  });

  // POST /installments — Create plan for invoice
  fastify.post(
    '/',
    {
      preHandler: [...preHandler, roleGuard('installments', 'create')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const data = createInstallmentPlanSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InstallmentService(tenantDb);
        const plan = await service.create(data, userId);
        return apiResponse(reply, 201, { plan }, 'Installment plan created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to create installment plan');
      }
    },
  );

  // PUT /installments/:id — Update plan (notes, frequency)
  fastify.put(
    '/:id',
    {
      preHandler: [...preHandler, roleGuard('installments', 'update')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateInstallmentPlanSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InstallmentService(tenantDb);
        const plan = await service.update(id, data, userId);
        return apiResponse(reply, 200, { plan }, 'Installment plan updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to update installment plan');
      }
    },
  );

  // POST /installments/:id/payments/:number — Record installment payment
  fastify.post(
    '/:id/payments/:number',
    {
      preHandler: [...preHandler, roleGuard('installments', 'update')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const { id, number } = request.params as { id: string; number: string };
        const data = recordInstallmentPaymentSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InstallmentService(tenantDb);
        const plan = await service.recordPayment(id, parseInt(number, 10), data, userId);
        return apiResponse(reply, 200, { plan }, 'Payment recorded');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to record installment payment');
      }
    },
  );

  // PATCH /installments/:id/payments/:number/waive — Waive installment
  fastify.patch(
    '/:id/payments/:number/waive',
    {
      preHandler: [...preHandler, roleGuard('installments', 'update')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const { id, number } = request.params as { id: string; number: string };
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InstallmentService(tenantDb);
        const plan = await service.waiveInstallment(id, parseInt(number, 10), userId);
        return apiResponse(reply, 200, { plan }, 'Installment waived');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to waive installment');
      }
    },
  );

  // PATCH /installments/:id/cancel — Cancel plan
  fastify.patch(
    '/:id/cancel',
    {
      preHandler: [...preHandler, roleGuard('installments', 'delete')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InstallmentService(tenantDb);
        const plan = await service.cancelPlan(id, userId);
        return apiResponse(reply, 200, { plan }, 'Installment plan cancelled');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to cancel installment plan');
      }
    },
  );
}
