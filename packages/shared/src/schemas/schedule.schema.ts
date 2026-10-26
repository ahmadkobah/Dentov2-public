import { z } from 'zod';

// ── Reusable helpers ────────────────────────────────────────

const objectId = z.string().min(1);
const timeString = z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format');
const dateString = z.string().date();

const bilingualSchema = z
  .object({
    en: z.string().min(1).max(200),
    ar: z.string().max(200).optional().default(''),
  })
  .strict();

// ── Doctor Schedule ─────────────────────────────────────────

export const scheduleTypeEnum = z.enum(['recurring', 'override']);

export const createDoctorScheduleSchema = z
  .object({
    doctorId: objectId,
    branchId: objectId,
    scheduleType: scheduleTypeEnum,
    dayOfWeek: z.number().int().min(0).max(6).optional(), // 0=Sunday … 6=Saturday
    specificDate: dateString.optional(), // for override
    startTime: timeString,
    endTime: timeString,
    breakStart: timeString.optional(),
    breakEnd: timeString.optional(),
    slotDuration: z.number().int().min(5).max(180).default(30),
    isAvailable: z.boolean().default(true),
    isRamadanSchedule: z.boolean().default(false),
  })
  .strict()
  .refine(
    (d) => {
      if (d.scheduleType === 'recurring') return d.dayOfWeek !== undefined;
      return true;
    },
    { message: 'dayOfWeek is required for recurring schedules', path: ['dayOfWeek'] },
  )
  .refine(
    (d) => {
      if (d.scheduleType === 'override') return d.specificDate !== undefined;
      return true;
    },
    { message: 'specificDate is required for override schedules', path: ['specificDate'] },
  );

export const updateDoctorScheduleSchema = z
  .object({
    startTime: timeString.optional(),
    endTime: timeString.optional(),
    breakStart: timeString.optional(),
    breakEnd: timeString.optional(),
    slotDuration: z.number().int().min(5).max(180).optional(),
    isAvailable: z.boolean().optional(),
    isRamadanSchedule: z.boolean().optional(),
  })
  .strict();

export const doctorScheduleQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    doctorId: objectId.optional(),
    branchId: objectId.optional(),
    scheduleType: scheduleTypeEnum.optional(),
    dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
    isActive: z.coerce.boolean().optional(),
    isRamadanSchedule: z.coerce.boolean().optional(),
  })
  .strict();

// ── Schedule Exception ──────────────────────────────────────

export const exceptionTypeEnum = z.enum([
  'vacation',
  'sick_leave',
  'day_off',
  'conference',
  'special_hours',
  'other',
]);

export const exceptionStatusEnum = z.enum(['pending', 'approved', 'rejected']);

export const createScheduleExceptionSchema = z
  .object({
    doctorId: objectId,
    branchId: objectId.optional(), // null = all branches
    exceptionType: exceptionTypeEnum,
    startDate: dateString,
    endDate: dateString,
    isFullDay: z.boolean().default(true),
    specialStartTime: timeString.optional(),
    specialEndTime: timeString.optional(),
    reason: z.string().max(500).optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict()
  .refine(
    (d) => {
      if (!d.isFullDay) return d.specialStartTime !== undefined && d.specialEndTime !== undefined;
      return true;
    },
    {
      message: 'specialStartTime and specialEndTime are required for partial-day exceptions',
      path: ['specialStartTime'],
    },
  );

export const updateScheduleExceptionSchema = z
  .object({
    exceptionType: exceptionTypeEnum.optional(),
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    isFullDay: z.boolean().optional(),
    specialStartTime: timeString.optional(),
    specialEndTime: timeString.optional(),
    reason: z.string().max(500).optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export const reviewScheduleExceptionSchema = z
  .object({
    status: z.enum(['approved', 'rejected', 'cancelled']),
    rejectionReason: z.string().max(500).optional(),
  })
  .strict();

export const scheduleExceptionQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    doctorId: objectId.optional(),
    branchId: objectId.optional(),
    exceptionType: exceptionTypeEnum.optional(),
    status: exceptionStatusEnum.optional(),
    dateFrom: dateString.optional(),
    dateTo: dateString.optional(),
  })
  .strict();

// ── Shift Template ──────────────────────────────────────────

export const shiftTypeEnum = z.enum([
  'morning',
  'afternoon',
  'evening',
  'night',
  'split',
  'custom',
]);

export const createShiftTemplateSchema = z
  .object({
    name: bilingualSchema,
    startTime: timeString,
    endTime: timeString,
    breakDuration: z.number().int().min(0).max(120).default(30),
    shiftType: shiftTypeEnum.default('morning'),
    color: z.string().max(20).optional(),
    branchId: objectId.optional(), // null = global template
    applicableRoles: z.array(z.string()).default([]),
    isDefault: z.boolean().default(false),
  })
  .strict();

export const updateShiftTemplateSchema = createShiftTemplateSchema.partial().strict();

export const shiftTemplateQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    branchId: objectId.optional(),
    shiftType: shiftTypeEnum.optional(),
    isActive: z.coerce.boolean().optional(),
  })
  .strict();

