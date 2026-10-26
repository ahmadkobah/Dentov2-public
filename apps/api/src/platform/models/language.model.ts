/**
 * Language Model — Platform
 *
 * Per V2_DATABASE DEEP_SCAN_GAPS_REPORT — P1 #9
 *
 * Collection: `languages` in `dento_platform` database.
 * Dynamic language registry replacing hardcoded 'en' | 'ar' enum.
 */

import mongoose, { Schema, type Document } from 'mongoose';

// ── Interface ───────────────────────────────────────────────

export interface ILanguage extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  name: { en: string; ar: string };
  direction: 'ltr' | 'rtl';
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const languageSchema = new Schema<ILanguage>(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z]{2}(-[A-Z]{2})?$/,
      maxlength: 5,
    },
    name: {
      type: {
        en: { type: String, required: true, trim: true },
        ar: { type: String, default: '', trim: true },
      },
      required: true,
    },
    direction: {
      type: String,
      required: true,
      enum: ['ltr', 'rtl'],
      default: 'ltr',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'languages',
    versionKey: false,
  },
);

// ── Indexes ─────────────────────────────────────────────────

languageSchema.index({ code: 1 }, { unique: true });
languageSchema.index({ isActive: 1, isDefault: 1 });

// ── Model ───────────────────────────────────────────────────

export const Language = mongoose.model<ILanguage>('Language', languageSchema);
