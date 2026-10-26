/**
 * Procedure Note Routes — CRUD + templates
 *
 * Per V2_DATABASE.md §5.5, §5.6 — procedure_notes + procedure_note_templates
 * Per DENTO_V2_MASTER_PLAN.md §10, §17 — Procedure Notes + Cross-Linking
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 *
 * Naming: v1 "treatments" → v2 "procedure_notes"
 * Rule: procedure_notes = "Was wurde gemacht" (Documentation) — past-oriented
 *
 * Endpoints:
 *   - GET    /api/procedure-notes                     — List (paginated, filterable)
 *   - GET    /api/procedure-notes/:id                 — Get detail
 *   - POST   /api/procedure-notes                     — Create
 *   - PUT    /api/procedure-notes/:id                 — Update
 *   - DELETE /api/procedure-notes/:id                 — Delete
 *   - GET    /api/procedure-notes/templates           — List templates
 *   - GET    /api/procedure-notes/templates/:id       — Get template
 *   - POST   /api/procedure-notes/templates           — Create template
 *   - PUT    /api/procedure-notes/templates/:id       — Update template
 *   - DELETE /api/procedure-notes/templates/:id       — Delete template
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createProcedureNoteSchema,
  updateProcedureNoteSchema,
  procedureNoteQuerySchema,
  createProcedureNoteTemplateSchema,
  updateProcedureNoteTemplateSchema,
  procedureNoteTemplateQuerySchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { ProcedureNoteService } from '../../services/procedure-note.service.js';

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

export async function procedureNoteRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];
  const readPreHandler = [...preHandler, roleGuard('procedure-notes', 'read')];

  // ── Template routes (registered BEFORE /:id to avoid conflict) ──

  // GET /procedure-notes/templates — List templates
  fastify.get('/templates', { preHandler: readPreHandler }, async (request, reply) => {
    try {
      const query = procedureNoteTemplateQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new ProcedureNoteService(tenantDb);
      const result = await service.listTemplates(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list templates');
    }
  });

  // GET /procedure-notes/templates/:id — Get template
  fastify.get('/templates/:id', { preHandler: readPreHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const service = new ProcedureNoteService(tenantDb);
      const template = await service.getTemplateById(id);
      return apiResponse(reply, 200, { template });
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to fetch template');
    }
  });

  // POST /procedure-notes/templates — Create template
  fastify.post(
    '/templates',
    { preHandler: [...preHandler, roleGuard('procedure-notes', 'create')] },
    async (request, reply) => {
      try {
        const data = createProcedureNoteTemplateSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new ProcedureNoteService(tenantDb);
        const template = await service.createTemplate(data);
        return apiResponse(reply, 201, { template }, 'Template created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to create template');
      }
    },
  );

  // PUT /procedure-notes/templates/:id — Update template
  fastify.put(
    '/templates/:id',
    { preHandler: [...preHandler, roleGuard('procedure-notes', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateProcedureNoteTemplateSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new ProcedureNoteService(tenantDb);
        const template = await service.updateTemplate(id, data);
        return apiResponse(reply, 200, { template }, 'Template updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update template');
      }
    },
  );

  // DELETE /procedure-notes/templates/:id — Delete template
  fastify.delete(
    '/templates/:id',
    { preHandler: [...preHandler, roleGuard('procedure-notes', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new ProcedureNoteService(tenantDb);
        const result = await service.deleteTemplate(id);
        return apiResponse(reply, 200, result, 'Template deleted');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to delete template');
      }
    },
  );

  // ── Standard CRUD for Procedure Notes ─────────────────────

  // GET /procedure-notes — List
  fastify.get('/', { preHandler: readPreHandler }, async (request, reply) => {
    try {
      const query = procedureNoteQuerySchema.parse(request.query);
      const tenantDb = getTenantDb(request);
      const service = new ProcedureNoteService(tenantDb);
      const result = await service.list(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list procedure notes');
    }
  });

  // GET /procedure-notes/:id — Get detail
  fastify.get('/:id', { preHandler: readPreHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tenantDb = getTenantDb(request);
      const service = new ProcedureNoteService(tenantDb);
      const note = await service.getById(id);
      return apiResponse(reply, 200, { note });
    } catch (err) {
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to fetch procedure note');
    }
  });

  // POST /procedure-notes — Create
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('procedure-notes', 'create')] },
    async (request, reply) => {
      try {
        const data = createProcedureNoteSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new ProcedureNoteService(tenantDb);
        const note = await service.create(data);
        return apiResponse(reply, 201, { note }, 'Procedure note created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to create procedure note');
      }
    },
  );

  // PUT /procedure-notes/:id — Update
  fastify.put(
    '/:id',
    { preHandler: [...preHandler, roleGuard('procedure-notes', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateProcedureNoteSchema.parse(request.body);
        const tenantDb = getTenantDb(request);
        const service = new ProcedureNoteService(tenantDb);
        const note = await service.update(id, data);
        return apiResponse(reply, 200, { note }, 'Procedure note updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to update procedure note');
      }
    },
  );

  // DELETE /procedure-notes/:id — Delete
  fastify.delete(
    '/:id',
    { preHandler: [...preHandler, roleGuard('procedure-notes', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantDb = getTenantDb(request);
        const service = new ProcedureNoteService(tenantDb);
        const result = await service.delete(id);
        return apiResponse(reply, 200, result, 'Procedure note deleted');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to delete procedure note');
      }
    },
  );
}
