/**
 * Recurring Appointments Routes
 * Based on DENTO_V2_MASTER_PLAN.md §19
 *
 * Endpoints:
 * GET    /api/recurring-rules              - List rules
 * GET    /api/recurring-rules/:id          - Get rule detail
 * POST   /api/recurring-rules              - Create rule
 * PATCH  /api/recurring-rules/:id          - Update rule
 * PATCH  /api/recurring-rules/:id/pause    - Pause series
 * PATCH  /api/recurring-rules/:id/resume   - Resume series
 * DELETE /api/recurring-rules/:id          - Cancel series
 * GET    /api/recurring-rules/:id/skipped  - Get skipped occurrences
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { RecurringAppointmentsService } from '../../../services/recurring-appointments.service.js';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import type { Connection } from 'mongoose';

// ── Zod Schemas ─────────────────────────────────────────────

const recurrenceTypeSchema = z.enum([
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'biannual',
  'annual',
]);

const dayOfWeekSchema = z.number().int().min(0).max(6);
const weekOfMonthSchema = z.number().int().min(1).max(5);

const createRecurringRuleSchema = z
  .object({
    branchId: z.string().min(1),
    patientId: z.string().min(1),
    doctorId: z.string().min(1),
    serviceId: z.string().optional(),
    recurrenceType: recurrenceTypeSchema,
    preferredTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
    durationMinutes: z.number().int().min(5).max(480).optional().default(30),
    daysOfWeek: z.array(dayOfWeekSchema).optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    weekOfMonth: weekOfMonthSchema.optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    maxOccurrences: z.number().int().min(1).max(365).optional(),
    isAutoConfirm: z.boolean().optional().default(false),
    reminderDaysBefore: z.number().int().min(1).max(30).optional().default(7),
    isSkipHolidays: z.boolean().optional().default(false),
    isSkipIfConflict: z.boolean().optional().default(true),
    isAllowPatientCancel: z.boolean().optional().default(true),
    preferredChairId: z.string().optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

const updateRecurringRuleSchema = z
  .object({
    mode: z.enum(['this_and_future', 'all']).optional().default('this_and_future'),
    doctorId: z.string().optional(),
    serviceId: z.string().nullable().optional(),
    preferredTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .optional(),
    durationMinutes: z.number().int().min(5).max(480).optional(),
    daysOfWeek: z.array(dayOfWeekSchema).optional(),
    dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
    weekOfMonth: weekOfMonthSchema.nullable().optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    maxOccurrences: z.number().int().min(1).max(365).nullable().optional(),
    isAutoConfirm: z.boolean().optional(),
    reminderDaysBefore: z.number().int().min(1).max(30).optional(),
    isSkipHolidays: z.boolean().optional(),
    isSkipIfConflict: z.boolean().optional(),
    preferredChairId: z.string().nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .strict();

const listQuerySchema = z
  .object({
    patientId: z.string().optional(),
    doctorId: z.string().optional(),
    branchId: z.string().optional(),
    status: z.union([z.string(), z.array(z.string())]).optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  })
  .strict();

const idParamSchema = z
  .object({
    id: z.string().min(1),
  })
  .strict();

// ── Route Helpers ───────────────────────────────────────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

function getTenantId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).tenant as Record<string, string>).id;
}

// ── Routes ──────────────────────────────────────────────────

export default async function recurringRoutes(fastify: FastifyInstance): Promise<void> {
  // #80: these routes were registered with no middleware (unauthenticated).
  // Require an authenticated, tenant-scoped user with appointment permission,
  // scaled by HTTP method (read for GET, create for POST, update for the rest).
  fastify.addHook('preHandler', authGuard);
  fastify.addHook('preHandler', tenantDbMiddleware);
  fastify.addHook('preHandler', (request, reply) => {
    const perm =
      request.method === 'GET' ? 'read' : request.method === 'POST' ? 'create' : 'update';
    return roleGuard('appointments', perm)(request, reply);
  });

  // ── List Recurring Rules ────────────────────────────────────
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantDb = getTenantDb(request);
    const tenantId = getTenantId(request);
    const query = listQuerySchema.parse(request.query);

    const service = new RecurringAppointmentsService(tenantDb, tenantId);

    const result = await service.listRules({
      patientId: query.patientId,
      doctorId: query.doctorId,
      branchId: query.branchId,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    // Add pattern description to each rule
    const rulesWithDescription = result.rules.map((rule) => ({
      ...rule,
      patternDescription: service.getPatternDescription(rule),
    }));

    return apiResponse(reply, 200, {
      rules: rulesWithDescription,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  });

  // ── Get Recurring Rule Detail ───────────────────────────────
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantDb = getTenantDb(request);
    const tenantId = getTenantId(request);
    const { id } = idParamSchema.parse(request.params);

    const service = new RecurringAppointmentsService(tenantDb, tenantId);

    const rule = await service.getRule(id);
    if (!rule) {
      return apiError(reply, 404, 'Recurring rule not found');
    }

    // Get upcoming dates
    const upcomingDates = service.getUpcomingDates(rule, 56); // 8 weeks

    // Get skipped occurrences
    const skippedOccurrences = await service.getSkippedOccurrences(id);

    return apiResponse(reply, 200, {
      rule: {
        ...rule.toObject(),
        patternDescription: service.getPatternDescription(rule),
      },
      upcomingDates,
      skippedOccurrences,
      progress: {
        created: rule.occurrencesCreated,
        total: rule.maxOccurrences,
        percentage: rule.maxOccurrences
          ? Math.round((rule.occurrencesCreated / rule.maxOccurrences) * 100)
          : null,
      },
    });
  });

  // ── Create Recurring Rule ───────────────────────────────────
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantDb = getTenantDb(request);
    const userId = getUserId(request);
    const tenantId = getTenantId(request);

    try {
      const data = createRecurringRuleSchema.parse(request.body);

      // Validate pattern-specific fields
      if (
        (data.recurrenceType === 'weekly' || data.recurrenceType === 'biweekly') &&
        (!data.daysOfWeek || data.daysOfWeek.length === 0)
      ) {
        return apiError(reply, 400, 'daysOfWeek is required for weekly/biweekly patterns');
      }

      const service = new RecurringAppointmentsService(tenantDb, tenantId);

      const rule = await service.createRule(data as any, userId);

      return apiResponse(reply, 201, {
        rule: {
          ...rule.toObject(),
          patternDescription: service.getPatternDescription(rule),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return apiError(reply, 400, 'Validation failed', error.issues);
      }
      throw error;
    }
  });

  // ── Update Recurring Rule ───────────────────────────────────
  fastify.patch('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantDb = getTenantDb(request);
    const tenantId = getTenantId(request);
    const { id } = idParamSchema.parse(request.params);

    try {
      const { mode, ...updateData } = updateRecurringRuleSchema.parse(request.body);

      const service = new RecurringAppointmentsService(tenantDb, tenantId);

      const rule = await service.updateRule(id, updateData as any, mode);
      if (!rule) {
        return apiError(reply, 404, 'Recurring rule not found');
      }

      return apiResponse(reply, 200, {
        rule: {
          ...rule.toObject(),
          patternDescription: service.getPatternDescription(rule),
        },
        message: mode === 'all' ? 'All occurrences updated' : 'This and future occurrences updated',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return apiError(reply, 400, 'Validation failed', error.issues);
      }
      throw error;
    }
  });

  // ── Pause Recurring Rule ────────────────────────────────────
  fastify.patch('/:id/pause', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantDb = getTenantDb(request);
    const tenantId = getTenantId(request);
    const { id } = idParamSchema.parse(request.params);

    const service = new RecurringAppointmentsService(tenantDb, tenantId);

    const rule = await service.pauseRule(id);
    if (!rule) {
      return apiError(reply, 404, 'Recurring rule not found');
    }

    if (rule.status !== 'paused') {
      return apiError(reply, 400, 'Cannot pause rule in current state');
    }

    return apiResponse(reply, 200, {
      rule: {
        ...rule.toObject(),
        patternDescription: service.getPatternDescription(rule),
      },
      message: 'Series paused. No new appointments will be generated.',
    });
  });

  // ── Resume Recurring Rule ───────────────────────────────────
  fastify.patch('/:id/resume', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantDb = getTenantDb(request);
    const tenantId = getTenantId(request);
    const { id } = idParamSchema.parse(request.params);

    const service = new RecurringAppointmentsService(tenantDb, tenantId);

    const rule = await service.resumeRule(id);
    if (!rule) {
      return apiError(reply, 404, 'Recurring rule not found or not paused');
    }

    return apiResponse(reply, 200, {
      rule: {
        ...rule.toObject(),
        patternDescription: service.getPatternDescription(rule),
      },
      message: 'Series resumed. Appointments will be generated from next occurrence.',
    });
  });

  // ── Cancel Recurring Rule ───────────────────────────────────
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantDb = getTenantDb(request);
    const tenantId = getTenantId(request);
    const { id } = idParamSchema.parse(request.params);

    const service = new RecurringAppointmentsService(tenantDb, tenantId);

    const rule = await service.cancelRule(id);
    if (!rule) {
      return apiError(reply, 404, 'Recurring rule not found');
    }

    return apiResponse(reply, 200, {
      rule: {
        ...rule.toObject(),
        patternDescription: service.getPatternDescription(rule),
      },
      message: 'Series cancelled. Future appointments will be cancelled.',
    });
  });

  // ── Get Skipped Occurrences ─────────────────────────────────
  fastify.get('/:id/skipped', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantDb = getTenantDb(request);
    const tenantId = getTenantId(request);
    const { id } = idParamSchema.parse(request.params);

    const service = new RecurringAppointmentsService(tenantDb, tenantId);

    // Verify rule exists
    const rule = await service.getRule(id);
    if (!rule) {
      return apiError(reply, 404, 'Recurring rule not found');
    }

    const skipped = await service.getSkippedOccurrences(id);

    const reasonLabels = {
      conflict: { en: 'Doctor conflict', ar: 'تعارض مع موعد الطبيب' },
      holiday: { en: 'Branch holiday', ar: 'عطلة رسمية' },
      doctor_leave: { en: 'Doctor on leave', ar: 'الطبيب في إجازة' },
      manual: { en: 'Manually skipped', ar: 'تم تخطيه يدوياً' },
    };

    const skippedWithLabels = skipped.map((s) => ({
      ...s,
      reasonLabel: reasonLabels[s.reason] || { en: s.reason, ar: s.reason },
    }));

    return apiResponse(reply, 200, {
      skippedOccurrences: skippedWithLabels,
      total: skipped.length,
    });
  });

  // ── Regenerate Future Appointments ──────────────────────────
  // Deletes future unbooked instances and re-runs generation.
  fastify.post('/:id/regenerate', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantDb = getTenantDb(request);
    const tenantId = getTenantId(request);
    const { id } = idParamSchema.parse(request.params);

    const service = new RecurringAppointmentsService(tenantDb, tenantId);

    const rule = await service.getRule(id);
    if (!rule) {
      return apiError(reply, 404, 'Recurring rule not found');
    }

    if (rule.status !== 'active') {
      return apiError(reply, 400, 'Can only regenerate active recurring rules');
    }

    const result = await service.regenerateInstances(id);

    return apiResponse(
      reply,
      200,
      {
        ruleId: id,
        deletedCount: result.deletedCount,
        regeneratedDates: result.regeneratedDates,
      },
      'Future appointments regenerated successfully',
    );
  });
}
