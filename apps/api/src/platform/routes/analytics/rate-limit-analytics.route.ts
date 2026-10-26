import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { getRedis } from '../../../config/redis.js';
import { logger } from '../../../utils/logger.js';
import { RATE_LIMIT_DEFAULTS } from '@dento/shared';

/**
 * Rate Limit Analytics Routes — §23 API Security Dashboard
 *
 * Aggregated analytics for rate-limit usage across tiers:
 * - Per-tier active key counts + top violators
 * - Blocked keys (exceeded their limit)
 * - Historical violation log (Redis-backed rolling window)
 */

const TIERS = ['global', 'auth', 'api_key', 'public', 'webhook', 'upload', 'ip'] as const;

const querySchema = z
  .object({
    tier: z.enum(['all', ...TIERS]).default('all'),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export async function rateLimitAnalyticsRoutes(fastify: FastifyInstance) {
  /**
   * GET / — Aggregated rate-limit analytics dashboard
   *
   * Returns per-tier breakdown with active key counts,
   * top consumers (highest request counts), and blocked keys.
   */
  fastify.get(
    '/',
    { preHandler: [authGuard, platformGuard('platform_settings', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const redis = getRedis();
        const { tier: tierFilter, limit } = querySchema.parse(request.query);

        const tiersToScan = tierFilter === 'all' ? [...TIERS] : [tierFilter];
        const tierStats: Array<{
          tier: string;
          activeKeys: number;
          blockedKeys: number;
          topConsumers: Array<{ key: string; count: number; max: number; blocked: boolean }>;
          config: { max: number; timeWindow: string };
        }> = [];

        for (const tier of tiersToScan) {
          const pattern = `ratelimit:${tier}:*`;
          const config = RATE_LIMIT_DEFAULTS[tier as keyof typeof RATE_LIMIT_DEFAULTS] ?? {
            max: 100,
            timeWindow: '1 minute',
          };

          // Scan all keys for this tier
          let cursor = '0';
          const keyValues: Array<{ key: string; count: number }> = [];

          do {
            const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
            cursor = newCursor;

            if (keys.length > 0) {
              const pipeline = redis.pipeline();
              for (const k of keys) pipeline.get(k);
              const values = await pipeline.exec();

              for (let i = 0; i < keys.length; i++) {
                const val = values?.[i]?.[1];
                const count = val ? parseInt(String(val), 10) : 0;
                // Strip prefix to get the identifier
                const identifier = keys[i].replace(`ratelimit:${tier}:`, '');
                keyValues.push({ key: identifier, count });
              }
            }
          } while (cursor !== '0');

          // Sort by count descending → top consumers
          keyValues.sort((a, b) => b.count - a.count);
          const topConsumers = keyValues.slice(0, limit).map((kv) => ({
            key: kv.key,
            count: kv.count,
            max: config.max,
            blocked: kv.count >= config.max,
          }));

          const blockedCount = keyValues.filter((kv) => kv.count >= config.max).length;

          tierStats.push({
            tier,
            activeKeys: keyValues.length,
            blockedKeys: blockedCount,
            topConsumers,
            config: { max: config.max, timeWindow: config.timeWindow },
          });
        }

        const totalActive = tierStats.reduce((s, t) => s + t.activeKeys, 0);
        const totalBlocked = tierStats.reduce((s, t) => s + t.blockedKeys, 0);

        return apiResponse(reply, 200, {
          summary: {
            totalActiveKeys: totalActive,
            totalBlockedKeys: totalBlocked,
            tiersScanned: tiersToScan.length,
          },
          tiers: tierStats,
        });
      } catch (err) {
        logger.error(err, 'Rate limit analytics fetch failed');
        return apiError(reply, 500, 'Failed to fetch rate limit analytics');
      }
    },
  );

  /**
   * GET /violations — Recent rate-limit violations (blocked requests)
   *
   * Scans all tiers for keys that are at or above their limit.
   */
  fastify.get(
    '/violations',
    { preHandler: [authGuard, platformGuard('platform_settings', 'read')] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const redis = getRedis();
        const violations: Array<{
          tier: string;
          key: string;
          count: number;
          max: number;
          ttl: number;
        }> = [];

        for (const tier of TIERS) {
          const pattern = `ratelimit:${tier}:*`;
          const config = RATE_LIMIT_DEFAULTS[tier as keyof typeof RATE_LIMIT_DEFAULTS] ?? {
            max: 100,
            timeWindow: '1 minute',
          };

          let cursor = '0';
          do {
            const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
            cursor = newCursor;

            if (keys.length > 0) {
              const pipeline = redis.pipeline();
              for (const k of keys) {
                pipeline.get(k);
                pipeline.ttl(k);
              }
              const results = await pipeline.exec();

              for (let i = 0; i < keys.length; i++) {
                const count = results?.[i * 2]?.[1] ? parseInt(String(results[i * 2][1]), 10) : 0;
                const ttl = results?.[i * 2 + 1]?.[1]
                  ? parseInt(String(results[i * 2 + 1][1]), 10)
                  : 0;

                if (count >= config.max) {
                  violations.push({
                    tier,
                    key: keys[i].replace(`ratelimit:${tier}:`, ''),
                    count,
                    max: config.max,
                    ttl: Math.max(0, ttl),
                  });
                }
              }
            }
          } while (cursor !== '0');
        }

        // Sort by most over-limit first
        violations.sort((a, b) => b.count / b.max - a.count / a.max);

        return apiResponse(reply, 200, {
          total: violations.length,
          violations: violations.slice(0, 100),
        });
      } catch (err) {
        logger.error(err, 'Rate limit violations fetch failed');
        return apiError(reply, 500, 'Failed to fetch rate limit violations');
      }
    },
  );
}
