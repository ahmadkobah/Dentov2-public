/**
 * Consent Template Routes — CRUD
 *
 * Per V2_DATABASE.md §5.11 — consent_templates
 * Per DENTO_V2_MASTER_PLAN.md §10 (#24) — Consent Forms
 *
 * Endpoints:
 *   - GET    /api/consent-templates       — List
 *   - GET    /api/consent-templates/:id   — Get by ID
 *   - POST   /api/consent-templates       — Create
 *   - PUT    /api/consent-templates/:id   — Update
 *   - DELETE /api/consent-templates/:id   — Soft-delete
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createConsentTemplateSchema,
  updateConsentTemplateSchema,
  consentTemplateQuerySchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { ConsentTemplateService } from '../../services/consent.service.js';

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

export async function consentTemplateRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  fastify.get('/', { preHandler }, async (request, reply) => {
    try {
      const query = consentTemplateQuerySchema.parse(request.query);
      const service = new ConsentTemplateService(getTenantDb(request));
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list consent templates');
    }
  });

  fastify.get('/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const service = new ConsentTemplateService(getTenantDb(request));
      const template = await service.getById(id);
      return apiResponse(reply, 200, { template });
    } catch (err) {
      if (err instanceof Error && 'statusCode' in err) throw err;
      return apiError(reply, 500, 'Failed to get consent template');
    }
  });

  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('settings', 'manage')] },
    async (request, reply) => {
      try {
        const data = createConsentTemplateSchema.parse(request.body);
        const service = new ConsentTemplateService(getTenantDb(request));
        const template = await service.create(data);
        return apiResponse(reply, 201, { template });
      } catch (err) {
        if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
        return apiError(reply, 500, 'Failed to create consent template');
      }
    },
  );

  fastify.put(
    '/:id',
    { preHandler: [...preHandler, roleGuard('settings', 'manage')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateConsentTemplateSchema.parse(request.body);
        const service = new ConsentTemplateService(getTenantDb(request));
        const template = await service.update(id, data);
        return apiResponse(reply, 200, { template });
      } catch (err) {
        if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
        return apiError(reply, 500, 'Failed to update consent template');
      }
    },
  );

  fastify.delete(
    '/:id',
    { preHandler: [...preHandler, roleGuard('settings', 'manage')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const service = new ConsentTemplateService(getTenantDb(request));
        await service.delete(id);
        return apiResponse(reply, 200, { message: 'Consent template deactivated' });
      } catch (err) {
        if (err instanceof Error && 'statusCode' in err) throw err;
        return apiError(reply, 500, 'Failed to delete consent template');
      }
    },
  );
}
