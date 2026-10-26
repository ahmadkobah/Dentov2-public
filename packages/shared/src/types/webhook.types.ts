/**
 * Webhook System Types — §23 Webhook System (Zwei Ebenen)
 *
 * Two levels:
 * 1. Platform Webhooks (Dev Portal) — platform events in dento_platform DB
 * 2. Tenant Webhooks (Admin Portal) — tenant events in tenant_{slug} DB
 *
 * Delivery: BullMQ Job → HTTP POST → Retry 60s (max 3x, exponential backoff)
 *   → After 10 consecutive failures: Auto-Disable
 *
 * Security: HMAC-SHA256 signature on every delivery
 */

// ── Webhook Event Types ─────────────────────────────────────

/** Platform-level events (Dev Portal / dento_platform) */
export type PlatformWebhookEvent =
  | 'tenant.created'
  | 'tenant.suspended'
  | 'subscription.paid'
  | 'subscription.overdue'
  | 'module.updated'
  | 'deployment.completed'
  | 'system.error'
  | 'system.health_degraded';

/** Tenant-level events (Admin Portal / tenant_{slug}) */
export type TenantWebhookEvent =
  // Patient events
  | 'patient.created'
  | 'patient.updated'
  | 'patient.deleted'
  // Appointment events
  | 'appointment.created'
  | 'appointment.updated'
  | 'appointment.cancelled'
  | 'appointment.completed'
  | 'appointment.reminder'
  | 'appointment.no_show'
  // Invoice events
  | 'invoice.created'
  | 'invoice.issued'
  | 'invoice.paid'
  | 'invoice.overdue'
  | 'invoice.voided'
  | 'invoice.sent'
  // Payment events
  | 'payment.received'
  | 'payment.refunded'
  // Treatment events
  | 'treatment.started'
  | 'treatment.completed'
  // Commission events
  | 'commission.calculated'
  | 'commission.approved'
  | 'commission.payout_created'
  // Installment events
  | 'installment.plan_created'
  | 'installment.payment_recorded'
  | 'installment.plan_cancelled'
  | 'installment.overdue'
  // Insurance claim events
  | 'insurance_claim.created'
  | 'insurance_claim.status_updated'
  // Inventory events
  | 'inventory.item.created'
  | 'inventory.item.updated'
  | 'inventory.out_of_stock'
  | 'inventory.critical_stock'
  | 'inventory.low_stock'
  | 'inventory.expired'
  | 'inventory.expiring_soon'
  | 'inventory.restocked'
  | 'inventory.transfer.requested'
  | 'inventory.transfer.completed'
  | 'inventory.stock_count.completed'
  | 'inventory.stock_count.discrepancy'
  | 'inventory.purchase_order.created'
  | 'inventory.purchase_order.received'
  // Imaging events
  | 'cbct.scan_completed'
  | 'xray.captured'
  // Device events
  | 'device.connected'
  | 'device.disconnected'
  // Workflow events
  | 'workflow.executed'
  // Test events
  | 'test.ping';

export const PLATFORM_WEBHOOK_EVENTS: PlatformWebhookEvent[] = [
  'tenant.created',
  'tenant.suspended',
  'subscription.paid',
  'subscription.overdue',
  'module.updated',
  'deployment.completed',
  'system.error',
  'system.health_degraded',
];

export const TENANT_WEBHOOK_EVENTS: TenantWebhookEvent[] = [
  'patient.created',
  'patient.updated',
  'patient.deleted',
  'appointment.created',
  'appointment.cancelled',
  'appointment.completed',
  'appointment.reminder',
  'appointment.no_show',
  'invoice.created',
  'invoice.issued',
  'invoice.paid',
  'invoice.overdue',
  'invoice.voided',
  'invoice.sent',
  'payment.received',
  'payment.refunded',
  'treatment.started',
  'treatment.completed',
  'commission.calculated',
  'commission.approved',
  'commission.payout_created',
  'installment.plan_created',
  'installment.payment_recorded',
  'installment.plan_cancelled',
  'installment.overdue',
  'insurance_claim.created',
  'insurance_claim.status_updated',
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
  'cbct.scan_completed',
  'xray.captured',
  'device.connected',
  'device.disconnected',
  'workflow.executed',
  'test.ping',
];

// ── Webhook Endpoint Types ──────────────────────────────────

export type WebhookStatus = 'active' | 'disabled' | 'failed';

export interface IWebhookEndpoint {
  _id: string;
  url: string;
  description: string;
  secret: string; // HMAC-SHA256 signing secret
  events: string[]; // Subscribed events
  status: WebhookStatus;
  consecutiveFailures: number; // Auto-disable after 10
  lastDeliveryAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── Webhook Delivery Types ──────────────────────────────────

export type DeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying';

export interface IWebhookDelivery {
  _id: string;
  endpointId: string;
  event: string;
  payload: Record<string, unknown>;
  status: DeliveryStatus;
  httpStatus: number | null;
  responseBody: string | null;
  attempts: number; // Current attempt (1-based)
  maxAttempts: number; // Default 3
  nextRetryAt: string | null;
  error: string | null;
  duration: number | null; // ms
  signature: string; // HMAC-SHA256 signature sent with request
  createdAt: string;
  updatedAt: string;
}

// ── API Request/Response Types ──────────────────────────────

export interface CreateWebhookInput {
  url: string;
  description?: string;
  events: string[];
}

export interface UpdateWebhookInput {
  url?: string;
  description?: string;
  events?: string[];
  status?: WebhookStatus;
}

export interface WebhookDeliveryStats {
  total: number;
  success: number;
  failed: number;
  pending: number;
  successRate: number; // percentage
}

// ── Webhook Constants ───────────────────────────────────────

export const WEBHOOK_MAX_RETRIES = 3;
export const WEBHOOK_RETRY_DELAY_MS = 60_000; // 60s base delay
export const WEBHOOK_AUTO_DISABLE_THRESHOLD = 10; // consecutive failures
export const WEBHOOK_TIMEOUT_MS = 30_000; // 30s timeout per delivery
export const WEBHOOK_SIGNATURE_HEADER = 'x-dento-signature';
