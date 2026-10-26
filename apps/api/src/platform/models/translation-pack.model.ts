import mongoose, { Schema, type Document } from 'mongoose';
import { translationsEN } from '../../scripts/seed-data/translations-en.js';
import { translationsAR } from '../../scripts/seed-data/translations-ar.js';

/**
 * Translation Pack Model — Platform Database (dento_platform)
 *
 * Stores translations for all UI strings in EN and AR.
 * Per MASTER_PLAN §26 - i18n System
 *
 * Structure:
 * - Each pack has a locale (en, ar)
 * - Translations are stored as nested key-value pairs
 * - Keys follow dot notation: "auth.login.title", "patients.list.empty"
 */

// ── Types ───────────────────────────────────────────────────

export interface ITranslationPack extends Document {
  locale: 'en' | 'ar';
  namespace: string; // e.g., 'common', 'auth', 'patients', 'appointments'
  translations: Record<string, string>;
  version: number;
  isDefault: boolean; // true = shipped with app, false = tenant custom
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | null;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const translationPackSchema = new Schema<ITranslationPack>(
  {
    locale: {
      type: String,
      enum: ['en', 'ar'],
      required: true,
    },
    namespace: {
      type: String,
      required: true,
      index: true,
    },
    translations: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    version: {
      type: Number,
      default: 1,
    },
    isDefault: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Compound unique index: one translation pack per locale + namespace
translationPackSchema.index({ locale: 1, namespace: 1 }, { unique: true });

// ── Model ───────────────────────────────────────────────────

export const TranslationPack = mongoose.model<ITranslationPack>(
  'TranslationPack',
  translationPackSchema,
);

// ── Default Translation Bootstrap ────────────────────────────

/**
 * Idempotently upsert the bundled EN/AR translation packs.
 *
 * The standalone seed-platform script is hard-blocked in production and is not
 * run by any deploy pipeline, so a freshly deployed server starts with an empty
 * TranslationPack collection — `/api/translations/ar` returns [] and the UI
 * silently falls back to the English bundle. This runs on every boot regardless
 * of NODE_ENV. Safe to re-run: upserts by { locale, namespace }.
 */
export async function ensureDefaultTranslations(): Promise<void> {
  const sources: Array<['en' | 'ar', Record<string, unknown>]> = [
    ['en', translationsEN],
    ['ar', translationsAR],
  ];
  for (const [locale, packs] of sources) {
    for (const [namespace, translations] of Object.entries(packs)) {
      await TranslationPack.updateOne(
        { locale, namespace },
        {
          $set: {
            locale,
            namespace,
            translations: translations as Record<string, string>,
            isDefault: true,
            version: 1,
          },
        },
        { upsert: true },
      );
    }
  }
}
