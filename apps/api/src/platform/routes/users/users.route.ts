import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'node:crypto';
import { nanoid } from 'nanoid';
import {
  invitePlatformUserSchema,
  createPlatformUserSchema,
  updatePlatformUserSchema,
  updatePlatformPermissionsSchema,
  platformUserListQuerySchema,
} from '@dento/shared';
import { apiResponse, apiError, ApiError } from '../../../utils/api-response.js';
import { User } from '../../models/index.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { logger } from '../../../utils/logger.js';
import { hashPassword } from '../../../utils/password.js';
import { sendEmail } from '../../../services/providers/email.provider.js';
import { emailVerificationHtml } from '../../../utils/email-templates.js';
import { regexContains } from '../../../tenant/services/search.helpers.js';

/**
 * Platform User Management Routes
 *
 * 8 Endpoints for managing Developer Portal users.
 * Chain: authGuard → platformGuard(module, action) → handler
 *
 * See: PLATFORM_RBAC.md §7
 */

const INVITE_TOKEN_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

export async function platformUserRoutes(fastify: FastifyInstance) {
  // ─────────────────────────────────────────────────────────
  // GET /platform/users — List all platform users
  // ─────────────────────────────────────────────────────────
  fastify.get(
    '/',
    {
      preHandler: [authGuard, platformGuard('platform_users', 'read')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = platformUserListQuerySchema.parse(request.query);
        const { page, limit, search, platformRole, status, sortBy, sortOrder } = query;

        // Build filter: only platform users (tenantSlug = null, platformRole exists)
        const filter: Record<string, unknown> = {
          tenantSlug: null,
          platformRole: { $ne: null },
        };

        if (platformRole) filter.platformRole = platformRole;
        if (status) filter.status = status;
        if (search) {
          const rx = regexContains(search);
          filter.$or = [
            { email: rx },
            { 'profile.firstName.en': rx },
            { 'profile.lastName.en': rx },
          ];
        }

        const skip = (page - 1) * limit;
        const sortDir = sortOrder === 'asc' ? 1 : -1;

        const [users, total] = await Promise.all([
          User.find(filter)
            .select(
              'email profile platformRole status isEmailVerified lastLoginAt invitedAt createdAt',
            )
            .sort({ [sortBy]: sortDir })
            .skip(skip)
            .limit(limit)
            .lean(),
          User.countDocuments(filter),
        ]);

        return apiResponse(reply, 200, users, undefined, {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        });
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to fetch platform users');
      }
    },
  );

  // ─────────────────────────────────────────────────────────
  // GET /platform/users/:id — Get single platform user
  // ─────────────────────────────────────────────────────────
  fastify.get(
    '/:id',
    {
      preHandler: [authGuard, platformGuard('platform_users', 'read')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const user = await User.findOne({
          _id: id,
          tenantSlug: null,
          platformRole: { $ne: null },
        })
          .select(
            '-password -passwordHistory -twoFactorSecret -twoFactorPendingSecret -twoFactorRecoveryCodes -inviteToken',
          )
          .lean();

        if (!user) {
          return apiError(reply, 404, 'Platform user not found');
        }

        return apiResponse(reply, 200, user);
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to fetch platform user');
      }
    },
  );

  // ─────────────────────────────────────────────────────────
  // POST /platform/users/create — Create platform user directly
  // ─────────────────────────────────────────────────────────
  fastify.post(
    '/create',
    {
      preHandler: [authGuard, platformGuard('platform_users', 'create')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = createPlatformUserSchema.parse(request.body);
        const creatorId = request.user!.userId;

        // Only owners can create other owners
        if (body.platformRole === 'platform_owner') {
          const creator = await User.findById(creatorId).select('platformRole').lean();
          if (creator?.platformRole !== 'platform_owner') {
            return apiError(reply, 403, 'Only platform owners can create other owners');
          }
        }

        // Check email uniqueness
        const existing = await User.findOne({ email: body.email.toLowerCase() });
        if (existing) {
          return apiError(reply, 409, 'A user with this email already exists');
        }

        // Hash password
        const hashedPassword = await hashPassword(body.password);

        // Generate email verification token
        const rawVerifyToken = nanoid(48);
        const hashedVerifyToken = crypto.createHash('sha256').update(rawVerifyToken).digest('hex');
        const verifyExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

        // Create user — active immediately, email unverified
        const user = await User.create({
          email: body.email.toLowerCase(),
          password: hashedPassword,
          role: 'platform_admin', // base role for authGuard
          tenantSlug: null,
          platformRole: body.platformRole,
          platformPermissionOverrides: [],
          profile: {
            firstName: body.firstName,
            lastName: body.lastName,
            phone: body.phone || undefined,
          },
          status: 'active',
          isProfileComplete: true,
          isEmailVerified: false,
          activationToken: hashedVerifyToken,
          activationTokenExpiresAt: verifyExpiresAt,
          createdBy: creatorId,
        });

        // Send verification email (fire and forget — don't block response)
        const devPortalUrl = process.env.DEV_PORTAL_URL || 'http://localhost:3002';
        const verifyLink = `${devPortalUrl}/verify-email?token=${rawVerifyToken}`;

        sendEmail({
          to: body.email.toLowerCase(),
          subject: 'Verify your email — Dento Developer Portal',
          html: emailVerificationHtml({
            verifyLink,
            userName: body.firstName.en,
            expiresInHours: 72,
          }),
        }).catch((err) => {
          logger.error({ msg: 'Failed to send verification email', error: err, email: body.email });
        });

        logger.info({
          msg: 'Platform user created',
          email: body.email,
          platformRole: body.platformRole,
          createdBy: creatorId,
        });

        return apiResponse(
          reply,
          201,
          {
            id: user._id,
            email: user.email,
            profile: user.profile,
            platformRole: user.platformRole,
            status: user.status,
            isEmailVerified: false,
          },
          'Platform user created successfully. Verification email sent.',
        );
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to create platform user');
      }
    },
  );

  // ─────────────────────────────────────────────────────────
  // POST /platform/users/invite — Invite new platform user
  // ─────────────────────────────────────────────────────────
  fastify.post(
    '/invite',
    {
      preHandler: [authGuard, platformGuard('platform_users', 'create')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = invitePlatformUserSchema.parse(request.body);
        const inviterUserId = request.user!.userId;

        // Check email uniqueness
        const existing = await User.findOne({ email: body.email.toLowerCase() });
        if (existing) {
          return apiError(reply, 409, 'A user with this email already exists');
        }

        // Generate invite token: nanoid(48), SHA-256 hashed in DB
        const rawToken = nanoid(48);
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS);

        // Create invited user (no password yet — set during accept-invite)
        const user = await User.create({
          email: body.email.toLowerCase(),
          password: crypto.randomBytes(32).toString('hex'), // Placeholder, overwritten on accept
          role: 'platform_admin', // All platform users keep role=platform_admin for authGuard bypass
          tenantSlug: null,
          platformRole: body.platformRole,
          platformPermissionOverrides: [],
          profile: {
            firstName: body.firstName,
            lastName: body.lastName,
          },
          status: 'invited',
          isProfileComplete: false,
          isEmailVerified: false,
          invitedBy: inviterUserId,
          invitedAt: new Date(),
          inviteToken: hashedToken,
          inviteTokenExpiresAt: expiresAt,
        });

        logger.info({
          msg: 'Platform user invited',
          inviteeEmail: body.email,
          invitedBy: inviterUserId,
          platformRole: body.platformRole,
        });

        return apiResponse(
          reply,
          201,
          {
            id: user._id,
            email: user.email,
            platformRole: user.platformRole,
            status: user.status,
            invitedAt: user.invitedAt,
            inviteExpiresAt: expiresAt,
            // Return raw token ONCE — frontend shows invite link
            inviteToken: rawToken,
          },
          'Platform user invited successfully',
        );
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to invite platform user');
      }
    },
  );

  // ─────────────────────────────────────────────────────────
  // PATCH /platform/users/:id — Update role or status
  // ─────────────────────────────────────────────────────────
  fastify.patch(
    '/:id',
    {
      preHandler: [authGuard, platformGuard('platform_users', 'update')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updatePlatformUserSchema.parse(request.body);

        const user = await User.findOne({
          _id: id,
          tenantSlug: null,
          platformRole: { $ne: null },
        });

        if (!user) {
          return apiError(reply, 404, 'Platform user not found');
        }

        // Last-owner protection
        if (
          body.platformRole &&
          user.platformRole === 'platform_owner' &&
          body.platformRole !== 'platform_owner'
        ) {
          const ownerCount = await User.countDocuments({
            platformRole: 'platform_owner',
            status: 'active',
          });
          if (ownerCount <= 1) {
            return apiError(reply, 400, 'Cannot demote the last platform owner');
          }
        }

        // Self-deactivation protection
        if (body.status === 'deactivated' && id === request.user!.userId) {
          return apiError(reply, 400, 'Cannot deactivate your own account');
        }

        const setFields: Record<string, unknown> = {};
        if (body.platformRole) setFields.platformRole = body.platformRole;
        if (body.status) setFields.status = body.status;
        if (body.firstName) setFields['profile.firstName'] = body.firstName;
        if (body.lastName) setFields['profile.lastName'] = body.lastName;
        if (body.phone !== undefined) setFields['profile.phone'] = body.phone || undefined;

        // Invalidate sessions on role change or suspend/deactivate
        const needsTokenBump =
          body.platformRole || body.status === 'suspended' || body.status === 'deactivated';

        const updateOps: Record<string, unknown> = { $set: setFields };
        if (needsTokenBump) updateOps.$inc = { tokenVersion: 1 };

        const updated = await User.findByIdAndUpdate(id, updateOps, { new: true })
          .select('email profile platformRole status')
          .lean();

        logger.info({
          msg: 'Platform user updated',
          targetUserId: id,
          changes: body,
          updatedBy: request.user!.userId,
        });

        return apiResponse(reply, 200, updated, 'Platform user updated');
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to update platform user');
      }
    },
  );

  // ─────────────────────────────────────────────────────────
  // PATCH /platform/users/:id/permissions — Update overrides
  // ─────────────────────────────────────────────────────────
  fastify.patch(
    '/:id/permissions',
    {
      preHandler: [authGuard, platformGuard('platform_users', 'manage')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updatePlatformPermissionsSchema.parse(request.body);

        const user = await User.findOne({
          _id: id,
          tenantSlug: null,
          platformRole: { $ne: null },
        });

        if (!user) {
          return apiError(reply, 404, 'Platform user not found');
        }

        // Owners cannot have overrides (they have '*' on everything)
        if (user.platformRole === 'platform_owner') {
          return apiError(reply, 400, 'Cannot set permission overrides for platform_owner');
        }

        const updated = await User.findByIdAndUpdate(
          id,
          {
            platformPermissionOverrides: body.platformPermissionOverrides,
            $inc: { tokenVersion: 1 }, // Invalidate existing tokens
          },
          { new: true },
        )
          .select('email platformRole platformPermissionOverrides')
          .lean();

        logger.info({
          msg: 'Platform user permissions updated',
          targetUserId: id,
          overrides: body.platformPermissionOverrides,
          updatedBy: request.user!.userId,
        });

        return apiResponse(reply, 200, updated, 'Permissions updated');
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to update permissions');
      }
    },
  );

  // ─────────────────────────────────────────────────────────
  // DELETE /platform/users/:id — Deactivate platform user
  // ─────────────────────────────────────────────────────────
  fastify.delete(
    '/:id',
    {
      preHandler: [authGuard, platformGuard('platform_users', 'delete')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const user = await User.findOne({
          _id: id,
          tenantSlug: null,
          platformRole: { $ne: null },
        });

        if (!user) {
          return apiError(reply, 404, 'Platform user not found');
        }

        // Cannot delete self
        if (id === request.user!.userId) {
          return apiError(reply, 400, 'Cannot delete your own account');
        }

        // Last-owner protection
        if (user.platformRole === 'platform_owner') {
          const ownerCount = await User.countDocuments({
            platformRole: 'platform_owner',
            status: 'active',
          });
          if (ownerCount <= 1) {
            return apiError(reply, 400, 'Cannot delete the last platform owner');
          }
        }

        await User.findByIdAndUpdate(id, {
          status: 'deactivated',
          $inc: { tokenVersion: 1 },
        });

        logger.info({
          msg: 'Platform user deactivated',
          targetUserId: id,
          deletedBy: request.user!.userId,
        });

        return apiResponse(reply, 200, null, 'Platform user deactivated');
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to deactivate platform user');
      }
    },
  );

  // ─────────────────────────────────────────────────────────
  // POST /platform/users/:id/resend-invite — Resend invite
  // ─────────────────────────────────────────────────────────
  fastify.post(
    '/:id/resend-invite',
    {
      preHandler: [authGuard, platformGuard('platform_users', 'create')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const user = await User.findOne({
          _id: id,
          tenantSlug: null,
          platformRole: { $ne: null },
          status: 'invited',
        });

        if (!user) {
          return apiError(reply, 404, 'Invited platform user not found');
        }

        // Generate new invite token
        const rawToken = nanoid(48);
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS);

        await User.findByIdAndUpdate(id, {
          inviteToken: hashedToken,
          inviteTokenExpiresAt: expiresAt,
        });

        logger.info({
          msg: 'Platform invite resent',
          targetUserId: id,
          resentBy: request.user!.userId,
        });

        return apiResponse(
          reply,
          200,
          {
            id: user._id,
            email: user.email,
            inviteExpiresAt: expiresAt,
            inviteToken: rawToken,
          },
          'Invite resent',
        );
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to resend invite');
      }
    },
  );

  // ─────────────────────────────────────────────────────────
  // POST /platform/users/:id/revoke-invite — Revoke invite
  // ─────────────────────────────────────────────────────────
  fastify.post(
    '/:id/revoke-invite',
    {
      preHandler: [authGuard, platformGuard('platform_users', 'delete')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const user = await User.findOne({
          _id: id,
          tenantSlug: null,
          platformRole: { $ne: null },
          status: 'invited',
        });

        if (!user) {
          return apiError(reply, 404, 'Invited platform user not found');
        }

        await User.findByIdAndUpdate(id, {
          status: 'deactivated',
          inviteToken: null,
          inviteTokenExpiresAt: null,
        });

        logger.info({
          msg: 'Platform invite revoked',
          targetUserId: id,
          revokedBy: request.user!.userId,
        });

        return apiResponse(reply, 200, null, 'Invite revoked');
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to revoke invite');
      }
    },
  );
}
