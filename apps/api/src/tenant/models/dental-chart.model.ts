import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';
import { fieldEncryptionPlugin } from '../../utils/mongoose-field-encryption.plugin.js';

/**
 * Dental Chart Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §5.2 — dental_charts collection
 * Per DENTO_V2_MASTER_PLAN.md §10 — Dental Chart Module
 *
 * Each document represents ONE tooth's current state.
 * Uses FDI numbering by default. Supports Universal numbering.
 * Includes periodontal data (pocket depth, recession, BOP, mobility, furcation).
 *
 * Index: { patientId: 1, toothNumber: 1 } unique
 */

// ── Embedded Types ──────────────────────────────────────────

export interface IPerioData {
  pocketDepth?: number[]; // 6 sites
  recession?: number[]; // 6 sites
  bleedingOnProbing?: boolean[]; // 6 sites
  mobility?: number; // 0-3
  furcation?: number; // 0-3
}

// ── Main Interface ──────────────────────────────────────────

export type ToothCondition =
  | 'healthy'
  | 'cavity'
  | 'crown'
  | 'bridge'
  | 'implant'
  | 'missing'
  | 'rct'
  | 'filling'
  | 'extraction_needed'
  | 'periodontal'
  | 'veneer'
  | 'temporary'
  | 'pontic';

export type NumberingSystem = 'universal' | 'fdi';

export type Surface =
  | 'mesial'
  | 'distal'
  | 'buccal'
  | 'lingual'
  | 'occlusal'
  | 'incisal'
  | 'labial'
  | 'palatal';

export interface IDentalChart extends Document {
  patientId: Types.ObjectId;
  toothNumber: number;
  numberingSystem: NumberingSystem;
  condition: ToothCondition;
  surfaces: Surface[];
  perioData?: IPerioData;
  notes?: string;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ── Perio Data Sub-Schema ───────────────────────────────────

const perioDataSchema = new Schema<IPerioData>(
  {
    pocketDepth: { type: [Number] },
    recession: { type: [Number] },
    bleedingOnProbing: { type: [Boolean] },
    mobility: { type: Number, min: 0, max: 3 },
    furcation: { type: Number, min: 0, max: 3 },
  },
  { _id: false },
);

// ── Dental Chart Schema ─────────────────────────────────────

const dentalChartSchema = new Schema<IDentalChart>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    toothNumber: { type: Number, required: true, min: 1, max: 85 },
    numberingSystem: {
      type: String,
      enum: ['universal', 'fdi'],
      default: 'fdi',
    },
    condition: {
      type: String,
      enum: [
        'healthy',
        'cavity',
        'crown',
        'bridge',
        'implant',
        'missing',
        'rct',
        'filling',
        'extraction_needed',
        'periodontal',
        'veneer',
        'temporary',
        'pontic',
      ],
      required: true,
    },
    surfaces: {
      type: [String],
      enum: ['mesial', 'distal', 'buccal', 'lingual', 'occlusal', 'incisal', 'labial', 'palatal'],
      default: [],
    },
    perioData: { type: perioDataSchema },
    notes: { type: String, maxlength: 2000 },
    updatedBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);

// ── Indexes ─────────────────────────────────────────────────

dentalChartSchema.index({ patientId: 1, toothNumber: 1 }, { unique: true });
dentalChartSchema.index({ patientId: 1, condition: 1 });

// ── Field-Level Encryption (HIPAA/GDPR — C-1) ──────────────────
dentalChartSchema.plugin(fieldEncryptionPlugin, { fields: ['notes'] });

// ── Model Factory ───────────────────────────────────────────

/**
 * Get DentalChart model for a specific tenant database connection.
 * Usage: const DentalChart = getDentalChartModel(tenantDb);
 */
export function getDentalChartModel(connection: Connection): Model<IDentalChart> {
  return (connection.models.DentalChart ||
    connection.model('DentalChart', dentalChartSchema)) as Model<IDentalChart>;
}

export type DentalChartModel = ReturnType<typeof getDentalChartModel>;

// ════════════════════════════════════════════════════════════
// Dental Chart History — Snapshot-based (§5.3)
// ════════════════════════════════════════════════════════════

export type SnapshotTrigger = 'manual' | 'tooth_update' | 'procedure_note' | 'treatment_plan';

export interface ISnapshotChartData {
  entries: IDentalChart[];
  procedureNoteTeeth: { toothNumber: number; procedureName: string }[];
  capturedAt: string;
}

export interface IDentalChartHistory extends Document {
  patientId: Types.ObjectId;
  trigger: SnapshotTrigger;
  chartData: ISnapshotChartData;
  notes?: string;
  recordedBy: string;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const dentalChartHistorySchema = new Schema<IDentalChartHistory>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    trigger: {
      type: String,
      enum: ['manual', 'tooth_update', 'procedure_note', 'treatment_plan'],
      default: 'manual',
    },
    chartData: { type: Schema.Types.Mixed, required: true },
    notes: { type: String, maxlength: 2000 },
    recordedBy: { type: String, required: true },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// ── Indexes ─────────────────────────────────────────────────

dentalChartHistorySchema.index({ patientId: 1, recordedAt: -1 });

// ── Field-Level Encryption (HIPAA/GDPR — C-1) ──────────────────
dentalChartHistorySchema.plugin(fieldEncryptionPlugin, { fields: ['notes'] });

// ── Model Factory ───────────────────────────────────────────

/**
 * Get DentalChartHistory model for a specific tenant database connection.
 * Usage: const ChartHistory = getDentalChartHistoryModel(tenantDb);
 */
export function getDentalChartHistoryModel(connection: Connection): Model<IDentalChartHistory> {
  return (connection.models.DentalChartHistory ||
    connection.model('DentalChartHistory', dentalChartHistorySchema)) as Model<IDentalChartHistory>;
}

export type DentalChartHistoryModel = ReturnType<typeof getDentalChartHistoryModel>;
