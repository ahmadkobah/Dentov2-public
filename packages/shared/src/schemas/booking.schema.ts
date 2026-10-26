import { z } from 'zod';

// ── Reusable helpers ────────────────────────────────────────

const objectId = z.string().min(1);
const dateString = z.string().date();
const timeString = z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format');

// ── Public Slot Query ───────────────────────────────────────

export const slotQuerySchema = z
  .object({
    branchId: objectId,
    doctorId: objectId.optional(),
    serviceId: objectId.optional(),
    date: dateString,
    durationMinutes: z.coerce.number().int().min(5).max(480).default(30),
  })
  .strict();

// ── Public Create Booking ───────────────────────────────────

export const createBookingSchema = z
  .object({
    branchId: objectId,
    doctorId: objectId,
    serviceId: objectId.optional(),
    date: dateString,
    startTime: timeString,
    endTime: timeString,
    durationMinutes: z.number().int().min(5).max(480).default(30),

    // Patient info (for new or existing)
    patientId: objectId.optional(), // existing patient
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    phone: z.string().min(5).max(20).optional(),
    email: z.string().email().optional(),

    reason: z.string().max(500).optional(),
    notes: z.string().max(2000).optional(),
    preferredLanguage: z.enum(['en', 'ar']).default('en'),

    // Phase 11.2 — Insurance pre-check (optional, validated server-side)
    insuranceProvider: z.string().min(1).max(200).optional(),
    insurancePolicyNumber: z.string().min(1).max(100).optional(),
  })
  .strict()
  .refine(
    (d) => {
      // Either existing patient or first+last+phone for new patient
      if (d.patientId) return true;
      return d.firstName !== undefined && d.lastName !== undefined && d.phone !== undefined;
    },
    {
      message:
        'Either patientId or (firstName + lastName + phone) is required for new patient booking',
      path: ['patientId'],
    },
  );

// ── Booking Confirmation (Admin) ────────────────────────────

export const bookingConfirmActionEnum = z.enum(['confirm', 'confirm_with_changes', 'reject']);

export const confirmBookingSchema = z
  .object({
    action: bookingConfirmActionEnum,
    // For confirm_with_changes:
    newDate: dateString.optional(),
    newStartTime: timeString.optional(),
    newEndTime: timeString.optional(),
    newDoctorId: objectId.optional(),
    // For reject:
    rejectionReason: z.string().max(500).optional(),
    // Optional message sent back to patient
    patientMessage: z.string().max(1000).optional(),
  })
  .strict();

// ── Public Branch Query (for booking widget) ────────────────

export const publicBranchQuerySchema = z
  .object({
    isActive: z.coerce.boolean().optional(),
  })
  .strict();

// ── Public Doctor Query (for booking widget) ────────────────

export const publicDoctorQuerySchema = z
  .object({
    branchId: objectId,
    serviceId: objectId.optional(),
  })
  .strict();

// ── Booking List Query (Admin) ──────────────────────────────

export const bookingListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['pending', 'confirmed', 'rejected', 'cancelled']).optional(),
    dateFrom: dateString.optional(),
    dateTo: dateString.optional(),
    branchId: objectId.optional(),
    doctorId: objectId.optional(),
  })
  .strict();

// ── Inferred Types ──────────────────────────────────────────

export type SlotQuery = z.infer<typeof slotQuerySchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type ConfirmBookingInput = z.infer<typeof confirmBookingSchema>;
export type PublicBranchQuery = z.infer<typeof publicBranchQuerySchema>;
export type PublicDoctorQuery = z.infer<typeof publicDoctorQuerySchema>;
export type BookingListQuery = z.infer<typeof bookingListQuerySchema>;
