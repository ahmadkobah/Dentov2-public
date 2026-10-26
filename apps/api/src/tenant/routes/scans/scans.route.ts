/**
 * Intraoral 3D Scan Routes — CRUD + patient timeline
 *
 * Gated under 'xrays' module (same as CBCT).
 * File upload/download is handled via the existing /api/uploads endpoints.
 *
 * Endpoints:
 *   - GET    /api/scans                              — List scans (paginated, filterable)
 *   - GET    /api/scans/:id                           — Get scan detail
 *   - POST   /api/scans                              — Create scan record
 *   - PUT    /api/scans/:id                           — Update scan
 *   - DELETE /api/scans/:id                           — Delete scan + R2 file
 *   - PATCH  /api/scans/:id/ready                     — Mark scan as ready
 *   - GET    /api/scans/patient/:patientId            — Patient scan history
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import { createScanSchema, updateScanSchema, scanQuerySchema } from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { ScanService } from '../../services/scan.service.js';
import { deleteFromS3 } from '../../../config/s3.js';

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

export async function scanRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // GET /scans — List
  fastify.get('/', { preHandler }, async (request, reply) => {
    try {
      const query = scanQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new ScanService(tenantDb);
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      fastify.log.error(err, 'Scan list error');
      return apiError(reply, 500, 'Failed to list scans');
    }
  });

  // GET /scans/patient/:patientId — Patient scan history
  fastify.get('/patient/:patientId', { preHandler }, async (request, reply) => {
    try {
      const { patientId } = request.params as { patientId: string };
      const tenantDb = getTenantDb(request);
      const service = new ScanService(tenantDb);
      const scans = await service.getPatientScans(patientId);
      return apiResponse(reply, 200, { scans });
    } catch {
      return apiError(reply, 500, 'Failed to fetch patient scans');
    }
  });

  // GET /scans/:id — Get detail
  fastify.get('/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const service = new ScanService(tenantDb);
      const scan = await service.getById(id);
      return apiResponse(reply, 200, { scan });
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to fetch scan');
    }
  });

  // POST /scans — Create
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('xrays', 'create')] },
    async (request, reply) => {
      try {
        const data = createScanSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new ScanService(tenantDb);
        const scan = await service.create(data);
        return apiResponse(reply, 201, { scan }, 'Scan created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to create scan');
      }
    },
  );

  // PUT /scans/:id — Update
  fastify.put(
    '/:id',
    { preHandler: [...preHandler, roleGuard('xrays', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateScanSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new ScanService(tenantDb);
        const scan = await service.update(id, data);
        return apiResponse(reply, 200, { scan }, 'Scan updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update scan');
      }
    },
  );

  // DELETE /scans/:id — Delete scan + R2 file
  fastify.delete(
    '/:id',
    { preHandler: [...preHandler, roleGuard('xrays', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new ScanService(tenantDb);
        const result = await service.delete(id);

        // Delete the ZIP file from R2
        if (result.fileKey) {
          try {
            await deleteFromS3(result.fileKey);
          } catch (err) {
            fastify.log.warn(err, `Failed to delete R2 file: ${result.fileKey}`);
          }
        }

        return apiResponse(reply, 200, { message: result.message }, 'Scan deleted');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to delete scan');
      }
    },
  );

  // PATCH /scans/:id/ready — Mark scan as ready
  fastify.patch(
    '/:id/ready',
    { preHandler: [...preHandler, roleGuard('xrays', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new ScanService(tenantDb);
        const scan = await service.markReady(id);
        return apiResponse(reply, 200, { scan }, 'Scan marked as ready');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to update scan status');
      }
    },
  );
}
