/**
 * Dashboard Routes (Free Tier)
 * Based on DENTO_V2_MASTER_PLAN.md §21 — /api/dashboard/*
 *
 * Business logic extracted to DashboardService (service-layer pattern).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware } from '../../middleware/index.js';
import { getTenantDb } from './report-helpers.js';
import { DashboardService } from '../../services/dashboard.service.js';

export async function dashboardRoutes(fastify: FastifyInstance): Promise<void> {
  const preHandler = [authGuard, tenantDbMiddleware];

  // GET /api/dashboard/stats — Dashboard widget data (Free)
  fastify.get('/stats', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantDb = getTenantDb(request);
      const service = new DashboardService(tenantDb);
      const stats = await service.getStats();
      return apiResponse(reply, 200, stats);
    } catch (err) {
      request.log.error({ err }, 'Failed to load dashboard stats');
      return apiError(reply, 500, 'Failed to load dashboard stats');
    }
  });

  // GET /api/dashboard/trends — Trend comparison (Free)
  fastify.get('/trends', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantDb = getTenantDb(request);
      const service = new DashboardService(tenantDb);
      const trends = await service.getTrends();
      return apiResponse(reply, 200, trends);
    } catch {
      return apiError(reply, 500, 'Failed to load dashboard trends');
    }
  });
}
