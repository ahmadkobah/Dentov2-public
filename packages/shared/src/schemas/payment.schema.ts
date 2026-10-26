import { z } from 'zod';

/**
 * Payment Schema — Week 14 (Phase 4: Financial)
 *
 * Per V2_DATABASE.md §5.8 — payments collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#9 Payments)
 * Per V2_DECISION_LOG.md §11.1 — Webhook events
 *
 * Tenant-level payments for patient invoices (NOT platform SaaS payments).
 */

// ── Payment Method (tenant-level) ──────────────────────────

export const TENANT_PAYMENT_METHODS = [
  'cash',
  'card',
  'bank_transfer',
  'cheque',
  'insurance',
  'online',
  'fawry',
  'meeza',
] as const;

export type TenantPaymentMethod = (typeof TENANT_PAYMENT_METHODS)[number];

// ── Payment Status ─────────────────────────────────────────

export const TENANT_PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'refunded'] as const;

export type TenantPaymentStatus = (typeof TENANT_PAYMENT_STATUSES)[number];

// ── Create Payment ─────────────────────────────────────────

export const createPaymentSchema = z
  .object({
    invoiceId: z.string().min(1),
    patientId: z.string().min(1),
    amount: z.number().positive(),
    paymentMethod: z.enum(TENANT_PAYMENT_METHODS),
    paymentReference: z.string().max(200).optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

// ── Payment Query ──────────────────────────────────────────

export const paymentQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    invoiceId: z.string().optional(),
    patientId: z.string().optional(),
    search: z.string().max(100).optional(),
    paymentMethod: z.enum(TENANT_PAYMENT_METHODS).optional(),
    status: z.enum(TENANT_PAYMENT_STATUSES).optional(),
    // Accept date-only (YYYY-MM-DD from <input type="date">) as well as full ISO datetimes
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    sortBy: z.enum(['createdAt', 'amount', 'receivedAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

// ── Refund Payment ─────────────────────────────────────────

export const refundPaymentSchema = z
  .object({
    reason: z.string().min(1).max(500),
  })
  .strict();

// ── Online Payment Intent ──────────────────────────────────

export const createOnlinePaymentSchema = z
  .object({
    invoiceId: z.string().min(1),
    amount: z.number().positive(),
    currency: z
      .string()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'Must be a 3-letter ISO 4217 currency code'),
    method: z.enum(['card', 'fawry', 'wallet', 'meeza']).default('card'),
  })
  .strict();

// ── Reconciliation ─────────────────────────────────────────

export const RECONCILIATION_STATUSES = ['open', 'closed', 'reviewed'] as const;

export type ReconciliationStatus = (typeof RECONCILIATION_STATUSES)[number];

export const createReconciliationSchema = z
  .object({
    branchId: z.string().min(1),
    reconciliationDate: z.string().date(),
    openingBalance: z.number().default(0),
  })
  .strict();

export const updateReconciliationSchema = z
  .object({
    closingBalance: z.number().optional(),
    expenses: z.number().optional(),
    status: z.enum(RECONCILIATION_STATUSES).optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export const reconciliationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    branchId: z.string().optional(),
    status: z.enum(RECONCILIATION_STATUSES).optional(),
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional(),
    sortBy: z.enum(['reconciliationDate', 'createdAt']).default('reconciliationDate'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

// ── Type Exports ───────────────────────────────────────────

export type CreateTenantPaymentInput = z.infer<typeof createPaymentSchema>;
export type PaymentQuery = z.infer<typeof paymentQuerySchema>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
export type CreateOnlinePaymentInput = z.infer<typeof createOnlinePaymentSchema>;
export type CreateReconciliationInput = z.infer<typeof createReconciliationSchema>;
export type UpdateReconciliationInput = z.infer<typeof updateReconciliationSchema>;
export type ReconciliationQuery = z.infer<typeof reconciliationQuerySchema>;
