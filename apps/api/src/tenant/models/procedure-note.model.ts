import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';
import { fieldEncryptionPlugin } from '../../utils/mongoose-field-encryption.plugin.js';

/**
 * Procedure Note Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §5.5 — procedure_notes collection
 * Per DENTO_V2_MASTER_PLAN.md §10, §17 — Procedure Notes + Cross-Linking
 *
 * Rule: procedure_notes = "Was wurde gemacht" (Documentation) — past-oriented
 * Naming: v1 "treatments" → v2 "procedure_notes"
 *
 * A procedure note CAN optionally link to a treatment_plan + treatment_plan item (plan-based)
 * OR be standalone (direct treatment).
 *
 * §17 cross-links: linkedXrays, linkedCbcts, preOpXrays, postOpXrays
 */

// ── Embedded Types ──────────────────────────────────────────

export interface IProcedureAttachment {
  name: string;
  url: string;
  type?: string;
}

export interface IAffectedSurface {
  toothNumber: string;
  surface: string;
}

// ── Main Interface ──────────────────────────────────────────

export type ProcedureNoteStatus = 'draft' | 'completed';
export type ProcedureNoteType = 'pre_op' | 'intra_op' | 'post_op';

export interface IProcedureNote extends Document {
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  appointmentId?: Types.ObjectId;
  treatmentPlanId?: Types.ObjectId;
  treatmentPlanItemId?: Types.ObjectId;
  templateId?: Types.ObjectId;
  serviceId?: Types.ObjectId;
  status: ProcedureNoteStatus;
  noteType: ProcedureNoteType;

  // Clinical
  procedureName: string;
  teethInvolved?: string;
  procedurePerformed?: string;
  materialsUsed?: string;
  anesthesiaUsed?: string;
  complications?: string;
  postOpInstructions?: string;
  followUpRequired: boolean;
  followUpDate?: Date;

  // Cross-Links to imaging (§17)
  linkedXrays: Types.ObjectId[];
  linkedCbcts: Types.ObjectId[];
  preOpXrays: Types.ObjectId[];
  postOpXrays: Types.ObjectId[];

  // Template-based dynamic fields
  teethDetails?: Record<string, unknown> | null;

  // Attachments
  attachments: IProcedureAttachment[];

  // Voice note (Phase 10.4)
  voiceNoteUrl?: string;
  voiceNoteDurationSeconds?: number;

  // Affected surfaces — link to dental chart (Phase 12.3)
  affectedSurfaces: IAffectedSurface[];

  // Inventory deduction tracking (Phase 10.5) — prevents double deduction
  materialsDeducted: boolean;
  materialsDeductedAt?: Date;

  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Attachment Sub-Schema ───────────────────────────────────

const attachmentSchema = new Schema<IProcedureAttachment>(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: String,
  },
  { _id: true },
);

// ── Procedure Note Schema ───────────────────────────────────

