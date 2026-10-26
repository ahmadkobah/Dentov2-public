import { z } from 'zod';

/**
 * Installment Plan Schema — Phase 4 Week 1 (Financial)
 *
 * Per V2_DATABASE.md §7.4 — installment_plans collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#9 Installments)
 *
 * Embedded payments[] array (v1: installment_payments → v2: embedded)
 * 3 frequencies: weekly | biweekly | monthly
 * 4 plan statuses: active | completed | defaulted | cancelled
 * 4 payment statuses: pending | paid | overdue | waived
 */

// ── Constants ──────────────────────────────────────────────

export const INSTALLMENT_FREQUENCY_VALUES = ['weekly', 'biweekly', 'monthly'] as const;
export type InstallmentFrequency = (typeof INSTALLMENT_FREQUENCY_VALUES)[number];

export const INSTALLMENT_PLAN_STATUS_VALUES = [
  'active',
  'completed',
  'defaulted',
  'cancelled',
] as const;
export type InstallmentPlanStatus = (typeof INSTALLMENT_PLAN_STATUS_VALUES)[number];

export const INSTALLMENT_PAYMENT_STATUS_VALUES = ['pending', 'paid', 'overdue', 'waived'] as const;
export type InstallmentPaymentStatus = (typeof INSTALLMENT_PAYMENT_STATUS_VALUES)[number];

// ── Create Installment Plan ────────────────────────────────

export const createInstallmentPlanSchema = z
  .object({
    invoiceId: z.string().min(1),
    patientId: z.string().min(1),
    totalAmount: z.number().min(0),
    downPayment: z.number().min(0).default(0),
    numberOfInstallments: z.number().int().min(1).max(24),
    frequency: z.enum(INSTALLMENT_FREQUENCY_VALUES),
    startDate: z.string().datetime(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

// ── Record Installment Payment ─────────────────────────────

export const recordInstallmentPaymentSchema = z
  .object({
    amountPaid: z.number().min(0),
    paymentId: z.string().optional(),
    lateFee: z.number().min(0).default(0),
    notes: z.string().max(2000).optional(),
  })
  .strict();

// ── Installment Query ──────────────────────────────────────

export const installmentQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(100).optional(),
    status: z.enum(INSTALLMENT_PLAN_STATUS_VALUES).optional(),
    patientId: z.string().optional(),
    // Date-range filter on plan start date (YYYY-MM-DD from <input type="date">)
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sortBy: z.enum(['createdAt', 'totalAmount', 'status', 'remainingAmount']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

// ── Update Installment Plan ────────────────────────────────

export const updateInstallmentPlanSchema = z
  .object({
    notes: z.string().max(2000).optional(),
    frequency: z.enum(INSTALLMENT_FREQUENCY_VALUES).optional(),
  })
  .strict();

// ── Type Exports ───────────────────────────────────────────

export type CreateInstallmentPlanInput = z.infer<typeof createInstallmentPlanSchema>;
export type UpdateInstallmentPlanInput = z.infer<typeof updateInstallmentPlanSchema>;
export type RecordInstallmentPaymentInput = z.infer<typeof recordInstallmentPaymentSchema>;
export type InstallmentQuery = z.infer<typeof installmentQuerySchema>;
