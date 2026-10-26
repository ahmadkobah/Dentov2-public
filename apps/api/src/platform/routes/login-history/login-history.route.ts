import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { LoginAttempt } from '../../models/login-attempt.model.js';
import { apiResponse } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { getRedis } from '../../../config/redis.js';
import { unblockIdentifier } from '../../../tenant/middleware/brute-force.js';
import { logger } from '../../../utils/logger.js';

/**
 * Login History & IP Management Routes — Platform Admin
 *
 * Per GAP_IMPLEMENTATION_PLAN §3.3 (P1 #8)
 *
 * Endpoints:
 *   GET    /api/platform/login-history              — List login attempts (paginated)
 *   GET    /api/platform/login-history/blocked-ips   — List currently blocked IPs from Redis
 *   DELETE /api/platform/login-history/ip-block/:ip  — Unblock a specific IP
 *   DELETE /api/platform/login-history/cooldown/:email — Clear login cooldown for an email
 */

// ── Schemas ─────────────────────────────────────────────────

const loginHistoryQuerySchema = z
  .object({
    email: z.string().optional(),
    ipAddress: z.string().optional(),
    success: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    tenantSlug: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

// ── Route Registration ──────────────────────────────────────

export async function loginHistoryRoutes(fastify: FastifyInstance) {
  // ── GET /api/platform/login-history ─────────────────────────
  // Paginated list of login attempts from the LoginAttempt collection.
  fastify.get(
    '/',
    {
      preHandler: [authGuard, platformGuard('platform_support', 'read')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const filter = loginHistoryQuerySchema.parse(request.query);
      const query: Record<string, unknown> = {};

      if (filter.email) query.email = filter.email.toLowerCase();
      if (filter.ipAddress) query.ipAddress = filter.ipAddress;
      if (filter.success !== undefined) query.success = filter.success;
      if (filter.tenantSlug) query.tenantSlug = filter.tenantSlug;

      const page = filter.page;
      const limit = filter.limit;
      const skip = (page - 1) * limit;
      const sortDirection = filter.sortOrder === 'asc' ? 1 : -1;

      const [data, total] = await Promise.all([
        LoginAttempt.find(query).sort({ createdAt: sortDirection }).skip(skip).limit(limit).lean(),
        LoginAttempt.countDocuments(query),
      ]);

      return apiResponse(reply, 200, data, undefined, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    },
  );

  // ── GET /api/platform/login-history/blocked-ips ─────────────
  // Scan Redis for currently blocked IPs (auth:blocked:* keys).
  fastify.get(
    '/blocked-ips',
    {
      preHandler: [authGuard, platformGuard('platform_support', 'read')],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const redis = getRedis();
      const blockedKeys: string[] = [];

      // Use SCAN to safely iterate (no KEYS in production)
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          'auth:blocked:*',
          'COUNT',
          100,
        );
        cursor = nextCursor;
        blockedKeys.push(...keys);
      } while (cursor !== '0');

      // Fetch expiry info for each blocked key
      const blockedIps = await Promise.all(
        blockedKeys.map(async (key) => {
          const value = await redis.get(key);
          const ttl = await redis.ttl(key);
          const identifier = key.replace('auth:blocked:', '');

          return {
            identifier,
            blockedUntil: value ? new Date(parseInt(value)).toISOString() : null,
            ttlSeconds: ttl > 0 ? ttl : null,
          };
        }),
      );

      return apiResponse(reply, 200, {
        blockedIps,
        total: blockedIps.length,
      });
    },
  );

  // ── DELETE /api/platform/login-history/ip-block/:ip ─────────
  // Manually unblock an IP from brute-force protection.
  fastify.delete(
    '/ip-block/:ip',
    {
      preHandler: [authGuard, platformGuard('platform_support', 'delete')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { ip } = z.object({ ip: z.string().min(1) }).parse(request.params);

      const cleared = await unblockIdentifier(ip);

      if (!cleared) {
        return apiResponse(reply, 200, { cleared: false }, 'IP was not blocked');
      }

      logger.info({ ip, action: 'ip_unblock' }, 'Platform admin unblocked IP');
      return apiResponse(reply, 200, { cleared: true }, `IP ${ip} unblocked`);
    },
  );

  // ── DELETE /api/platform/login-history/cooldown/:email ──────
  // Clear login cooldown for a specific email address.
  fastify.delete(
    '/cooldown/:email',
    {
      preHandler: [authGuard, platformGuard('platform_support', 'delete')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email } = z.object({ email: z.string().min(1) }).parse(request.params);
      const redis = getRedis();

      // Scan for all attempt keys matching this email
      const keysToDelete: string[] = [];
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          `auth:attempts:*:${email.toLowerCase()}`,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        keysToDelete.push(...keys);
      } while (cursor !== '0');

      // Also scan for blocked keys with this email
      cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          `auth:blocked:*:${email.toLowerCase()}`,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        keysToDelete.push(...keys);
      } while (cursor !== '0');

      let deletedCount = 0;
      if (keysToDelete.length > 0) {
        deletedCount = await redis.del(...keysToDelete);
      }

      logger.info(
        { email, deletedCount, action: 'cooldown_clear' },
        'Platform admin cleared login cooldown',
      );

      return apiResponse(
        reply,
        200,
        { email, keysCleared: deletedCount },
        `Login cooldown cleared for ${email}`,
      );
    },
  );
}
