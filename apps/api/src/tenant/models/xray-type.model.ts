import { Schema, type Document, type Connection, type Model } from 'mongoose';

/**
 * X-Ray Type Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md — xray_types lookup collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#11)
 *
 * Lookup table for X-Ray types with bilingual names.
 * Used by XrayListPage dropdown + create form.
 */

export interface IXrayType extends Document {
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

const xrayTypeSchema = new Schema<IXrayType>(
  {
    code: { type: String, required: true, maxlength: 50 },
    name: { type: bilingualSchema, required: true },
    description: { type: String, maxlength: 500 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

xrayTypeSchema.index({ isActive: 1, sortOrder: 1 });
xrayTypeSchema.index({ code: 1 }, { unique: true });

export function getXrayTypeModel(connection: Connection): Model<IXrayType> {
  return (connection.models.XrayType ||
    connection.model('XrayType', xrayTypeSchema)) as Model<IXrayType>;
}

export type XrayTypeModel = ReturnType<typeof getXrayTypeModel>;
