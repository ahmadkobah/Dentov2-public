import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Branding Model — Platform Database (dento_platform)
 *
 * Per V2_DATABASE §4.17 — branding singleton
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 2.3
 *
 * Singleton document (_id = 'default') storing platform branding:
 * - Platform name
 * - Logo + favicon URLs
 * - Primary color
 * - Landing page URL
 */

// ── Types ───────────────────────────────────────────────────

export interface IDocsConfig {
  headerLogo: string;
  headerTitle: string;
  footerSupportEmail: string;
  footerSupportPhone: string;
  footerCopyrightText: string;
  footerPlatformVersion: string;
}

export interface IPlatformBranding extends Document<string> {
  _id: string;
  platformName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  landingPageUrl: string;
  docsConfig: IDocsConfig;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const platformBrandingSchema = new Schema<IPlatformBranding>(
  {
    _id: {
      type: String,
      default: 'default',
    },
    platformName: {
      type: String,
      default: 'Dento',
      maxlength: 200,
    },
    logoUrl: {
      type: String,
      default: '',
      maxlength: 2048,
    },
    faviconUrl: {
      type: String,
      default: '',
      maxlength: 2048,
    },
    primaryColor: {
      type: String,
      default: '#2563EB',
      match: /^#[0-9a-fA-F]{6}$/,
    },
    landingPageUrl: {
      type: String,
      default: '',
      maxlength: 2048,
    },
    docsConfig: {
      type: new Schema(
        {
          headerLogo: { type: String, default: '', maxlength: 2048 },
          headerTitle: { type: String, default: 'Dento Docs', maxlength: 200 },
          footerSupportEmail: { type: String, default: '', maxlength: 200 },
          footerSupportPhone: { type: String, default: '', maxlength: 50 },
          footerCopyrightText: { type: String, default: '', maxlength: 500 },
          footerPlatformVersion: { type: String, default: '', maxlength: 50 },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    _id: false,
    timestamps: true,
    collection: 'branding',
  },
);

// ── Singleton Helper ────────────────────────────────────────

/**
 * Get (or create) the singleton branding document.
 */
export async function getPlatformBranding(): Promise<IPlatformBranding> {
  let branding = await PlatformBranding.findById('default');
  if (!branding) {
    branding = await PlatformBranding.create({ _id: 'default' });
  }
  return branding;
}

// ── Model Export ────────────────────────────────────────────

export const PlatformBranding = mongoose.model<IPlatformBranding>(
  'PlatformBranding',
  platformBrandingSchema,
);
