import { z } from 'zod';

/**
 * Insurance Schema — Phase 4 Week 1 (Financial)
 *
 * Per V2_DATABASE.md §7.5 — insurance_companies + insurance_claims
 * Per DENTO_V2_MASTER_PLAN.md §10 (#11 Insurance)
 * Per SECURITY_AND_ENCRYPTION.md §5 — policyNumber AES-256-GCM
 *
 * Insurance Companies: CRUD for insurance providers
 * Insurance Claims: 6-status flow with document attachments
 */

// ── Insurance Company ──────────────────────────────────────

export const createInsuranceCompanySchema = z
  .object({
    name: z.object({
      en: z.string().min(1).max(200),
      ar: z.string().min(1).max(200),
    }),
    code: z.string().min(1).max(50),
    contactPerson: z.string().max(200).optional(),
    phone: z.string().max(30).optional(),
    email: z.string().email().max(200).optional(),
    coveragePercentage: z.number().min(0).max(100).default(0),
    maxCoverage: z.number().min(0).optional(),
    isActive: z.boolean().default(true),
  })
  .strict();

export const updateInsuranceCompanySchema = createInsuranceCompanySchema.partial();

export const insuranceCompanyQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(100).optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    sortBy: z.enum(['createdAt', 'name.en', 'code', 'coveragePercentage']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

// ── Insurance Claim ────────────────────────────────────────

export const INSURANCE_CLAIM_STATUS_VALUES = [
  'submitted',
  'under_review',
  'approved',
  'partially_approved',
  'denied',
  'paid',
] as const;

export type InsuranceClaimStatus = (typeof INSURANCE_CLAIM_STATUS_VALUES)[number];

/**
 * Valid status transitions per V2_DATABASE.md §7.5
 * submitted → under_review → approved | partially_approved | denied → paid
 */
export const VALID_INSURANCE_CLAIM_STATUS_TRANSITIONS: Record<
  InsuranceClaimStatus,
  readonly InsuranceClaimStatus[]
> = {
  submitted: ['under_review', 'denied'],
  under_review: ['approved', 'partially_approved', 'denied'],
  approved: ['paid'],
  partially_approved: ['paid'],
  denied: [],
  paid: [],
} as const;

export const createInsuranceClaimSchema = z
  .object({
    patientId: z.string().min(1),
    patientInsuranceIndex: z.number().int().min(0),
    invoiceId: z.string().min(1),
    claimDate: z.string().datetime(),
    serviceDate: z.string().datetime(),
    totalAmount: z.number().min(0),
    claimedAmount: z.number().min(0),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export const updateClaimStatusSchema = z
  .object({
    status: z.enum(INSURANCE_CLAIM_STATUS_VALUES),
    approvedAmount: z.number().min(0).optional(),
    patientResponsibility: z.number().min(0).optional(),
    denialReason: z.string().max(2000).optional(),
  })
  .strict();

export const insuranceClaimQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(100).optional(),
    status: z.enum(INSURANCE_CLAIM_STATUS_VALUES).optional(),
    patientId: z.string().optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    sortBy: z
      .enum(['createdAt', 'claimNumber', 'claimDate', 'totalAmount', 'status'])
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

export const claimAgingQuerySchema = z
  .object({
    asOfDate: z.string().datetime().optional(),
    insuranceCompanyId: z.string().optional(),
  })
  .strict();

// ── Type Exports ───────────────────────────────────────────

export type CreateInsuranceCompanyInput = z.infer<typeof createInsuranceCompanySchema>;
export type UpdateInsuranceCompanyInput = z.infer<typeof updateInsuranceCompanySchema>;
export type InsuranceCompanyQuery = z.infer<typeof insuranceCompanyQuerySchema>;
export type CreateInsuranceClaimInput = z.infer<typeof createInsuranceClaimSchema>;
export type UpdateClaimStatusInput = z.infer<typeof updateClaimStatusSchema>;
export type InsuranceClaimQuery = z.infer<typeof insuranceClaimQuerySchema>;
export type ClaimAgingQuery = z.infer<typeof claimAgingQuerySchema>;

// ── Attach Document Schema (moved from insurance-claims.route.ts) ──

export const ALLOWED_CLAIM_DOC_TYPES = [
  'referral',
  'prescription',
  'xray',
  'lab_report',
  'approval_letter',
  'other',
] as const;

export const attachClaimDocumentSchema = z
  .object({
    name: z.string().min(1).max(200),
    url: z.string().url().max(2048),
    type: z.enum(ALLOWED_CLAIM_DOC_TYPES),
  })
  .strict();

export type AttachClaimDocumentInput = z.infer<typeof attachClaimDocumentSchema>;
