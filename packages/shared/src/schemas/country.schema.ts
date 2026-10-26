/**
 * Country Config Schemas — Zod Validation
 *
 * Per MASTER_PLAN §25 — Tenant Locale System
 * Validates payloads for platform-level country config CRUD.
 */

import { z } from 'zod';

const currencySchema = z.object({
  code: z
    .string()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Must be a 3-letter ISO 4217 currency code'),
  symbol: z.string().min(1).max(10),
  symbolPosition: z.enum(['before', 'after']).default('before'),
  decimalPlaces: z.number().int().min(0).max(4).default(2),
});

export const createCountryConfigSchema = z
  .object({
    code: z
      .string()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, 'Must be a 2-letter ISO 3166-1 country code'),
    name: z.string().min(1).max(200),
    nameArabic: z.string().max(200).optional(),
    defaultLocale: z.enum(['en', 'ar']).default('en'),
    supportedLocales: z
      .array(z.enum(['en', 'ar']))
      .min(1, 'At least one locale required')
      .default(['en', 'ar']),
    currency: currencySchema,
    timezone: z.string().regex(/^[A-Za-z_][A-Za-z0-9_+\-/]*$/, 'Invalid timezone format'),
    dateFormat: z.string().min(1).max(50).default('dd/MM/yyyy'),
    timeFormat: z.enum(['12h', '24h']).default('12h'),
    weekStart: z.union([z.literal(0), z.literal(1), z.literal(5), z.literal(6)]).default(0),
    phoneCode: z.string().regex(/^\+\d{1,4}$/, 'Must be a valid phone code (e.g. +20)'),
    direction: z.enum(['ltr', 'rtl']).default('ltr'),
    isActive: z.boolean().default(true),
  })
  .strict();

export const updateCountryConfigSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    nameArabic: z.string().max(200).optional().nullable(),
    defaultLocale: z.enum(['en', 'ar']).optional(),
    supportedLocales: z
      .array(z.enum(['en', 'ar']))
      .min(1)
      .optional(),
    currency: currencySchema.optional(),
    timezone: z
      .string()
      .regex(/^[A-Za-z_][A-Za-z0-9_+\-/]*$/, 'Invalid timezone format')
      .optional(),
    dateFormat: z.string().min(1).max(50).optional(),
    timeFormat: z.enum(['12h', '24h']).optional(),
    weekStart: z.union([z.literal(0), z.literal(1), z.literal(5), z.literal(6)]).optional(),
    phoneCode: z
      .string()
      .regex(/^\+\d{1,4}$/, 'Must be a valid phone code (e.g. +20)')
      .optional(),
    direction: z.enum(['ltr', 'rtl']).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export type CreateCountryConfigInput = z.infer<typeof createCountryConfigSchema>;
export type UpdateCountryConfigInput = z.infer<typeof updateCountryConfigSchema>;
