import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Domain Model — Platform Database (dento_platform)
 *
 * Per V2_DATABASE §4.14 — Gap G6
 *
 * Custom domain management for tenants:
 * - DNS verification (CNAME/TXT records)
 * - SSL certificate status tracking
 * - Cloudflare integration
 */

// ── Types ───────────────────────────────────────────────────

export type SSLStatus = 'pending' | 'active' | 'expired' | 'error';

export interface IDNSRecord {
  type: 'CNAME' | 'A' | 'TXT';
  name: string;
  value: string;
  verified: boolean;
}

export interface IDomain extends Document {
  tenantSlug: string;
  customDomain: string;
  dnsVerified: boolean;
  sslStatus: SSLStatus;
  sslExpiresAt: Date | null;
  requiredRecords: IDNSRecord[];
  verifiedAt: Date | null;
  isActive: boolean;
  cloudflareRecordId: string | null;
  createdBy: mongoose.Types.ObjectId | null;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const dnsRecordSchema = new Schema<IDNSRecord>(
  {
    type: {
      type: String,
      enum: ['CNAME', 'A', 'TXT'],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const domainSchema = new Schema<IDomain>(
  {
    tenantSlug: {
      type: String,
      required: true,
    },
    customDomain: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    dnsVerified: {
      type: Boolean,
      default: false,
    },
    sslStatus: {
      type: String,
      enum: ['pending', 'active', 'expired', 'error'],
      default: 'pending',
    },
    sslExpiresAt: {
      type: Date,
      default: null,
    },
    requiredRecords: {
      type: [dnsRecordSchema],
      default: [],
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    cloudflareRecordId: {
      type: String,
      default: null,
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
    collection: 'domains',
  },
);

// ── Indexes (per V2_DATABASE §4.14) ────────────────────────

// 1. Unique custom domain
domainSchema.index({ customDomain: 1 }, { unique: true });
// 2. Lookup by tenant
domainSchema.index({ tenantSlug: 1 });
// 3. SSL renewal check cron
domainSchema.index({ sslExpiresAt: 1 });
// 4. Active domains
domainSchema.index({ isActive: 1, tenantSlug: 1 });

// ── Model Export ────────────────────────────────────────────

export const Domain = mongoose.model<IDomain>('Domain', domainSchema);
