/**
 * Schedule Routes — Doctor Schedules, Exceptions, Shift Templates, Staff Schedules
 *
 * Per IMPLEMENTATION_ROADMAP.md — Week 9 (Scheduling Engine)
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 * Per BUILD_RULES §3.5 — Relative paths, prefix set in server.ts
 *
 * Endpoints:
 *   Doctor Schedules:
 *   - GET    /api/schedules/doctors                      — List doctor schedules
 *   - POST   /api/schedules/doctors                      — Create doctor schedule
 *   - PUT    /api/schedules/doctors/:id                  — Update doctor schedule
 *   - DELETE /api/schedules/doctors/:id                  — Soft delete doctor schedule
 *
 *   Schedule Exceptions:
 *   - GET    /api/schedules/exceptions                   — List exceptions
 *   - POST   /api/schedules/exceptions                   — Create exception
 *   - PUT    /api/schedules/exceptions/:id               — Update exception
 *   - PATCH  /api/schedules/exceptions/:id/status        — Approve/reject/cancel
 *   - DELETE /api/schedules/exceptions/:id               — Soft delete exception
 *
 *   Shift Templates:
 *   - GET    /api/schedules/shifts                       — List shift templates
 *   - POST   /api/schedules/shifts                       — Create shift template
 *   - PUT    /api/schedules/shifts/:id                   — Update shift template
 *   - DELETE /api/schedules/shifts/:id                   — Soft delete shift template
 *
 *   Staff Schedules:
 *   - GET    /api/schedules/staff                        — List staff schedules
 *   - POST   /api/schedules/staff                        — Create staff schedule
 *   - PUT    /api/schedules/staff/:id                    — Update staff schedule
 *   - DELETE /api/schedules/staff/:id                    — Soft delete staff schedule
 *
 *   Branch Config (Holidays, Slots, Online Booking):
 *   - PUT    /api/schedules/branches/:branchId/holidays  — Update branch holidays
 *   - PUT    /api/schedules/branches/:branchId/slot-config — Update slot config
 *   - PUT    /api/schedules/branches/:branchId/online-booking — Update online booking config
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createDoctorScheduleSchema,
  updateDoctorScheduleSchema,
  doctorScheduleQuerySchema,
  createScheduleExceptionSchema,
  updateScheduleExceptionSchema,
  reviewScheduleExceptionSchema,
  scheduleExceptionQuerySchema,
  createShiftTemplateSchema,
  updateShiftTemplateSchema,
  shiftTemplateQuerySchema,
  createStaffScheduleSchema,
  updateStaffScheduleSchema,
  staffScheduleQuerySchema,
  publishStaffScheduleSchema,
  updateBranchHolidaysSchema,
  updateSlotConfigSchema,
  updateOnlineBookingConfigSchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { ScheduleService } from '../../services/schedule.service.js';

// ── Helper ──────────────────────────────────────────────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

// ── Route Registration ──────────────────────────────────────

export async function scheduleRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // ═══════════════════════════════════════════════════════════
  // DOCTOR SCHEDULES
  // ═══════════════════════════════════════════════════════════

  // GET /schedules/doctors
  fastify.get(
    '/doctors',
    { preHandler: [...preHandler, roleGuard('schedules', 'read')] },
    async (request, reply) => {
      try {
        const query = doctorScheduleQuerySchema.parse(request.query);
        const service = new ScheduleService(getTenantDb(request));
        const result = await service.listDoctorSchedules(query);
        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to list doctor schedules');
      }
    },
  );

  // POST /schedules/doctors
  fastify.post(
    '/doctors',
    { preHandler: [...preHandler, roleGuard('schedules', 'create')] },
    async (request, reply) => {
      try {
        const data = createDoctorScheduleSchema.parse(request.body);
        const service = new ScheduleService(getTenantDb(request));
        const schedule = await service.createDoctorSchedule(data, getUserId(request));
        return apiResponse(reply, 201, { schedule }, 'Doctor schedule created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to create doctor schedule');
      }
    },
  );

  // PUT /schedules/doctors/:id
  fastify.put(
    '/doctors/:id',
    { preHandler: [...preHandler, roleGuard('schedules', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateDoctorScheduleSchema.parse(request.body);
        const service = new ScheduleService(getTenantDb(request));
        const schedule = await service.updateDoctorSchedule(id, data, getUserId(request));
        return apiResponse(reply, 200, { schedule }, 'Doctor schedule updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to update doctor schedule');
      }
    },
  );

  // DELETE /schedules/doctors/:id
  fastify.delete(
    '/doctors/:id',
    { preHandler: [...preHandler, roleGuard('schedules', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const service = new ScheduleService(getTenantDb(request));
        const schedule = await service.deleteDoctorSchedule(id, getUserId(request));
        return apiResponse(reply, 200, { schedule }, 'Doctor schedule deactivated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to delete doctor schedule');
      }
    },
  );

  // ═══════════════════════════════════════════════════════════
  // SCHEDULE EXCEPTIONS
  // ═══════════════════════════════════════════════════════════

  // GET /schedules/exceptions
  fastify.get(
    '/exceptions',
    { preHandler: [...preHandler, roleGuard('schedules', 'read')] },
    async (request, reply) => {
      try {
        const query = scheduleExceptionQuerySchema.parse(request.query);
        const service = new ScheduleService(getTenantDb(request));
        const result = await service.listExceptions(query);
        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to list schedule exceptions');
      }
    },
  );

  // POST /schedules/exceptions
  fastify.post(
    '/exceptions',
    { preHandler: [...preHandler, roleGuard('schedules', 'create')] },
    async (request, reply) => {
      try {
        const data = createScheduleExceptionSchema.parse(request.body);
        const service = new ScheduleService(getTenantDb(request));
        const exception = await service.createException(data, getUserId(request));
        return apiResponse(reply, 201, { exception }, 'Schedule exception created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to create schedule exception');
      }
    },
  );

  // PUT /schedules/exceptions/:id
  fastify.put(
    '/exceptions/:id',
    { preHandler: [...preHandler, roleGuard('schedules', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateScheduleExceptionSchema.parse(request.body);
        const service = new ScheduleService(getTenantDb(request));
        const exception = await service.updateException(id, data, getUserId(request));
        return apiResponse(reply, 200, { exception }, 'Schedule exception updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to update schedule exception');
      }
    },
  );

  // PATCH /schedules/exceptions/:id/status — Approve/reject/cancel (per BUILD_RULES §3.2)
  fastify.patch(
    '/exceptions/:id/status',
    { preHandler: [...preHandler, roleGuard('schedules', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = reviewScheduleExceptionSchema.parse(request.body);
        const service = new ScheduleService(getTenantDb(request));
        const exception = await service.reviewException(id, data, getUserId(request));
        return apiResponse(reply, 200, { exception }, 'Exception reviewed');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to review schedule exception');
      }
    },
  );

  // DELETE /schedules/exceptions/:id
  fastify.delete(
    '/exceptions/:id',
    { preHandler: [...preHandler, roleGuard('schedules', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const service = new ScheduleService(getTenantDb(request));
        const exception = await service.deleteException(id, getUserId(request));
        return apiResponse(reply, 200, { exception }, 'Schedule exception deactivated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to delete schedule exception');
      }
    },
  );

  // ═══════════════════════════════════════════════════════════
  // SHIFT TEMPLATES
  // ═══════════════════════════════════════════════════════════

  // GET /schedules/shifts
  fastify.get(
    '/shifts',
    { preHandler: [...preHandler, roleGuard('schedules', 'read')] },
    async (request, reply) => {
      try {
        const query = shiftTemplateQuerySchema.parse(request.query);
        const service = new ScheduleService(getTenantDb(request));
        const result = await service.listShiftTemplates(query);
        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to list shift templates');
      }
    },
  );

  // POST /schedules/shifts
  fastify.post(
    '/shifts',
    { preHandler: [...preHandler, roleGuard('schedules', 'create')] },
    async (request, reply) => {
      try {
        const data = createShiftTemplateSchema.parse(request.body);
        const service = new ScheduleService(getTenantDb(request));
        const shift = await service.createShiftTemplate(data, getUserId(request));
        return apiResponse(reply, 201, { shift }, 'Shift template created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to create shift template');
      }
    },
  );

  // PUT /schedules/shifts/:id
  fastify.put(
    '/shifts/:id',
    { preHandler: [...preHandler, roleGuard('schedules', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateShiftTemplateSchema.parse(request.body);
        const service = new ScheduleService(getTenantDb(request));
        const shift = await service.updateShiftTemplate(id, data, getUserId(request));
        return apiResponse(reply, 200, { shift }, 'Shift template updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to update shift template');
      }
    },
  );

  // DELETE /schedules/shifts/:id
  fastify.delete(
    '/shifts/:id',
    { preHandler: [...preHandler, roleGuard('schedules', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const service = new ScheduleService(getTenantDb(request));
        const shift = await service.deleteShiftTemplate(id, getUserId(request));
        return apiResponse(reply, 200, { shift }, 'Shift template deactivated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to delete shift template');
      }
    },
  );

  // ═══════════════════════════════════════════════════════════
  // STAFF SCHEDULES
  // ═══════════════════════════════════════════════════════════

  // GET /schedules/staff
  fastify.get(
    '/staff',
    { preHandler: [...preHandler, roleGuard('schedules', 'read')] },
    async (request, reply) => {
      try {
        const query = staffScheduleQuerySchema.parse(request.query);
        const service = new ScheduleService(getTenantDb(request));
        const result = await service.listStaffSchedules(query);
        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to list staff schedules');
      }
    },
  );

  // POST /schedules/staff
  fastify.post(
    '/staff',
    { preHandler: [...preHandler, roleGuard('schedules', 'create')] },
    async (request, reply) => {
      try {
        const data = createStaffScheduleSchema.parse(request.body);
        const service = new ScheduleService(getTenantDb(request));
        const schedule = await service.createStaffSchedule(data, getUserId(request));
        return apiResponse(reply, 201, { schedule }, 'Staff schedule created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to create staff schedule');
      }
    },
  );

  // PUT /schedules/staff/:id
  fastify.put(
    '/staff/:id',
    { preHandler: [...preHandler, roleGuard('schedules', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateStaffScheduleSchema.parse(request.body);
        const service = new ScheduleService(getTenantDb(request));
        const schedule = await service.updateStaffSchedule(id, data, getUserId(request));
        return apiResponse(reply, 200, { schedule }, 'Staff schedule updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to update staff schedule');
      }
    },
  );

  // DELETE /schedules/staff/:id
  fastify.delete(
    '/staff/:id',
    { preHandler: [...preHandler, roleGuard('schedules', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const service = new ScheduleService(getTenantDb(request));
        const schedule = await service.deleteStaffSchedule(id, getUserId(request));
        return apiResponse(reply, 200, { schedule }, 'Staff schedule deactivated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to delete staff schedule');
      }
    },
  );

  // POST /schedules/staff/publish — Bulk publish draft schedules
  fastify.post(
    '/staff/publish',
    { preHandler: [...preHandler, roleGuard('schedules', 'update')] },
    async (request, reply) => {
      try {
        const data = publishStaffScheduleSchema.parse(request.body);
        const service = new ScheduleService(getTenantDb(request));
        const result = await service.publishStaffSchedules(data, getUserId(request));
        return apiResponse(reply, 200, result, 'Staff schedules published');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to publish staff schedules');
      }
    },
  );

  // ═══════════════════════════════════════════════════════════
  // BRANCH CONFIG (Holidays, Slot Config, Online Booking)
  // ═══════════════════════════════════════════════════════════

  // PUT /schedules/branches/:branchId/holidays
  fastify.put(
    '/branches/:branchId/holidays',
    { preHandler: [...preHandler, roleGuard('schedules', 'update')] },
    async (request, reply) => {
      try {
        const { branchId } = request.params as { branchId: string };
        const data = updateBranchHolidaysSchema.parse(request.body);
        const service = new ScheduleService(getTenantDb(request));
        const holidays = await service.updateBranchHolidays(branchId, data, getUserId(request));
        return apiResponse(reply, 200, { holidays }, 'Branch holidays updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to update branch holidays');
      }
    },
  );

  // PUT /schedules/branches/:branchId/slot-config
  fastify.put(
    '/branches/:branchId/slot-config',
    { preHandler: [...preHandler, roleGuard('schedules', 'update')] },
    async (request, reply) => {
      try {
        const { branchId } = request.params as { branchId: string };
        const data = updateSlotConfigSchema.parse(request.body);
        const service = new ScheduleService(getTenantDb(request));
        const slotConfig = await service.updateSlotConfig(branchId, data, getUserId(request));
        return apiResponse(reply, 200, { slotConfig }, 'Slot config updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to update slot config');
      }
    },
  );

  // PUT /schedules/branches/:branchId/online-booking
  fastify.put(
    '/branches/:branchId/online-booking',
    { preHandler: [...preHandler, roleGuard('schedules', 'update')] },
    async (request, reply) => {
      try {
        const { branchId } = request.params as { branchId: string };
        const data = updateOnlineBookingConfigSchema.parse(request.body);
        const service = new ScheduleService(getTenantDb(request));
        const onlineBookingConfig = await service.updateOnlineBookingConfig(
          branchId,
          data,
          getUserId(request),
        );
        return apiResponse(reply, 200, { onlineBookingConfig }, 'Online booking config updated');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to update online booking config');
      }
    },
  );
}
