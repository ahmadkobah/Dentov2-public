/**
 * Webhook Event Type Model — Platform
 *
 * Per V2_DATABASE DEEP_SCAN_GAPS_REPORT — P1 #9
 *
 * Collection: `webhook_event_types` in `dento_platform` database.
 * Makes webhook event types dynamic and admin-editable instead of hardcoded.
 */

import mongoose, { Schema, type Document } from 'mongoose';

// ── Interface ───────────────────────────────────────────────

export interface IWebhookEventType extends Document {
  _id: mongoose.Types.ObjectId;
  key: string;
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  category: string;
  payloadSchema: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const bilingualSchema = {
  en: { type: String, required: true, trim: true },
  ar: { type: String, default: '', trim: true },
};

const webhookEventTypeSchema = new Schema<IWebhookEventType>(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      match: /^[a-z][a-z0-9_.]*$/,
      maxlength: 100,
    },
    name: { type: bilingualSchema, required: true },
    description: { type: bilingualSchema, default: { en: '', ar: '' } },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    payloadSchema: {
      type: Schema.Types.Mixed,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'webhook_event_types',
    versionKey: false,
  },
);

// ── Indexes ─────────────────────────────────────────────────

webhookEventTypeSchema.index({ category: 1, isActive: 1 });
webhookEventTypeSchema.index({ key: 1 }, { unique: true });

// ── Model ───────────────────────────────────────────────────

export const WebhookEventType = mongoose.model<IWebhookEventType>(
  'WebhookEventType',
  webhookEventTypeSchema,
);
