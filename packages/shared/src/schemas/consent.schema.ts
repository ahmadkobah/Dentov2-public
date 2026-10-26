import { z } from 'zod';

/**
 * Consent Template + Consent Form Schemas
 *
 * Per V2_DATABASE.md §5.11 — consent_templates, consent_forms
 * Per DENTO_V2_MASTER_PLAN.md §10 (#24) — Consent Forms
 */

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

const bilingualSchema = z.object({
  en: z.string().min(1).max(200),
  ar: z.string().max(200).optional().default(''),
});

const bilingualLongSchema = z.object({
  en: z.string().min(1).max(50000),
  ar: z.string().max(50000).optional().default(''),
});

// ── Consent Template ────────────────────────────────────────

export const createConsentTemplateSchema = z
  .object({
    name: bilingualSchema,
    procedureType: z.string().min(1).max(100),
    content: bilingualLongSchema,
    risks: bilingualLongSchema.optional(),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

export const updateConsentTemplateSchema = createConsentTemplateSchema.partial();

export const consentTemplateQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    search: z.string().max(100).optional(),
    procedureType: z.string().max(100).optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    sortBy: z.enum(['name.en', 'procedureType', 'createdAt']).default('name.en'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict();

// ── Consent Form ────────────────────────────────────────────

export const createConsentFormSchema = z
  .object({
    templateId: objectId,
    patientId: objectId,
    doctorId: objectId,
    appointmentId: objectId.optional(),
    treatmentPlanId: objectId.optional(),
    patientSignature: z.string().min(1).max(500000), // Base64 or S3 URL
    witnessSignature: z.string().max(500000).optional(),
    signedAt: z.coerce.date(),
  })
  .strict();

export const consentFormQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    patientId: objectId.optional(),
    doctorId: objectId.optional(),
    treatmentPlanId: objectId.optional(),
    templateId: objectId.optional(),
    search: z.string().max(100).optional(),
    sortBy: z.enum(['signedAt', 'createdAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

// ── Types ───────────────────────────────────────────────────

export type CreateConsentTemplateInput = z.infer<typeof createConsentTemplateSchema>;
export type UpdateConsentTemplateInput = z.infer<typeof updateConsentTemplateSchema>;
export type ConsentTemplateQuery = z.infer<typeof consentTemplateQuerySchema>;

export type CreateConsentFormInput = z.infer<typeof createConsentFormSchema>;
export type ConsentFormQuery = z.infer<typeof consentFormQuerySchema>;
