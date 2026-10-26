import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Country Config Model — Platform Database (dento_platform)
 *
 * Defines locale, currency, timezone, and regional settings per country.
 * Per MASTER_PLAN §25 - Tenant Locale System
 *
 * Propagation:
 * - When tenant sets country → derives language, currency, timezone
 * - Can be overridden at tenant level
 */

// ── Types ───────────────────────────────────────────────────

export interface ICountryConfig extends Document {
  code: string; // ISO 3166-1 alpha-2 (EG, SA, AE, US, DE)
  name: string;
  nameArabic?: string;
  defaultLocale: 'en' | 'ar';
  supportedLocales: ('en' | 'ar')[];
  currency: {
    code: string; // ISO 4217 (EGP, SAR, AED, USD, EUR)
    symbol: string;
    symbolPosition: 'before' | 'after';
    decimalPlaces: number;
  };
  timezone: string; // IANA timezone (Africa/Cairo, Asia/Riyadh)
  dateFormat: string; // Intl format (dd/MM/yyyy)
  timeFormat: '12h' | '24h';
  weekStart: 0 | 1 | 5 | 6; // Sun=0, Mon=1, Fri=5, Sat=6
  phoneCode: string; // +20, +966, +971
  direction: 'ltr' | 'rtl';
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | null;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const countryConfigSchema = new Schema<ICountryConfig>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      minlength: 2,
      maxlength: 2,
    },
    name: {
      type: String,
      required: true,
    },
    nameArabic: String,
    defaultLocale: {
      type: String,
      enum: ['en', 'ar'],
      default: 'en',
    },
    supportedLocales: {
      type: [String],
      enum: ['en', 'ar'],
      default: ['en', 'ar'],
    },
    currency: {
      code: { type: String, required: true },
      symbol: { type: String, required: true },
      symbolPosition: { type: String, enum: ['before', 'after'], default: 'before' },
      decimalPlaces: { type: Number, default: 2 },
    },
    timezone: {
      type: String,
      required: true,
    },
    dateFormat: {
      type: String,
      default: 'dd/MM/yyyy',
    },
    timeFormat: {
      type: String,
      enum: ['12h', '24h'],
      default: '12h',
    },
    weekStart: {
      type: Number,
      enum: [0, 1, 5, 6],
      default: 0, // Sunday
    },
    phoneCode: {
      type: String,
      required: true,
    },
    direction: {
      type: String,
      enum: ['ltr', 'rtl'],
      default: 'ltr',
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

// ── Model ───────────────────────────────────────────────────

export const CountryConfig = mongoose.model<ICountryConfig>('CountryConfig', countryConfigSchema);
