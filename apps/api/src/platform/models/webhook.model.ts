import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Platform Webhook Models — dento_platform Database
 *
 * Per MASTER_PLAN §23 — Webhook System (Ebene 1: Platform-Webhooks)
 *
 * Platform-level webhook endpoints and delivery logs.
 * Events: tenant.created, tenant.suspended, subscription.paid, etc.
 * Used by platform operator (Dev Portal) for monitoring.
 */

// ── Webhook Endpoint ────────────────────────────────────────

export interface IPlatformWebhookEndpoint extends Document {
  url: string;
  description: string;
  secret: string; // HMAC-SHA256 signing secret
  // F-10: rotation grace window. When `previousSecret` is set and
  // `previousSecretExpiresAt` is in the future, the dispatcher signs each
  // delivery with BOTH secrets so receivers can switch over without
  // dropping events.
  previousSecret: string | null;
  previousSecretExpiresAt: Date | null;
  events: string[];
  status: 'active' | 'disabled' | 'failed';
  consecutiveFailures: number;
  lastDeliveryAt: Date | null;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const platformWebhookEndpointSchema = new Schema<IPlatformWebhookEndpoint>(
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
      // test/rotate routes explicitly `.select('+secret')` when they need it.
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
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'webhook_endpoints',
  },
);

platformWebhookEndpointSchema.index({ events: 1, status: 1 });

// ── Webhook Delivery ────────────────────────────────────────

export interface IPlatformWebhookDelivery extends Document {
  endpointId: mongoose.Types.ObjectId;
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
  createdBy: mongoose.Types.ObjectId | null;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const platformWebhookDeliverySchema = new Schema<IPlatformWebhookDelivery>(
  {
    endpointId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformWebhookEndpoint',
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
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    collection: 'webhook_deliveries',
  },
);

platformWebhookDeliverySchema.index({ endpointId: 1, createdAt: -1 });
platformWebhookDeliverySchema.index({ status: 1, nextRetryAt: 1 });

// ── Models ──────────────────────────────────────────────────

export const PlatformWebhookEndpoint = mongoose.model<IPlatformWebhookEndpoint>(
  'PlatformWebhookEndpoint',
  platformWebhookEndpointSchema,
);

export const PlatformWebhookDelivery = mongoose.model<IPlatformWebhookDelivery>(
  'PlatformWebhookDelivery',
  platformWebhookDeliverySchema,
);
