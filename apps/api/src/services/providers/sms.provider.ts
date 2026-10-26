/**
 * SMS Provider — Twilio
 *
 * Per DENTO_V2_MASTER_PLAN.md §20 — SMS Channel
 * Per TECH_REQUIREMENTS.md — Twilio for SMS delivery
 */

import Twilio from 'twilio';
import { logger } from '../../utils/logger.js';
import type { SmsCredentials } from '../provider-credentials.service.js';

// ── Types ───────────────────────────────────────────────────

export interface SmsSendOptions {
  to: string;
  body: string;
  from?: string;
}

export interface SmsSendResult {
  success: boolean;
  sid?: string;
  provider: 'twilio';
  error?: string;
}

// ── Provider Instance (platform default) ────────────────────

let twilioClient: ReturnType<typeof Twilio> | null = null;

function getTwilioClient(): ReturnType<typeof Twilio> | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;

  if (!twilioClient) {
    twilioClient = Twilio(accountSid, authToken);
  }
  return twilioClient;
}

// ── SMS Send Function ───────────────────────────────────────

const DEFAULT_FROM = process.env.TWILIO_PHONE_NUMBER || '+1234567890';

export async function sendSms(
  options: SmsSendOptions,
  tenantConfig?: SmsCredentials,
): Promise<SmsSendResult> {
  const { to, body } = options;

  // Tenant custom Twilio
  if (tenantConfig?.useCustom && tenantConfig.twilioAccountSid && tenantConfig.twilioAuthToken) {
    const tenantClient = Twilio(tenantConfig.twilioAccountSid, tenantConfig.twilioAuthToken);
    const from = options.from ?? tenantConfig.twilioPhoneNumber ?? DEFAULT_FROM;

    try {
      const message = await tenantClient.messages.create({ to, from, body });
      logger.info({ sid: message.sid, to }, 'SMS sent via tenant Twilio');
      return { success: true, sid: message.sid, provider: 'twilio' };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ err, to }, 'Tenant SMS send failed');
      return { success: false, provider: 'twilio', error: errorMsg };
    }
  }

  // Platform default
  const from = options.from ?? DEFAULT_FROM;
  const client = getTwilioClient();
  if (!client) {
    logger.warn({ to }, 'Twilio not configured — SMS not sent (dev mode: logging only)');
    logger.info({ to, body: body.substring(0, 50) }, 'SMS content (simulated)');
    return { success: true, sid: `sim_${Date.now()}`, provider: 'twilio' };
  }

  try {
    const message = await client.messages.create({
      to,
      from,
      body,
    });

    logger.info({ sid: message.sid, to }, 'SMS sent via Twilio');
    return { success: true, sid: message.sid, provider: 'twilio' };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ err, to }, 'SMS send failed');
    return { success: false, provider: 'twilio', error: errorMsg };
  }
}
