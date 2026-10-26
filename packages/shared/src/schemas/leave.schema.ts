import { z } from 'zod';

// ── Reusable helpers ────────────────────────────────────────

const objectId = z.string().min(1);
const dateString = z.string().date();
const timeString = z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format');

const bilingualSchema = z
  .object({
    en: z.string().min(1).max(200),
    ar: z.string().max(200).optional().default(''),
  })
  .strict();

// ── Leave Type ──────────────────────────────────────────────

export const createLeaveTypeSchema = z
  .object({
    name: bilingualSchema,
    code: z.string().min(1).max(50),
    maxDaysPerYear: z.number().int().min(0).max(365),
    isPaid: z.boolean().default(true),
    isApprovalRequired: z.boolean().default(true),
    maxDaysPerRequest: z.number().int().min(1).max(180).optional(),
    color: z.string().max(20).optional(),
  })
  .strict();

export const updateLeaveTypeSchema = createLeaveTypeSchema.partial().strict();

export const leaveTypeQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    isActive: z.coerce.boolean().optional(),
  })
  .strict();

// ── Leave Request ───────────────────────────────────────────

export const leaveRequestStatusEnum = z.enum(['pending', 'approved', 'rejected', 'cancelled']);

export const createLeaveRequestSchema = z
  .object({
    leaveTypeId: objectId,
    startDate: dateString,
    endDate: dateString,
    reason: z.string().max(500).optional(),
    attachments: z
      .array(
        z
          .object({
            name: z.string().max(200),
            url: z.string().url().max(500),
          })
          .strict(),
      )
      .max(5)
      .default([]),
  })
  .strict();

export const updateLeaveRequestSchema = z
  .object({
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    reason: z.string().max(500).optional(),
    attachments: z
      .array(
        z
          .object({
            name: z.string().max(200),
            url: z.string().url().max(500),
          })
          .strict(),
      )
      .max(5)
      .optional(),
  })
  .strict();

export const reviewLeaveRequestSchema = z
  .object({
    status: z.enum(['approved', 'rejected', 'cancelled']),
    rejectionReason: z.string().max(500).optional(),
  })
  .strict();

export const leaveRequestQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    userId: objectId.optional(),
    leaveTypeId: objectId.optional(),
    status: leaveRequestStatusEnum.optional(),
    dateFrom: dateString.optional(),
    dateTo: dateString.optional(),
    sortBy: z.enum(['startDate', 'createdAt', 'status']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

// ── Leave Balance ───────────────────────────────────────────

export const leaveBalanceQuerySchema = z
  .object({
    userId: objectId.optional(),
    year: z.coerce.number().int().min(2020).max(2100).optional(),
  })
  .strict();

export const updateLeaveBalanceSchema = z
  .object({
    totalAllowance: z.number().int().min(0).max(365).optional(),
    carriedForward: z.number().int().min(0).max(365).optional(),
  })
  .strict();

// ── Attendance ──────────────────────────────────────────────

export const attendanceStatusEnum = z.enum([
  'present',
  'late',
  'absent',
  'half_day',
  'on_leave',
  'holiday',
]);

export const clockInSchema = z
  .object({
    branchId: objectId,
    notes: z.string().max(500).optional(),
  })
  .strict();

export const clockOutSchema = z
  .object({
    notes: z.string().max(500).optional(),
  })
  .strict();

/** Body for PATCH /attendance/today — per BUILD_RULES §3.2 (no verbs in URL) */
export const updateAttendanceTodaySchema = z
  .object({
    action: z.enum(['clock_out', 'break_start', 'break_end']),
    notes: z.string().max(500).optional(),
  })
  .strict();

export const attendanceQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    userId: objectId.optional(),
    branchId: objectId.optional(),
    dateFrom: dateString.optional(),
    dateTo: dateString.optional(),
    status: attendanceStatusEnum.optional(),
    sortBy: z.enum(['date', 'checkIn', 'status']).default('date'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

export const manualAttendanceSchema = z
  .object({
    userId: objectId,
    branchId: objectId,
    date: dateString,
    checkIn: timeString,
    checkOut: timeString.optional(),
    breakStart: timeString.optional(),
    breakEnd: timeString.optional(),
    status: attendanceStatusEnum.default('present'),
    notes: z.string().max(500).optional(),
  })
  .strict();

// ── Inferred Types ──────────────────────────────────────────

export type CreateLeaveTypeInput = z.infer<typeof createLeaveTypeSchema>;
export type UpdateLeaveTypeInput = z.infer<typeof updateLeaveTypeSchema>;
export type LeaveTypeQuery = z.infer<typeof leaveTypeQuerySchema>;

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type UpdateLeaveRequestInput = z.infer<typeof updateLeaveRequestSchema>;
export type ReviewLeaveRequestInput = z.infer<typeof reviewLeaveRequestSchema>;
export type LeaveRequestQuery = z.infer<typeof leaveRequestQuerySchema>;

export type LeaveBalanceQuery = z.infer<typeof leaveBalanceQuerySchema>;
export type UpdateLeaveBalanceInput = z.infer<typeof updateLeaveBalanceSchema>;

export type ClockInInput = z.infer<typeof clockInSchema>;
export type ClockOutInput = z.infer<typeof clockOutSchema>;
export type UpdateAttendanceTodayInput = z.infer<typeof updateAttendanceTodaySchema>;
export type AttendanceQuery = z.infer<typeof attendanceQuerySchema>;
export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>;
