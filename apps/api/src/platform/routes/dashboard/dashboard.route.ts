/**
 * Platform Dashboard Route — Developer Portal Stats
 *
 * Endpoints:
 *   GET /stats — Aggregate platform-level stats for the dev portal dashboard
 *
 * Auth: authGuard → platformGuard('platform_tenants', 'read')
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { Tenant, ApiKey, SupportTicket, ApiKeyUsage } from '../../models/index.js';

export async function platformDashboardRoutes(fastify: FastifyInstance): Promise<void> {
  const preHandler = [authGuard, platformGuard('platform_tenants', 'read')];

  // GET /api/platform/dashboard/stats
  fastify.get('/stats', { preHandler }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [activeTenants, apiKeys, openTickets, apiUsage24h] = await Promise.all([
        Tenant.countDocuments({ status: { $in: ['active', 'trial'] } }),
        ApiKey.countDocuments({ isActive: true }),
        SupportTicket.countDocuments({ status: { $nin: ['closed', 'resolved'] } }),
        ApiKeyUsage.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } }),
      ]);

      return apiResponse(reply, 200, {
        activeTenants,
        apiUsage24h,
        apiKeys,
        openTickets,
      });
    } catch {
      return apiError(reply, 500, 'Failed to load platform dashboard stats');
    }
  });
}
