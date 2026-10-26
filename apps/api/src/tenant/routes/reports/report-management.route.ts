/**
 * Report Management Routes — saved reports, scheduled reports, and history
 * Based on DENTO_V2_MASTER_PLAN.md §21 — Advanced Analytics tier
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { logger } from '../../../utils/logger.js';
import { RATE_LIMITS } from '../../../config/constants.js';
import {
  createSavedReportModel,
  createReportScheduleModel,
  createReportHistoryModel,
} from '../../models/report.model.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import {
  createSavedReportSchema,
  createReportScheduleSchema,
  updateReportScheduleSchema,
  reportHistoryQuerySchema,
} from '@dento/shared';
import {
  getTenantDb,
  getUserId,
  getTenantId,
  idParamSchema,
  calculateNextRunAt,
} from './report-helpers.js';

export async function reportManagementRoutes(fastify: FastifyInstance): Promise<void> {
  const preHandler = [authGuard, tenantDbMiddleware];
  const readGuard = [...preHandler, roleGuard('reports', 'read')];
  const writeGuard = [...preHandler, roleGuard('reports', 'create')];
  const deleteGuard = [...preHandler, roleGuard('reports', 'delete')];

  // GET /saved — List saved reports (Advanced)
  fastify.get(
    '/saved',
    { preHandler: readGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantDb = getTenantDb(request);
      const userId = getUserId(request);
      const tenantId = getTenantId(request);
      const SavedReport = createSavedReportModel(tenantDb);

      // String id values are cast to ObjectId by Mongoose; filter typed loosely
      // so Mongoose 9's stricter query casting accepts the string ids unchanged.
      const filter: Record<string, unknown> = {
        tenantId,
        createdBy: userId,
      };
      const reports = await SavedReport.find(filter).sort({ updatedAt: -1 }).lean();

      return apiResponse(reply, 200, { reports, total: reports.length });
    },
  );

  // POST /saved — Save report configuration (Advanced)
  fastify.post(
    '/saved',
    { preHandler: writeGuard, config: { rateLimit: RATE_LIMITS.MUTATION } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantDb = getTenantDb(request);
      const userId = getUserId(request);
      const tenantId = getTenantId(request);

      try {
        const data = createSavedReportSchema.parse(request.body);
        const SavedReport = createSavedReportModel(tenantDb);

        // Validated DTO values (string reportType/category, Date-bearing params,
        // string createdBy) are cast/stored by Mongoose; payload typed loosely so
        // Mongoose 9's stricter create casting accepts them unchanged.
        const savedReportDoc: Record<string, unknown> = {
          tenantId,
          name: data.name,
          reportType: data.reportType,
          category: data.category,
          params: data.params || {},
          createdBy: userId,
        };
        const saved = await SavedReport.create(savedReportDoc);

        return apiResponse(reply, 201, { report: saved });
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.warn({ errors: error.issues }, 'Saved report validation failed');
          return apiError(reply, 422, 'Validation failed', error.issues);
        }
        throw error;
      }
    },
  );

  // DELETE /saved/:id — Delete saved report (Advanced)
  fastify.delete(
    '/saved/:id',
    { preHandler: deleteGuard, config: { rateLimit: RATE_LIMITS.MUTATION } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantDb = getTenantDb(request);
      const userId = getUserId(request);
      const tenantId = getTenantId(request);
      const { id } = idParamSchema.parse(request.params);
      const SavedReport = createSavedReportModel(tenantDb);

      const deleteFilter: Record<string, unknown> = {
        _id: id,
        tenantId,
        createdBy: userId,
      };
      const deleted = await SavedReport.findOneAndDelete(deleteFilter);

      if (!deleted) {
        return apiError(reply, 404, 'Saved report not found');
      }

      return apiResponse(reply, 200, {
        message: { en: 'Saved report deleted', ar: 'تم حذف التقرير المحفوظ' },
      });
    },
  );

  // GET /scheduled — List schedules (Advanced)
  fastify.get(
    '/scheduled',
    { preHandler: readGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantDb = getTenantDb(request);
      const tenantId = getTenantId(request);
      const ReportSchedule = createReportScheduleModel(tenantDb);

      const schedules = await ReportSchedule.find({
        tenantId,
      })
        .sort({ nextRunAt: 1 })
        .lean();

      return apiResponse(reply, 200, { schedules, total: schedules.length });
    },
  );

  // POST /scheduled — Create schedule (Advanced)
  fastify.post(
    '/scheduled',
    { preHandler: writeGuard, config: { rateLimit: RATE_LIMITS.MUTATION } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantDb = getTenantDb(request);
      const userId = getUserId(request);
      const tenantId = getTenantId(request);

      try {
        const data = createReportScheduleSchema.parse(request.body);
        const ReportSchedule = createReportScheduleModel(tenantDb);

        const nextRunAt = calculateNextRunAt(
          data.frequency,
          data.time,
          data.timezone,
          data.dayOfWeek,
          data.dayOfMonth,
        );

        // Validated DTO values are cast/stored by Mongoose; payload typed loosely
        // so Mongoose 9's stricter create casting accepts them unchanged.
        const scheduleDoc: Record<string, unknown> = {
          tenantId,
          reportType: data.reportType,
          category: data.category,
          reportParams: data.reportParams || {},
          frequency: data.frequency,
          dayOfWeek: data.dayOfWeek ?? null,
          dayOfMonth: data.dayOfMonth ?? null,
          time: data.time,
          timezone: data.timezone,
          deliveryMethod: data.deliveryMethod,
          recipients: data.recipients,
          emailAddresses: data.emailAddresses || [],
          format: data.format,
          name: data.name,
          nextRunAt,
          createdBy: userId,
        };
        const schedule = await ReportSchedule.create(scheduleDoc);

        return apiResponse(reply, 201, { schedule });
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.warn({ errors: error.issues }, 'Schedule creation validation failed');
          return apiError(reply, 422, 'Validation failed', error.issues);
        }
        throw error;
      }
    },
  );

  // PATCH /scheduled/:id — Update schedule (Advanced)
  fastify.patch(
    '/scheduled/:id',
    { preHandler: writeGuard, config: { rateLimit: RATE_LIMITS.MUTATION } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantDb = getTenantDb(request);
      const tenantId = getTenantId(request);
      const { id } = idParamSchema.parse(request.params);

      try {
        const data = updateReportScheduleSchema.parse(request.body);
        const ReportSchedule = createReportScheduleModel(tenantDb);

        const schedule = await ReportSchedule.findOneAndUpdate(
          { _id: id, tenantId },
          { $set: data },
          { new: true },
        );

        if (!schedule) {
          return apiError(reply, 404, 'Schedule not found');
        }

        return apiResponse(reply, 200, { schedule });
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.warn({ errors: error.issues }, 'Schedule update validation failed');
          return apiError(reply, 422, 'Validation failed', error.issues);
        }
        throw error;
      }
    },
  );

  // DELETE /scheduled/:id — Delete schedule (Advanced)
  fastify.delete(
    '/scheduled/:id',
    { preHandler: deleteGuard, config: { rateLimit: RATE_LIMITS.MUTATION } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantDb = getTenantDb(request);
      const tenantId = getTenantId(request);
      const { id } = idParamSchema.parse(request.params);
      const ReportSchedule = createReportScheduleModel(tenantDb);

      const deleted = await ReportSchedule.findOneAndDelete({
        _id: id,
        tenantId,
      });

      if (!deleted) {
        return apiError(reply, 404, 'Schedule not found');
      }

      return apiResponse(reply, 200, {
        message: { en: 'Schedule deleted', ar: 'تم حذف الجدول' },
      });
    },
  );

  // POST /scheduled/:id/run — Run schedule now (Advanced)
  fastify.post(
    '/scheduled/:id/run',
    { preHandler: writeGuard, config: { rateLimit: RATE_LIMITS.MUTATION } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantDb = getTenantDb(request);
      const userId = getUserId(request);
      const tenantId = getTenantId(request);
      const { id } = idParamSchema.parse(request.params);
      const ReportSchedule = createReportScheduleModel(tenantDb);
      const ReportHistory = createReportHistoryModel(tenantDb);

      const schedule = await ReportSchedule.findOne({
        _id: id,
        tenantId,
      });

      if (!schedule) {
        return apiError(reply, 404, 'Schedule not found');
      }

      // Log the manual run. Mixed ObjectId/string/dynamic values are stored as-is
      // by Mongoose; payload typed loosely so Mongoose 9's create casting accepts it.
      const historyDoc: Record<string, unknown> = {
        tenantId,
        scheduleId: schedule._id,
        reportType: schedule.reportType,
        category: schedule.category,
        params: schedule.reportParams,
        status: 'pending',
        format: schedule.format,
        triggeredBy: 'manual',
        userId,
        generatedAt: new Date(),
      };
      const historyEntry = await ReportHistory.create(historyDoc);

      // Queue the export via BullMQ
      const { queueReportExport } = await import('../../../services/report-export.service.js');
      await queueReportExport({
        tenantSlug:
          ((request as unknown as Record<string, unknown>).tenantSlug as string) || 'unknown',
        tenantId,
        historyId: historyEntry._id.toString(),
        reportType: schedule.reportType,
        category: schedule.category,
        params: (schedule.reportParams as Record<string, unknown>) || {},
        format: schedule.format as 'csv' | 'excel' | 'pdf',
        userId,
      });

      return apiResponse(reply, 202, {
        historyId: historyEntry._id,
        status: 'pending',
        message: {
          en: 'Report generation triggered. You will be notified when ready.',
          ar: 'تم تشغيل إنشاء التقرير. سيتم إعلامك عند الجاهزية.',
        },
      });
    },
  );

  // GET /history — Report generation history (Advanced)
  fastify.get(
    '/history',
    { preHandler: readGuard },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantDb = getTenantDb(request);
      const tenantId = getTenantId(request);
      const ReportHistory = createReportHistoryModel(tenantDb);

      const { page, limit } = reportHistoryQuerySchema.parse(request.query);
      const skip = (page - 1) * limit;

      const [history, total] = await Promise.all([
        ReportHistory.find({ tenantId }).sort({ generatedAt: -1 }).skip(skip).limit(limit).lean(),
        ReportHistory.countDocuments({ tenantId }),
      ]);

      return apiResponse(reply, 200, { history }, undefined, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    },
  );
}
