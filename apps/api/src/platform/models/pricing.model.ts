import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Pricing Config Model — Platform Database (dento_platform)
 *
 * Per MASTER_PLAN §28 — Pricing System (Module-Only, dynamisch konfigurierbar)
 *
 * Single document containing all pricing configuration:
 * - Module prices (11 modules, per spec table)
 * - Usage limits (free users, storage, branches)
 * - Global discounts (sales, promotions)
 * - Coupons (WELCOME50, etc.)
 *
 * All configurable in Dev Portal — no code deployment needed.
 */

// ── Sub-Schema Types ────────────────────────────────────────

export interface IRegionPriceDoc {
  countryCode: string;
  price: number;
  currency: string;
}

export interface ILanguagePriceDoc {
  languageCode: string;
  price: number;
  isActive: boolean;
  regionPrices: IRegionPriceDoc[];
}

export interface IModulePricingDoc {
  slug: string;
  basePrice: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  yearlyDiscount: number;
  isActive: boolean;
  isFree: boolean;
  trialDays: number;
  regionPrices: IRegionPriceDoc[];
  languagePrices: ILanguagePriceDoc[];
}

export interface IUsageLimitsDoc {
  freeUsers: number;
  extraUserPrice: number;
  freeStorageGB: number;
  extraStoragePrice: number;
  freeBranches: number;
}

export interface IGlobalDiscountDoc {
  name: string;
  discountType: 'percent' | 'fixed_amount';
  discountPercent: number;
  discountAmount: number;
  regionalAmounts: { countryCode: string; currency: string; amount: number }[];
  allowedCountries: string[];
  allowedCurrencies: string[];
  appliesTo: string; // JSON: "all" or stringified array
  startsAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface ICouponDoc {
  code: string;
  discountType: 'percent' | 'fixed_amount';
  discountPercent: number;
  discountAmount: number;
  regionalAmounts: { countryCode: string; currency: string; amount: number }[];
  maxUses: number;
  usedCount: number;
  appliesTo: string; // JSON: "all" or stringified array
  allowedCountries: string[]; // ISO-2 country codes, empty = all
  allowedCurrencies: string[]; // ISO-3 currency codes, empty = all
  duration: 'once' | 'repeating' | 'forever';
  durationMonths: number; // only relevant when duration='repeating'
  expiresAt: Date;
  isActive: boolean;
}

export interface IPricingConfig extends Document {
  modules: IModulePricingDoc[];
  usageLimits: IUsageLimitsDoc;
  globalDiscounts: mongoose.Types.DocumentArray<IGlobalDiscountDoc & mongoose.Types.Subdocument>;
  coupons: mongoose.Types.DocumentArray<ICouponDoc & mongoose.Types.Subdocument>;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | null;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Sub-Schemas ─────────────────────────────────────────────

const regionPriceSchema = new Schema<IRegionPriceDoc>(
  {
    countryCode: { type: String, required: true, minlength: 2, maxlength: 2, uppercase: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, minlength: 3, maxlength: 3 },
  },
  { _id: false },
);

const languagePriceSchema = new Schema<ILanguagePriceDoc>(
  {
    languageCode: { type: String, required: true, minlength: 2, maxlength: 5, lowercase: true },
    price: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    regionPrices: { type: [regionPriceSchema], default: [] },
  },
  { _id: false },
);

const modulePricingSchema = new Schema<IModulePricingDoc>(
  {
    slug: { type: String, required: true },
    basePrice: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    yearlyDiscount: { type: Number, default: 0, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
    isFree: { type: Boolean, default: false },
    trialDays: { type: Number, default: 0, min: 0 },
    regionPrices: { type: [regionPriceSchema], default: [] },
    languagePrices: { type: [languagePriceSchema], default: [] },
  },
  { _id: false },
);

const usageLimitsSchema = new Schema<IUsageLimitsDoc>(
  {
    freeUsers: { type: Number, default: 10, min: 0 },
    extraUserPrice: { type: Number, default: 5, min: 0 },
    freeStorageGB: { type: Number, default: 1, min: 0 },
    extraStoragePrice: { type: Number, default: 2, min: 0 },
    freeBranches: { type: Number, default: 1, min: 0 },
  },
  { _id: false },
);

const globalDiscountSchema = new Schema<IGlobalDiscountDoc>(
  {
    name: { type: String, required: true, maxlength: 200 },
    discountType: { type: String, enum: ['percent', 'fixed_amount'], default: 'percent' },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Number, default: 0, min: 0 },
    regionalAmounts: {
      type: [
        {
          countryCode: {
            type: String,
            required: true,
            minlength: 2,
            maxlength: 2,
            uppercase: true,
          },
          currency: { type: String, required: true, minlength: 3, maxlength: 3 },
          amount: { type: Number, required: true, min: 0 },
        },
      ],
      default: [],
    },
    allowedCountries: { type: [String], default: [] },
    allowedCurrencies: { type: [String], default: [] },
    appliesTo: { type: String, default: 'all' }, // "all" or JSON array
    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { _id: true },
);

const couponSchema = new Schema<ICouponDoc>(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ['percent', 'fixed_amount'], default: 'percent' },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Number, default: 0, min: 0 },
    regionalAmounts: {
      type: [
        {
          countryCode: {
            type: String,
            required: true,
            minlength: 2,
            maxlength: 2,
            uppercase: true,
          },
          currency: { type: String, required: true, minlength: 3, maxlength: 3 },
          amount: { type: Number, required: true, min: 0 },
        },
      ],
      default: [],
    },
    maxUses: { type: Number, default: 0 }, // 0 = unlimited
    usedCount: { type: Number, default: 0 },
    appliesTo: { type: String, default: 'all' },
    allowedCountries: { type: [String], default: [] },
    allowedCurrencies: { type: [String], default: [] },
    duration: { type: String, enum: ['once', 'repeating', 'forever'], default: 'once' },
    durationMonths: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { _id: true },
);

// ── Pricing Config Schema ───────────────────────────────────

const pricingConfigSchema = new Schema<IPricingConfig>(
  {
    modules: {
      type: [modulePricingSchema],
      default: [],
    },
    usageLimits: {
      type: usageLimitsSchema,
      required: true,
      default: () => ({
        freeUsers: 10,
        extraUserPrice: 5,
        freeStorageGB: 1,
        extraStoragePrice: 2,
        freeBranches: 1,
      }),
    },
    globalDiscounts: {
      type: [globalDiscountSchema],
      default: [],
    },
    coupons: {
      type: [couponSchema],
      default: [],
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
    collection: 'pricing_config',
  },
);

// Only one pricing config document
pricingConfigSchema.index({}, { unique: true });

// ── Model ───────────────────────────────────────────────────

export const PricingConfig = mongoose.model<IPricingConfig>('PricingConfig', pricingConfigSchema);
