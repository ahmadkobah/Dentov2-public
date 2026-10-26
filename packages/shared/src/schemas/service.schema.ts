import { z } from 'zod';

/**
 * Service Schemas
 *
 * Per V2_DATABASE.md §11.2 — services
 * Per DENTO_V2_MASTER_PLAN.md §10 (#16) — Dental Services
 */

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

const bilingualSchema = z.object({
  en: z.string().min(1).max(200),
  ar: z.string().max(200).optional().default(''),
});

const bilingualOptSchema = z.object({
  en: z.string().max(1000).optional().default(''),
  ar: z.string().max(1000).optional().default(''),
});

// ── Service ─────────────────────────────────────────────────

const branchPriceSchema = z.object({
  branchId: objectId,
  price: z.coerce.number().min(0),
});

const requiredMaterialSchema = z.object({
  itemId: objectId,
  quantity: z.coerce.number().min(0),
  isOptional: z.boolean().optional().default(false),
});

export const toothConditionForServiceEnum = z.enum([
  'healthy',
  'cavity',
  'crown',
  'bridge',
  'implant',
  'missing',
  'rct',
  'filling',
  'extraction_needed',
  'periodontal',
  'veneer',
  'temporary',
  'pontic',
]);

export const createServiceSchema = z
  .object({
    name: bilingualSchema,
    description: bilingualOptSchema.optional(),
    code: z.string().max(20).optional(),
    chartCondition: toothConditionForServiceEnum.optional(),
    defaultPrice: z.coerce.number().min(0),
    branchPrices: z.array(branchPriceSchema).max(50).optional().default([]),
    defaultDuration: z.coerce.number().int().min(5).max(480).default(30),
    requiredMaterials: z.array(requiredMaterialSchema).max(50).optional().default([]),
    isActive: z.boolean().optional().default(true),
    sortOrder: z.coerce.number().int().min(0).optional().default(0),
  })
  .strict();

export const updateServiceSchema = createServiceSchema.partial();

export const serviceQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    search: z.string().max(100).optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    sortBy: z.enum(['sortOrder', 'name.en', 'defaultPrice', 'createdAt']).default('sortOrder'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict();

// ── Types ───────────────────────────────────────────────────

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type ServiceQuery = z.infer<typeof serviceQuerySchema>;
