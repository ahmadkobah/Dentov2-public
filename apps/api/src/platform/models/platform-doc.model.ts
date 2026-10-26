/**
 * Platform Documentation Model — dento_platform database
 *
 * Documents/tutorials published by the developer team
 * for all tenants to read via the admin portal "Docs" page.
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IPlatformDoc extends Document {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  content: string; // Markdown
  category: string;
  order: number;
  isPublished: boolean;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const platformDocSchema = new Schema<IPlatformDoc>(
  {
    title: { type: String, required: true, maxlength: 500 },
    slug: { type: String, required: true, unique: true, maxlength: 200 },
    content: { type: String, required: true },
    category: { type: String, required: true, maxlength: 100 },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

platformDocSchema.index({ category: 1, order: 1 });
// `slug` already gets a unique index via the field-level `unique: true` above.
platformDocSchema.index({ isPublished: 1 });

export const PlatformDoc = mongoose.model<IPlatformDoc>('PlatformDoc', platformDocSchema);
