/**
 * WhatsApp Bot Webhook Routes
 *
 * Handles incoming WhatsApp messages from both Twilio and Meta.
 * Routes are public (no auth) because they receive webhook calls from providers.
 *
 * Twilio:
 *   POST /api/whatsapp-bot/:tenantSlug/twilio  — Incoming message from Twilio
 *
 * Meta:
 *   GET  /api/whatsapp-bot/:tenantSlug/meta     — Webhook verification challenge
 *   POST /api/whatsapp-bot/:tenantSlug/meta     — Incoming message from Meta
 *
 * Per BUILD_RULES §5.3 — Thin handlers, delegate to service layer
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Tenant } from '../../../platform/models/index.js';
import { getTenantConnection } from '../../middleware/tenant-db.js';
import { WhatsAppBotService } from '../../services/whatsapp-bot.service.js';
import { sendWhatsApp } from '../../../services/providers/whatsapp.provider.js';
import { logger } from '../../../utils/logger.js';
import { env } from '../../../config/env.js';
import { RATE_LIMITS } from '../../../config/constants.js';
import crypto from 'node:crypto';

// ── Env ─────────────────────────────────────────────────────

const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
// No public fallback: the verify token must be explicitly configured.
const META_WHATSAPP_VERIFY_TOKEN = process.env.META_WHATSAPP_VERIFY_TOKEN;
const META_WHATSAPP_APP_SECRET = process.env.META_WHATSAPP_APP_SECRET;

// ── Helpers ─────────────────────────────────────────────────

async function resolveTenant(slug: string) {
  const tenant = await Tenant.findOne({ slug, status: 'active' }).lean();
  if (!tenant) return null;
  return getTenantConnection(slug);
}

/**
 * Validate Twilio webhook signature.
 * See https://www.twilio.com/docs/usage/security#validating-requests
 */
function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  // No auth token configured: allow only outside production (sandbox/dev).
  if (!TWILIO_AUTH_TOKEN) return env.NODE_ENV !== 'production';

  // Sort params and append key=value
  const data =
    url +
    Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], '');

  const expectedSig = crypto.createHmac('sha1', TWILIO_AUTH_TOKEN).update(data).digest('base64');

  const received = Buffer.from(signature || '');
  const expected = Buffer.from(expectedSig);
  // crypto.timingSafeEqual throws on length mismatch — guard before comparing.
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(received, expected);
}

/**
 * Validate Meta (WhatsApp Cloud API) webhook signature.
 * Meta signs the raw request body with the App Secret using HMAC-SHA256 and
 * sends it in the `X-Hub-Signature-256` header as `sha256=<hex>`.
 * See https://developers.facebook.com/docs/graph-api/webhooks/getting-started#validate-payloads
 */
