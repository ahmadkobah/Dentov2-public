/**
 * Reports & Analytics Routes — Composer
 * Based on DENTO_V2_MASTER_PLAN.md §21
 *
 * Two-Tier Model:
 * - /api/dashboard/* — Free (dashboard-reports module) → dashboard.route.ts
 * - /api/reports/*   — Advanced ($199/Mo advanced-analytics module)
 *     → report-data.route.ts     (catalog, category data, export)
 *     → report-management.route.ts (saved, scheduled, history)
 *
 * Shared helpers live in report-helpers.ts
 */

import type { FastifyInstance } from 'fastify';
import { reportDataRoutes } from './report-data.route.js';
import { reportManagementRoutes } from './report-management.route.js';

// Re-export dashboardRoutes so server.ts import stays unchanged
export { dashboardRoutes } from './dashboard.route.js';

/**
 * reportRoutes — composes data + management sub-routes.
 * Registered in server.ts with prefix '/api/reports'.
 */
export async function reportRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(reportDataRoutes);
  await fastify.register(reportManagementRoutes);
}
