import { z } from 'zod';

// ── Commission Status Constants ─────────────────────────────

export const COMMISSION_STATUS_VALUES = ['pending', 'approved', 'paid', 'cancelled'] as const;

export type CommissionStatus = (typeof COMMISSION_STATUS_VALUES)[number];

/**
 * Valid status transitions for doctor commissions.
 * pending → approved → paid
 * pending → cancelled
 * approved → cancelled
 */
export const VALID_COMMISSION_STATUS_TRANSITIONS: Record<
  CommissionStatus,
  readonly CommissionStatus[]
> = {
  pending: ['approved', 'cancelled'],
  approved: ['paid', 'cancelled'],
  paid: [],
  cancelled: [],
} as const;

// ── Payment Method Values ───────────────────────────────────

export const PAYOUT_PAYMENT_METHODS = ['cash', 'bank_transfer', 'cheque', 'other'] as const;

// ── Commission Query Schema ─────────────────────────────────

export const commissionQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    doctorId: z.string().optional(),
    status: z.enum(COMMISSION_STATUS_VALUES).optional(),
    invoiceId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .strict();

// ── Approve Commissions Schema (bulk) ───────────────────────

export const approveCommissionsSchema = z
  .object({
    ids: z.array(z.string()).min(1, 'At least one commission ID required'),
  })
  .strict();

// ── Create Payout Schema ────────────────────────────────────

export const createPayoutSchema = z
  .object({
    doctorId: z.string().min(1, 'Doctor ID required'),
    periodStart: z.string().min(1, 'Period start required'),
    periodEnd: z.string().min(1, 'Period end required'),
    paymentMethod: z.enum(PAYOUT_PAYMENT_METHODS),
    reference: z.string().optional(),
  })
  .strict();

// ── Commission Summary Query Schema ─────────────────────────

export const commissionSummaryQuerySchema = z
  .object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .strict();

// ── Payout Query Schema ─────────────────────────────────────

export const payoutQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    doctorId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .strict();

// ── Calculate Commission from Invoice ───────────────────────

export const calculateCommissionSchema = z
  .object({
    invoiceId: z.string().min(1, 'Invoice ID required'),
    doctorId: z.string().min(1, 'Doctor ID required'),
    commissionRate: z.number().min(0).max(1, 'Rate must be 0–1'),
    appointmentId: z.string().optional(),
  })
  .strict();

// ── Inferred Types ──────────────────────────────────────────

export type CalculateCommissionInput = z.infer<typeof calculateCommissionSchema>;

// ── Calculate Commission Body (without invoiceId — taken from URL param) ──

export const calculateCommissionBodySchema = z
  .object({
    doctorId: z.string().min(1, 'Doctor ID required'),
    commissionRate: z.number().min(0).max(1, 'Rate must be 0–1'),
    appointmentId: z.string().optional(),
  })
  .strict();

export type CalculateCommissionBodyInput = z.infer<typeof calculateCommissionBodySchema>;

export type CommissionQuery = z.infer<typeof commissionQuerySchema>;
export type ApproveCommissionsInput = z.infer<typeof approveCommissionsSchema>;
export type CreatePayoutInput = z.infer<typeof createPayoutSchema>;
export type CommissionSummaryQuery = z.infer<typeof commissionSummaryQuerySchema>;
export type PayoutQuery = z.infer<typeof payoutQuerySchema>;
