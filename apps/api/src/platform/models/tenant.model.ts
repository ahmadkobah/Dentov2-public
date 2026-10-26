import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Tenant Model — Platform Database (dento_platform)
 *
 * Each tenant represents a dental clinic with its own isolated database.
 * Database naming: tenant_{slug}
 */

// ── Types ───────────────────────────────────────────────────

export interface ITenantBranding {
  logoUrl?: string;
  logoDarkUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  accentColor: string;
}

export interface ITenantContact {
  email: string;
  phone: string;
  website?: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    country: string;
    postalCode?: string;
  };
}

export interface ISessionLimits {
  maxDesktop: number;
  maxMobile: number;
  maxTablet: number;
}

export interface ITenantSettings {
  timezone: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  currency: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  weekStartsOn: 0 | 1 | 6; // 0 = Sunday, 1 = Monday, 6 = Saturday
  isAllowNegativeStock: boolean;
  isRequireAppointmentConfirmation: boolean;
  sessionLimits: ISessionLimits;
  platformEnforce2FA: boolean;
}

export interface ITenant extends Document {
  // Identity
  name: { en: string; ar?: string };
  slug: string; // URL-safe identifier, used for database name
  status: 'pending' | 'trial' | 'active' | 'suspended' | 'cancelled';

  // Trial / Subscription
  trialStartedAt: Date | null;
  trialEndAt: Date | null;
  activatedAt: Date | null;

  // Limits
  maxUsers: number;
  maxBranches: number;
  storageUsedMB: number;
  storageLimitMB: number;
  storageTierId: mongoose.Types.ObjectId | null;

  // Contact & Branding
  contact: ITenantContact;
  branding: ITenantBranding;
  settings: ITenantSettings;

  // Modules (references to enabled modules)
  enabledModules: string[];

  // Billing
  billingDay: number; // 1-28, day of month for invoice generation
  gracePeriodDays: number; // days after due date before overdue escalation
  redeemedCoupons: {
    couponCode: string;
    redeemedAt: Date;
    discountType: 'percent' | 'fixed_amount';
    discountPercent: number;
    discountAmount: number;
    duration: 'once' | 'repeating' | 'forever';
    durationMonths: number;
    remainingMonths: number;
  }[];

  // Owner
  ownerId: mongoose.Types.ObjectId;

  // Tracking
  lastActivityAt: Date | null;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | null;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Sub-Schemas ─────────────────────────────────────────────

const brandingSchema = new Schema<ITenantBranding>(
  {
    logoUrl: { type: String },
    logoDarkUrl: { type: String },
    faviconUrl: { type: String },
    primaryColor: { type: String, default: '#4f46e5' },
    accentColor: { type: String, default: '#10b981' },
  },
  { _id: false },
);

const contactSchema = new Schema<ITenantContact>(
  {
    email: { type: String, required: true },
    phone: { type: String, required: true },
    website: { type: String },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String, required: true },
      postalCode: { type: String },
    },
  },
  { _id: false },
);

const sessionLimitsSchema = new Schema<ISessionLimits>(
  {
    maxDesktop: { type: Number, default: 1, min: 1, max: 5 },
    maxMobile: { type: Number, default: 1, min: 1, max: 5 },
    maxTablet: { type: Number, default: 1, min: 1, max: 5 },
  },
  { _id: false },
);

const settingsSchema = new Schema<ITenantSettings>(
  {
    timezone: { type: String, default: 'Africa/Cairo' },
    defaultLanguage: { type: String, default: 'en' },
    supportedLanguages: { type: [String], default: ['en'] },
    currency: { type: String, default: 'EGP' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    timeFormat: { type: String, enum: ['12h', '24h'], default: '12h' },
    weekStartsOn: { type: Number, enum: [0, 1, 6], default: 0 },
    isAllowNegativeStock: { type: Boolean, default: false },
    isRequireAppointmentConfirmation: { type: Boolean, default: true },
    sessionLimits: { type: sessionLimitsSchema, default: () => ({}) },
    platformEnforce2FA: { type: Boolean, default: false },
  },
  { _id: false },
);

// ── Main Schema ─────────────────────────────────────────────

const tenantSchema = new Schema<ITenant>(
  {
    name: {
      en: { type: String, required: true },
      ar: { type: String },
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9-]+$/,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'trial', 'active', 'suspended', 'cancelled'],
      default: 'pending',
      index: true,
    },

    // Trial / Subscription
    trialStartedAt: { type: Date, default: null },
    trialEndAt: { type: Date, default: null },
    activatedAt: { type: Date, default: null },

    // Limits
    maxUsers: { type: Number, default: 10 },
    maxBranches: { type: Number, default: 1 },
    storageUsedMB: { type: Number, default: 0 },
    storageLimitMB: { type: Number, default: 102400 }, // 100 GB default (Basic tier)
    storageTierId: { type: Schema.Types.ObjectId, ref: 'StorageTier', default: null },

    // Contact & Settings
    contact: { type: contactSchema, required: true },
    branding: { type: brandingSchema, default: () => ({}) },
    settings: { type: settingsSchema, default: () => ({}) },

    // Modules
    enabledModules: {
      type: [String],
      default: [],
    },

    // Billing
    billingDay: { type: Number, default: 1, min: 1, max: 28 },
    gracePeriodDays: { type: Number, default: 7, min: 0, max: 30 },
    redeemedCoupons: {
      type: [
        {
          couponCode: { type: String, required: true },
          redeemedAt: { type: Date, required: true },
          discountType: { type: String, enum: ['percent', 'fixed_amount'], default: 'percent' },
          discountPercent: { type: Number, default: 0 },
          discountAmount: { type: Number, default: 0 },
          duration: { type: String, enum: ['once', 'repeating', 'forever'], required: true },
          durationMonths: { type: Number, default: 0 },
          remainingMonths: { type: Number, default: 0 },
        },
      ],
      default: [],
    },

    // Owner
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Tracking
    lastActivityAt: { type: Date, default: null },

    // ── Standard Fields ─────────────────────────────────
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    collection: 'tenants',
  },
);

// ── Indexes ─────────────────────────────────────────────────

tenantSchema.index({ status: 1, trialEndAt: 1 });
tenantSchema.index({ 'contact.country': 1 });
tenantSchema.index({ ownerId: 1 });

// ── Virtual: Database name ──────────────────────────────────

tenantSchema.virtual('databaseName').get(function () {
  return `tenant_${this.slug}`;
});

// ── Model Export ────────────────────────────────────────────

export const Tenant = mongoose.model<ITenant>('Tenant', tenantSchema);
