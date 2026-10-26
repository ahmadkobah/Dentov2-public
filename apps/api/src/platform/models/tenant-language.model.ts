/**
 * Tenant Language Model — Platform
 *
 * Per V2_DATABASE DEEP_SCAN_GAPS_REPORT — P1 #9
 *
 * Collection: `tenant_languages` in `dento_platform` database.
 * Maps which languages each tenant has enabled, with their default.
 */

import mongoose, { Schema, type Document } from 'mongoose';

// ── Interface ───────────────────────────────────────────────

export interface ITenantLanguage extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  languageCode: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const tenantLanguageSchema = new Schema<ITenantLanguage>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    languageCode: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 5,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'tenant_languages',
    versionKey: false,
  },
);

// ── Indexes ─────────────────────────────────────────────────

tenantLanguageSchema.index({ tenantId: 1, languageCode: 1 }, { unique: true });
tenantLanguageSchema.index({ tenantId: 1, isDefault: 1 });

// ── Model ───────────────────────────────────────────────────

export const TenantLanguage = mongoose.model<ITenantLanguage>(
  'TenantLanguage',
  tenantLanguageSchema,
);
