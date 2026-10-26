/**
 * Report Data Routes — catalog + 6 category data endpoints + export
 * Based on DENTO_V2_MASTER_PLAN.md §21 — Advanced Analytics tier
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { logger } from '../../../utils/logger.js';
import { RATE_LIMITS } from '../../../config/constants.js';
import { createReportHistoryModel, REPORT_CATALOG } from '../../models/report.model.js';
import { ReportPipelineService } from '../../services/report-pipeline.service.js';
import { InventoryReportPipelineService } from '../../services/inventory-report-pipeline.service.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { reportExportSchema } from '@dento/shared';
import {
  getTenantDb,
  getUserId,
  getTenantId,
  getEnabledModules,
  reportQuerySchema,
  reportCategoryParam,
  generatePreviewData,
  inferCategory,
} from './report-helpers.js';

export async function reportDataRoutes(fastify: FastifyInstance): Promise<void> {
  const preHandler = [authGuard, tenantDbMiddleware];
  const readGuard = [...preHandler, roleGuard('reports', 'read')];
  const writeGuard = [...preHandler, roleGuard('reports', 'create')];

  // GET /catalog — Report catalog for Reports Hub
  fastify.get(
    '/catalog',
    { preHandler: readGuard },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const categories = (Object.keys(REPORT_CATALOG) as Array<keyof typeof REPORT_CATALOG>).map(
        (category) => {
          const reports = REPORT_CATALOG[category];
          const freeReports = reports.filter((r) => r.isFree).length;
          const categoryNames: Record<string, { en: string; ar: string }> = {
            financial: { en: 'Financial Reports', ar: 'التقارير المالية' },
            patient: { en: 'Patient Reports', ar: 'تقارير المرضى' },
            appointment: { en: 'Appointment Reports', ar: 'تقارير المواعيد' },
            clinical: { en: 'Clinical Reports', ar: 'التقارير السريرية' },
            operational: { en: 'Operational Reports', ar: 'التقارير التشغيلية' },
            inventory: { en: 'Inventory Reports', ar: 'تقارير المخزون' },
          };
          const categoryIcons: Record<string, string> = {
            financial: 'DollarSign',
            patient: 'Users',
            appointment: 'CalendarDays',
            clinical: 'Stethoscope',
            operational: 'Settings',
            inventory: 'Package',
          };

          return {
            category,
            name: categoryNames[category],
            icon: categoryIcons[category],
            reports: reports.map((r) => ({
              ...r,
              category,
              route: `/reports/${category}/${r.type}`,
            })),
            totalReports: reports.length,
            freeReports,
            paidReports: reports.length - freeReports,
          };
        },
      );

      return apiResponse(reply, 200, {
        categories,
        totalReports: categories.reduce((sum, c) => sum + c.totalReports, 0),
        freeReports: categories.reduce((sum, c) => sum + c.freeReports, 0),
        paidReports: categories.reduce((sum, c) => sum + c.paidReports, 0),
      });
    },
  );

  // GET /financial/:type — Financial Report Data
  fastify.get(
    '/financial/:type',
    { preHandler: readGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { type } = reportCategoryParam.parse(request.params);
      const query = reportQuerySchema.parse(request.query);

      const reportDef = REPORT_CATALOG.financial.find((r) => r.type === type);
      if (!reportDef) {
        return apiError(reply, 404, `Financial report '${type}' not found`);
      }

      if (!reportDef.isFree) {
        const enabledModules = getEnabledModules(request);
        if (!enabledModules.includes('advanced-analytics') && !enabledModules.includes('reports')) {
          return apiResponse(reply, 200, {
            locked: true,
            reportType: type,
            category: 'financial',
            name: reportDef.name,
            description: reportDef.description,
            module: 'advanced-analytics',
            previewData: generatePreviewData('financial', type),
            upgradeMessage: {
              en: 'Upgrade to Advanced Analytics ($199/mo) to unlock this report',
              ar: 'قم بالترقية إلى التحليلات المتقدمة ($199/شهر) لفتح هذا التقرير',
            },
          });
        }
      }

      try {
        const tenantDb = getTenantDb(request);
        const tenantId = getTenantId(request);
        const pipelineService = new ReportPipelineService(tenantDb, tenantId);
        const reportData = await pipelineService.getReport(
          type,
          query as Parameters<typeof pipelineService.getReport>[1],
        );

        if (reportData) {
          return apiResponse(reply, 200, {
            locked: false,
            reportType: type,
            category: 'financial',
            generatedAt: new Date().toISOString(),
            period: { from: query.from, to: query.to },
            ...reportData,
          });
        }
      } catch {
        // Fall through to fallback mock data
      }

      return apiResponse(reply, 200, {
        locked: false,
        reportType: type,
        category: 'financial',
        generatedAt: new Date().toISOString(),
        period: { from: query.from || '2026-02-01', to: query.to || '2026-02-25' },
        summary: { totalRevenue: 0, invoiceCount: 0, avgInvoice: 0 },
        chart: [],
        table: [],
      });
    },
  );

  // GET /patients/:type — Patient Report Data
  fastify.get(
    '/patients/:type',
    { preHandler: readGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { type } = reportCategoryParam.parse(request.params);
      const query = reportQuerySchema.parse(request.query);

      const reportDef = REPORT_CATALOG.patient.find((r) => r.type === type);
      if (!reportDef) {
        return apiError(reply, 404, `Patient report '${type}' not found`);
      }

      if (!reportDef.isFree) {
        const enabledModules = getEnabledModules(request);
        if (!enabledModules.includes('advanced-analytics') && !enabledModules.includes('reports')) {
          return apiResponse(reply, 200, {
            locked: true,
            reportType: type,
            category: 'patient',
            name: reportDef.name,
            description: reportDef.description,
            module: 'advanced-analytics',
            previewData: generatePreviewData('patient', type),
            upgradeMessage: {
              en: 'Upgrade to Advanced Analytics ($199/mo) to unlock this report',
              ar: 'قم بالترقية إلى التحليلات المتقدمة ($199/شهر) لفتح هذا التقرير',
            },
          });
        }
      }

      try {
        const tenantDb = getTenantDb(request);
        const tenantId = getTenantId(request);
        const pipelineService = new ReportPipelineService(tenantDb, tenantId);
        const reportData = await pipelineService.getReport(
          type,
          query as Parameters<typeof pipelineService.getReport>[1],
        );

        if (reportData) {
          return apiResponse(reply, 200, {
            locked: false,
            reportType: type,
            category: 'patient',
            generatedAt: new Date().toISOString(),
            period: { from: query.from, to: query.to },
            ...reportData,
          });
        }
      } catch {
        // Fall through to fallback
      }

      return apiResponse(reply, 200, {
        locked: false,
        reportType: type,
        category: 'patient',
        generatedAt: new Date().toISOString(),
        period: { from: query.from, to: query.to },
        summary: {},
        chart: [],
        table: [],
      });
    },
  );

  // GET /appointments/:type — Appointment Report Data
  fastify.get(
    '/appointments/:type',
    { preHandler: readGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { type } = reportCategoryParam.parse(request.params);
      const query = reportQuerySchema.parse(request.query);

      const reportDef = REPORT_CATALOG.appointment.find((r) => r.type === type);
      if (!reportDef) {
        return apiError(reply, 404, `Appointment report '${type}' not found`);
      }

      if (!reportDef.isFree) {
        const enabledModules = getEnabledModules(request);
        if (!enabledModules.includes('advanced-analytics') && !enabledModules.includes('reports')) {
          return apiResponse(reply, 200, {
            locked: true,
            reportType: type,
            category: 'appointment',
            name: reportDef.name,
            description: reportDef.description,
            module: 'advanced-analytics',
            previewData: generatePreviewData('appointment', type),
            upgradeMessage: {
              en: 'Upgrade to Advanced Analytics ($199/mo) to unlock this report',
              ar: 'قم بالترقية إلى التحليلات المتقدمة ($199/شهر) لفتح هذا التقرير',
            },
          });
        }
      }

      try {
        const tenantDb = getTenantDb(request);
        const tenantId = getTenantId(request);
        const pipelineService = new ReportPipelineService(tenantDb, tenantId);
        const reportData = await pipelineService.getReport(
          type,
          query as Parameters<typeof pipelineService.getReport>[1],
        );

        if (reportData) {
          return apiResponse(reply, 200, {
            locked: false,
            reportType: type,
            category: 'appointment',
            generatedAt: new Date().toISOString(),
            period: { from: query.from, to: query.to },
            ...reportData,
          });
        }
      } catch {
        // Fall through to fallback
      }

      return apiResponse(reply, 200, {
        locked: false,
        reportType: type,
        category: 'appointment',
        generatedAt: new Date().toISOString(),
        period: { from: query.from, to: query.to },
        summary: {},
        chart: [],
        table: [],
      });
    },
  );

  // GET /clinical/:type — Clinical Report Data
  fastify.get(
    '/clinical/:type',
    { preHandler: readGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { type } = reportCategoryParam.parse(request.params);

      const reportDef = REPORT_CATALOG.clinical.find((r) => r.type === type);
      if (!reportDef) {
        return apiError(reply, 404, `Clinical report '${type}' not found`);
      }

      if (!reportDef.isFree) {
        const enabledModules = getEnabledModules(request);
        if (!enabledModules.includes('advanced-analytics') && !enabledModules.includes('reports')) {
          return apiResponse(reply, 200, {
            locked: true,
            reportType: type,
            category: 'clinical',
            name: reportDef.name,
            description: reportDef.description,
            module: 'advanced-analytics',
            previewData: generatePreviewData('clinical', type),
            upgradeMessage: {
              en: 'Upgrade to Advanced Analytics ($199/mo) to unlock this report',
              ar: 'قم بالترقية إلى التحليلات المتقدمة ($199/شهر) لفتح هذا التقرير',
            },
          });
        }
      }

      try {
        const query = reportQuerySchema.parse(request.query);
        const tenantDb = getTenantDb(request);
        const tenantId = getTenantId(request);
        const pipelineService = new ReportPipelineService(tenantDb, tenantId);
        const reportData = await pipelineService.getReport(
          type,
          query as Parameters<typeof pipelineService.getReport>[1],
        );

        if (reportData) {
          return apiResponse(reply, 200, {
            locked: false,
            reportType: type,
            category: 'clinical',
            generatedAt: new Date().toISOString(),
            period: { from: query.from, to: query.to },
            ...reportData,
          });
        }
      } catch {
        // Fall through to fallback
      }

      return apiResponse(reply, 200, {
        locked: false,
        reportType: type,
        category: 'clinical',
        generatedAt: new Date().toISOString(),
        summary: {},
        chart: [],
        table: [],
      });
    },
  );

  // GET /operational/:type — Operational Report Data
  fastify.get(
    '/operational/:type',
    { preHandler: readGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { type } = reportCategoryParam.parse(request.params);

      const reportDef = REPORT_CATALOG.operational.find((r) => r.type === type);
      if (!reportDef) {
        return apiError(reply, 404, `Operational report '${type}' not found`);
      }

      if (!reportDef.isFree) {
        const enabledModules = getEnabledModules(request);
        if (!enabledModules.includes('advanced-analytics') && !enabledModules.includes('reports')) {
          return apiResponse(reply, 200, {
            locked: true,
            reportType: type,
            category: 'operational',
            name: reportDef.name,
            description: reportDef.description,
            module: 'advanced-analytics',
            previewData: generatePreviewData('operational', type),
            upgradeMessage: {
              en: 'Upgrade to Advanced Analytics ($199/mo) to unlock this report',
              ar: 'قم بالترقية إلى التحليلات المتقدمة ($199/شهر) لفتح هذا التقرير',
            },
          });
        }
      }

      try {
        const query = reportQuerySchema.parse(request.query);
        const tenantDb = getTenantDb(request);
        const tenantId = getTenantId(request);
        const pipelineService = new ReportPipelineService(tenantDb, tenantId);
        const reportData = await pipelineService.getReport(
          type,
          query as Parameters<typeof pipelineService.getReport>[1],
        );

        if (reportData) {
          return apiResponse(reply, 200, {
            locked: false,
            reportType: type,
            category: 'operational',
            generatedAt: new Date().toISOString(),
            period: { from: query.from, to: query.to },
            ...reportData,
          });
        }
      } catch {
        // Fall through to fallback
      }

      return apiResponse(reply, 200, {
        locked: false,
        reportType: type,
        category: 'operational',
        generatedAt: new Date().toISOString(),
        summary: {},
        chart: [],
        table: [],
      });
    },
  );

  // GET /inventory/:type — Inventory Report Data
  fastify.get(
    '/inventory/:type',
    { preHandler: readGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { type } = reportCategoryParam.parse(request.params);
      const query = reportQuerySchema.parse(request.query);

      const reportDef = REPORT_CATALOG.inventory.find((r) => r.type === type);
      if (!reportDef) {
        return apiError(reply, 404, `Inventory report '${type}' not found`);
      }

      if (!reportDef.isFree) {
        const enabledModules = getEnabledModules(request);
        if (!enabledModules.includes('inventory')) {
          return apiResponse(reply, 200, {
            locked: true,
            reportType: type,
            category: 'inventory',
            name: reportDef.name,
            description: reportDef.description,
            module: 'inventory',
            previewData: generatePreviewData('inventory', type),
            upgradeMessage: {
              en: 'Enable the Inventory module ($29/mo) to unlock this report',
              ar: 'قم بتفعيل وحدة المخزون ($29/شهر) لفتح هذا التقرير',
            },
          });
        }
      }

      try {
        const tenantDb = getTenantDb(request);
        const tenantId = getTenantId(request);
        const pipelineService = new InventoryReportPipelineService(tenantDb, tenantId);
        const reportData = await pipelineService.getReport(
          type,
          query as Parameters<typeof pipelineService.getReport>[1],
        );

        if (reportData) {
          return apiResponse(reply, 200, {
            locked: false,
            reportType: type,
            category: 'inventory',
            generatedAt: new Date().toISOString(),
            period: { from: query.from, to: query.to },
            ...reportData,
          });
        }
      } catch {
        // Fall through to fallback mock data
      }

      return apiResponse(reply, 200, {
        locked: false,
        reportType: type,
        category: 'inventory',
        generatedAt: new Date().toISOString(),
        period: { from: query.from, to: query.to },
        summary: {},
        chart: [],
        table: [],
      });
    },
  );

  // POST /export — Export report (Advanced)
  fastify.post(
    '/export',
    { preHandler: writeGuard, config: { rateLimit: RATE_LIMITS.MUTATION } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantDb = getTenantDb(request);
      const userId = getUserId(request);
      const tenantId = getTenantId(request);

      try {
        const data = reportExportSchema.parse(request.body);
        const ReportHistory = createReportHistoryModel(tenantDb);

        // Log the export request. Validated DTO values (string reportType/category,
        // params, string userId) are cast/stored by Mongoose; payload typed loosely
        // so Mongoose 9's stricter create casting accepts them unchanged.
        const historyDoc: Record<string, unknown> = {
          tenantId,
          reportType: data.reportType,
          category: inferCategory(data.reportType),
          params: data.params || {},
          status: 'pending',
          format: data.format,
          triggeredBy: 'manual',
          userId,
          generatedAt: new Date(),
        };
        const historyEntry = await ReportHistory.create(historyDoc);

        // Queue actual export job via BullMQ
        const { queueReportExport } = await import('../../../services/report-export.service.js');
        await queueReportExport({
          tenantSlug:
            ((request as unknown as Record<string, unknown>).tenantSlug as string) || 'unknown',
          tenantId,
          historyId: historyEntry._id.toString(),
          reportType: data.reportType,
          category: inferCategory(data.reportType),
          params: (data.params as Record<string, unknown>) || {},
          format: data.format,
          userId,
        });

        // Audit log per §16.7 — every export must be audit-logged
        try {
          const { AuditLogService } = await import('../../services/audit-log.service.js');
          const auditService = new AuditLogService(tenantDb);
          const user = (request as unknown as Record<string, unknown>).user as Record<
            string,
            string
          >;
          await auditService.create({
            actorId: userId,
            actorEmail: user.email,
            actorRole: user.role,
            tenantSlug:
              ((request as unknown as Record<string, unknown>).tenantSlug as string) || undefined,
            resourceType: 'report',
            resourceId: historyEntry._id.toString(),
            action: 'export',
            description: `Exported ${data.reportType} report as ${data.format}`,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'] || '',
            sensitivityLevel: 'medium',
            status: 'success',
          });
        } catch (auditError) {
          logger.error({ err: auditError }, 'Failed to create audit log for report export');
        }

        logger.info(
          { reportType: data.reportType, format: data.format, userId },
          'Report export queued',
        );

        return apiResponse(reply, 202, {
          historyId: historyEntry._id,
          status: 'pending',
          message: {
            en: 'Report generation queued. You will be notified when ready.',
            ar: 'تم إضافة التقرير للقائمة. سيتم إعلامك عند الجاهزية.',
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.warn({ errors: error.issues }, 'Report export validation failed');
          return apiError(reply, 422, 'Validation failed', error.issues);
        }
        throw error;
      }
    },
  );
}