// ── Staff Schedule ──────────────────────────────────────────

export const staffScheduleStatusEnum = z.enum(['scheduled', 'confirmed', 'swapped', 'cancelled']);

export const createStaffScheduleSchema = z
  .object({
    userId: objectId,
    branchId: objectId,
    shiftTemplateId: objectId.optional(),
    scheduleDate: dateString,
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: timeString,
    endTime: timeString,
    breakStart: timeString.optional(),
    breakEnd: timeString.optional(),
    role: z.string().min(1),
    status: staffScheduleStatusEnum.default('scheduled'),
    isPublished: z.boolean().default(false),
    isRamadanSchedule: z.boolean().default(false),
    notes: z.string().max(500).optional(),
  })
  .strict();

export const updateStaffScheduleSchema = z
  .object({
    shiftTemplateId: objectId.optional(),
    startTime: timeString.optional(),
    endTime: timeString.optional(),
    breakStart: timeString.optional(),
    breakEnd: timeString.optional(),
    status: staffScheduleStatusEnum.optional(),
    isPublished: z.boolean().optional(),
    notes: z.string().max(500).optional(),
  })
  .strict();

export const staffScheduleQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    userId: objectId.optional(),
    branchId: objectId.optional(),
    dateFrom: dateString.optional(),
    dateTo: dateString.optional(),
    role: z.string().optional(),
    isPublished: z.coerce.boolean().optional(),
    isRamadanSchedule: z.coerce.boolean().optional(),
  })
  .strict();

// ── Branch Holiday ──────────────────────────────────────────

export const branchHolidaySchema = z
  .object({
    date: dateString,
    name: bilingualSchema,
  })
  .strict();

export const updateBranchHolidaysSchema = z
  .object({
    holidays: z.array(branchHolidaySchema).max(100),
  })
  .strict();

// ── Branch Slot Config ──────────────────────────────────────

export const updateSlotConfigSchema = z
  .object({
    defaultDuration: z.number().int().min(5).max(480).optional(),
    minDuration: z.number().int().min(5).max(480).optional(),
    maxDuration: z.number().int().min(5).max(480).optional(),
    bufferBetween: z.number().int().min(0).max(60).optional(),
    bookingLeadTime: z.number().int().min(0).optional(),
    bookingWindowDays: z.number().int().min(1).max(365).optional(),
  })
  .strict();

// ── Branch Online Booking Config ────────────────────────────

export const updateOnlineBookingConfigSchema = z
  .object({
    isEnabled: z.boolean().optional(),
    isAutoConfirm: z.boolean().optional(),
    autoConfirmLeadTimeHours: z.number().int().min(0).optional(),
    isPatientPhoneRequired: z.boolean().optional(),
    isPatientEmailRequired: z.boolean().optional(),
    isDoctorSelectionAllowed: z.boolean().optional(),
    enabledServices: z.array(objectId).optional(),
    confirmationMessage: bilingualSchema.optional(),
  })
  .strict();

// ── Inferred Types ──────────────────────────────────────────

export type CreateDoctorScheduleInput = z.infer<typeof createDoctorScheduleSchema>;
export type UpdateDoctorScheduleInput = z.infer<typeof updateDoctorScheduleSchema>;
export type DoctorScheduleQuery = z.infer<typeof doctorScheduleQuerySchema>;

export type CreateScheduleExceptionInput = z.infer<typeof createScheduleExceptionSchema>;
export type UpdateScheduleExceptionInput = z.infer<typeof updateScheduleExceptionSchema>;
export type ReviewScheduleExceptionInput = z.infer<typeof reviewScheduleExceptionSchema>;
export type ScheduleExceptionQuery = z.infer<typeof scheduleExceptionQuerySchema>;

export type CreateShiftTemplateInput = z.infer<typeof createShiftTemplateSchema>;
export type UpdateShiftTemplateInput = z.infer<typeof updateShiftTemplateSchema>;
export type ShiftTemplateQuery = z.infer<typeof shiftTemplateQuerySchema>;

export type CreateStaffScheduleInput = z.infer<typeof createStaffScheduleSchema>;
export type UpdateStaffScheduleInput = z.infer<typeof updateStaffScheduleSchema>;
export type StaffScheduleQuery = z.infer<typeof staffScheduleQuerySchema>;

// ── Publish Staff Schedules ─────────────────────────────────

export const publishStaffScheduleSchema = z
  .object({
    scheduleIds: z.array(objectId).min(1).max(200),
    notifyStaff: z.boolean().default(true),
  })
  .strict();

export type PublishStaffScheduleInput = z.infer<typeof publishStaffScheduleSchema>;

export type UpdateBranchHolidaysInput = z.infer<typeof updateBranchHolidaysSchema>;
export type UpdateSlotConfigInput = z.infer<typeof updateSlotConfigSchema>;
export type UpdateOnlineBookingConfigInput = z.infer<typeof updateOnlineBookingConfigSchema>;
