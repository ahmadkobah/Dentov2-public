/**
 * Storage Schemas — Zod validation for storage + tier endpoints
 */

import { z } from 'zod';

// ── Tenant Storage List Query ───────────────────────────────

export const storageTenantsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
    sortBy: z.enum(['storageUsedMB', 'usagePercentage', 'name']).default('storageUsedMB'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

export type StorageTenantsQuery = z.infer<typeof storageTenantsQuerySchema>;

// ── Storage Tier Schemas ────────────────────────────────────

const regionPriceSchema = z.object({
  countryCode: z
    .string()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'Must be a 2-letter ISO 3166-1 country code'),
  price: z.number().min(0),
  currency: z
    .string()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Must be a 3-letter ISO 4217 currency code'),
});

export const createStorageTierSchema = z.object({
  name: z.string().min(1).max(100),
  storageLimitGB: z.number().int().min(1).max(10000),
  pricePerMonth: z.number().min(0),
  currency: z
    .string()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Must be a 3-letter ISO 4217 currency code')
    .default('EUR'),
  isCustom: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(99),
  regionPrices: z.array(regionPriceSchema).default([]),
});

export const updateStorageTierSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  storageLimitGB: z.number().int().min(1).max(10000).optional(),
  pricePerMonth: z.number().min(0).optional(),
  currency: z
    .string()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Must be a 3-letter ISO 4217 currency code')
    .optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  regionPrices: z.array(regionPriceSchema).optional(),
});

export type CreateStorageTier = z.infer<typeof createStorageTierSchema>;
export type UpdateStorageTier = z.infer<typeof updateStorageTierSchema>;
