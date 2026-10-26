import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { RATE_LIMITS } from '../config/constants.js';
import { getRedis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

/**
 * Rate Limit Plugin — Redis-backed, per-API-key aware
 *
 * Per MASTER_PLAN §23 + §31:
 *   - Global: 100 req/min (all authenticated requests)
 *   - Auth: 5 req/min (login/register — brute force protection)
 *   - Upload: 10 req/min (file uploads)
 *   - API Key: 1000 req/min per X-API-Key (public booking endpoints)
 *   - Webhook: 200 req/min (inbound webhooks from payment providers)
 *
 * Uses Redis for distributed state (multi-instance safe).
 * Falls back to in-memory if Redis is unavailable.
 */

const rateLimitPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Try to get Redis for distributed rate limiting
  let redisClient: ReturnType<typeof getRedis> | null = null;
  try {
    redisClient = getRedis();
  } catch {
    logger.warn('Redis not available for rate limiting, falling back to in-memory');
  }

  // ── Global rate limiter ──────────────────────────────────
  await fastify.register(rateLimit, {
    max: RATE_LIMITS.GLOBAL.max,
    timeWindow: RATE_LIMITS.GLOBAL.timeWindow,
    redis: redisClient ?? undefined,
    keyGenerator: (request) => {
      // Use API key if present, otherwise IP address
      const apiKey = request.headers['x-api-key'] as string | undefined;
      if (apiKey) return `ratelimit:apikey:${apiKey}`;
      return `ratelimit:ip:${request.ip}`;
    },
    errorResponseBuilder: (_request, context) => ({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Maximum ${context.max} requests per ${context.after}. Try again in ${context.ttl}ms.`,
        details: {
          max: context.max,
          remaining: 0,
          resetAfterMs: context.ttl,
        },
      },
    }),
  });

  // ── Decorate for route-specific limits ───────────────────

  // Auth routes: tighter limit (5/min)
  fastify.decorate('authRateLimit', {
    config: {
      rateLimit: {
        max: RATE_LIMITS.AUTH.max,
        timeWindow: RATE_LIMITS.AUTH.timeWindow,
        keyGenerator: (request: { ip: string }) => `ratelimit:auth:${request.ip}`,
      },
    },
  });

  // API Key routes: per-key limit (1000/min per §16.3)
  fastify.decorate('apiKeyRateLimit', {
    config: {
      rateLimit: {
        max: RATE_LIMITS.API_KEY.max,
        timeWindow: RATE_LIMITS.API_KEY.timeWindow,
        keyGenerator: (request: { headers: Record<string, string | undefined> }) => {
          const apiKey = request.headers['x-api-key'];
          return `ratelimit:public:${apiKey || 'anonymous'}`;
        },
      },
    },
  });

  // Webhook routes: higher limit (200/min)
  fastify.decorate('webhookRateLimit', {
    config: {
      rateLimit: {
        max: RATE_LIMITS.WEBHOOK.max,
        timeWindow: RATE_LIMITS.WEBHOOK.timeWindow,
        keyGenerator: (request: { ip: string }) => `ratelimit:webhook:${request.ip}`,
      },
    },
  });

  // Upload routes: stricter limit (10/min) — file uploads, document attachments
  fastify.decorate('uploadRateLimit', {
    config: {
      rateLimit: {
        max: RATE_LIMITS.UPLOAD.max,
        timeWindow: RATE_LIMITS.UPLOAD.timeWindow,
        keyGenerator: (request: { ip: string }) => `ratelimit:upload:${request.ip}`,
      },
    },
  });

  logger.info(
    {
      global: `${RATE_LIMITS.GLOBAL.max}/${RATE_LIMITS.GLOBAL.timeWindow}`,
      auth: `${RATE_LIMITS.AUTH.max}/${RATE_LIMITS.AUTH.timeWindow}`,
      upload: `${RATE_LIMITS.UPLOAD.max}/${RATE_LIMITS.UPLOAD.timeWindow}`,
      apiKey: `${RATE_LIMITS.API_KEY.max}/${RATE_LIMITS.API_KEY.timeWindow}`,
      webhook: `${RATE_LIMITS.WEBHOOK.max}/${RATE_LIMITS.WEBHOOK.timeWindow}`,
      backend: redisClient ? 'redis' : 'in-memory',
    },
    'Rate limiting configured',
  );
};

export default fp(rateLimitPlugin, { name: 'rate-limit' });
