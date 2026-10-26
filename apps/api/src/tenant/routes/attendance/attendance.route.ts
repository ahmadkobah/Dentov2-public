/**
 * Attendance Routes — Clock in/out, break tracking, manual attendance, list
 *
 * Per IMPLEMENTATION_ROADMAP.md — Week 9 (Staff Attendance)
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 * Per BUILD_RULES §3.3 — POST → 201, PATCH → 200
 *
 * Endpoints:
 *   - GET    /api/attendance                 — List attendance records
 *   - POST   /api/attendance                 — Clock in (creates today's record)
 *   - PATCH  /api/attendance/today           — Update today's record (clock out / break)
 *   - POST   /api/attendance/manual          — Create manual attendance (admin)
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import {
  attendanceQuerySchema,
  clockInSchema,
  updateAttendanceTodaySchema,
  manualAttendanceSchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { AttendanceService } from '../../services/attendance.service.js';

// ── Helpers ─────────────────────────────────────────────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

// ── Route Registration ──────────────────────────────────────

export async function attendanceRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // GET /attendance
  fastify.get(
    '/',
    { preHandler: [...preHandler, roleGuard('attendance', 'read')] },
    async (request, reply) => {
      try {
        const query = attendanceQuerySchema.parse(request.query);
        const service = new AttendanceService(getTenantDb(request));
        const result = await service.list(query);
        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to list attendance records');
      }
    },
  );

  // POST /attendance — Clock in (creates today's attendance record)
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('attendance', 'create')] },
    async (request, reply) => {
      try {
        const data = clockInSchema.parse(request.body);
        const service = new AttendanceService(getTenantDb(request));
        const record = await service.clockIn(data, getUserId(request));
        return apiResponse(reply, 201, { record }, 'Clocked in');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to clock in');
      }
    },
  );

  // PATCH /attendance/today — Update today's record (clock out / break start / break end)
  fastify.patch(
    '/today',
    { preHandler: [...preHandler, roleGuard('attendance', 'update')] },
    async (request, reply) => {
      try {
        const { action, notes } = updateAttendanceTodaySchema.parse(request.body);
        const service = new AttendanceService(getTenantDb(request));
        const userId = getUserId(request);

        let record;
        let message: string;

        switch (action) {
          case 'clock_out':
            record = await service.clockOut({ notes }, userId);
            message = 'Clocked out';
            break;
          case 'break_start':
            record = await service.startBreak(userId);
            message = 'Break started';
            break;
          case 'break_end':
            record = await service.endBreak(userId);
            message = 'Break ended';
            break;
        }

        return apiResponse(reply, 200, { record }, message);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to update attendance');
      }
    },
  );

  // POST /attendance/manual (admin creates manual entry)
  fastify.post(
    '/manual',
    { preHandler: [...preHandler, roleGuard('attendance', 'create')] },
    async (request, reply) => {
      try {
        const data = manualAttendanceSchema.parse(request.body);
        const service = new AttendanceService(getTenantDb(request));
        const record = await service.createManual(data, getUserId(request));
        return apiResponse(reply, 201, { record }, 'Manual attendance record created');
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to create manual attendance');
      }
    },
  );
}
