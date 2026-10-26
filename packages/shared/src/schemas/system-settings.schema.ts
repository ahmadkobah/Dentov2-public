/**
 * Platform System Settings Schemas — Zod Validation
 *
 * Per V2_DATABASE §4.17 — Singleton platform-level configuration
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 2.1
 *
 * Validates update payloads sent to PATCH /api/platform/settings/*
 */

import { z } from 'zod';

// ── System Settings Update ──────────────────────────────────

export const updateSystemSettingsSchema = z
  .object({
    maintenanceMode: z.boolean().optional(),
    maintenanceMessage: z.string().max(1000).optional(),
    defaultTimezone: z
      .string()
      .regex(/^[A-Za-z_][A-Za-z0-9_+\-/]*$/, 'Invalid timezone format')
      .optional(),
    defaultCurrency: z
      .string()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'Must be a 3-letter ISO 4217 currency code')
      .optional(),
    defaultLanguage: z.enum(['en', 'ar']).optional(),
    registrationEnabled: z.boolean().optional(),
    maxTenantsPerCluster: z.number().int().min(1).max(10000).optional(),
    supportEmail: z.string().email().optional(),
    platformVersion: z.string().min(1).max(30).optional(),
  })
  .strict();

// ── Branding Update ─────────────────────────────────────────

export const docsConfigSchema = z
  .object({
    headerLogo: z.string().max(2048).optional(),
    headerTitle: z.string().max(200).optional(),
    footerSupportEmail: z.string().max(200).optional(),
    footerSupportPhone: z.string().max(50).optional(),
    footerCopyrightText: z.string().max(500).optional(),
    footerPlatformVersion: z.string().max(50).optional(),
  })
  .strict();

export const updateBrandingSchema = z
  .object({
    platformName: z.string().min(1).max(200).optional(),
    logoUrl: z.string().max(2048).optional(),
    faviconUrl: z.string().max(2048).optional(),
    primaryColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color (#RRGGBB)')
      .optional(),
    landingPageUrl: z.string().url().max(2048).or(z.literal('')).optional(),
    docsConfig: docsConfigSchema.optional(),
  })
  .strict();

// ── Exchange Rate Item ──────────────────────────────────────

export const exchangeRateSchema = z
  .object({
    currency: z
      .string()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'Must be a 3-letter ISO 4217 currency code'),
    rate: z.number().positive(),
  })
  .strict();

// ── Currencies Update ───────────────────────────────────────

export const updateCurrenciesSchema = z
  .object({
    baseCurrency: z
      .string()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'Must be a 3-letter ISO 4217 currency code')
      .optional(),
    exchangeRates: z.array(exchangeRateSchema).max(200).optional(),
  })
  .strict();

// Inferred types live in types/system-settings.types.ts to avoid duplicate exports.
