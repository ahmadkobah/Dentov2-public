/**
 * Settings Schemas — Zod Validation
 *
 * Per V2_DATABASE.md §11.1 — Tenant-Konfiguration
 * Per V2_DECISION_LOG.md §9 — Security settings for 2FA
 *
 * Key-value pattern: each settings "key" maps to a typed value object.
 */

import { z } from 'zod';

// ── Bilingual Helper ────────────────────────────────────────

const bilingualSchema = z.object({
  en: z.string().min(1).max(500),
  ar: z.string().max(500).optional(),
});

// ── Clinic Settings (key = "clinic") ────────────────────────

export const clinicSettingsSchema = z.object({
  name: bilingualSchema,
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional().nullable(),
  logo: z.string().optional().nullable(),
  address: bilingualSchema.optional(),
  timezone: z
    .string()
    .regex(/^[A-Za-z_][A-Za-z0-9_+\-/]*$/, 'Invalid timezone format')
    .default('Africa/Cairo'),
  defaultLanguage: z.enum(['en', 'ar']).default('en'),
  supportedLanguages: z.array(z.string()).min(1).default(['en']),
  dateFormat: z.string().default('DD/MM/YYYY'),
  timeFormat: z.enum(['12h', '24h']).default('12h'),
  currency: z
    .string()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Must be a 3-letter ISO 4217 currency code')
    .default('EGP'),
  taxEnabled: z.boolean().default(false),
  taxPercentage: z.number().min(0).max(100).nullable().default(null),
  fiscalYearStart: z.number().min(1).max(12).default(1),
});

// ── Appointment Settings (key = "appointment") ──────────────

export const appointmentSettingsSchema = z.object({
  slotDuration: z.number().min(5).max(240).default(30),
  bufferTime: z.number().min(0).max(60).default(0),
  maxAdvanceBookingDays: z.number().min(1).max(365).default(90),
  minCancellationHours: z.number().min(0).max(168).default(24),
  autoConfirm: z.boolean().default(false),
  walkInEnabled: z.boolean().default(true),
  onlineBookingEnabled: z.boolean().default(false),
  reminderHoursBefore: z.array(z.number().min(0).max(168)).default([24, 2]),
  autoNoShowMinutes: z.number().min(5).max(240).default(30),
  workingDays: z.array(z.number().min(0).max(6)).default([0, 1, 2, 3, 4]),
  workingHoursStart: z.string().default('09:00'),
  workingHoursEnd: z.string().default('17:00'),
  ramadanScheduleActive: z.boolean().default(false),
  ramadanStart: z.string().optional(),
  ramadanEnd: z.string().optional(),
});

// ── Billing Settings (key = "billing") ──────────────────────

export const billingSettingsSchema = z.object({
  invoicePrefix: z.string().max(10).default('INV'),
  invoiceStartNumber: z.number().min(1).default(1),
  paymentMethods: z.array(z.string()).default(['cash']),
  defaultPaymentTermDays: z.number().min(0).max(365).default(0),
  enableInstallments: z.boolean().default(false),
  enableInsurance: z.boolean().default(false),
  enableCommissions: z.boolean().default(false),
});

// ── Notification Settings (key = "notifications") ───────────

export const notificationSettingsSchema = z.object({
  emailEnabled: z.boolean().default(true),
  smsEnabled: z.boolean().default(false),
  whatsappEnabled: z.boolean().default(false),
  pushEnabled: z.boolean().default(true),
  quietHoursStart: z.string().optional(), // "22:00"
  quietHoursEnd: z.string().optional(), // "08:00"
  defaultLanguage: z.enum(['en', 'ar']).default('en'),
});

// ── Security Settings (key = "security") ────────────────────
// Per V2_DECISION_LOG.md §9

