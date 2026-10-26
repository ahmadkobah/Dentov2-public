/**
 * WhatsApp Provider — Twilio (primary) / Meta Business API (fallback)
 *
 * Per DENTO_V2_MASTER_PLAN.md §20 — WhatsApp Channel
 *
 * When TWILIO_WHATSAPP_FROM is set (e.g. Twilio sandbox), messages
 * are sent via Twilio's messaging API.  Otherwise falls back to the
 * Meta WhatsApp Cloud API via graph.facebook.com.
 */

import { logger } from '../../utils/logger.js';
import type { WhatsAppCredentials } from '../provider-credentials.service.js';

// ── Types ───────────────────────────────────────────────────

export interface WhatsAppSendOptions {
  to: string; // Phone number in international format (e.g., +201234567890)
  templateId: string; // Meta template name OR Twilio Content SID
  language?: string; // Template language code (default: en)
  variables?: string[]; // Template variable values
  body?: string; // Plain text body (used by Twilio when no template)
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  provider: 'twilio-whatsapp' | 'meta-whatsapp';
  error?: string;
}

// ── Twilio WhatsApp Configuration ───────────────────────────

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM; // e.g. whatsapp:+14155238886

// ── Meta WhatsApp Configuration ─────────────────────────────

const WHATSAPP_API_VERSION = 'v21.0';
const WHATSAPP_BASE_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;
const WHATSAPP_PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.META_WHATSAPP_TOKEN;

// ── Twilio WhatsApp Send ────────────────────────────────────

async function sendViaTwilio(options: WhatsAppSendOptions): Promise<WhatsAppSendResult> {
  const { to, templateId, variables = [], body } = options;

  const cleanTo = to.replace(/[^0-9+]/g, '');
  const twilioTo = cleanTo.startsWith('whatsapp:') ? cleanTo : `whatsapp:${cleanTo}`;

  const params = new URLSearchParams();
  params.append('From', TWILIO_WHATSAPP_FROM!);
  params.append('To', twilioTo);

  // If a Content SID (template) is provided, use it; otherwise send plain body
  if (templateId && templateId.startsWith('HX')) {
    params.append('ContentSid', templateId);
    if (variables.length > 0) {
      const varsObj: Record<string, string> = {};
      variables.forEach((v, i) => {
        varsObj[String(i + 1)] = v;
      });
      params.append('ContentVariables', JSON.stringify(varsObj));
    }
  } else if (body) {
    params.append('Body', body);
  } else {
    // Fallback: send templateId as plain text body for sandbox testing
    params.append('Body', templateId || 'Hello from Dento!');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const authHeader =
    'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: authHeader,
      },
      body: params.toString(),
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const errorMsg = (data.message as string) || `HTTP ${response.status}`;
      logger.error(
        { status: response.status, error: data, to: cleanTo },
        'WhatsApp send failed (Twilio)',
      );
      return { success: false, provider: 'twilio-whatsapp', error: errorMsg };
    }

    const sid = data.sid as string;
    logger.info({ messageId: sid, to: cleanTo, templateId }, 'WhatsApp message sent via Twilio');
    return { success: true, messageId: sid, provider: 'twilio-whatsapp' };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ err, to: cleanTo, templateId }, 'WhatsApp Twilio send error');
    return { success: false, provider: 'twilio-whatsapp', error: errorMsg };
  }
}

// ── Meta WhatsApp Send ──────────────────────────────────────

async function sendViaMeta(
  options: WhatsAppSendOptions,
  tenantConfig?: WhatsAppCredentials,
): Promise<WhatsAppSendResult> {
  const { to, templateId, language = 'en', variables = [] } = options;

  const phoneNumberId =
    tenantConfig?.useCustom && tenantConfig.metaPhoneNumberId
      ? tenantConfig.metaPhoneNumberId
      : WHATSAPP_PHONE_NUMBER_ID;
  const accessToken =
    tenantConfig?.useCustom && tenantConfig.metaAccessToken
      ? tenantConfig.metaAccessToken
      : WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    logger.warn({ to, templateId }, 'WhatsApp not configured — message simulated');
    return { success: true, messageId: `sim_wa_${Date.now()}`, provider: 'meta-whatsapp' };
  }

  const url = `${WHATSAPP_BASE_URL}/${phoneNumberId}/messages`;

  const body: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to: to.replace(/[^0-9+]/g, ''),
    type: 'template',
    template: {
      name: templateId,
      language: { code: language },
      ...(variables.length > 0 && {
        components: [
          {
            type: 'body',
            parameters: variables.map((v) => ({ type: 'text', text: v })),
          },
        ],
      }),
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const errorData = data.error as Record<string, string> | undefined;
      const errorMsg = errorData?.message || `HTTP ${response.status}`;
      logger.error(
        { status: response.status, error: errorData, to },
        'WhatsApp send failed (Meta)',
      );
      return { success: false, provider: 'meta-whatsapp', error: errorMsg };
    }

    const messages = data.messages as Array<{ id: string }> | undefined;
    const messageId = messages?.[0]?.id;

    logger.info({ messageId, to, templateId }, 'WhatsApp message sent via Meta API');
    return { success: true, messageId, provider: 'meta-whatsapp' };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ err, to, templateId }, 'WhatsApp Meta send error');
    return { success: false, provider: 'meta-whatsapp', error: errorMsg };
  }
}

// ── Main Export ─────────────────────────────────────────────

export async function sendWhatsApp(
  options: WhatsAppSendOptions,
  tenantConfig?: WhatsAppCredentials,
): Promise<WhatsAppSendResult> {
  // Prefer Twilio when configured (sandbox or production)
  if (TWILIO_WHATSAPP_FROM && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    return sendViaTwilio(options);
  }

  // Fall back to Meta Business API
  return sendViaMeta(options, tenantConfig);
}
