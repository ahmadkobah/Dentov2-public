import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Tenant Webhook Models — Tenant Database (tenant_{slug})
 *
 * Per MASTER_PLAN §23 — Webhook System (Ebene 2: Tenant-Webhooks)
 *
 * Tenant-level webhook endpoints and delivery logs.
 * Physically isolated per tenant — stored in tenant_{slug} DB.
 *
 * Events: patient.created/updated/deleted, appointment.*, invoice.*, etc.
 * Used by tenants to connect websites, CRMs, devices.
 */

// ── Webhook Endpoint ────────────────────────────────────────

export interface ITenantWebhookEndpoint extends Document {
  url: string;
  description: string;
  secret: string;
  // F-10: rotation grace window — see platform model for details.
  previousSecret: string | null;
  previousSecretExpiresAt: Date | null;
  events: string[];
  status: 'active' | 'disabled' | 'failed';
  consecutiveFailures: number;
  lastDeliveryAt: Date | null;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  authType: 'none' | 'hmac' | 'bearer' | 'basic';
  authValue: string | null;
  totalDeliveries: number;
  successRate: number;
  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const tenantWebhookEndpointSchema = new Schema<ITenantWebhookEndpoint>(
  {
    url: {
      type: String,
      required: true,
      match: /^https?:\/\/.+/,
    },
    description: {
      type: String,
      default: '',
      maxlength: 500,
    },
    secret: {
      type: String,
      required: true,
      // #69: signing secret must never be returned on list/detail reads. The
      // dispatcher + test route explicitly `.select('+secret')` when signing.
      select: false,
    },
    // F-10: rotation grace window
    previousSecret: { type: String, default: null, select: false },
    previousSecretExpiresAt: { type: Date, default: null },
    events: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: 'At least one event required',
      },
    },
    status: {
      type: String,
      enum: ['active', 'disabled', 'failed'],
      default: 'active',
      index: true,
    },
    consecutiveFailures: {
      type: Number,
      default: 0,
    },
    lastDeliveryAt: { type: Date, default: null },
    lastSuccessAt: { type: Date, default: null },
    lastFailureAt: { type: Date, default: null },

    // Auth (extensible beyond HMAC) — per V2_DATABASE §4.7
    authType: {
      type: String,
      enum: ['none', 'hmac', 'bearer', 'basic'],
      default: 'hmac',
    },
    authValue: { type: String, default: null, select: false }, // encrypted at rest

    // Delivery metrics — per V2_DATABASE §4.7
    totalDeliveries: { type: Number, default: 0 },
    successRate: { type: Number, default: 100, min: 0, max: 100 },

    // Standard Fields
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    collection: 'webhook_endpoints',
  },
);

tenantWebhookEndpointSchema.index({ events: 1, status: 1 });

// ── Webhook Delivery ────────────────────────────────────────

export interface ITenantWebhookDelivery extends Document {
  endpointId: string;
  event: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  httpStatus: number | null;
  responseBody: string | null;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: Date | null;
  error: string | null;
  duration: number | null;
  signature: string;
  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const tenantWebhookDeliverySchema = new Schema<ITenantWebhookDelivery>(
  {
    endpointId: {
      type: String,
      required: true,
      index: true,
    },
    event: {
      type: String,
      required: true,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'retrying'],
      default: 'pending',
      index: true,
    },
    httpStatus: { type: Number, default: null },
    responseBody: { type: String, default: null, maxlength: 5000 },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    nextRetryAt: { type: Date, default: null },
    error: { type: String, default: null },
    duration: { type: Number, default: null },
    signature: { type: String, required: true },

    // Standard Fields
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    collection: 'webhook_deliveries',
  },
);

tenantWebhookDeliverySchema.index({ endpointId: 1, createdAt: -1 });
tenantWebhookDeliverySchema.index({ status: 1, nextRetryAt: 1 });

// ── Model Factory (Connection-based for tenant isolation) ───

export function createTenantWebhookEndpointModel(
  connection: Connection,
): Model<ITenantWebhookEndpoint> {
  return (
    connection.models.TenantWebhookEndpoint ||
    connection.model<ITenantWebhookEndpoint>('TenantWebhookEndpoint', tenantWebhookEndpointSchema)
  );
}

export function createTenantWebhookDeliveryModel(
  connection: Connection,
): Model<ITenantWebhookDelivery> {
  return (
    connection.models.TenantWebhookDelivery ||
    connection.model<ITenantWebhookDelivery>('TenantWebhookDelivery', tenantWebhookDeliverySchema)
  );
}