const procedureNoteSchema = new Schema<IProcedureNote>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: Schema.Types.ObjectId, required: true },
    appointmentId: { type: Schema.Types.ObjectId },
    treatmentPlanId: { type: Schema.Types.ObjectId },
    treatmentPlanItemId: { type: Schema.Types.ObjectId },
    templateId: { type: Schema.Types.ObjectId },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service' },
    status: { type: String, enum: ['draft', 'completed'], default: 'draft' },
    noteType: {
      type: String,
      enum: ['pre_op', 'intra_op', 'post_op'],
      default: 'intra_op',
    },

    // Clinical
    procedureName: { type: String, required: true, maxlength: 300 },
    teethInvolved: { type: String, maxlength: 500 },
    procedurePerformed: { type: String, maxlength: 5000 },
    materialsUsed: { type: String, maxlength: 2000 },
    anesthesiaUsed: { type: String, maxlength: 200 },
    complications: { type: String, maxlength: 2000 },
    postOpInstructions: { type: String, maxlength: 2000 },
    followUpRequired: { type: Boolean, default: false },
    followUpDate: Date,

    // Cross-Links (§17)
    linkedXrays: { type: [Schema.Types.ObjectId], default: [] },
    linkedCbcts: { type: [Schema.Types.ObjectId], default: [] },
    preOpXrays: { type: [Schema.Types.ObjectId], default: [] },
    postOpXrays: { type: [Schema.Types.ObjectId], default: [] },

    // Template dynamic fields
    teethDetails: { type: Schema.Types.Mixed, default: null },

    // Attachments
    attachments: { type: [attachmentSchema], default: [] },

    // Voice note (Phase 10.4)
    voiceNoteUrl: { type: String, maxlength: 2000 },
    voiceNoteDurationSeconds: { type: Number, min: 0, max: 3600 },

    // Affected surfaces (Phase 12.3) — links procedure to specific tooth surfaces in dental chart
    affectedSurfaces: {
      type: [
        new Schema(
          {
            toothNumber: { type: String, required: true },
            surface: { type: String, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },

    // Inventory deduction tracking (Phase 10.5)
    materialsDeducted: { type: Boolean, default: false },
    materialsDeductedAt: { type: Date },

    notes: { type: String, maxlength: 2000 },
  },
  { timestamps: true },
);

// ── Indexes per V2_DATABASE.md ──────────────────────────────

procedureNoteSchema.index({ patientId: 1, createdAt: -1 });
procedureNoteSchema.index({ doctorId: 1, createdAt: -1 });
procedureNoteSchema.index({ appointmentId: 1 });
procedureNoteSchema.index({ treatmentPlanId: 1 });

// ── Field-Level Encryption (HIPAA/GDPR — C-1) ──────────────────────
procedureNoteSchema.plugin(fieldEncryptionPlugin, {
  fields: [
    'procedurePerformed',
    'materialsUsed',
    'anesthesiaUsed',
    'complications',
    'postOpInstructions',
  ],
});

// ── Model Factory ───────────────────────────────────────────

/**
 * Get ProcedureNote model for a specific tenant database connection.
 * Usage: const ProcedureNote = getProcedureNoteModel(tenantDb);
 */
export function getProcedureNoteModel(connection: Connection): Model<IProcedureNote> {
  return (connection.models.ProcedureNote ||
    connection.model('ProcedureNote', procedureNoteSchema)) as Model<IProcedureNote>;
}

export type ProcedureNoteModel = ReturnType<typeof getProcedureNoteModel>;

// ════════════════════════════════════════════════════════════
// Procedure Note Templates (§5.6)
// ════════════════════════════════════════════════════════════

export const PROCEDURE_TEMPLATE_TYPES = [
  'rct',
  'filling',
  'crown',
  'extraction',
  'scaling',
  'other',
] as const;
export type ProcedureTemplateType = (typeof PROCEDURE_TEMPLATE_TYPES)[number];

export interface IProcedureNoteTemplate extends Document {
  name: { en: string; ar: string };
  procedureType: string;
  templateType: ProcedureTemplateType;
  templateContent?: string;
  fields?: Record<string, unknown>;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const bilingualSchema = new Schema(
  {
    en: { type: String, required: true },
    ar: { type: String, default: '' },
  },
  { _id: false },
);

const procedureNoteTemplateSchema = new Schema<IProcedureNoteTemplate>(
  {
    name: { type: bilingualSchema, required: true },
    procedureType: { type: String, required: true, maxlength: 100 },
    templateType: {
      type: String,
      enum: PROCEDURE_TEMPLATE_TYPES,
      default: 'other',
      index: true,
    },
    templateContent: { type: String, maxlength: 10000 },
    fields: { type: Schema.Types.Mixed },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// ── Indexes per V2_DATABASE.md ──────────────────────────────

procedureNoteTemplateSchema.index({ procedureType: 1, isActive: 1 });

// ── Model Factory ───────────────────────────────────────────

/**
 * Get ProcedureNoteTemplate model for a specific tenant database connection.
 * Usage: const Template = getProcedureNoteTemplateModel(tenantDb);
 */
export function getProcedureNoteTemplateModel(
  connection: Connection,
): Model<IProcedureNoteTemplate> {
  return (connection.models.ProcedureNoteTemplate ||
    connection.model(
      'ProcedureNoteTemplate',
      procedureNoteTemplateSchema,
    )) as Model<IProcedureNoteTemplate>;
}

export type ProcedureNoteTemplateModel = ReturnType<typeof getProcedureNoteTemplateModel>;
