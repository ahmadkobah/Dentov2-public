import { z } from 'zod';

/**
 * Branch Management Schemas — Per V2_DATABASE §11.4 + MASTER_PLAN §13
 *
 * Multi-branch clinic support with embedded chairs, working hours,
 * slot config, and online booking configuration.
 */

// ── Bilingual Field ─────────────────────────────────────────

const bilingualField = z.object({
  en: z.string().min(1, 'English name is required'),
  ar: z.string().optional(),
});

// ── Chair ───────────────────────────────────────────────────

const chairSchema = z.object({
  number: z.number().int().min(1),
  name: z.string().optional(),
  isActive: z.boolean().default(true),
  equipmentType: z.enum(['standard', 'surgical', 'pediatric']).default('standard'),
});

// ── Working Hours ───────────────────────────────────────────

const workingHoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  isClosed: z.boolean().default(false),
});

// ── Holiday ─────────────────────────────────────────────────

const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: bilingualField,
});

// ── Slot Config ─────────────────────────────────────────────

const slotConfigSchema = z.object({
  defaultDuration: z.number().int().min(5).default(30),
  minDuration: z.number().int().min(5).default(15),
  maxDuration: z.number().int().default(180),
  bufferBetween: z.number().int().min(0).default(0),
  bookingLeadTime: z.number().int().min(0).default(60),
  bookingWindowDays: z.number().int().min(1).default(60),
});

// ── Online Booking Config ───────────────────────────────────

const onlineBookingConfigSchema = z.object({
  isEnabled: z.boolean().default(false),
  isAutoConfirm: z.boolean().default(false),
  autoConfirmLeadTimeHours: z.number().default(24),
  isPatientPhoneRequired: z.boolean().default(true),
  isPatientEmailRequired: z.boolean().default(false),
  isDoctorSelectionAllowed: z.boolean().default(true),
  enabledServices: z.array(z.string()).default([]),
  confirmationMessage: bilingualField.optional(),
});

// ── Create Branch ───────────────────────────────────────────

export const createBranchSchema = z
  .object({
    name: bilingualField,
    code: z.string().min(1).max(20),
    address: bilingualField,
    city: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    chairs: z.array(chairSchema).optional(),
    workingHours: z.array(workingHoursSchema).optional(),
    slotConfig: slotConfigSchema.optional(),
    onlineBookingConfig: onlineBookingConfigSchema.optional(),
    isPrimary: z.boolean().default(false),
    coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
  })
  .strict();

// ── Update Branch ───────────────────────────────────────────

export const updateBranchSchema = z
  .object({
    name: bilingualField.optional(),
    address: bilingualField.optional(),
    city: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    chairs: z.array(chairSchema).optional(),
    workingHours: z.array(workingHoursSchema).optional(),
    ramadanHours: z.array(workingHoursSchema).optional(),
    isRamadanMode: z.boolean().optional(),
    holidays: z.array(holidaySchema).optional(),
    slotConfig: slotConfigSchema.optional(),
    onlineBookingConfig: onlineBookingConfigSchema.optional(),
    isPrimary: z.boolean().optional(),
    isActive: z.boolean().optional(),
    coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
  })
  .strict();

// ── Branch List Query ───────────────────────────────────────

export const branchListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    isActive: z.coerce.boolean().optional(),
    sortBy: z.enum(['createdAt', 'name.en', 'code']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict();

// ── Type Exports ────────────────────────────────────────────

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
export type BranchListQuery = z.infer<typeof branchListQuerySchema>;
