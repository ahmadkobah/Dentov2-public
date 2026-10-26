import { Schema, type Document, type Connection, type Model } from 'mongoose';

/**
 * CBCT Scan Region Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md — cbct_scan_regions seed collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#12)
 *
 * Lookup/seed table for CBCT scan regions (anatomical areas).
 * Used by CBCT order form dropdown.
 */

export interface ICbctScanRegion extends Document {
  code: string;
  name: { en: string; ar: string };
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const bilingualSchema = new Schema(
  {
    en: { type: String, required: true, maxlength: 200 },
    ar: { type: String, default: '', maxlength: 200 },
  },
  { _id: false },
);

const cbctScanRegionSchema = new Schema<ICbctScanRegion>(
  {
    code: { type: String, required: true, maxlength: 50 },
    name: { type: bilingualSchema, required: true },
    description: { type: String, maxlength: 500 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

cbctScanRegionSchema.index({ isActive: 1, sortOrder: 1 });
cbctScanRegionSchema.index({ code: 1 }, { unique: true });

export function getCbctScanRegionModel(connection: Connection): Model<ICbctScanRegion> {
  return (connection.models.CbctScanRegion ||
    connection.model('CbctScanRegion', cbctScanRegionSchema)) as Model<ICbctScanRegion>;
}

export type CbctScanRegionModel = ReturnType<typeof getCbctScanRegionModel>;
