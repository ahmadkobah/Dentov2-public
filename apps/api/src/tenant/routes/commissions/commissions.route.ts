/**
 * Commission Routes — Doctor commissions + payouts
 *
 * Per V2_DATABASE.md §7.3 — doctor_commissions + commission_payouts
 * Per DENTO_V2_MASTER_PLAN.md §10 (#10 Commissions)
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 *
 * Endpoints:
 *   - GET    /api/commissions                          — List commissions
 *   - GET    /api/commissions/me                       — List own commissions (doctor self-view)
 *   - GET    /api/commissions/me/summary               — Own commission summary
 *   - GET    /api/commissions/:id                      — Get commission by ID
 *   - POST   /api/commissions/calculate/:invoiceId     — Calculate from invoice
 *   - PATCH  /api/commissions/approve                  — Bulk approve
 *   - GET    /api/commissions/payouts                  — List payouts
 *   - POST   /api/commissions/payouts                  — Create payout
 *   - GET    /api/commissions/summary/:doctorId        — Doctor summary
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import {
  commissionQuerySchema,
  approveCommissionsSchema,
  createPayoutSchema,
  commissionSummaryQuerySchema,
  payoutQuerySchema,
  calculateCommissionBodySchema,
} from '@dento/shared';
import { apiResponse, apiError, ApiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { CommissionService } from '../../services/commission.service.js';
import { getDoctorModel } from '../../models/doctor.model.js';
import { RATE_LIMITS } from '../../../config/constants.js';

// ── Helper to extract tenant context from request ───────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

// ── Route Registration ──────────────────────────────────────

export async function commissionRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];
  const readGuard = [...preHandler, roleGuard('commissions', 'read')];

  // GET /commissions — List commissions (paginated, filterable)
  fastify.get('/', { preHandler: readGuard }, async (request, reply) => {
    try {
      const query = commissionQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new CommissionService(tenantDb);
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list commissions');
    }
  });

  // ── Doctor self-view (Phase 7.6) ──────────────────────────
  // No module guard — identity-gated via Doctor.userId lookup.

  async function resolveCurrentDoctorId(request: unknown): Promise<string> {
    const tenantDb = getTenantDb(request);
    const userId = getUserId(request);
    const Doctor = getDoctorModel(tenantDb);
    const doctor = await Doctor.findOne({ userId }).select('_id').lean();
    if (!doctor) {
      throw ApiError.notFound('Doctor profile for current user');
    }
    return doctor._id.toString();
  }

  // GET /commissions/me — List own commissions
  fastify.get('/me', { preHandler }, async (request, reply) => {
    try {
      const query = commissionQuerySchema.parse(request.query);
      const doctorId = await resolveCurrentDoctorId(request);
      const tenantDb = getTenantDb(request);
      const service = new CommissionService(tenantDb);
      const result = await service.list({ ...query, doctorId });
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      if (err instanceof ApiError) throw err;
      return apiError(reply, 500, 'Failed to list own commissions');
    }
  });

  // GET /commissions/me/summary — Own commission summary
  fastify.get('/me/summary', { preHandler }, async (request, reply) => {
    try {
      const query = commissionSummaryQuerySchema.parse(request.query);
      const doctorId = await resolveCurrentDoctorId(request);
      const tenantDb = getTenantDb(request);
      const service = new CommissionService(tenantDb);
      const result = await service.getDoctorSummary(doctorId, query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      if (err instanceof ApiError) throw err;
      return apiError(reply, 500, 'Failed to get own commission summary');
    }
  });

  // GET /commissions/payouts — List payouts (must be before /:id)
  fastify.get('/payouts', { preHandler: readGuard }, async (request, reply) => {
    try {
      const query = payoutQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new CommissionService(tenantDb);
      const result = await service.listPayouts(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list payouts');
    }
  });

  // GET /commissions/summary/:doctorId — Doctor commission summary
  fastify.get('/summary/:doctorId', { preHandler: readGuard }, async (request, reply) => {
    try {
      const { doctorId } = request.params as { doctorId: string };
      const query = commissionSummaryQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new CommissionService(tenantDb);
      const result = await service.getDoctorSummary(doctorId, query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to get commission summary');
    }
  });

  // GET /commissions/:id — Get commission by ID
  fastify.get('/:id', { preHandler: readGuard }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const service = new CommissionService(tenantDb);
      const commission = await service.getById(id);
      return apiResponse(reply, 200, { commission });
    } catch (err) {
      if (err instanceof ApiError) throw err;
      return apiError(reply, 500, 'Failed to fetch commission');
    }
  });

  // POST /commissions/calculate/:invoiceId — Calculate commissions from invoice
  fastify.post(
    '/calculate/:invoiceId',
    {
      preHandler: [...preHandler, roleGuard('commissions', 'create')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const { invoiceId } = request.params as { invoiceId: string };
        const body = calculateCommissionBodySchema.parse(request.body);

        const tenantDb = getTenantDb(request);
        const service = new CommissionService(tenantDb);
        const commissions = await service.calculateFromInvoice(
          invoiceId,
          body.doctorId,
          body.commissionRate,
          body.appointmentId,
        );
        return apiResponse(reply, 201, { commissions }, 'Commissions calculated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof ApiError) throw err;
        return apiError(reply, 500, 'Failed to calculate commissions');
      }
    },
  );

  // PATCH /commissions/approve — Bulk approve commissions
  fastify.patch(
    '/approve',
    {
      preHandler: [...preHandler, roleGuard('commissions', 'update')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const data = approveCommissionsSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new CommissionService(tenantDb);
        const result = await service.approveCommissions(data, userId);
        return apiResponse(reply, 200, result, 'Commissions approved');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof ApiError) throw err;
        return apiError(reply, 500, 'Failed to approve commissions');
      }
    },
  );

  // POST /commissions/payouts — Create payout for doctor
  fastify.post(
    '/payouts',
    {
      preHandler: [...preHandler, roleGuard('commissions', 'create')],
      config: { rateLimit: RATE_LIMITS.MUTATION },
    },
    async (request, reply) => {
      try {
        const data = createPayoutSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const service = new CommissionService(tenantDb);
        const payout = await service.createPayout(data, userId);
        return apiResponse(reply, 201, { payout }, 'Payout created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof ApiError) throw err;
        return apiError(reply, 500, 'Failed to create payout');
      }
    },
  );
}
