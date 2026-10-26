import { logger } from '../../utils/logger.js';
import { getSystemSettings, type ISystemSettings } from '../models/system-settings.model.js';
import { getPlatformBranding, type IPlatformBranding } from '../models/branding.model.js';
import { getCurrencies, type ICurrencies } from '../models/currencies.model.js';
import { getPlatformChannels } from '../models/platform-channels.model.js';
import { encryptField, decryptField, isEncryptionEnabled } from '../../utils/encryption.js';
import { getPresignedDownloadUrl } from '../../config/s3.js';
import { env } from '../../config/env.js';

/**
 * Platform Settings Service — Phase 7
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 2.5
 * Singleton CRUD for system_settings, branding, and currencies.
 *
 * Pattern: standalone exported async functions (per deployment.service.ts)
 */

// ── System Settings ─────────────────────────────────────────

export async function fetchSystemSettings(): Promise<ISystemSettings> {
  return getSystemSettings();
}

export async function patchSystemSettings(
  updates: Record<string, unknown>,
  updatedBy: string,
): Promise<ISystemSettings> {
  const settings = await getSystemSettings();
  Object.assign(settings, updates, { updatedBy });
  await settings.save();
  logger.info({ updatedBy, fields: Object.keys(updates) }, 'System settings updated');
  return settings;
}

// ── Branding ────────────────────────────────────────────────

/** Check if a value looks like an S3 key (not a full URL). */
function isS3Key(value: string): boolean {
  return !!value && !value.startsWith('http://') && !value.startsWith('https://');
}

/** Resolve S3 keys in logoUrl / faviconUrl to fresh presigned URLs. */
async function resolveBrandingUrls(branding: IPlatformBranding) {
  const obj = branding.toObject();
  const s3Ready = !!(env.S3_ENDPOINT && env.S3_ACCESS_KEY && env.S3_SECRET_KEY && env.S3_BUCKET);

  if (s3Ready && obj.logoUrl && isS3Key(obj.logoUrl)) {
    obj.logoUrl = await getPresignedDownloadUrl(obj.logoUrl, 86_400);
  }
  if (s3Ready && obj.faviconUrl && isS3Key(obj.faviconUrl)) {
    obj.faviconUrl = await getPresignedDownloadUrl(obj.faviconUrl, 86_400);
  }
  if (s3Ready && obj.docsConfig?.headerLogo && isS3Key(obj.docsConfig.headerLogo)) {
    obj.docsConfig.headerLogo = await getPresignedDownloadUrl(obj.docsConfig.headerLogo, 86_400);
  }
  return obj;
}

export async function fetchBranding() {
  const branding = await getPlatformBranding();
  return resolveBrandingUrls(branding);
}

export async function patchBranding(
  updates: Record<string, unknown>,
  updatedBy: string,
): Promise<IPlatformBranding> {
  const branding = await getPlatformBranding();
  Object.assign(branding, updates, { updatedBy });
  await branding.save();
  logger.info({ updatedBy, fields: Object.keys(updates) }, 'Platform branding updated');
  return branding;
}

// ── Currencies ──────────────────────────────────────────────

export async function fetchCurrencies(): Promise<ICurrencies> {
  return getCurrencies();
}

export async function patchCurrencies(
  updates: Record<string, unknown>,
  updatedBy: string,
): Promise<ICurrencies> {
  const currencies = await getCurrencies();
  Object.assign(currencies, updates, { updatedBy });
  if (updates.exchangeRates) {
    currencies.lastUpdatedAt = new Date();
  }
  await currencies.save();
  logger.info({ updatedBy, fields: Object.keys(updates) }, 'Currencies updated');
  return currencies;
}

// ── Platform Channels ───────────────────────────────────────

const SENSITIVE_CHANNEL_FIELDS: Record<string, string[]> = {
  email: ['resendApiKey', 'smtpPass'],
  sms: ['twilioAuthToken'],
  whatsapp: ['metaAccessToken'],
  push: ['vapidPrivateKey'],
};

const MASKED_CHANNEL_FIELDS: Record<string, string[]> = {
  email: ['resendApiKey', 'smtpPass'],
  sms: ['twilioAuthToken', 'twilioAccountSid'],
  whatsapp: ['metaAccessToken'],
  push: ['vapidPrivateKey'],
};

function maskSecret(value: string): string {
  if (value.length <= 8) return '••••••••';
  return value.slice(0, 4) + '••••' + value.slice(-4);
}

export async function fetchPlatformChannels(): Promise<Record<string, unknown>> {
  const doc = await getPlatformChannels();
  const obj = doc.toObject() as Record<string, unknown>;

  // Decrypt then mask sensitive fields for API response
  for (const channel of ['email', 'sms', 'whatsapp', 'push']) {
    const cfg = obj[channel] as Record<string, unknown> | undefined;
    if (!cfg) continue;

    // Decrypt first
    for (const field of SENSITIVE_CHANNEL_FIELDS[channel] ?? []) {
      const val = cfg[field];
      if (typeof val === 'string' && val.includes(':')) {
        cfg[field] = decryptField(val);
      }
    }

    // Mask for response
    for (const field of MASKED_CHANNEL_FIELDS[channel] ?? []) {
      const val = cfg[field];
      if (typeof val === 'string' && val.length > 0) {
        cfg[field] = maskSecret(val);
      }
    }
  }

  return { email: obj.email, sms: obj.sms, whatsapp: obj.whatsapp, push: obj.push };
}

export async function patchPlatformChannel(
  channel: string,
  config: Record<string, unknown>,
  updatedBy: string,
): Promise<Record<string, unknown>> {
  // Encrypt sensitive fields before saving
  if (isEncryptionEnabled()) {
    for (const field of SENSITIVE_CHANNEL_FIELDS[channel] ?? []) {
      const val = config[field];
      if (typeof val === 'string' && val.length > 0 && !val.includes(':')) {
        config[field] = encryptField(val);
      }
    }
  }

  const doc = await getPlatformChannels();
  (doc as unknown as Record<string, unknown>)[channel] = config;
  doc.updatedBy = updatedBy;
  doc.markModified(channel);
  await doc.save();

  logger.info({ channel, updatedBy }, 'Platform channel config updated');
  return fetchPlatformChannels();
}
