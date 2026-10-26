/**
 * Email Provider — Resend + Nodemailer Fallback
 *
 * Per DENTO_V2_MASTER_PLAN.md §20 — Email Channel
 * Per TECH_REQUIREMENTS.md — Resend as primary email provider
 *
 * Strategy:
 * - Primary: Resend (production) — managed deliverability, analytics
 * - Fallback: Nodemailer (dev/test) — SMTP for local development
 */

import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import type { EmailCredentials } from '../provider-credentials.service.js';

// ── Types ───────────────────────────────────────────────────

export interface EmailSendOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  provider: 'resend' | 'nodemailer';
  error?: string;
}

// ── Provider Instances (platform defaults) ──────────────────

let resendClient: Resend | null = null;
let nodemailerTransport: Transporter | null = null;

function getResendClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

function getNodemailerTransport(): Transporter {
  if (!nodemailerTransport) {
    nodemailerTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: Number(process.env.SMTP_PORT || 1025),
      secure: false,
      // Dev: no auth (MailHog/Mailpit), Prod: use env credentials
      ...(process.env.SMTP_USER && {
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }),
    });
  }
  return nodemailerTransport;
}

// ── Tenant-Specific Client Factories ────────────────────────

function createTenantResendClient(apiKey: string): Resend {
  return new Resend(apiKey);
}

function createTenantSmtpTransport(creds: EmailCredentials): Transporter {
  return nodemailer.createTransport({
    host: creds.smtpHost || 'localhost',
    port: creds.smtpPort || 587,
    secure: creds.smtpSecure ?? false,
    ...(creds.smtpUser && {
      auth: {
        user: creds.smtpUser,
        pass: creds.smtpPass,
      },
    }),
  });
}

// ── Email Send Function ─────────────────────────────────────

const DEFAULT_FROM = 'Dento <noreply@dento.app>';

export async function sendEmail(
  options: EmailSendOptions,
  tenantConfig?: EmailCredentials,
): Promise<EmailSendResult> {
  const { to, subject, html, text, replyTo, tags } = options;
  const recipients = Array.isArray(to) ? to : [to];

  // Determine from address
  const from =
    options.from ??
    (tenantConfig?.fromName && tenantConfig?.fromEmail
      ? `${tenantConfig.fromName} <${tenantConfig.fromEmail}>`
      : tenantConfig?.fromEmail
        ? tenantConfig.fromEmail
        : DEFAULT_FROM);

  // If tenant has custom config, use their credentials
  if (tenantConfig?.useCustom) {
    if (tenantConfig.provider === 'resend' && tenantConfig.resendApiKey) {
      try {
        const client = createTenantResendClient(tenantConfig.resendApiKey);
        const result = await client.emails.send({
          from,
          to: recipients,
          subject,
          html,
          ...(text && { text }),
          ...(replyTo && { replyTo }),
          ...(tags && { tags }),
        });
        if (result.error) {
          logger.warn({ error: result.error, to: recipients }, 'Tenant Resend send failed');
          return { success: false, provider: 'resend', error: String(result.error.message) };
        }
        logger.info({ messageId: result.data?.id, to: recipients }, 'Email sent via tenant Resend');
        return { success: true, messageId: result.data?.id, provider: 'resend' };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        logger.error({ err, to: recipients }, 'Tenant Resend error');
        return { success: false, provider: 'resend', error: errorMsg };
      }
    }

    if (tenantConfig.provider === 'smtp' || tenantConfig.smtpHost) {
      try {
        const transport = createTenantSmtpTransport(tenantConfig);
        const info = await transport.sendMail({
          from,
          to: recipients.join(', '),
          subject,
          html,
          ...(text && { text }),
          ...(replyTo && { replyTo }),
        });
        logger.info({ messageId: info.messageId, to: recipients }, 'Email sent via tenant SMTP');
        return { success: true, messageId: info.messageId, provider: 'nodemailer' };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        logger.error({ err, to: recipients }, 'Tenant SMTP error');
        return { success: false, provider: 'nodemailer', error: errorMsg };
      }
    }
  }

  // Platform default: try Resend first, then Nodemailer fallback
  const resend = getResendClient();
  if (resend) {
    try {
      const result = await resend.emails.send({
        from,
        to: recipients,
        subject,
        html,
        ...(text && { text }),
        ...(replyTo && { replyTo }),
        ...(tags && { tags }),
      });

      if (result.error) {
        logger.warn(
          { error: result.error, to: recipients },
          'Resend send failed, falling back to Nodemailer',
        );
      } else {
        logger.info({ messageId: result.data?.id, to: recipients }, 'Email sent via Resend');
        return { success: true, messageId: result.data?.id, provider: 'resend' };
      }
    } catch (err) {
      logger.warn({ err, to: recipients }, 'Resend error, falling back to Nodemailer');
    }
  }

  // Fallback: Nodemailer
  try {
    const transport = getNodemailerTransport();
    const info = await transport.sendMail({
      from,
      to: recipients.join(', '),
      subject,
      html,
      ...(text && { text }),
      ...(replyTo && { replyTo }),
    });

    logger.info({ messageId: info.messageId, to: recipients }, 'Email sent via Nodemailer');
    return { success: true, messageId: info.messageId, provider: 'nodemailer' };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ err, to: recipients }, 'Email send failed (all providers)');
    return { success: false, provider: 'nodemailer', error: errorMsg };
  }
}
