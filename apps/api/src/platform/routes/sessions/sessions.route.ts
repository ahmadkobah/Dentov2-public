import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { type Types } from 'mongoose';
import { z } from 'zod';
import { UserSession, type IUserSession } from '../../models/user-session.model.js';
import { User } from '../../models/user.model.js';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { logger } from '../../../utils/logger.js';

/**
 * Lean session document as returned by the list/detail queries.
 * `userId` is populated with a partial user projection, so it is widened
 * here from the schema's ObjectId to the populated record shape.
 */
type LeanSession = Pick<
  IUserSession,
  'sessionId' | 'userAgent' | 'ipAddress' | 'deviceType' | 'browser' | 'os' | 'isActive'
> & {
  _id: unknown;
  userId: Record<string, unknown> | unknown;
  expiresAt: Date | string | null;
  lastActivityAt: Date | string | null;
  createdAt: Date | string | null;
};

type RegexContains = { $regex: string; $options: string };

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function regexContains(search: string): RegexContains {
  return { $regex: escapeRegex(search), $options: 'i' };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function localizedString(value: unknown): string | undefined {
  const direct = asString(value);
  if (direct) return direct;

  const record = asRecord(value);
  return asString(record?.en) ?? asString(record?.ar);
}

async function resolveUserIdsBySearch(search: string): Promise<Types.ObjectId[]> {
  const literal = regexContains(search);
  const users = (await User.find({
    $or: [
      { email: literal },
      { 'profile.displayName': literal },
      { 'profile.firstName.en': literal },
      { 'profile.firstName.ar': literal },
      { 'profile.lastName.en': literal },
      { 'profile.lastName.ar': literal },
      // Legacy fallback for any historical user documents that stored names flat.
      { firstName: literal },
      { lastName: literal },
    ],
  })
    .select('_id')
    .lean()) as Array<{ _id: Types.ObjectId }>;

  return users.map((user) => user._id);
}

/* â”€â”€ Transform raw session doc â†’ frontend DTO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function toSessionDTO(doc: LeanSession): Record<string, unknown> {
  const user = asRecord(doc.userId) ?? {};
  const profile = asRecord(user.profile) ?? {};
  const firstName = localizedString(profile.firstName) ?? asString(user.firstName);
  const lastName = localizedString(profile.lastName) ?? asString(user.lastName);
  const displayName = asString(profile.displayName);
  const email = asString(user.email) ?? '';
  const now = new Date();
  const expiresAt = doc.expiresAt ? new Date(doc.expiresAt) : null;
  const isActive = doc.isActive;

  let status: string;
  if (!isActive) status = 'revoked';
  else if (expiresAt && expiresAt < now) status = 'expired';
  else status = 'active';

  return {
    _id: doc._id,
    userId: typeof user._id !== 'undefined' ? String(user._id) : String(doc.userId),
    email,
    userName: [firstName, lastName].filter(Boolean).join(' ') || displayName || email || 'â€”',
    role: (user.role as string) ?? 'unknown',
    tenantSlug: asString(user.tenantSlug),
    ipAddress: doc.ipAddress ?? '',
    userAgent: doc.userAgent ?? '',
    device: {
      browser: (doc.browser as string) || 'Unknown',
      os: (doc.os as string) || 'Unknown',
      device: (doc.deviceType as string) || 'unknown',
      isMobile: doc.deviceType === 'mobile',
    },
    location: null,
    loginAt: doc.createdAt,
    lastActivityAt: doc.lastActivityAt,
    expiresAt: doc.expiresAt,
    status,
    createdAt: doc.createdAt,
  };
}

/**
 * Platform Session Management Routes â€” Phase 6 (Task 5.1 â€” Gap G5)
 *
 * Per BUILD_RULES Â§17.7, SECURITY Â§9.1
 * RBAC Module: platform_support (per Phase 6 Â§5.7)
 *
 * Platform-wide session management (for dev portal operators):
 *   - GET    /api/platform/user-sessions          â€” List all active sessions
 *   - GET    /api/platform/user-sessions/stats     â€” Session statistics
 *   - DELETE /api/platform/user-sessions/:id       â€” Revoke specific session
 *   - DELETE /api/platform/user-sessions/user/:userId â€” Revoke all sessions for a user
 */

// â”€â”€ Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const querySchema = z
  .object({
    userId: z.string().optional(),
    search: z.string().trim().optional(),
    email: z.string().trim().optional(),
    tenantSlug: z.string().trim().optional(),
    status: z.enum(['active', 'expired', 'revoked']).optional(),
    deviceType: z.enum(['desktop', 'mobile', 'tablet', 'unknown']).optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

// â”€â”€ Route Registration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function platformSessionRoutes(fastify: FastifyInstance) {
  // â”€â”€ GET /api/platform/user-sessions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.get(
    '/',
    {
      preHandler: [authGuard, platformGuard('platform_support', 'read')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const filter = querySchema.parse(request.query);
      const query: Record<string, unknown> = {};
      const now = new Date();

      if (filter.userId) query.userId = filter.userId;
      if (filter.deviceType) query.deviceType = filter.deviceType;
      if (filter.status === 'active') {
        query.isActive = true;
        query.expiresAt = { $gte: now };
      } else if (filter.status === 'expired') {
        query.isActive = true;
        query.expiresAt = { $lt: now };
      } else if (filter.status === 'revoked') {
        query.isActive = false;
      } else if (filter.isActive !== undefined) query.isActive = filter.isActive;
      else query.isActive = true; // Default: show only active

      const userClauses: Record<string, unknown>[] = [];
      if (filter.email) {
        const ids = await resolveUserIdsBySearch(filter.email);
        userClauses.push({ userId: { $in: ids } });
      }
      if (filter.tenantSlug) {
        const users = (await User.find({ tenantSlug: filter.tenantSlug })
          .select('_id')
          .lean()) as Array<{ _id: Types.ObjectId }>;
        userClauses.push({ userId: { $in: users.map((user) => user._id) } });
      }
      if (userClauses.length) query.$and = userClauses;

      if (filter.search) {
        const matchingUserIds = await resolveUserIdsBySearch(filter.search);
        const sessionSearch = regexContains(filter.search);
        query.$or = [
          { sessionId: sessionSearch },
          { ipAddress: sessionSearch },
          { userAgent: sessionSearch },
          { browser: sessionSearch },
          { os: sessionSearch },
          ...(matchingUserIds.length ? [{ userId: { $in: matchingUserIds } }] : []),
        ];
      }

      const page = filter.page;
      const limit = filter.limit;
      const skip = (page - 1) * limit;

      const [raw, total] = await Promise.all([
        UserSession.find(query)
          .sort({ lastActivityAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('userId', 'email profile role tenantSlug')
          .lean<LeanSession[]>(),
        UserSession.countDocuments(query),
      ]);

      const data = raw.map(toSessionDTO);

      return apiResponse(reply, 200, data, undefined, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    },
  );

  // â”€â”€ GET /api/platform/user-sessions/stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.get(
    '/stats',
    {
      preHandler: [authGuard, platformGuard('platform_support', 'read')],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [activeSessions, byDeviceType, byUser, sessionsToday, byRole] = await Promise.all([
        UserSession.countDocuments({ isActive: true }),

        UserSession.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$deviceType', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        UserSession.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$userId', sessionCount: { $sum: 1 } } },
          {
            $group: {
              _id: null,
              uniqueUsers: { $sum: 1 },
              totalSessions: { $sum: '$sessionCount' },
            },
          },
        ]),

        UserSession.countDocuments({ createdAt: { $gte: todayStart } }),

        UserSession.aggregate([
          { $match: { isActive: true } },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: '_id',
              as: 'user',
              pipeline: [{ $project: { role: 1 } }],
            },
          },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          { $group: { _id: '$user.role', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
      ]);

      return apiResponse(reply, 200, {
        activeSessions,
        uniqueUsers: byUser[0]?.uniqueUsers ?? 0,
        sessionsToday,
        sessionsByRole: byRole.map((r) => ({ role: r._id ?? 'unknown', count: r.count })),
        sessionsByDevice: byDeviceType.map((d) => ({ device: d._id ?? 'unknown', count: d.count })),
        avgSessionDuration: 0,
      });
    },
  );

  // â”€â”€ GET /api/platform/user-sessions/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: [authGuard, platformGuard('platform_support', 'read')],
    },
    async (request, reply) => {
      const raw = await UserSession.findById(request.params.id)
        .populate('userId', 'email profile role tenantSlug')
        .lean<LeanSession>();

      if (!raw) return apiError(reply, 404, 'Session not found');

      return apiResponse(reply, 200, toSessionDTO(raw));
    },
  );

  // â”€â”€ DELETE /api/platform/user-sessions/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: [authGuard, platformGuard('platform_support', 'delete')],
    },
    async (request, reply) => {
      const session = await UserSession.findByIdAndUpdate(
        request.params.id,
        { isActive: false },
        { new: true },
      ).lean();

      if (!session) return apiError(reply, 404, 'Session not found');

      logger.info({ msg: 'Platform admin revoked session', sessionId: session.sessionId });
      return apiResponse(reply, 200, session, 'Session revoked');
    },
  );

  // â”€â”€ DELETE /api/platform/user-sessions/user/:userId â”€â”€â”€â”€â”€â”€â”€
  fastify.delete<{ Params: { userId: string } }>(
    '/user/:userId',
    {
      preHandler: [authGuard, platformGuard('platform_support', 'delete')],
    },
    async (request, reply) => {
      const { userId } = request.params;

      const result = await UserSession.updateMany({ userId, isActive: true }, { isActive: false });

      logger.info({
        msg: 'Platform admin revoked all sessions for user',
        userId,
        revokedCount: result.modifiedCount,
      });

      return apiResponse(
        reply,
        200,
        { revokedCount: result.modifiedCount },
        'All sessions revoked for user',
      );
    },
  );
}
