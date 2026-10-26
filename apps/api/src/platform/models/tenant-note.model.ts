import mongoose, { Schema, type Document } from 'mongoose';

export type NoteSource = 'platform' | 'tenant';

export interface ITenantNote extends Document {
  tenantId: mongoose.Types.ObjectId;
  tenantSlug: string;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  source: NoteSource;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const tenantNoteSchema = new Schema<ITenantNote>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    tenantSlug: { type: String, required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, required: true },
    authorName: { type: String, required: true },
    source: { type: String, enum: ['platform', 'tenant'], required: true },
    content: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true },
);

// Compound index for efficient tenant-scoped queries sorted by time
tenantNoteSchema.index({ tenantSlug: 1, createdAt: -1 });

export const TenantNote = mongoose.model<ITenantNote>('TenantNote', tenantNoteSchema);
