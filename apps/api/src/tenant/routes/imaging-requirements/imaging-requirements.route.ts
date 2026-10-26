import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Connection } from 'mongoose';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { getImagingRequirementModel } from '../../models/imaging-requirement.model.js';

/**
 * Imaging Requirements Routes
 *
 * Endpoints:
 *   GET  /api/imaging-requirements/:serviceId — List imaging requirements for a service
 *   POST /api/imaging-requirements/:id/waive  — Waive an imaging requirement
 */

// ── Helpers ─────────────────────────────────────────────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

// ── Route Registration ──────────────────────────────────────

export async function imagingRequirementRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // ── GET /imaging-requirements/:serviceId ────────────────────
  // List imaging requirements for a given service.
  fastify.get(
    '/:serviceId',
    { preHandler },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantDb = getTenantDb(request);
        const { serviceId } = z.object({ serviceId: z.string().min(1) }).parse(request.params);

        const ImagingRequirement = getImagingRequirementModel(tenantDb);

        const requirements = await ImagingRequirement.find({
          serviceId,
          isActive: true,
        })
          .sort({ imagingType: 1, bodyRegion: 1 })
          .lean();

        return apiResponse(reply, 200, { requirements });
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to list imaging requirements');
      }
    },
  );

  // ── POST /imaging-requirements/:id/waive ────────────────────
  // Waive an imaging requirement (doctor override).
  fastify.post(
    '/:id/waive',
    { preHandler: [...preHandler, roleGuard('appointments', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const { id } = z.object({ id: z.string().min(1) }).parse(request.params);

        const ImagingRequirement = getImagingRequirementModel(tenantDb);

        const requirement = await ImagingRequirement.findById(id);
        if (!requirement) {
          return apiError(reply, 404, 'Imaging requirement not found');
        }

        if (!requirement.canWaive) {
          return apiError(reply, 400, 'This imaging requirement cannot be waived');
        }

        if (requirement.waivedBy) {
          return apiError(reply, 409, 'Imaging requirement already waived');
        }

        requirement.waivedBy = userId as unknown as typeof requirement.waivedBy;
        requirement.waivedAt = new Date();
        await requirement.save();

        return apiResponse(reply, 200, { requirement }, 'Imaging requirement waived');
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || 'statusCode' in err)) throw err;
        return apiError(reply, 500, 'Failed to waive imaging requirement');
      }
    },
  );
}
