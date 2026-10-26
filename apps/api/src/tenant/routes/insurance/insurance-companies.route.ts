/**
 * Insurance Company Routes — Full CRUD for insurance providers
 *
 * Per V2_DATABASE.md §7.5 — insurance_companies collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#11 Insurance)
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 *
 * Endpoints:
 *   - GET    /api/insurance-companies           — List (paginated, filterable)
 *   - GET    /api/insurance-companies/:id        — Get by ID
 *   - GET    /api/insurance-companies/:id/stats  — Get company with claim stats
 *   - POST   /api/insurance-companies            — Create
 *   - PUT    /api/insurance-companies/:id        — Update
 *   - DELETE /api/insurance-companies/:id        — Soft-deactivate (isActive=false)
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createInsuranceCompanySchema,
  updateInsuranceCompanySchema,
  insuranceCompanyQuerySchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { InsuranceCompanyService } from '../../services/insurance-company.service.js';
import { RATE_LIMITS } from '../../../config/constants.js';

// ── Helper to extract tenant context from request ───────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

// ── Route Registration ──────────────────────────────────────

export async function insuranceCompanyRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];
  const readGuard = [...preHandler, roleGuard('insurance', 'read')];

  // GET /insurance-companies — List (paginated, filterable)
  fastify.get('/', { preHandler: readGuard }, async (request, reply) => {
    try {
      const query = insuranceCompanyQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new InsuranceCompanyService(tenantDb);
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list insurance companies');
    }
  });

  // GET /insurance-companies/:id — Get by ID
  fastify.get('/:id', { preHandler: readGuard }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const service = new InsuranceCompanyService(tenantDb);
      const company = await service.getById(id);
      return apiResponse(reply, 200, { company });
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to fetch insurance company');
    }
  });

  // GET /insurance-companies/:id/stats — Get company with claim statistics
  fastify.get('/:id/stats', { preHandler: readGuard }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const service = new InsuranceCompanyService(tenantDb);
      const result = await service.getCompanyStats(id);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to fetch insurance company stats');
    }
  });

  // POST /insurance-companies — Create new company
  fastify.post(
    '/',
    {
      preHandler: [...preHandler, roleGuard('insurance', 'create')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const data = createInsuranceCompanySchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new InsuranceCompanyService(tenantDb);
        const company = await service.create(data);
        return apiResponse(reply, 201, { company }, 'Insurance company created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to create insurance company');
      }
    },
  );

  // PUT /insurance-companies/:id — Update company
  fastify.put(
    '/:id',
    {
      preHandler: [...preHandler, roleGuard('insurance', 'update')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateInsuranceCompanySchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new InsuranceCompanyService(tenantDb);
        const company = await service.update(id, data);
        return apiResponse(reply, 200, { company }, 'Insurance company updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to update insurance company');
      }
    },
  );

  // DELETE /insurance-companies/:id — Soft-deactivate
  fastify.delete(
    '/:id',
    {
      preHandler: [...preHandler, roleGuard('insurance', 'delete')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new InsuranceCompanyService(tenantDb);
        const company = await service.deactivate(id);
        return apiResponse(reply, 200, { company }, 'Insurance company deactivated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to deactivate insurance company');
      }
    },
  );
}