function verifyMetaSignature(rawBody: string, signatureHeader: string | undefined): boolean {
  // No app secret configured: allow only outside production (dev).
  if (!META_WHATSAPP_APP_SECRET) return env.NODE_ENV !== 'production';
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;

  const expected =
    'sha256=' +
    crypto.createHmac('sha256', META_WHATSAPP_APP_SECRET).update(rawBody, 'utf8').digest('hex');

  const received = Buffer.from(signatureHeader);
  const expectedBuf = Buffer.from(expected);
  if (received.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(received, expectedBuf);
}

// ── Route Registration ──────────────────────────────────────

export async function whatsappBotRoutes(fastify: FastifyInstance) {
  // Capture the raw JSON body so the Meta webhook can verify the
  // X-Hub-Signature-256 HMAC over the exact bytes Meta signed. This parser is
  // scoped to this (encapsulated) plugin only; the Twilio route uses
  // form-encoded bodies and is unaffected.
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    (req as FastifyRequest & { rawBody?: string }).rawBody =
      typeof body === 'string' ? body : body.toString();
    try {
      done(null, body ? JSON.parse(body as string) : {});
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  // Inbound provider webhooks: cap abuse at the platform webhook tier.
  const webhookRateLimit = {
    config: {
      rateLimit: {
        max: RATE_LIMITS.WEBHOOK.max,
        timeWindow: RATE_LIMITS.WEBHOOK.timeWindow,
        keyGenerator: (req: FastifyRequest) => `ratelimit:whatsapp:${req.ip}`,
      },
    },
  };

  // ═══════════════════════════════════════════════════════════
  // TWILIO WEBHOOK
  // ═══════════════════════════════════════════════════════════

  /**
   * POST /:tenantSlug/twilio — Twilio sends form-encoded body with:
   *   From: whatsapp:+1234567890
   *   Body: message text
   *   To: whatsapp:+14155238886
   *   MessageSid, AccountSid, etc.
   */
  fastify.post(
    '/:tenantSlug/twilio',
    webhookRateLimit,
    async (request: FastifyRequest<{ Params: { tenantSlug: string } }>, reply: FastifyReply) => {
      const { tenantSlug } = request.params;

      try {
        // Validate Twilio signature in production
        const twilioSignature = request.headers['x-twilio-signature'] as string;
        if (TWILIO_AUTH_TOKEN && twilioSignature) {
          const fullUrl = `${request.protocol}://${request.hostname}${request.url}`;
          const body = request.body as Record<string, string>;
          if (!validateTwilioSignature(fullUrl, body, twilioSignature)) {
            logger.warn({ tenantSlug }, 'Invalid Twilio signature on WhatsApp webhook');
            return reply.code(403).send('Invalid signature');
          }
        }

        // Resolve tenant
        const tenantDb = await resolveTenant(tenantSlug);
        if (!tenantDb) {
          return reply.code(404).send('Tenant not found');
        }

        const body = request.body as Record<string, string>;
        const from = (body.From || '').replace('whatsapp:', '').trim();
        const messageText = (body.Body || '').trim();

        if (!from || !messageText) {
          return reply.code(200).send('<Response></Response>');
        }

        logger.info({ tenantSlug, from, messageText }, 'WhatsApp bot: incoming Twilio message');

        // Process message
        const bot = new WhatsAppBotService(tenantDb);
        const replyText = await bot.handleMessage(from, messageText);

        // Send reply via Twilio (using existing provider)
        await sendWhatsApp({
          to: from,
          templateId: '',
          body: replyText,
        });

        // Return TwiML empty response (we send reply via API, not TwiML)
        reply.header('Content-Type', 'text/xml');
        return reply.code(200).send('<Response></Response>');
      } catch (err) {
        logger.error({ err, tenantSlug }, 'WhatsApp bot Twilio webhook error');
        reply.header('Content-Type', 'text/xml');
        return reply.code(200).send('<Response></Response>');
      }
    },
  );

  // ═══════════════════════════════════════════════════════════
  // META WEBHOOK — Verification
  // ═══════════════════════════════════════════════════════════

  /**
   * GET /:tenantSlug/meta — Meta webhook verification (hub.challenge)
   */
  fastify.get(
    '/:tenantSlug/meta',
    webhookRateLimit,
    async (
      request: FastifyRequest<{
        Params: { tenantSlug: string };
        Querystring: {
          'hub.mode'?: string;
          'hub.verify_token'?: string;
          'hub.challenge'?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const query = request.query;
      const mode = query['hub.mode'];
      const token = query['hub.verify_token'];
      const challenge = query['hub.challenge'];

      // The verify token must be explicitly configured; never accept a default.
      if (!META_WHATSAPP_VERIFY_TOKEN) {
        logger.error('META_WHATSAPP_VERIFY_TOKEN is not configured');
        return reply.code(503).send('Webhook not configured');
      }

      if (mode === 'subscribe' && token === META_WHATSAPP_VERIFY_TOKEN) {
        logger.info({ tenantSlug: request.params.tenantSlug }, 'Meta WhatsApp webhook verified');
        return reply.code(200).send(challenge);
      }

      return reply.code(403).send('Verification failed');
    },
  );

  // ═══════════════════════════════════════════════════════════
  // META WEBHOOK — Incoming Messages
  // ═══════════════════════════════════════════════════════════

  /**
   * POST /:tenantSlug/meta — Meta Cloud API sends JSON with nested structure:
   *   entry[].changes[].value.messages[].from, .text.body
   */
  fastify.post(
    '/:tenantSlug/meta',
    webhookRateLimit,
    async (request: FastifyRequest<{ Params: { tenantSlug: string } }>, reply: FastifyReply) => {
      const { tenantSlug } = request.params;

      try {
        // Verify the Meta signature over the raw body before any processing.
        const signature = request.headers['x-hub-signature-256'] as string | undefined;
        const rawBody = (request as FastifyRequest & { rawBody?: string }).rawBody ?? '';
        if (!verifyMetaSignature(rawBody, signature)) {
          logger.warn({ tenantSlug }, 'Invalid Meta signature on WhatsApp webhook');
          return reply.code(403).send('Invalid signature');
        }

        // Resolve tenant
        const tenantDb = await resolveTenant(tenantSlug);
        if (!tenantDb) {
          // Meta requires 200 even on errors to avoid retries
          return reply.code(200).send('OK');
        }

        const payload = request.body as MetaWebhookPayload;

        // Extract messages from Meta webhook structure
        const messages = extractMetaMessages(payload);
        if (messages.length === 0) {
          return reply.code(200).send('OK');
        }

        const bot = new WhatsAppBotService(tenantDb);

        // Process each message (usually just one)
        for (const msg of messages) {
          logger.info(
            { tenantSlug, from: msg.from, text: msg.text },
            'WhatsApp bot: incoming Meta message',
          );

          const replyText = await bot.handleMessage(msg.from, msg.text);

          // Reply via WhatsApp provider (will use Meta API since no Twilio for Meta webhooks)
          await sendWhatsApp({
            to: msg.from,
            templateId: '',
            body: replyText,
          });
        }

        return reply.code(200).send('OK');
      } catch (err) {
        logger.error({ err, tenantSlug }, 'WhatsApp bot Meta webhook error');
        return reply.code(200).send('OK');
      }
    },
  );
}

// ── Meta Webhook Types ──────────────────────────────────────

interface MetaWebhookPayload {
  object: string;
  entry?: Array<{
    id: string;
    changes?: Array<{
      value: {
        messaging_product?: string;
        metadata?: { display_phone_number: string; phone_number_id: string };
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body: string };
        }>;
        statuses?: Array<unknown>;
      };
      field: string;
    }>;
  }>;
}

function extractMetaMessages(payload: MetaWebhookPayload): Array<{ from: string; text: string }> {
  const results: Array<{ from: string; text: string }> = [];

  if (payload.object !== 'whatsapp_business_account') return results;

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;
      for (const msg of change.value.messages || []) {
        if (msg.type === 'text' && msg.text?.body) {
          results.push({ from: msg.from, text: msg.text.body });
        }
      }
    }
  }

  return results;
}
