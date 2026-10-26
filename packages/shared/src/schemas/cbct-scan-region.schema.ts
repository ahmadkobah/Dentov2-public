import { z } from 'zod';

/**
 * CBCT Scan Region Schemas — Lookup/seed collection CRUD
 *
 * Per V2_DATABASE.md — cbct_scan_regions collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#12)
 */

const bilingualSchema = z.object({
  en: z.string().min(1).max(200),
  ar: z.string().max(200).optional().default(''),
});

export const createCbctScanRegionSchema = z
  .object({
    code: z.string().min(1).max(50),
    name: bilingualSchema,
    description: z.string().max(500).optional(),
    isActive: z.boolean().optional().default(true),
    sortOrder: z.coerce.number().int().min(0).optional().default(0),
  })
  .strict();

export const updateCbctScanRegionSchema = createCbctScanRegionSchema.partial();

export const cbctScanRegionQuerySchema = z
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

export type CreateCbctScanRegionInput = z.infer<typeof createCbctScanRegionSchema>;
export type UpdateCbctScanRegionInput = z.infer<typeof updateCbctScanRegionSchema>;
export type CbctScanRegionQuery = z.infer<typeof cbctScanRegionQuerySchema>;
