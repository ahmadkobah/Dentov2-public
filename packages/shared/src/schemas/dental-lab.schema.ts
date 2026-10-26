import { z } from 'zod';

/**
 * Dental Lab Schemas — CRUD
 *
 * Per V2_DATABASE.md §5.13 — dental_labs collection
 */

export const createDentalLabSchema = z
  .object({
    name: z.string().min(1).max(200),
    contactPerson: z.string().max(200).optional(),
    phone: z.string().max(30).optional(),
    email: z.string().email().max(200).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    specialties: z.array(z.string().max(100)).max(20).optional().default([]),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    defaultTurnaroundDays: z.coerce.number().int().min(1).max(90).default(7),
    pricingNotes: z.string().max(2000).optional(),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

export const updateDentalLabSchema = createDentalLabSchema.partial();

export const dentalLabQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    search: z.string().max(100).optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    sortBy: z.enum(['name', 'rating', 'createdAt']).default('name'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict();

export type CreateDentalLabInput = z.infer<typeof createDentalLabSchema>;
export type UpdateDentalLabInput = z.infer<typeof updateDentalLabSchema>;
export type DentalLabQuery = z.infer<typeof dentalLabQuerySchema>;
