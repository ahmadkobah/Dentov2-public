/**
 * Provider Settings Routes — Per-Tenant Provider Credentials CRUD
 *
 * GET  /                   — Get all provider configs (masked)
 * GET  /:channel           — Get single channel config (masked)
 * PATCH /:channel          — Update channel credentials (encrypts secrets)
 * POST /:channel/test      — Test channel connectivity
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Connection } from 'mongoose';
import { z } from 'zod';
import { apiResponse, apiError, ApiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, requireAdmin } from '../../middleware/index.js';
import { ProviderCredentialsService } from '../../../services/provider-credentials.service.js';
import { sendEmail } from '../../../services/providers/email.provider.js';

// ── Validation ──────────────────────────────────────────────

const channelParamSchema = z.object({
  channel: z.enum(['email', 'sms', 'whatsapp', 'push']),
});

const emailConfigSchema = z.object({
  useCustom: z.boolean(),
  provider: z.enum(['resend', 'smtp']).optional(),
  resendApiKey: z.string().max(500).optional(),
  smtpHost: z.string().max(255).optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().max(255).optional(),
  smtpPass: z.string().max(500).optional(),
  smtpSecure: z.boolean().optional(),
  fromEmail: z.string().email().max(255).optional(),
  fromName: z.string().max(255).optional(),
});

const smsConfigSchema = z.object({
  useCustom: z.boolean(),
  provider: z.enum(['twilio']).optional(),
  twilioAccountSid: z.string().max(255).optional(),
  twilioAuthToken: z.string().max(255).optional(),
  twilioPhoneNumber: z.string().max(30).optional(),
});

const whatsappConfigSchema = z.object({
  useCustom: z.boolean(),
  provider: z.enum(['meta']).optional(),
  metaPhoneNumberId: z.string().max(255).optional(),
  metaAccessToken: z.string().max(1000).optional(),
});

const pushConfigSchema = z.object({
  useCustom: z.boolean(),
  provider: z.enum(['vapid']).optional(),
  vapidSubject: z.string().max(255).optional(),
  vapidPublicKey: z.string().max(500).optional(),
  vapidPrivateKey: z.string().max(500).optional(),
});

const configSchemas = {
  email: emailConfigSchema,
  sms: smsConfigSchema,
  whatsapp: whatsappConfigSchema,
  push: pushConfigSchema,
} as const;

// ── Helpers ─────────────────────────────────────────────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

// ── Route Registration ──────────────────────────────────────

export async function providerSettingsRoutes(fastify: FastifyInstance) {
  const adminOnly = [authGuard, tenantDbMiddleware, requireAdmin];

  // ─── GET / — Get all provider configs (masked) ───────────
  fastify.get(
    '/',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantDb = getTenantDb(request);
        const service = new ProviderCredentialsService(tenantDb);
        const config = await service.getMaskedConfig();
        return apiResponse(reply, 200, { providers: config });
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to fetch provider config');
      }
    },
  );

  // ─── GET /:channel — Get single channel config (masked) ──
  fastify.get(
    '/:channel',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = channelParamSchema.safeParse(request.params);
        if (!params.success) {
          return apiError(reply, 400, 'Invalid channel. Valid: email, sms, whatsapp, push');
        }

        const tenantDb = getTenantDb(request);
        const service = new ProviderCredentialsService(tenantDb);
        const config = await service.getMaskedConfig();
        return apiResponse(reply, 200, {
          channel: params.data.channel,
          config: config[params.data.channel],
        });
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to fetch channel config');
      }
    },
  );

  // ─── PATCH /:channel — Update channel credentials ────────
  fastify.patch(
    '/:channel',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = channelParamSchema.safeParse(request.params);
        if (!params.success) {
          return apiError(reply, 400, 'Invalid channel. Valid: email, sms, whatsapp, push');
        }

        const channel = params.data.channel;
        const schema = configSchemas[channel];
        const parsed = schema.safeParse(request.body);
        if (!parsed.success) {
          return apiError(reply, 400, 'Validation failed', parsed.error.issues);
        }

        const userId = getUserId(request);
        const tenantDb = getTenantDb(request);
        const service = new ProviderCredentialsService(tenantDb);
        await service.saveChannelConfig(channel, parsed.data as Record<string, unknown>, userId);

        // Return masked config after save
        const updated = await service.getMaskedConfig();
        return apiResponse(
          reply,
          200,
          { channel, config: updated[channel] },
          'Provider config updated',
        );
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to update provider config');
      }
    },
  );

  // ─── POST /:channel/test — Test channel connectivity ─────
  fastify.post(
    '/:channel/test',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = channelParamSchema.safeParse(request.params);
        if (!params.success) {
          return apiError(reply, 400, 'Invalid channel. Valid: email, sms, whatsapp, push');
        }

        const channel = params.data.channel;
        const tenantDb = getTenantDb(request);
        const service = new ProviderCredentialsService(tenantDb);
        const config = await service.getDecryptedConfig();

        let testResult: { success: boolean; error?: string };

        switch (channel) {
          case 'email': {
            const emailCfg = config.email;
            if (!emailCfg.useCustom) {
              return apiResponse(reply, 200, {
                success: true,
                message: 'Using platform default — no test needed',
              });
            }
            const result = await sendEmail(
              {
                to: 'test@example.com',
                subject: 'Dento Provider Test',
                html: '<p>This is a test email from Dento.</p>',
              },
              emailCfg,
            );
            testResult = { success: result.success, error: result.error };
            break;
          }
          case 'sms': {
            const smsCfg = config.sms;
            if (!smsCfg.useCustom) {
              return apiResponse(reply, 200, {
                success: true,
                message: 'Using platform default — no test needed',
              });
            }
            // Cannot send a real test SMS without a real number — return config validity check
            testResult = {
              success: !!(
                smsCfg.twilioAccountSid &&
                smsCfg.twilioAuthToken &&
                smsCfg.twilioPhoneNumber
              ),
              error: smsCfg.twilioAccountSid ? undefined : 'Missing Twilio credentials',
            };
            break;
          }
          case 'whatsapp': {
            const waCfg = config.whatsapp;
            if (!waCfg.useCustom) {
              return apiResponse(reply, 200, {
                success: true,
                message: 'Using platform default — no test needed',
              });
            }
            testResult = {
              success: !!(waCfg.metaPhoneNumberId && waCfg.metaAccessToken),
              error: waCfg.metaPhoneNumberId ? undefined : 'Missing WhatsApp credentials',
            };
            break;
          }
          case 'push': {
            const pushCfg = config.push;
            if (!pushCfg.useCustom) {
              return apiResponse(reply, 200, {
                success: true,
                message: 'Using platform default — no test needed',
              });
            }
            testResult = {
              success: !!(pushCfg.vapidPublicKey && pushCfg.vapidPrivateKey),
              error: pushCfg.vapidPublicKey ? undefined : 'Missing VAPID keys',
            };
            break;
          }
          default:
            return apiError(reply, 400, 'Unknown channel');
        }

        return apiResponse(
          reply,
          200,
          testResult,
          testResult.success ? 'Test passed' : 'Test failed',
        );
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to test provider');
      }
    },
  );
}
