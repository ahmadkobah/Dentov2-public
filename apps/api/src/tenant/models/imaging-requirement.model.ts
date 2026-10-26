import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Imaging Requirement Model — Tenant Database (tenant_{slug})
 *
 * Links imaging requirements to dental services.
 * E.g., "Implant" service requires a CBCT scan of the jaw region.
 */

// ── Types ───────────────────────────────────────────────────

export interface IImagingRequirement extends Document {
  serviceId: Types.ObjectId;
  imagingType: 'xray' | 'cbct';
  bodyRegion: string;
  isRequired: boolean;
  canWaive: boolean;
  waivedBy?: Types.ObjectId;
  waivedAt?: Date;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const imagingRequirementSchema = new Schema<IImagingRequirement>(
  {
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    imagingType: {
      type: String,
      enum: ['xray', 'cbct'],
      required: true,
    },
    bodyRegion: { type: String, required: true, trim: true },
    isRequired: { type: Boolean, default: true },
    canWaive: { type: Boolean, default: false },
    waivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    waivedAt: { type: Date },
    notes: { type: String, maxlength: 2000 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: 'imaging_requirements',
  },
);

// ── Indexes ─────────────────────────────────────────────────

imagingRequirementSchema.index({ serviceId: 1, isActive: 1 });
imagingRequirementSchema.index({ imagingType: 1 });

// ── Model Factory ───────────────────────────────────────────

export function getImagingRequirementModel(connection: Connection): Model<IImagingRequirement> {
  return (connection.models.ImagingRequirement ||
    connection.model('ImagingRequirement', imagingRequirementSchema)) as Model<IImagingRequirement>;
}
