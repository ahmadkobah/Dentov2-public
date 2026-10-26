import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Platform Channels Model — dento_platform database
 *
 * Singleton (_id = 'default') storing platform-level provider credentials.
 * These act as the defaults for tenants with useCustom: false.
 *
 * Shape mirrors TenantProviderConfig from provider-credentials.service.ts
 * but lives in the platform DB instead of per-tenant settings collection.
 */

// ── Types ───────────────────────────────────────────────────

export interface IPlatformChannelConfig {
  enabled: boolean;
  provider?: string;
  [key: string]: unknown;
}

export interface IPlatformChannels extends Document<string> {
  _id: string;
  email: IPlatformChannelConfig;
  sms: IPlatformChannelConfig;
  whatsapp: IPlatformChannelConfig;
  push: IPlatformChannelConfig;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const channelConfigSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    provider: { type: String },
  },
  { _id: false, strict: false },
);

const platformChannelsSchema = new Schema<IPlatformChannels>(
  {
    _id: { type: String, default: 'default' },
    email: { type: channelConfigSchema, default: () => ({ enabled: false }) },
    sms: { type: channelConfigSchema, default: () => ({ enabled: false }) },
    whatsapp: { type: channelConfigSchema, default: () => ({ enabled: false }) },
    push: { type: channelConfigSchema, default: () => ({ enabled: false }) },
    updatedBy: { type: String, default: null },
  },
  {
    _id: false,
    timestamps: true,
    collection: 'platform_channels',
  },
);

// ── Singleton Helper ────────────────────────────────────────

export async function getPlatformChannels(): Promise<IPlatformChannels> {
  let doc = await PlatformChannels.findById('default');
  if (!doc) {
    doc = await PlatformChannels.create({ _id: 'default' });
  }
  return doc;
}

// ── Model Export ────────────────────────────────────────────

export const PlatformChannels = mongoose.model<IPlatformChannels>(
  'PlatformChannels',
  platformChannelsSchema,
);
