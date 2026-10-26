import { Schema, type Document, type Connection, type Types } from 'mongoose';

/**
 * Branding Model — Tenant Database (tenant_{slug})
 *
 * Per MASTER_PLAN §14 - Logo & Branding Propagation
 *
 * Stored in `settings` collection with `type: "branding"` discriminator.
 * One document per tenant — upserted on save.
 *
 * Propagation targets:
 * - Sidebar (Admin Portal) — Logo top-left (light/dark)
 * - Login Page — Logo + Clinic Name
 * - Document PDFs (Invoice, Prescription, Treatment Plan, Consent, Lab Order)
 * - Email Templates — Logo in header
 * - Browser Tab — Favicon + clinic name as title
 * - Notification Emails — Logo in header
 */

// ── Sub-Schemas ─────────────────────────────────────────────

const bilingualSchema = new Schema(
  {
    en: { type: String, required: true, default: '' },
    ar: { type: String, default: '' },
  },
  { _id: false },
);

const brandingAddressSchema = new Schema(
  {
    main: { type: bilingualSchema, required: true, default: () => ({ en: '', ar: '' }) },
    branchId: { type: String, default: null },
  },
  { _id: false },
);

// ── Branding Document Interface ─────────────────────────────

export interface IBrandingDoc extends Document {
  type: 'branding';

  // Logo
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;

  // Logo Display
  logoSize: 'small' | 'medium' | 'large';
  logoAlignment: 'left' | 'center' | 'right';
  logoLayout: 'logo-left' | 'logo-top' | 'logo-only';

  // Clinic Information
  clinicName: { en: string; ar?: string };
  address: {
    main: { en: string; ar?: string };
    branchId?: string;
  };
  phone: string;
  email: string;
  website: string;

  // Colors
  primaryColor: string;
  accentColor: string;

  // Custom CSS
  customCss: string | null;

  // Standard Fields
  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;

  updatedAt: Date;
}

// ── Branding Schema ─────────────────────────────────────────

const brandingSchema = new Schema<IBrandingDoc>(
  {
    type: {
      type: String,
      required: true,
      enum: ['branding'],
      default: 'branding',
    },

    // === Logo ===
    logoUrl: { type: String, default: null },
    logoDarkUrl: { type: String, default: null },
    faviconUrl: { type: String, default: null },

    // === Logo Display ===
    logoSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
    logoAlignment: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
    logoLayout: {
      type: String,
      enum: ['logo-left', 'logo-top', 'logo-only'],
      default: 'logo-left',
    },

    // === Clinic Information ===
    clinicName: {
      type: bilingualSchema,
      required: true,
      default: () => ({ en: 'My Dental Clinic', ar: '' }),
    },
    address: {
      type: brandingAddressSchema,
      required: true,
      default: () => ({ main: { en: '', ar: '' } }),
    },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    website: { type: String, default: '' },

    // === Colors ===
    primaryColor: { type: String, default: '#4f46e5' },
    accentColor: { type: String, default: '#10b981' },

    // === Custom CSS ===
    customCss: { type: String, default: null },

    // === Standard Fields ===
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    collection: 'settings',
  },
);

// Ensure only one branding document per tenant
brandingSchema.index({ type: 1 }, { unique: true });

// ── Factory Function ────────────────────────────────────────

export function createBrandingModel(connection: Connection) {
  return (
    connection.models['BrandingSetting'] ||
    connection.model<IBrandingDoc>('BrandingSetting', brandingSchema)
  );
}

// ── Default Branding Seed ───────────────────────────────────

export const DEFAULT_BRANDING_VALUES = {
  type: 'branding' as const,
  logoUrl: null,
  logoDarkUrl: null,
  faviconUrl: null,
  logoSize: 'medium' as const,
  logoAlignment: 'left' as const,
  logoLayout: 'logo-left' as const,
  clinicName: { en: 'My Dental Clinic', ar: '' },
  address: { main: { en: '', ar: '' } },
  phone: '',
  email: '',
  website: '',
  primaryColor: '#4f46e5',
  accentColor: '#10b981',
  customCss: null,
};
