/**
 * Webhook Schemas — Zod Validation
 *
 * Per V2_DATABASE.md §4.7 — webhooks + webhook_logs
 * Per DENTO_V2_MASTER_PLAN.md §23 — Tenant-Level Webhooks
 * Per SECURITY_AND_ENCRYPTION.md — HMAC-SHA256 Signierung
 */

import { z } from 'zod';

// ── Webhook Events ──────────────────────────────────────────

export const webhookEventEnum = z.enum([
  // Patient events
  'patient.created',
  'patient.updated',
  'patient.deleted',
  // Appointment events
  'appointment.created',
  'appointment.updated',
  'appointment.cancelled',
  'appointment.completed',
  'appointment.reminder',
  'appointment.no_show',
  // Invoice events
  'invoice.created',
  'invoice.issued',
  'invoice.updated',
  'invoice.paid',
  'invoice.overdue',
  'invoice.voided',
  'invoice.sent',
  // Payment events
  'payment.received',
  'payment.refunded',
  // Treatment events
  'treatment.started',
  'treatment.completed',
  // Commission events
  'commission.calculated',
  'commission.approved',
  'commission.payout_created',
  // Installment events
  'installment.plan_created',
  'installment.payment_recorded',
  'installment.plan_cancelled',
  'installment.overdue',
  // Insurance claim events
  'insurance_claim.created',
  'insurance_claim.status_updated',
  // Inventory events
  'inventory.item.created',
  'inventory.item.updated',
  'inventory.out_of_stock',
  'inventory.critical_stock',
  'inventory.low_stock',
  'inventory.expired',
  'inventory.expiring_soon',
  'inventory.restocked',
  'inventory.transfer.requested',
  'inventory.transfer.completed',
  'inventory.stock_count.completed',
  'inventory.stock_count.discrepancy',
  'inventory.purchase_order.created',
  'inventory.purchase_order.received',
  // Imaging events
  'cbct.scan_completed',
  'xray.captured',
  // Device events
  'device.connected',
  'device.disconnected',
  // Prescription / Treatment plan events
  'prescription.created',
  'treatment_plan.created',
  'treatment_plan.updated',
  'treatment_plan.accepted',
  'dental_chart.updated',
  // User events
  'user.created',
  'user.updated',
  'user.deactivated',
  // Schedule events
  'doctor_schedule.updated',
  // Workflow events
  'workflow.executed',
  // Test events
  'test.ping',
]);

// ── Create Webhook Schema ───────────────────────────────────

export const createWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url().max(2048),
  events: z.array(webhookEventEnum).min(1).max(50),
  secret: z.string().min(16).max(256).optional(),
  isActive: z.boolean().default(true),
  description: z.string().max(500).optional(),
});

// ── Update Webhook Schema ───────────────────────────────────

export const updateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().max(2048).optional(),
  events: z.array(webhookEventEnum).min(1).max(50).optional(),
  secret: z.string().min(16).max(256).optional(),
  isActive: z.boolean().optional(),
  description: z.string().max(500).optional(),
});

// ── Webhook Query Schema ────────────────────────────────────

export const webhookQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(['active', 'paused', 'disabled']).optional(),
  event: webhookEventEnum.optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().trim().min(1).optional(),
});

// ── Webhook Test Schema ─────────────────────────────────────

export const webhookTestSchema = z.object({
  event: webhookEventEnum,
});

// ── Webhook Delivery Query Schema ───────────────────────────

export const webhookDeliveryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['success', 'failed', 'retrying']).optional(),
  event: webhookEventEnum.optional(),
});

// ── Inferred Types ──────────────────────────────────────────

export type WebhookEvent = z.infer<typeof webhookEventEnum>;
export type CreateWebhookSchemaInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookSchemaInput = z.infer<typeof updateWebhookSchema>;
export type WebhookQueryInput = z.infer<typeof webhookQuerySchema>;
export type WebhookTestInput = z.infer<typeof webhookTestSchema>;
export type WebhookDeliveryQueryInput = z.infer<typeof webhookDeliveryQuerySchema>;
