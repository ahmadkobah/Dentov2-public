/**
 * Provider Credentials Service — Per-Tenant Provider Configuration
 *
 * Manages encrypted per-tenant credentials for notification channels.
 * Each tenant can either use platform defaults or supply their own API keys.
 *
 * Encryption: AES-256-GCM via utils/encryption.ts
 * Storage: tenant_settings collection, key = 'providers'
 */

import type { Connection } from 'mongoose';
import { getSettingsModel, type SettingsKey } from '../tenant/models/settings.model.js';
import { encryptField, decryptField, isEncryptionEnabled } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';

// ── Types ───────────────────────────────────────────────────

export interface EmailCredentials {
  useCustom: boolean;
  provider?: 'resend' | 'smtp';
  resendApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  fromEmail?: string;
  fromName?: string;
}

export interface SmsCredentials {
  useCustom: boolean;
  provider?: 'twilio';
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
}

export interface WhatsAppCredentials {
  useCustom: boolean;
  provider?: 'meta';
  metaPhoneNumberId?: string;
  metaAccessToken?: string;
}

export interface PushCredentials {
  useCustom: boolean;
  provider?: 'vapid';
  vapidSubject?: string;
  vapidPublicKey?: string;
  vapidPrivateKey?: string;
}

export interface TenantProviderConfig {
  email: EmailCredentials;
  sms: SmsCredentials;
  whatsapp: WhatsAppCredentials;
  push: PushCredentials;
}

// Fields that must be encrypted when storing
const SENSITIVE_FIELDS: Record<string, string[]> = {
  email: ['resendApiKey', 'smtpPass'],
  sms: ['twilioAuthToken'],
  whatsapp: ['metaAccessToken'],
  push: ['vapidPrivateKey'],
};

// Fields that should be masked in API responses
const MASKED_FIELDS: Record<string, string[]> = {
  email: ['resendApiKey', 'smtpPass'],
  sms: ['twilioAuthToken', 'twilioAccountSid'],
  whatsapp: ['metaAccessToken'],
  push: ['vapidPrivateKey'],
};

// ── Service ─────────────────────────────────────────────────

export class ProviderCredentialsService {
  constructor(private tenantDb: Connection) {}

  /**
   * Get decrypted provider config for internal use (worker calls).
   */
  async getDecryptedConfig(): Promise<TenantProviderConfig> {
    const Settings = getSettingsModel(this.tenantDb);
    const doc = await Settings.findOne({ key: 'providers' as SettingsKey }).lean();

    const defaults: TenantProviderConfig = {
      email: { useCustom: false },
      sms: { useCustom: false },
      whatsapp: { useCustom: false },
      push: { useCustom: false },
    };

    if (!doc?.value) return defaults;

    const stored = doc.value as unknown as TenantProviderConfig;

    // Decrypt sensitive fields
    for (const channel of Object.keys(SENSITIVE_FIELDS)) {
      const channelConfig = stored[channel as keyof TenantProviderConfig];
      if (!channelConfig) continue;

      for (const field of SENSITIVE_FIELDS[channel]) {
        const val = (channelConfig as unknown as Record<string, unknown>)[field];
        if (typeof val === 'string' && val.includes(':')) {
          (channelConfig as unknown as Record<string, unknown>)[field] = decryptField(val);
        }
      }
    }

    return {
      email: { ...defaults.email, ...stored.email },
      sms: { ...defaults.sms, ...stored.sms },
      whatsapp: { ...defaults.whatsapp, ...stored.whatsapp },
      push: { ...defaults.push, ...stored.push },
    };
  }

  /**
   * Get masked provider config for API responses (hides secrets).
   */
  async getMaskedConfig(): Promise<TenantProviderConfig> {
    const config = await this.getDecryptedConfig();

    for (const channel of Object.keys(MASKED_FIELDS)) {
      const channelConfig = config[channel as keyof TenantProviderConfig];
      for (const field of MASKED_FIELDS[channel]) {
        const val = (channelConfig as unknown as Record<string, unknown>)[field];
        if (typeof val === 'string' && val.length > 0) {
          (channelConfig as unknown as Record<string, unknown>)[field] = maskSecret(val);
        }
      }
    }

    return config;
  }

  /**
   * Save provider config for a specific channel, encrypting sensitive fields.
   */
  async saveChannelConfig(
    channel: keyof TenantProviderConfig,
    config: Record<string, unknown>,
    updatedBy: string,
  ): Promise<void> {
    // Encrypt sensitive fields before saving
    if (isEncryptionEnabled()) {
      const sensitiveKeys = SENSITIVE_FIELDS[channel] ?? [];
      for (const field of sensitiveKeys) {
        const val = config[field];
        if (typeof val === 'string' && val.length > 0 && !val.includes(':')) {
          config[field] = encryptField(val);
        }
      }
    }

    const Settings = getSettingsModel(this.tenantDb);
    const existing = await Settings.findOne({ key: 'providers' as SettingsKey });

    if (existing) {
      const currentValue = (existing.value ?? {}) as Record<string, unknown>;
      currentValue[channel] = config;
      existing.value = currentValue;
      existing.updatedBy = updatedBy;
      await existing.save();
    } else {
      await Settings.create({
        key: 'providers' as SettingsKey,
        value: { [channel]: config },
        updatedBy,
      });
    }

    logger.info({ channel, tenantDb: this.tenantDb.name }, 'Provider config saved');
  }

  /**
   * Get decrypted config for a specific channel.
   */
  async getChannelConfig<T extends keyof TenantProviderConfig>(
    channel: T,
  ): Promise<TenantProviderConfig[T]> {
    const config = await this.getDecryptedConfig();
    return config[channel];
  }
}

// ── Helpers ─────────────────────────────────────────────────

function maskSecret(value: string): string {
  if (value.length <= 8) return '••••••••';
  return value.slice(0, 4) + '••••' + value.slice(-4);
}
