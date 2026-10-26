/**
 * Insurance Claim Routes — CRUD + status flow + document management
 *
 * Per V2_DATABASE.md §7.5 — insurance_claims collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#11 Insurance)
 * Per SECURITY_AND_ENCRYPTION.md §8 — Document upload validation
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 *
 * Endpoints:
 *   - GET    /api/insurance-claims              — List (paginated, filterable)
 *   - GET    /api/insurance-claims/aging         — Aging report (aggregation)
 *   - GET    /api/insurance-claims/:id           — Get claim by ID
 *   - POST   /api/insurance-claims              — Create claim (links to invoice)
 *   - PATCH  /api/insurance-claims/:id/status    — Update claim status
 *   - POST   /api/insurance-claims/:id/documents — Upload claim document
 *   - DELETE /api/insurance-claims/:id/documents/:docId — Remove document
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createInsuranceClaimSchema,
  updateClaimStatusSchema,
  insuranceClaimQuerySchema,
  claimAgingQuerySchema,
  attachClaimDocumentSchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { InsuranceClaimService } from '../../services/insurance-claim.service.js';
import { RATE_LIMITS } from '../../../config/constants.js';

// ── Helper to extract tenant context from request ───────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

// ── Route Registration ──────────────────────────────────────

export async function insuranceClaimRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];
  const readGuard = [...preHandler, roleGuard('insurance', 'read')];

  // GET /insurance-claims — List (paginated, filterable)
  fastify.get('/', { preHandler: readGuard }, async (request, reply) => {
    try {
      const query = insuranceClaimQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new InsuranceClaimService(tenantDb);
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list insurance claims');
    }
  });

  // GET /insurance-claims/aging — Aging report
  fastify.get('/aging', { preHandler: readGuard }, async (request, reply) => {
    try {
      const query = claimAgingQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new InsuranceClaimService(tenantDb);
      const result = await service.getAgingReport(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to generate aging report');
    }
  });

  // GET /insurance-claims/:id — Get claim by ID
  fastify.get('/:id', { preHandler: readGuard }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const service = new InsuranceClaimService(tenantDb);
      const claim = await service.getById(id);
      return apiResponse(reply, 200, { claim });
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to fetch insurance claim');
    }
  });

  // POST /insurance-claims — Create new claim
  fastify.post(
    '/',
    {
      preHandler: [...preHandler, roleGuard('insurance', 'create')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const data = createInsuranceClaimSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InsuranceClaimService(tenantDb);
        const claim = await service.create(data, userId);
        return apiResponse(reply, 201, { claim }, 'Insurance claim created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to create insurance claim');
      }
    },
  );

  // PATCH /insurance-claims/:id/status — Update claim status
  fastify.patch(
    '/:id/status',
    {
      preHandler: [...preHandler, roleGuard('insurance', 'update')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateClaimStatusSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new InsuranceClaimService(tenantDb);
        const claim = await service.updateStatus(id, data, userId);
        return apiResponse(reply, 200, { claim }, 'Claim status updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to update claim status');
      }
    },
  );

  // POST /insurance-claims/:id/documents — Upload document
  fastify.post(
    '/:id/documents',
    {
      preHandler: [...preHandler, roleGuard('insurance', 'update')],
      config: {
        rateLimit: {
          max: RATE_LIMITS.UPLOAD.max,
          timeWindow: RATE_LIMITS.UPLOAD.timeWindow,
          keyGenerator: (request: { ip: string }) => `ratelimit:upload:${request.ip}`,
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = attachClaimDocumentSchema.parse(request.body);

        const tenantDb = getTenantDb(request);
        const service = new InsuranceClaimService(tenantDb);
        const claim = await service.attachDocument(id, body);
        return apiResponse(reply, 200, { claim }, 'Document attached');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') {
          return apiError(reply, 400, 'Invalid document data');
        }
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to attach document');
      }
    },
  );

  // DELETE /insurance-claims/:id/documents/:docId — Remove document
  fastify.delete(
    '/:id/documents/:docId',
    {
      preHandler: [...preHandler, roleGuard('insurance', 'update')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const { id, docId } = request.params as { id: string; docId: string };
        const tenantDb = getTenantDb(request);
        const service = new InsuranceClaimService(tenantDb);
        const claim = await service.removeDocument(id, docId);
        return apiResponse(reply, 200, { claim }, 'Document removed');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to remove document');
      }
    },
  );
}
