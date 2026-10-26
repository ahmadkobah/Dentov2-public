import { z } from 'zod';

/**
 * Invoice Schema — Week 14 (Phase 4: Financial)
 *
 * Per V2_DATABASE.md §5.7 — invoices collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#8 Invoices)
 * Per V2_DECISION_LOG.md §11.1 — Webhook events
 *
 * Statuses: draft | issued | paid | partially_paid | overdue | cancelled | refunded
 */

// ── Invoice Status ─────────────────────────────────────────

export const INVOICE_STATUS_VALUES = [
  'draft',
  'issued',
  'installment',
  'paid',
  'partially_paid',
  'overdue',
  'cancelled',
  'refunded',
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUS_VALUES)[number];

// ── Invoice Status Transitions ─────────────────────────────

export const VALID_INVOICE_STATUS_TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  draft: ['issued', 'cancelled', 'installment'],
  issued: ['paid', 'partially_paid', 'overdue', 'cancelled', 'installment'],
  installment: ['paid', 'partially_paid', 'cancelled'],
  partially_paid: ['paid', 'overdue', 'cancelled'],
  overdue: ['paid', 'partially_paid', 'cancelled'],
  paid: ['refunded'],
  cancelled: [],
  refunded: [],
} as const;

// ── Invoice Item (embedded) ────────────────────────────────

export const invoiceItemSchema = z
  .object({
    description: z.string().min(1).max(500),
    treatmentId: z.string().optional(),
    serviceId: z.string().optional(),
    toothNumber: z.string().max(10).optional(),
    quantity: z.number().int().min(1).default(1),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).default(0),
    total: z.number().min(0),
  })
  .strict();

// ── Create Invoice ─────────────────────────────────────────

export const createInvoiceSchema = z
  .object({
    patientId: z.string().min(1),
    branchId: z.string().min(1),
    appointmentId: z.string().optional(),
    treatmentPlanId: z.string().optional(),
    doctorId: z.string().optional(),

    // Items
    items: z.array(invoiceItemSchema).min(1),

    // Totals (server can re-compute, but client may send)
    subtotal: z.number().min(0),
    discountAmount: z.number().min(0).default(0),
    discountPercentage: z.number().min(0).max(100).default(0),
    taxAmount: z.number().min(0).default(0),
    taxPercentage: z.number().min(0).max(100).default(0),
    totalAmount: z.number().min(0),

    // Per-invoice currency override (§25)
    currency: z
      .string()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'Must be a 3-letter ISO 4217 currency code')
      .optional(),

    // Multi-currency support (§25)
    exchangeRate: z.number().positive().optional(),
    originalAmountInClinicCurrency: z.number().min(0).optional(),

    // Dates
    issueDate: z.string().datetime().optional(),
    dueDate: z.string().datetime().optional(),

    // Notes
    notes: z.string().max(2000).optional(),
    terms: z.string().max(2000).optional(),

    // Insurance
    insuranceClaimId: z.string().optional(),
    insuredAmount: z.number().min(0).default(0),
    patientResponsibility: z.number().min(0).optional(),

    // Status (default draft)
    status: z.enum(INVOICE_STATUS_VALUES).default('draft'),
  })
  .strict();

// ── Update Invoice ─────────────────────────────────────────

export const updateInvoiceSchema = createInvoiceSchema
  .omit({ patientId: true, branchId: true })
  .partial();

// ── Invoice Query ──────────────────────────────────────────

export const invoiceQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(100).optional(),
    status: z.enum(INVOICE_STATUS_VALUES).optional(),
    patientId: z.string().optional(),
    branchId: z.string().optional(),
    doctorId: z.string().optional(),
    // Accept date-only (YYYY-MM-DD from <input type="date">) as well as full ISO datetimes
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    sortBy: z
      .enum(['createdAt', 'invoiceNumber', 'totalAmount', 'dueDate', 'status'])
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

// ── Generate from Treatment Plan ───────────────────────────

export const generateInvoiceFromPlanSchema = z
  .object({
    treatmentPlanId: z.string().min(1),
    branchId: z.string().min(1),
    currency: z
      .string()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'Must be a 3-letter ISO 4217 currency code')
      .optional(),
    notes: z.string().max(2000).optional(),
    dueDate: z.string().datetime().optional(),
  })
  .strict();

// ── Type Exports ───────────────────────────────────────────

export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type InvoiceQuery = z.infer<typeof invoiceQuerySchema>;
export type GenerateInvoiceFromPlanInput = z.infer<typeof generateInvoiceFromPlanSchema>;
