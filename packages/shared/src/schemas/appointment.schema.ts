import { z } from 'zod';

// ── Appointment Status Enum ─────────────────────────────────

export const appointmentStatusEnum = z.enum([
  'booked',
  'confirmed',
  'arrived',
  'in_progress',
  'completed',
  'no_show',
  'cancelled',
  'rescheduled',
]);

export const appointmentTypeEnum = z.enum([
  'consultation',
  'follow_up',
  'treatment',
  'emergency',
  'checkup',
]);

export const appointmentSourceEnum = z.enum([
  'admin',
  'website',
  'phone',
  'walk_in',
  'referral',
  'whatsapp',
]);

// ── Time format helper ──────────────────────────────────────

const timeString = z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format');

// ── Appointment Schemas ─────────────────────────────────────

export const createAppointmentSchema = z
  .object({
    patientId: z.string().min(1),
    doctorId: z.string().min(1),
    branchId: z.string().min(1),
    appointmentTypeId: z.string().optional(),
    serviceId: z.string().optional(),
    chairNumber: z.number().int().min(1).optional(),

    // Scheduling
    date: z.string().date(), // YYYY-MM-DD
    startTime: timeString, // HH:mm
    endTime: timeString, // HH:mm
    durationMinutes: z.number().int().min(5).max(480).default(30),

    type: z.string().min(1).default('consultation'),
    source: appointmentSourceEnum.default('admin'),
    isWalkIn: z.boolean().default(false),

    // Notes
    reason: z.string().max(500).optional(),
    notes: z.string().max(2000).optional(),
    internalNotes: z.string().max(2000).optional(),

    // Financial
    consultationFee: z.number().min(0).optional(),
  })
  .strict();

export const updateAppointmentSchema = z
  .object({
    doctorId: z.string().min(1).optional(),
    branchId: z.string().min(1).optional(),
    appointmentTypeId: z.string().optional(),
    serviceId: z.string().optional(),
    chairNumber: z.number().int().min(1).optional(),

    date: z.string().date().optional(),
    startTime: timeString.optional(),
    endTime: timeString.optional(),
    durationMinutes: z.number().int().min(5).max(480).optional(),

    type: z.string().min(1).optional(),
    status: appointmentStatusEnum.optional(),

    reason: z.string().max(500).optional(),
    notes: z.string().max(2000).optional(),
    internalNotes: z.string().max(2000).optional(),

    consultationFee: z.number().min(0).optional(),

    // Cancellation fields
    cancellationReason: z.string().max(500).optional(),
  })
  .strict();

export const appointmentQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    date: z.string().date().optional(),
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional(),
    doctorId: z.string().optional(),
    branchId: z.string().optional(),
    patientId: z.string().optional(),
    status: appointmentStatusEnum.optional(),
    type: z.string().min(1).optional(),
    sortBy: z.enum(['date', 'startTime', 'createdAt', 'status']).default('date'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict();

// ── Appointment Type Schemas (CRUD) ─────────────────────────

const bilingualSchema = z
  .object({
    en: z.string().min(1).max(200),
    ar: z.string().max(200).optional().default(''),
  })
  .strict();

export const createAppointmentTypeSchema = z
  .object({
    name: bilingualSchema,
    code: z.string().min(1).max(50).toLowerCase().trim(),
    defaultDuration: z.number().int().min(5).max(480).default(30),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color')
      .default('#4CAF50'),
    icon: z.string().max(50).optional(),
    isDoctorRequired: z.boolean().default(true),
    isOnlineBookingAllowed: z.boolean().default(false),
    defaultFee: z.number().min(0).optional(),
  })
  .strict();

export const updateAppointmentTypeSchema = createAppointmentTypeSchema.partial();

// ── Chair Assignment Schema ─────────────────────────────────

export const assignChairSchema = z
  .object({
    chairId: z.string().min(1, 'Chair ID is required'),
  })
  .strict();

// ── Chair Availability Query Schema ─────────────────────────

export const chairAvailabilityQuerySchema = z
  .object({
    branchId: z.string().min(1, 'Branch ID is required'),
    status: z.enum(['available', 'occupied', 'cleaning', 'maintenance', 'reserved']).optional(),
  })
  .strict();

// ── Recurring Edit Schema ────────────────────────────────────

export const recurringEditSchema = z
  .object({
    mode: z.enum(['this', 'this_and_following', 'all']),
    changes: z
      .object({
        startTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format')
          .optional(),
        endTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format')
          .optional(),
        doctorId: z.string().optional(),
        branchId: z.string().optional(),
      })
      .strict(),
  })
  .strict();

// Type exports
export type AppointmentStatus = z.infer<typeof appointmentStatusEnum>;
export type AppointmentType = z.infer<typeof appointmentTypeEnum>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type AppointmentQuery = z.infer<typeof appointmentQuerySchema>;
export type CreateAppointmentTypeInput = z.infer<typeof createAppointmentTypeSchema>;
export type UpdateAppointmentTypeInput = z.infer<typeof updateAppointmentTypeSchema>;
export type AssignChairInput = z.infer<typeof assignChairSchema>;
export type ChairAvailabilityQuery = z.infer<typeof chairAvailabilityQuerySchema>;
export type RecurringEditInput = z.infer<typeof recurringEditSchema>;
