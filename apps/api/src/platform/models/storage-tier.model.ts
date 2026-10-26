import mongoose, { Schema, type Document } from 'mongoose';
import { DEFAULT_STORAGE_TIERS } from '@dento/shared';
import { logger } from '../../utils/logger.js';

/**
 * Storage Tier Model — Platform Database (dento_platform)
 *
 * Configurable storage plans: Basic (100 GB free), Standard (200 GB),
 * Professional (500 GB), Enterprise (1024 GB), and custom tiers.
 *
 * Region pricing: per-country price overrides (same shape as module pricing).
 * Default currency: EUR.
 */

// ── Types ───────────────────────────────────────────────────

export interface IRegionPriceDoc {
  countryCode: string;
  price: number;
  currency: string;
}

export interface IStorageTier extends Document {
  slug: string;
  name: string;
  storageLimitGB: number;
  pricePerMonth: number;
  currency: string;
  isDefault: boolean;
  isCustom: boolean;
  sortOrder: number;
  isActive: boolean;
  regionPrices: IRegionPriceDoc[];
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const regionPriceSchema = new Schema<IRegionPriceDoc>(
  {
    countryCode: { type: String, required: true, minlength: 2, maxlength: 2, uppercase: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, minlength: 3, maxlength: 3 },
  },
  { _id: false },
);

const storageTierSchema = new Schema<IStorageTier>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9-]+$/,
    },
    name: { type: String, required: true, maxlength: 100 },
    storageLimitGB: { type: Number, required: true, min: 1 },
    pricePerMonth: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'EUR', minlength: 3, maxlength: 3 },
    isDefault: { type: Boolean, default: false },
    isCustom: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 99 },
    isActive: { type: Boolean, default: true },
    regionPrices: { type: [regionPriceSchema], default: [] },
  },
  {
    timestamps: true,
    collection: 'storage_tiers',
  },
);

storageTierSchema.index({ isActive: 1, sortOrder: 1 });

export const StorageTier = mongoose.model<IStorageTier>('StorageTier', storageTierSchema);

// ── Seed ────────────────────────────────────────────────────

export async function seedDefaultStorageTiers(): Promise<void> {
  for (const tier of DEFAULT_STORAGE_TIERS) {
    await StorageTier.updateOne(
      { slug: tier.slug },
      {
        $setOnInsert: {
          name: tier.name,
          storageLimitGB: tier.storageLimitGB,
          pricePerMonth: tier.pricePerMonth,
          currency: 'EUR',
          isDefault: tier.slug === 'basic',
          isCustom: false,
          sortOrder: tier.sortOrder,
          isActive: true,
          regionPrices: [],
        },
      },
      { upsert: true },
    );
  }
  logger.info('Default storage tiers seeded');
}

// ── Helpers ─────────────────────────────────────────────────

export async function getDefaultStorageTier(): Promise<IStorageTier | null> {
  return StorageTier.findOne({
    isDefault: true,
    isActive: true,
  }).lean() as unknown as Promise<IStorageTier | null>;
}

export async function getStorageTierById(id: string): Promise<IStorageTier | null> {
  return StorageTier.findById(id).lean() as unknown as Promise<IStorageTier | null>;
}
