import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { getRedis } from '../../../config/redis.js';
import { logger } from '../../../utils/logger.js';
import { RATE_LIMIT_DEFAULTS } from '@dento/shared';
import type { RateLimitTier } from '@dento/shared';

/**
 * Rate Limit Management Routes — §23 API Security
 *
 * Platform admin endpoints for managing rate limits:
 * - View current rate limit configuration
 * - Update limits per tier
 * - Check rate limit status for a specific key
 * - Clear rate limit for a specific key
 * - View rate limit statistics
 */

// ── Zod Schemas ─────────────────────────────────────────────

const updateRateLimitSchema = z
  .object({
    tier: z.enum(['global', 'auth', 'upload', 'api_key', 'public', 'webhook']),
    max: z.number().int().positive().max(10000),
    timeWindow: z.string().min(1),
  })
  .strict();

const resetRateLimitSchema = z
  .object({
    key: z.string().min(1), // API key or IP to reset
    tier: z.enum(['global', 'auth', 'upload', 'api_key', 'public', 'webhook']).optional(),
  })
  .strict();

// ── Interface ───────────────────────────────────────────────

// ── In-memory config store (persisted to Redis if available) ──

const currentConfig = { ...RATE_LIMIT_DEFAULTS };

// ── Routes ──────────────────────────────────────────────────

export async function rateLimitRoutes(fastify: FastifyInstance) {
  /**
   * GET / — Get current rate limit configuration
   */
  fastify.get(
    '/',
    { preHandler: [authGuard, platformGuard('platform_settings', 'read')] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return apiResponse(reply, 200, {
        tiers: Object.values(currentConfig),
      });
    },
  );

  /**
   * PATCH /:tier — Update rate limit for a tier
   */
  fastify.patch(
    '/:tier',
    { preHandler: [authGuard, platformGuard('platform_settings', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tier } = request.params as { tier: string };
      const body = updateRateLimitSchema.parse({
        ...(request.body as Record<string, unknown>),
        tier,
      });

      if (!currentConfig[body.tier as RateLimitTier]) {
        return apiError(reply, 400, `Unknown rate limit tier: ${body.tier}`);
      }

      currentConfig[body.tier as RateLimitTier] = {
        ...currentConfig[body.tier as RateLimitTier],
        max: body.max,
        timeWindow: body.timeWindow,
      };

      // Persist to Redis
      try {
        const redis = getRedis();
        await redis.set(
          `ratelimit:config:${body.tier}`,
          JSON.stringify(currentConfig[body.tier as RateLimitTier]),
        );
      } catch {
        logger.warn('Could not persist rate limit config to Redis');
      }

      logger.info(
        { tier: body.tier, max: body.max, timeWindow: body.timeWindow },
        'Rate limit updated',
      );
      return apiResponse(reply, 200, currentConfig[body.tier as RateLimitTier]);
    },
  );

  /**
   * POST /check — Check rate limit status for a specific key/IP
   */
  fastify.post(
    '/check',
    { preHandler: [authGuard, platformGuard('platform_settings', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = z
        .object({ key: z.string().min(1) })
        .strict()
        .parse(request.body);

      // Check Redis for rate limit counters
      try {
        const redis = getRedis();
        const tiers = ['global', 'auth', 'api_key', 'public', 'webhook'] as const;
        const results: Record<string, unknown>[] = [];

        for (const tier of tiers) {
          const redisKey = `ratelimit:${tier}:${body.key}`;
          const current = await redis.get(redisKey);
          const ttl = await redis.ttl(redisKey);
          const config = currentConfig[tier];

          results.push({
            tier,
            key: body.key,
            max: config.max,
            current: current ? parseInt(current, 10) : 0,
            remaining: current ? Math.max(0, config.max - parseInt(current, 10)) : config.max,
            resetInSeconds: ttl > 0 ? ttl : 0,
            isBlocked: current ? parseInt(current, 10) >= config.max : false,
          });
        }

        return apiResponse(reply, 200, { statuses: results });
      } catch {
        return apiError(reply, 400, 'Redis not available');
      }
    },
  );

  /**
   * DELETE / — Clear rate limit for a specific key
   */
  fastify.delete(
    '/',
    { preHandler: [authGuard, platformGuard('platform_settings', 'delete')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = resetRateLimitSchema.parse(request.body);

      try {
        const redis = getRedis();
        let deletedCount = 0;

        if (body.tier) {
          // Reset specific tier for key
          const redisKey = `ratelimit:${body.tier}:${body.key}`;
          deletedCount = await redis.del(redisKey);
        } else {
          // Reset all tiers for key
          const tiers = ['global', 'auth', 'api_key', 'public', 'webhook', 'ip'];
          for (const tier of tiers) {
            const redisKey = `ratelimit:${tier}:${body.key}`;
            deletedCount += await redis.del(redisKey);
          }
        }

        logger.info({ key: body.key, tier: body.tier || 'all', deletedCount }, 'Rate limit reset');

        return apiResponse(reply, 200, {
          key: body.key,
          tier: body.tier || 'all',
          reset: true,
          keysDeleted: deletedCount,
        });
      } catch {
        return apiError(reply, 400, 'Redis not available');
      }
    },
  );

  /**
   * GET /stats — Rate limit statistics overview
   */
  fastify.get(
    '/stats',
    { preHandler: [authGuard, platformGuard('platform_settings', 'read')] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const redis = getRedis();

        // Scan for rate limit keys to get overview
        const stats: Record<string, number> = {};
        const tiers = ['global', 'auth', 'api_key', 'public', 'webhook', 'ip'];

        for (const tier of tiers) {
          const pattern = `ratelimit:${tier}:*`;
          let cursor = '0';
          let count = 0;

          do {
            const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = newCursor;
            count += keys.length;
          } while (cursor !== '0');

          stats[tier] = count;
        }

        return apiResponse(reply, 200, {
          config: Object.values(currentConfig),
          activeKeys: stats,
          totalActiveKeys: Object.values(stats).reduce((sum, c) => sum + c, 0),
          backend: 'redis',
        });
      } catch {
        return apiResponse(reply, 200, {
          config: Object.values(currentConfig),
          activeKeys: {},
          totalActiveKeys: 0,
          backend: 'unavailable',
        });
      }
    },
  );
}
