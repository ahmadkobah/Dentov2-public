import { z } from 'zod';

/**
 * X-Ray Type Schemas — Lookup collection CRUD
 *
 * Per V2_DATABASE.md — xray_types collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#11)
 */

const bilingualSchema = z.object({
  en: z.string().min(1).max(200),
  ar: z.string().max(200).optional().default(''),
});

export const createXrayTypeSchema = z
  .object({
    code: z.string().min(1).max(50),
    name: bilingualSchema,
    description: z.string().max(500).optional(),
    isActive: z.boolean().optional().default(true),
    sortOrder: z.coerce.number().int().min(0).optional().default(0),
  })
  .strict();

export const updateXrayTypeSchema = createXrayTypeSchema.partial();

export const xrayTypeQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    search: z.string().max(100).optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    sortBy: z.enum(['sortOrder', 'code', 'createdAt']).default('sortOrder'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict();

export type CreateXrayTypeInput = z.infer<typeof createXrayTypeSchema>;
export type UpdateXrayTypeInput = z.infer<typeof updateXrayTypeSchema>;
export type XrayTypeQuery = z.infer<typeof xrayTypeQuerySchema>;
