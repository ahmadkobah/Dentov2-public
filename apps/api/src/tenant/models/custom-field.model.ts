/**
 * Custom Field Model — Tenant Database (tenant_{slug})
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 Module #11 — Custom Fields
 *
 * Dynamic fields per entity (Patient, Appointment, Invoice, etc.)
 * Tenant admins define field definitions; values stored on entity documents
 * in a `customFields: Record<string, unknown>` subdocument.
 */

import { Schema, type Document, type Connection, type Model } from 'mongoose';

// ── Types ───────────────────────────────────────────────────

export type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'url';

export type CustomFieldEntity =
  | 'patient'
  | 'appointment'
  | 'invoice'
  | 'treatment_plan'
  | 'prescription'
  | 'lab_order';

interface ISelectOption {
  label: { en: string; ar?: string };
  value: string;
  color?: string;
}

interface IValidationRules {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
}

export interface ICustomField extends Document {
  entity: CustomFieldEntity;
  fieldKey: string;
  label: { en: string; ar?: string };
  description?: { en?: string; ar?: string };
  type: CustomFieldType;
  isRequired: boolean;
  defaultValue: unknown;
  placeholder?: { en?: string; ar?: string };
  options?: ISelectOption[];
  validation?: IValidationRules;
  isActive: boolean;
  sortOrder: number;
  showInList: boolean;
  showInForm: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CustomFieldModel = Model<ICustomField>;

// ── Sub-Schemas ─────────────────────────────────────────────

const bilingualSchema = new Schema(
  { en: { type: String, default: '' }, ar: { type: String, default: '' } },
  { _id: false },
);

const selectOptionSchema = new Schema(
  {
    label: bilingualSchema,
    value: { type: String, required: true },
    color: { type: String },
  },
  { _id: false },
);

const validationRulesSchema = new Schema(
  {
    min: Number,
    max: Number,
    minLength: Number,
    maxLength: Number,
    pattern: String,
    patternMessage: String,
  },
  { _id: false },
);

// ── Schema ──────────────────────────────────────────────────

const customFieldSchema = new Schema<ICustomField>(
  {
    entity: {
      type: String,
      required: true,
      enum: ['patient', 'appointment', 'invoice', 'treatment_plan', 'prescription', 'lab_order'],
    },
    fieldKey: {
      type: String,
      required: true,
      match: /^[a-z][a-zA-Z0-9_]*$/,
    },
    label: { type: bilingualSchema, required: true },
    description: bilingualSchema,
    type: {
      type: String,
      required: true,
      enum: [
        'text',
        'number',
        'date',
        'boolean',
        'select',
        'multiselect',
        'textarea',
        'email',
        'phone',
        'url',
      ],
    },
    isRequired: { type: Boolean, default: false },
    defaultValue: { type: Schema.Types.Mixed, default: null },
    placeholder: bilingualSchema,
    options: [selectOptionSchema],
    validation: validationRulesSchema,
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    showInList: { type: Boolean, default: false },
    showInForm: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' } as any,
  },
  {
    timestamps: true,
    collection: 'custom_fields',
  },
);

// ── Indexes ─────────────────────────────────────────────────

customFieldSchema.index({ entity: 1, fieldKey: 1 }, { unique: true });
customFieldSchema.index({ entity: 1, isActive: 1, sortOrder: 1 });

// ── WeakMap Cache ───────────────────────────────────────────

const cache = new WeakMap<Connection, CustomFieldModel>();

export function getCustomFieldModel(conn: Connection): CustomFieldModel {
  if (cache.has(conn)) return cache.get(conn)!;
  const model = conn.model<ICustomField>('CustomField', customFieldSchema);
  cache.set(conn, model);
  return model;
}
