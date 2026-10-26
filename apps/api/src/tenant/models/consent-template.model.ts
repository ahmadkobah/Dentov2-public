/**
 * Consent Template Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §5.11 — consent_templates collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#24) — Consent Forms
 *
 * Bilingual consent templates per procedure type. Used to generate consent forms.
 */

import { Schema, type Document, type Connection, type Model } from 'mongoose';

// ── Types ───────────────────────────────────────────────────

export interface IConsentTemplate extends Document {
  name: { en: string; ar: string };
  procedureType: string;
  content: { en: string; ar: string };
  risks: { en: string; ar: string };
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const bilingualSchema = new Schema(
  {
    en: { type: String, required: true },
    ar: { type: String, default: '' },
  },
  { _id: false },
);

const bilingualLongSchema = new Schema(
  {
    en: { type: String, required: true },
    ar: { type: String, default: '' },
  },
  { _id: false },
);

const consentTemplateSchema = new Schema<IConsentTemplate>(
  {
    name: { type: bilingualSchema, required: true },
    procedureType: { type: String, required: true, trim: true },
    content: { type: bilingualLongSchema, required: true },
    risks: { type: bilingualLongSchema, default: () => ({ en: '', ar: '' }) },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ── Indexes ─────────────────────────────────────────────────

consentTemplateSchema.index({ procedureType: 1, isActive: 1 });

// ── Factory ─────────────────────────────────────────────────

export type ConsentTemplateModel = Model<IConsentTemplate>;

const modelCache = new WeakMap<Connection, ConsentTemplateModel>();

export function getConsentTemplateModel(connection: Connection): ConsentTemplateModel {
  let model = modelCache.get(connection);
  if (!model) {
    model = connection.model<IConsentTemplate>(
      'ConsentTemplate',
      consentTemplateSchema,
      'consent_templates',
    );
    modelCache.set(connection, model);
  }
  return model;
}
