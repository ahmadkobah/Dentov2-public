/**
 * Notification Schemas — Zod Validation
 *
 * Per DENTO_V2_MASTER_PLAN.md §20 — Notifications & Messaging System
 * Covers: templates, in-app notifications, device tokens, alert rules
 */

import { z } from 'zod';

// ── Notification Channel Enum ───────────────────────────────

export const notificationChannelEnum = z.enum(['email', 'sms', 'whatsapp', 'push', 'in_app']);

// ── Template Event Enum ─────────────────────────────────────

export const templateEventEnum = z.enum([
  'appointment_reminder',
  'appointment_booked',
  'appointment_cancelled',
  'prescription_ready',
  'payment_due',
  'payment_received',
  'birthday',
  'treatment_followup',
  'recall',
  'lab_order_ready',
  'low_stock',
  'expiry_alert',
  'welcome',
  'custom',
]);

// ── Bilingual Helper ────────────────────────────────────────

const bilingualSchema = z.object({
  en: z.string().min(1).max(2000),
  ar: z.string().max(2000).optional(),
});

// ── Create Template Schema ──────────────────────────────────

export const createNotificationTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  event: templateEventEnum,
  channel: notificationChannelEnum,
  subject: bilingualSchema.optional(), // For email
  body: bilingualSchema,
  isActive: z.boolean().default(true),
});

// ── Update Template Schema ──────────────────────────────────

export const updateNotificationTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  subject: bilingualSchema.optional(),
  body: bilingualSchema.optional(),
  isActive: z.boolean().optional(),
});

// ── Notification Query Schema ───────────────────────────────

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isRead: z.coerce.boolean().optional(),
  category: z.string().optional(),
});

// ── Send Notification Schema ────────────────────────────────

export const sendNotificationSchema = z.object({
  templateId: z.string().optional(),
  channel: notificationChannelEnum,
  recipientId: z.string(),
  recipientType: z.enum(['user', 'patient']),
  subject: bilingualSchema.optional(),
  body: bilingualSchema.optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  scheduledAt: z.string().datetime().optional(),
});

// ── Device Token Schema ─────────────────────────────────────

export const registerDeviceTokenSchema = z.object({
  token: z.string().min(1).max(4096),
  platform: z.enum(['web', 'ios', 'android']),
  deviceInfo: z
    .object({
      browser: z.string().max(100).optional(),
      os: z.string().max(100).optional(),
      appVersion: z.string().max(20).optional(),
    })
    .optional(),
});

// ── Alert Rule Create Schema ────────────────────────────────

export const createAlertRuleSchema = z.object({
  name: z.object({
    en: z.string().min(1).max(100),
    ar: z.string().max(100).optional(),
  }),
  triggerType: z.enum([
    'inventory_low_stock',
    'inventory_expiring',
    'invoice_overdue',
    'no_show_rate_high',
    'revenue_drop',
    'appointment_gap',
    'patient_inactive',
    'custom',
  ]),
  conditions: z.record(z.string(), z.unknown()).default({}),
  actions: z.object({
    channels: z.array(notificationChannelEnum).min(1),
    recipientRoles: z.array(z.string()).optional(),
    templateId: z.string().optional(),
  }),
  thresholds: z
    .object({
      warningLevel: z.number().optional(),
      criticalLevel: z.number().optional(),
      value: z.number().optional(),
      comparator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq']).optional(),
    })
    .optional(),
  schedule: z
    .object({
      frequency: z.enum(['realtime', 'hourly', 'daily', 'weekly']).default('daily'),
      cronExpression: z.string().max(100).optional(),
    })
    .optional(),
  isActive: z.boolean().default(true),
});

// ── Alert Rule Update Schema ────────────────────────────────

export const updateAlertRuleSchema = createAlertRuleSchema.partial();

// ── Notification Preferences Schema ─────────────────────────

export const updateNotificationPreferencesSchema = z.object({
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
  whatsapp: z.boolean().optional(),
  push: z.boolean().optional(),
  inApp: z.boolean().optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  disabledEvents: z.array(templateEventEnum).optional(),
});

// ── Inferred Types ──────────────────────────────────────────

export type NotificationChannelSchema = z.infer<typeof notificationChannelEnum>;
export type TemplateEvent = z.infer<typeof templateEventEnum>;
export type CreateNotificationTemplateInput = z.infer<typeof createNotificationTemplateSchema>;
export type UpdateNotificationTemplateInput = z.infer<typeof updateNotificationTemplateSchema>;
export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
export type SendNotificationSchemaInput = z.infer<typeof sendNotificationSchema>;
export type RegisterDeviceTokenInput = z.infer<typeof registerDeviceTokenSchema>;
export type CreateAlertRuleInput = z.infer<typeof createAlertRuleSchema>;
export type UpdateAlertRuleInput = z.infer<typeof updateAlertRuleSchema>;
export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;
