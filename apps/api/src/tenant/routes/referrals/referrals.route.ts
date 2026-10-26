/**
 * Referral Routes — Phase 9.3
 *
 * Mounted under `/api/referrals` from server.ts. Gated under the `patients`
 * module since referrals are part of patient PHI.
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard, withAudit } from '../../middleware/index.js';
import { ReferralService } from '../../services/referral.service.js';

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

const URGENCY = ['routine', 'urgent', 'emergency'] as const;
const STATUS = ['draft', 'sent', 'acknowledged', 'completed', 'cancelled'] as const;

const createSchema = z
  .object({
    patientId: z.string().min(1),
    branchId: z.string().min(1),
    referringDoctorId: z.string().min(1),
    appointmentId: z.string().min(1).optional(),
    treatmentPlanId: z.string().min(1).optional(),
    specialty: z.string().min(1).max(120),
    specialistName: z.string().max(200).optional(),
    specialistClinic: z.string().max(200).optional(),
    specialistPhone: z.string().max(40).optional(),
    specialistEmail: z.string().email().max(200).optional(),
    reason: z.string().min(1).max(2000),
    clinicalNotes: z.string().max(5000).optional(),
    attachmentUrls: z.array(z.string().url()).max(20).optional(),
    urgency: z.enum(URGENCY).optional(),
    followUpAt: z.string().datetime().optional(),
  })
  .strict();

const updateSchema = z
  .object({
    specialty: z.string().min(1).max(120).optional(),
    specialistName: z.string().max(200).optional(),
    specialistClinic: z.string().max(200).optional(),
    specialistPhone: z.string().max(40).optional(),
    specialistEmail: z.string().email().max(200).optional(),
    reason: z.string().min(1).max(2000).optional(),
    clinicalNotes: z.string().max(5000).optional(),
    attachmentUrls: z.array(z.string().url()).max(20).optional(),
    urgency: z.enum(URGENCY).optional(),
    followUpAt: z.string().datetime().nullable().optional(),
    outcomeNotes: z.string().max(5000).optional(),
  })
  .strict();

const transitionSchema = z
  .object({
    status: z.enum(STATUS),
    cancelReason: z.string().max(500).optional(),
    outcomeNotes: z.string().max(5000).optional(),
  })
  .strict();

const listQuerySchema = z
  .object({
    patientId: z.string().optional(),
    branchId: z.string().optional(),
    referringDoctorId: z.string().optional(),
    status: z.enum(STATUS).optional(),
    urgency: z.enum(URGENCY).optional(),
    specialty: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();

export async function referralRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // GET /referrals
  fastify.get(
    '/',
    { preHandler: [...preHandler, roleGuard('patients', 'read')] },
    async (request, reply) => {
      try {
        const query = listQuerySchema.parse(request.query);
        const service = new ReferralService(getTenantDb(request));
        const result = await service.list(query);
        return apiResponse(reply, 200, result, 'Referrals retrieved');
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || 'statusCode' in err)) throw err;
        return apiError(reply, 500, 'Failed to list referrals');
      }
    },
  );

  // GET /referrals/:id  (PHI — high-sensitivity audit)
  fastify.get(
    '/:id',
    {
      preHandler: [
        ...preHandler,
        roleGuard('patients', 'read'),
        withAudit({ resourceType: 'referral', sensitivityLevel: 'high', action: 'export' }),
      ],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const service = new ReferralService(getTenantDb(request));
        const referral = await service.getById(id);
        return apiResponse(reply, 200, { referral }, 'Referral retrieved');
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || 'statusCode' in err)) throw err;
        return apiError(reply, 500, 'Failed to fetch referral');
      }
    },
  );

  // POST /referrals
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('patients', 'create')] },
    async (request, reply) => {
      try {
        const data = createSchema.parse(request.body);
        const service = new ReferralService(getTenantDb(request));
        const referral = await service.create(data, getUserId(request));
        return apiResponse(reply, 201, { referral }, 'Referral created');
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || 'statusCode' in err)) throw err;
        return apiError(reply, 500, 'Failed to create referral');
      }
    },
  );

  // PATCH /referrals/:id
  fastify.patch(
    '/:id',
    { preHandler: [...preHandler, roleGuard('patients', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateSchema.parse(request.body);
        const service = new ReferralService(getTenantDb(request));
        const referral = await service.update(id, data, getUserId(request));
        return apiResponse(reply, 200, { referral }, 'Referral updated');
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || 'statusCode' in err)) throw err;
        return apiError(reply, 500, 'Failed to update referral');
      }
    },
  );

  // PATCH /referrals/:id/status  — state-machine transition
  fastify.patch(
    '/:id/status',
    { preHandler: [...preHandler, roleGuard('patients', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { status, cancelReason, outcomeNotes } = transitionSchema.parse(request.body);
        const service = new ReferralService(getTenantDb(request));
        const referral = await service.transition(id, status, getUserId(request), {
          cancelReason,
          outcomeNotes,
        });
        return apiResponse(reply, 200, { referral }, 'Referral status updated');
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || 'statusCode' in err)) throw err;
        return apiError(reply, 500, 'Failed to update referral status');
      }
    },
  );

  // DELETE /referrals/:id  (only draft)
  fastify.delete(
    '/:id',
    { preHandler: [...preHandler, roleGuard('patients', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const service = new ReferralService(getTenantDb(request));
        const result = await service.remove(id, getUserId(request));
        return apiResponse(reply, 200, result, 'Referral deleted');
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || 'statusCode' in err)) throw err;
        return apiError(reply, 500, 'Failed to delete referral');
      }
    },
  );
}
