/**
 * Consent Form Routes — CRUD
 *
 * Per V2_DATABASE.md §5.11 — consent_forms
 * Per DENTO_V2_MASTER_PLAN.md §10 (#24) — Consent Forms
 *
 * Endpoints:
 *   - GET    /api/consent-forms              — List (paginated, filterable)
 *   - GET    /api/consent-forms/:id          — Get by ID
 *   - POST   /api/consent-forms              — Create (sign)
 *   - GET    /api/consent-forms/patient/:pid — Get by patient
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import { createConsentFormSchema, consentFormQuerySchema } from '@dento/shared';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard, withAudit } from '../../middleware/index.js';
import { ConsentFormService } from '../../services/consent.service.js';

const updateConsentPdfUrlSchema = z
  .object({
    pdfUrl: z.string().url(),
  })
  .strict();

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

export async function consentFormRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];
  const readPreHandler = [...preHandler, roleGuard('consent-forms', 'read')];

  // GET / — List
  fastify.get('/', { preHandler: readPreHandler }, async (request, reply) => {
    try {
      const query = consentFormQuerySchema.parse(request.query);
      const service = new ConsentFormService(getTenantDb(request));
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list consent forms');
    }
  });

  // GET /:id — Get by ID [Phase 8.3 — consent view audit]
  fastify.get(
    '/:id',
    {
      preHandler: [
        ...readPreHandler,
        withAudit({ resourceType: 'consent-form', sensitivityLevel: 'high' }),
      ],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const service = new ConsentFormService(getTenantDb(request));
        const form = await service.getById(id);
        return apiResponse(reply, 200, { form });
      } catch (err) {
        if (err instanceof Error && 'statusCode' in err) throw err;
        return apiError(reply, 500, 'Failed to get consent form');
      }
    },
  );

  // POST / — Create (sign consent)
  fastify.post('/', { preHandler }, async (request, reply) => {
    try {
      const data = createConsentFormSchema.parse(request.body);
      const service = new ConsentFormService(getTenantDb(request));
      const form = await service.create(data);
      return apiResponse(reply, 201, { form });
    } catch (err) {
      if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
      return apiError(reply, 500, 'Failed to create consent form');
    }
  });

  // GET /patient/:patientId — Get by patient
  fastify.get('/patient/:patientId', { preHandler: readPreHandler }, async (request, reply) => {
    try {
      const { patientId } = request.params as { patientId: string };
      const service = new ConsentFormService(getTenantDb(request));
      const forms = await service.getByPatient(patientId);
      return apiResponse(reply, 200, { forms });
    } catch (err) {
      return apiError(reply, 500, 'Failed to get consent forms');
    }
  });

  // PATCH /:id/pdf-url — Persist generated PDF URL
  fastify.patch(
    '/:id/pdf-url',
    { preHandler: [...preHandler, roleGuard('consent-forms', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { pdfUrl } = updateConsentPdfUrlSchema.parse(request.body);
        const service = new ConsentFormService(getTenantDb(request));
        const form = await service.updatePdfUrl(id, pdfUrl);
        return apiResponse(reply, 200, { form }, 'Consent form PDF URL updated');
      } catch (err) {
        if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
        return apiError(reply, 500, 'Failed to update consent PDF URL');
      }
    },
  );
}
