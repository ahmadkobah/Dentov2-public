import { z } from 'zod';

// ── Tenant Schemas (Platform Level) ─────────────────────────

export const SUPPORTED_LANGUAGES = ['en', 'ar'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const createTenantSchema = z
  .object({
    name: z.string().min(2).max(200),
    slug: z
      .string()
      .min(2)
      .max(63)
      .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/),
    adminEmail: z.string().email(),
    adminFirstName: z.string().min(1).max(100),
    adminLastName: z.string().min(1).max(100),
    adminPassword: z.string().min(8).max(128),
    countryCode: z
      .string()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, 'Must be a 2-letter ISO 3166-1 country code')
      .default('EG'),
    timezone: z
      .string()
      .regex(/^[A-Za-z_][A-Za-z0-9_+\-/]*$/, 'Invalid timezone format')
      .default('Africa/Cairo'),
    defaultLanguage: z.enum(SUPPORTED_LANGUAGES).default('en'),
    supportedLanguages: z
      .array(z.enum(SUPPORTED_LANGUAGES))
      .min(1, 'At least one language required')
      .default(['en']),
  })
  .strict();

export const updateTenantSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    status: z.enum(['active', 'suspended', 'cancelled', 'trial']).optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

// Type exports
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
