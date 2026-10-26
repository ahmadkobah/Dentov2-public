/**
 * Impersonation Routes — Platform API (Dev Portal)
 * Based on DENTO_V2_MASTER_PLAN.md §9 — Tenant Impersonation
 *
 * Allows platform_admin to login as a tenant admin for support purposes.
 * Creates a temporary JWT (60 min), logs all actions, with Redis blocklist
 * for immediate revocation.
 *
 * Endpoints:
 *   - POST   /api/admin/tenants/:slug/impersonate        — Start impersonation session
 *   - DELETE /api/admin/support-sessions/:id              — End session manually
 *   - GET    /api/admin/support-sessions                  — List all sessions (with filters)
 *   - GET    /api/admin/support-sessions/:id              — Session detail with action log
 *   - PATCH  /api/admin/support-sessions/:id/status       — Revoke session immediately
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { SupportSession } from '../../models/support-session.model.js';
import { Tenant } from '../../models/tenant.model.js';
import { getRedis } from '../../../config/redis.js';
import { env } from '../../../config/env.js';
import { IMPERSONATION_MAX_MINUTES, SESSION_ID_PREFIX } from '@dento/shared';
import { logger } from '../../../utils/logger.js';
import {
  isTailscaleConfigured,
  createEphemeralAuthKey,
  revokeAuthKey,
} from '../../../config/tailscale.js';

// ── Route Helpers ───────────────────────────────────────────

function getUser(request: unknown): Record<string, string> {
  return ((request as unknown as Record<string, unknown>).user ?? {}) as Record<string, string>;
}

// ── Validation Schemas ──────────────────────────────────────

const startImpersonationSchema = z
  .object({
    reason: z.string().min(5).max(1000, 'Reason is required (max 1000 chars)'),
    linkedTicketId: z.string().nullable().optional(),
  })
  .strict();

// ── Helpers ─────────────────────────────────────────────────

function generateSessionId(): string {
  return `${SESSION_ID_PREFIX}${randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

function generateTempToken(
  tenantSlug: string,
  tenantId: string,
  performedBy: string,
  jti: string,
  email: string,
): string {
  return jwt.sign(
    {
      sub: performedBy,
      userId: performedBy,
      email,
      sessionId: `imp_${jti.slice(0, 16)}`,
      role: 'tenant_admin',
      tenantSlug,
      tenantId,
      impersonatedBy: performedBy,
      jti,
      type: 'impersonation',
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: `${IMPERSONATION_MAX_MINUTES}m` },
  );
}

async function blockTokenInRedis(jti: string, expiresInSeconds: number): Promise<void> {
  const redis = getRedis();
  await redis.set(`jwt_blocklist:${jti}`, 'revoked', 'EX', expiresInSeconds);
}

// ── Impersonation Routes ────────────────────────────────────

export async function impersonationRoutes(fastify: FastifyInstance) {
  // ─── START IMPERSONATION ──────────────────────────────────
  // POST /api/admin/tenants/:slug/impersonate
  fastify.post(
    '/tenants/:slug/impersonate',
    { preHandler: [authGuard, platformGuard('platform_support', 'create')] },
    async (request, reply) => {
      try {
        const { slug } = request.params as { slug: string };
        const body = startImpersonationSchema.parse(request.body);
        const user = getUser(request);

        // Verify tenant exists
        const tenant = await Tenant.findOne({ slug }).lean();
        if (!tenant) {
          return apiError(reply, 404, `Tenant "${slug}" not found`);
        }

        // Check for existing active session on this tenant by this user
        const existingSession = await SupportSession.findOne({
          'performedBy.userId': user.userId,
          tenantSlug: slug,
          status: 'active',
        });
        if (existingSession) {
          return apiError(
            reply,
            409,
            `Active session already exists for tenant "${slug}". End it first.`,
            { sessionId: existingSession.sessionId },
          );
        }

        const sessionId = generateSessionId();
        const jti = randomUUID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + IMPERSONATION_MAX_MINUTES * 60 * 1000);

        const tempToken = generateTempToken(
          slug,
          String(tenant._id),
          user.userId || 'system',
          jti,
          user.email || 'admin@dento.app',
        );

        // Generate Tailscale ephemeral auth key if configured
        let tailscaleKeyId: string | null = null;
        let tailscaleAuthKey: string | null = null;
        if (isTailscaleConfigured()) {
          try {
            const keyResult = await createEphemeralAuthKey(
              sessionId,
              IMPERSONATION_MAX_MINUTES * 60,
            );
            tailscaleKeyId = keyResult.authKeyId;
            tailscaleAuthKey = keyResult.authKey;
          } catch (tsErr) {
            logger.warn(
              { err: tsErr, sessionId },
              'Tailscale key creation failed — continuing without tunnel',
            );
          }
        }

        const session = await SupportSession.create({
          sessionId,
          performedBy: {
            userId: user.userId || 'system',
            email: user.email || 'admin@dento.app',
            name: user.firstName
              ? `${user.firstName} ${user.lastName || ''}`.trim()
              : 'Platform Admin',
          },
          tenantSlug: slug,
          tenantName:
            typeof tenant.name === 'object' ? tenant.name.en || slug : String(tenant.name || slug),
          status: 'active',
          startedAt: now,
          expiresAt,
          reason: body.reason,
          linkedTicketId: body.linkedTicketId || null,
          tempToken,
          tokenJti: jti,
          tailscaleKeyId,
        });

        return apiResponse(reply, 201, {
          session: {
            sessionId: session.sessionId,
            tenantSlug: session.tenantSlug,
            tenantName: session.tenantName,
            status: session.status,
            startedAt: session.startedAt,
            expiresAt: session.expiresAt,
            reason: session.reason,
          },
          tempToken,
          expiresAt,
          ...(tailscaleAuthKey && { tailscaleAuthKey }),
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return apiError(reply, 400, 'Invalid impersonation request', err.format());
        }
        logger.error({ err }, 'Impersonation start error');
        const detail =
          env.NODE_ENV === 'development' && err instanceof Error ? err.message : undefined;
        return apiError(reply, 500, detail || 'Failed to start impersonation');
      }
    },
  );

  // ─── END SESSION ──────────────────────────────────────────
  // DELETE /api/admin/support-sessions/:id
  fastify.delete(
    '/support-sessions/:id',
    { preHandler: [authGuard, platformGuard('platform_support', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const session = await SupportSession.findOne({ sessionId: id });
        if (!session) {
          return apiError(reply, 404, 'Session not found');
        }

        if (session.status !== 'active') {
          return apiError(reply, 400, `Session is already ${session.status}`);
        }

        session.status = 'ended';
        session.endedAt = new Date();
        await session.save();

        // Block JWT in Redis
        const ttlSeconds = Math.max(
          0,
          Math.ceil((session.expiresAt.getTime() - Date.now()) / 1000),
        );
        if (ttlSeconds > 0) {
          await blockTokenInRedis(session.tokenJti, ttlSeconds);
        }

        // Revoke Tailscale key if present (fire-and-forget)
        if (session.tailscaleKeyId) {
          revokeAuthKey(session.tailscaleKeyId, id).catch(() => {});
        }

        return apiResponse(reply, 200, {
          session: {
            sessionId: session.sessionId,
            status: session.status,
            endedAt: session.endedAt,
          },
        });
      } catch (err) {
        logger.error({ err }, 'Session end error');
        return apiError(reply, 500, 'Failed to end session');
      }
    },
  );

  // ─── LIST SESSIONS ────────────────────────────────────────
  // GET /api/admin/support-sessions
  fastify.get(
    '/support-sessions',
    { preHandler: [authGuard, platformGuard('platform_support', 'read')] },
    async (request, reply) => {
      try {
        const query = request.query as {
          status?: string;
          tenantSlug?: string;
          performedBy?: string;
          page?: string;
          limit?: string;
        };

        const filter: Record<string, unknown> = {};
        if (query.status && ['active', 'ended', 'expired', 'revoked'].includes(query.status)) {
          filter.status = query.status;
        }
        if (query.tenantSlug) filter.tenantSlug = query.tenantSlug;
        if (query.performedBy) filter['performedBy.userId'] = query.performedBy;

        const page = Math.max(1, parseInt(query.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(query.limit || '25', 10)));
        const skip = (page - 1) * limit;

        const [sessions, total] = await Promise.all([
          SupportSession.find(filter)
            .select('-tempToken -actionsPerformed') // Exclude sensitive data in list
            .sort({ startedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          SupportSession.countDocuments(filter),
        ]);

        // Auto-expire active sessions past their deadline
        const now = new Date();
        for (const sess of sessions) {
          if (sess.status === 'active' && new Date(sess.expiresAt) < now) {
            await SupportSession.findByIdAndUpdate(sess._id, {
              status: 'expired',
              endedAt: now,
            });
            sess.status = 'expired';
            sess.endedAt = now;
          }
        }

        return apiResponse(reply, 200, sessions, undefined, {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        });
      } catch (err) {
        logger.error({ err }, 'Session list error');
        return apiError(reply, 500, 'Failed to list sessions');
      }
    },
  );

  // ─── SESSION DETAIL ───────────────────────────────────────
  // GET /api/admin/support-sessions/:id
  fastify.get(
    '/support-sessions/:id',
    { preHandler: [authGuard, platformGuard('platform_support', 'read')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const session = await SupportSession.findOne({ sessionId: id })
          .select('-tempToken') // Never expose the JWT in detail view
          .lean();
        if (!session) {
          return apiError(reply, 404, 'Session not found');
        }

        // Auto-expire if past deadline
        if (session.status === 'active' && new Date(session.expiresAt) < new Date()) {
          await SupportSession.findByIdAndUpdate(session._id, {
            status: 'expired',
            endedAt: new Date(),
          });
          session.status = 'expired';
          session.endedAt = new Date();
        }

        return apiResponse(reply, 200, { session });
      } catch (err) {
        logger.error({ err }, 'Session detail error');
        return apiError(reply, 500, 'Failed to fetch session');
      }
    },
  );

  // ─── REVOKE SESSION ───────────────────────────────────────
  // PATCH /api/admin/support-sessions/:id/status
  fastify.patch(
    '/support-sessions/:id/status',
    { preHandler: [authGuard, platformGuard('platform_support', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const session = await SupportSession.findOne({ sessionId: id });
        if (!session) {
          return apiError(reply, 404, 'Session not found');
        }

        if (session.status !== 'active') {
          return apiError(reply, 400, `Session is already ${session.status}`);
        }

        session.status = 'revoked';
        session.endedAt = new Date();
        await session.save();

        // Block JWT immediately in Redis
        const ttlSeconds = Math.max(
          0,
          Math.ceil((session.expiresAt.getTime() - Date.now()) / 1000),
        );
        if (ttlSeconds > 0) {
          await blockTokenInRedis(session.tokenJti, ttlSeconds);
        }

        // Revoke Tailscale key if present (fire-and-forget)
        if (session.tailscaleKeyId) {
          revokeAuthKey(session.tailscaleKeyId, id).catch(() => {});
        }

        return apiResponse(reply, 200, {
          session: {
            sessionId: session.sessionId,
            status: session.status,
            endedAt: session.endedAt,
          },
        });
      } catch (err) {
        logger.error({ err }, 'Session revoke error');
        return apiError(reply, 500, 'Failed to revoke session');
      }
    },
  );
}