export const securitySettingsSchema = z.object({
  require2FA: z.boolean().default(false),
  require2FAForRoles: z.array(z.string()).default([]),
  allow2FAMethods: z.array(z.enum(['totp'])).default(['totp']),
  sessionTimeoutMinutes: z.number().min(5).max(1440).default(60),
  maxLoginAttempts: z.number().min(3).max(20).default(5),
  lockoutDurationMinutes: z.number().min(1).max(1440).default(15),
});

// ── Inventory Settings (key = "inventory") ──────────────────
// Per DENTO_V2_MASTER_PLAN.md §16 — Stock-Validierung

export const inventorySettingsSchema = z.object({
  allowNegativeStock: z.boolean().default(false),
  stockWarningThreshold: z.enum(['none', 'low', 'critical']).default('low'),
  autoReserveOnTreatmentPlan: z.boolean().default(true),
  requireBatchOnReceive: z.boolean().default(false),
  requireExpiryOnReceive: z.boolean().default(true),
  defaultValuationMethod: z
    .enum(['fifo', 'weighted_average', 'last_purchase'])
    .default('weighted_average'),
  autoReorderEnabled: z.boolean().default(false),
  lowStockThreshold: z.number().min(0).default(10),
  expiryAlertDays: z.number().min(1).max(365).default(30),
});

// ── Provider Credentials Settings ───────────────────────────

export const providerChannelSchema = z
  .object({
    useCustom: z.boolean().default(false),
  })
  .passthrough();

export const providersSettingsSchema = z.object({
  email: providerChannelSchema.default({ useCustom: false }),
  sms: providerChannelSchema.default({ useCustom: false }),
  whatsapp: providerChannelSchema.default({ useCustom: false }),
  push: providerChannelSchema.default({ useCustom: false }),
});

// ── Booking Widget Settings ─────────────────────────────────

export const bookingWidgetSettingsSchema = z.object({
  primaryColor: z.string().default('#16a085'),
  buttonPosition: z.enum(['bottom-right', 'bottom-left']).default('bottom-right'),
  language: z.enum(['en', 'ar']).default('en'),
  buttonText: z.string().max(30).default('Book Now'),
  showBranding: z.boolean().default(true),
});

// ── WhatsApp Bot Settings ───────────────────────────────────

export const whatsappBotSettingsSchema = z.object({
  isEnabled: z.boolean().default(false),
  provider: z.enum(['twilio', 'meta']).default('twilio'),
  defaultLanguage: z.enum(['en', 'ar']).default('en'),
  welcomeMessage: z.string().max(500).optional(),
  sessionTimeoutMinutes: z.number().min(5).max(120).default(30),
});

// ── Settings CRUD Schemas ───────────────────────────────────

export const settingsKeyEnum = z.enum([
  'clinic',
  'appointment',
  'billing',
  'notifications',
  'security',
  'inventory',
  'providers',
  'bookingWidget',
  'whatsappBot',
]);

export const getSettingsSchema = z.object({
  key: settingsKeyEnum,
});

export const updateSettingsSchema = z.object({
  key: settingsKeyEnum,
  value: z.record(z.string(), z.unknown()),
});

// ── Inferred Types ──────────────────────────────────────────

export type ClinicSettings = z.infer<typeof clinicSettingsSchema>;
export type AppointmentSettings = z.infer<typeof appointmentSettingsSchema>;
export type BillingSettings = z.infer<typeof billingSettingsSchema>;
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type SecuritySettings = z.infer<typeof securitySettingsSchema>;
export type InventorySettings = z.infer<typeof inventorySettingsSchema>;
export type ProvidersSettings = z.infer<typeof providersSettingsSchema>;
export type BookingWidgetSettings = z.infer<typeof bookingWidgetSettingsSchema>;
export type WhatsAppBotSettings = z.infer<typeof whatsappBotSettingsSchema>;
export type SettingsKey = z.infer<typeof settingsKeyEnum>;
export type GetSettingsInput = z.infer<typeof getSettingsSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
