import { z } from 'zod';

/**
 * Lab Order Type Schemas — Lookup CRUD
 *
 * Per V2_DATABASE.md §5.14 — lab_order_types collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#13) — Lab Order Types
 */

const bilingualSchema = z.object({
  en: z.string().min(1).max(200),
  ar: z.string().max(200).optional().default(''),
});

export const labOrderTypeCategoryEnum = z.enum([
  'crown_bridge',
  'veneers',
  'removable',
  'appliances',
  'orthodontics',
  'implants',
  'diagnostics',
  'other',
]);

export const createLabOrderTypeSchema = z
  .object({
    name: bilingualSchema,
    category: labOrderTypeCategoryEnum,
    description: z.string().max(500).optional(),
    defaultTurnaroundDays: z.coerce.number().int().min(1).max(90).default(7),
    isActive: z.boolean().optional().default(true),
    sortOrder: z.coerce.number().int().min(0).optional().default(0),
  })
  .strict();

export const updateLabOrderTypeSchema = createLabOrderTypeSchema.partial();

export const labOrderTypeQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    search: z.string().max(100).optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    category: labOrderTypeCategoryEnum.optional(),
    sortBy: z.enum(['sortOrder', 'name.en', 'createdAt']).default('sortOrder'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict();

export type CreateLabOrderTypeInput = z.infer<typeof createLabOrderTypeSchema>;
export type UpdateLabOrderTypeInput = z.infer<typeof updateLabOrderTypeSchema>;
export type LabOrderTypeQuery = z.infer<typeof labOrderTypeQuerySchema>;
