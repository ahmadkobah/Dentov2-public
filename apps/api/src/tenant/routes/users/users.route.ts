/**
 * User Management Routes — per DENTO_V2_MASTER_PLAN §12, §27
 *
 * Endpoints:
 *   - GET    /api/users              — List users (paginated, filterable)
 *   - GET    /api/users/stats        — Role & status distribution
 *   - GET    /api/users/:id          — Get user by ID
 *   - POST   /api/users/invite       — Invite new user
 *   - PUT    /api/users/:id          — Update user role/status
 *   - PATCH  /api/users/:id/suspend  — Suspend user
 *   - PATCH  /api/users/:id/deactivate — Deactivate user
 *   - PATCH  /api/users/:id/reactivate — Reactivate user
 *   - PATCH  /api/users/:id/unlock     — Clear brute-force lockout (M-7)
 *   - GET    /api/users/:id/sessions — Get active sessions
 *   - DELETE /api/users/:id/sessions — Revoke all sessions
 *
 * User model lives in Platform DB, filtered by tenantSlug.
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import crypto from 'node:crypto';
import {
  inviteUserSchema,
  updateUserSchema,
  userListQuerySchema,
  editUserProfileSchema,
  adminSetPasswordSchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { UserService } from '../../services/user.service.js';
import { DoctorSyncService } from '../../services/doctor-sync.service.js';
import { User } from '../../../platform/models/user.model.js';
import { sendEmail } from '../../../services/providers/email.provider.js';
import { passwordResetEmailHtml, staffInviteEmailHtml } from '../../../utils/email-templates.js';
import { env } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';

function getUser(request: unknown): { id: string; tenantSlug: string } {
  return (request as unknown as Record<string, unknown>).user as { id: string; tenantSlug: string };
}

function getTenantDb(request: unknown) {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

export async function userRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // GET / — List users
  fastify.get(
    '/',
    { preHandler: [...preHandler, roleGuard('staff', 'read')] },
    async (request, reply) => {
      try {
        const query = userListQuerySchema.parse(request.query);
        const user = getUser(request);
        const service = new UserService(user.tenantSlug);
        const result = await service.list(query);
        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to list users');
      }
    },
  );

  // GET /stats — Role & status distribution
  fastify.get(
    '/stats',
    { preHandler: [...preHandler, roleGuard('staff', 'read')] },
    async (request, reply) => {
      try {
        const user = getUser(request);
        const service = new UserService(user.tenantSlug);
        const stats = await service.getRoleStats();
        return apiResponse(reply, 200, { stats });
      } catch {
        return apiError(reply, 500, 'Failed to get user stats');
      }
    },
  );

  // GET /:id — Get user by ID
  fastify.get(
    '/:id',
    { preHandler: [...preHandler, roleGuard('staff', 'read')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = getUser(request);
        const service = new UserService(user.tenantSlug);
        const result = await service.getById(id);
        return apiResponse(reply, 200, { user: result });
      } catch (err) {
        if (err instanceof Error && 'statusCode' in err) throw err;
        return apiError(reply, 500, 'Failed to get user');
      }
    },
  );

  // POST /invite — Invite new user
  fastify.post(
    '/invite',
    { preHandler: [...preHandler, roleGuard('staff', 'create')] },
    async (request, reply) => {
      try {
        const data = inviteUserSchema.parse(request.body);
        const user = getUser(request);
        const service = new UserService(user.tenantSlug);
        const result = (await service.invite(data, user.id)) as Record<string, unknown> & {
          _rawInviteToken?: string;
        };
        const { _rawInviteToken, ...userData } = result;

        // Auto-create Doctor record for dentist role
        if (data.role === 'dentist') {
          try {
            const tenantDb = getTenantDb(request);
            const doctorSync = new DoctorSyncService(tenantDb);
            await doctorSync.createDoctorFromUser(userData as any, user.id);
          } catch (syncErr) {
            logger.error(
              { err: syncErr, userId: userData._id },
              'Failed to create Doctor record from invite',
            );
          }
        }

        // Build invite link and send email
        const adminPortalUrl = env.ADMIN_PORTAL_URL || 'http://localhost:5173';
        const inviteLink = `${adminPortalUrl}/invite/${_rawInviteToken}`;
        const displayName = data.firstName || 'there';

        sendEmail({
          to: data.email,
          subject: "You're invited to join the clinic — Dento",
          html: staffInviteEmailHtml({
            inviteLink,
            userName: displayName,
            roleName: data.role,
            expiresInDays: 7,
          }),
        }).catch((err) => {
          logger.error({ err, email: data.email }, 'Failed to send staff invite email');
        });

        return apiResponse(reply, 201, { user: userData, inviteLink });
      } catch (err) {
        if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
        return apiError(reply, 500, 'Failed to invite user');
      }
    },
  );

  // PUT /:id — Update user role/status
  fastify.put(
    '/:id',
    { preHandler: [...preHandler, roleGuard('staff', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = updateUserSchema.parse(request.body);
        const user = getUser(request);
        const service = new UserService(user.tenantSlug);
        const result = await service.update(id, data, user.id);
        return apiResponse(reply, 200, { user: result });
      } catch (err) {
        if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
        return apiError(reply, 500, 'Failed to update user');
      }
    },
  );

  // PATCH /:id/suspend — Suspend user
  fastify.patch(
    '/:id/suspend',
    { preHandler: [...preHandler, roleGuard('staff', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = getUser(request);
        const service = new UserService(user.tenantSlug);
        const result = await service.suspend(id, user.id);
        return apiResponse(reply, 200, { user: result });
      } catch (err) {
        if (err instanceof Error && 'statusCode' in err) throw err;
        return apiError(reply, 500, 'Failed to suspend user');
      }
    },
  );

  // PATCH /:id/deactivate — Deactivate user
  fastify.patch(
    '/:id/deactivate',
    { preHandler: [...preHandler, roleGuard('staff', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = getUser(request);
        const service = new UserService(user.tenantSlug);
        const result = await service.deactivate(id, user.id);
        return apiResponse(reply, 200, { user: result });
      } catch (err) {
        if (err instanceof Error && 'statusCode' in err) throw err;
        return apiError(reply, 500, 'Failed to deactivate user');
      }
    },
  );

  // PATCH /:id/reactivate — Reactivate user
  fastify.patch(
    '/:id/reactivate',
    { preHandler: [...preHandler, roleGuard('staff', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = getUser(request);
        const service = new UserService(user.tenantSlug);
        const result = await service.reactivate(id, user.id);
        return apiResponse(reply, 200, { user: result });
      } catch (err) {
        if (err instanceof Error && 'statusCode' in err) throw err;
        return apiError(reply, 500, 'Failed to reactivate user');
      }
    },
  );

  // PATCH /:id/unlock — Clear M-7 lockout (admin override)
  fastify.patch(
    '/:id/unlock',
    { preHandler: [...preHandler, roleGuard('staff', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = getUser(request);
        const service = new UserService(user.tenantSlug);
        const result = await service.unlock(id, user.id);

        // Compliance audit (HIPAA) — admin clearing a brute-force lockout is a
        // sensitive action; record actor, target, and context.
        try {
          const tenantDb = getTenantDb(request);
          const { AuditLogService } = await import('../../services/audit-log.service.js');
          const audit = new AuditLogService(tenantDb);
          await audit.create({
            actorId: user.id,
            actorRole: (request as unknown as { user: { role: string } }).user.role,
            tenantSlug: user.tenantSlug,
            resourceType: 'user',
            resourceId: id,
            action: 'update',
            description: `User account unlocked (M-7 brute-force lockout cleared) — target: ${result.email}`,
            newValues: { status: 'active', failedLoginCount: 0 },
            changedFields: ['status', 'failedLoginCount', 'lockedAt', 'lockedReason'],
            ipAddress: request.ip ?? '0.0.0.0',
            userAgent: request.headers['user-agent']?.slice(0, 500),
            requestId: request.id,
            sensitivityLevel: 'high',
            status: 'success',
          });
        } catch (auditErr) {
          logger.warn({ err: auditErr }, 'Failed to write unlock audit log');
        }

        return apiResponse(reply, 200, { user: result });
      } catch (err) {
        if (err instanceof Error && 'statusCode' in err) throw err;
        return apiError(reply, 500, 'Failed to unlock user');
      }
    },
  );

  // GET /:id/sessions — Get active sessions
  fastify.get(
    '/:id/sessions',
    { preHandler: [...preHandler, roleGuard('staff', 'read')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = getUser(request);
        const service = new UserService(user.tenantSlug);
        const sessions = await service.getSessions(id);
        return apiResponse(reply, 200, { sessions });
      } catch (err) {
        if (err instanceof Error && 'statusCode' in err) throw err;
        return apiError(reply, 500, 'Failed to get sessions');
      }
    },
  );

  // DELETE /:id/sessions — Revoke all sessions
  fastify.delete(
    '/:id/sessions',
    { preHandler: [...preHandler, roleGuard('staff', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = getUser(request);
        const service = new UserService(user.tenantSlug);
        const result = await service.revokeAllSessions(id);
        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && 'statusCode' in err) throw err;
        return apiError(reply, 500, 'Failed to revoke sessions');
      }
    },
  );

  // POST /:id/force-reset-password — Admin-initiated password reset
  fastify.post(
    '/:id/force-reset-password',
    { preHandler: [...preHandler, roleGuard('staff', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const currentUser = getUser(request);

        // Find target user in same tenant
        const targetUser = await User.findOne({
          _id: id,
          tenantSlug: currentUser.tenantSlug,
        });
        if (!targetUser) {
          return apiError(reply, 404, 'User not found');
        }

        // Generate reset token (same flow as forgot-password)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        targetUser.resetToken = hashedToken;
        targetUser.resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await targetUser.save();

        // Send reset email (fire-and-forget)
        const adminPortalUrl = env.ADMIN_PORTAL_URL || 'http://localhost:5173';
        const resetLink = `${adminPortalUrl}/reset-password?token=${resetToken}`;
        const displayName = targetUser.profile?.firstName?.en || 'there';

        sendEmail({
          to: targetUser.email,
          subject: 'Password Reset Requested by Administrator — Dento',
          html: passwordResetEmailHtml({
            resetLink,
            userName: displayName,
            expiresInMinutes: 60,
          }),
        }).catch((err) => {
          logger.error({ err, userId: id }, 'Failed to send admin-initiated reset email');
        });

        return apiResponse(reply, 200, null, 'Password reset email sent to user');
      } catch (err) {
        if (err instanceof Error && 'statusCode' in err) throw err;
        return apiError(reply, 500, 'Failed to initiate password reset');
      }
    },
  );

  // PUT /:id/profile — Edit user profile
  fastify.put(
    '/:id/profile',
    { preHandler: [...preHandler, roleGuard('staff', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = editUserProfileSchema.parse(request.body);
        const user = getUser(request);
        const service = new UserService(user.tenantSlug);
        const result = await service.editProfile(id, data, user.id);

        // Sync profile changes to Doctor record if user is a dentist
        if (result.role === 'dentist') {
          try {
            const tenantDb = getTenantDb(request);
            const doctorSync = new DoctorSyncService(tenantDb);
            await doctorSync.syncUserToDoctor(result as any, user.id);
          } catch (syncErr) {
            logger.error({ err: syncErr, userId: id }, 'Failed to sync user profile to Doctor');
          }
        }

        return apiResponse(reply, 200, { user: result });
      } catch (err) {
        if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
        return apiError(reply, 500, 'Failed to update user profile');
      }
    },
  );

  // POST /:id/set-password — Admin sets password directly
  fastify.post(
    '/:id/set-password',
    { preHandler: [...preHandler, roleGuard('staff', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = adminSetPasswordSchema.parse(request.body);
        const user = getUser(request);
        const service = new UserService(user.tenantSlug);
        const result = await service.adminSetPassword(id, data.newPassword, user.id);
        return apiResponse(reply, 200, result, 'Password updated successfully');
      } catch (err) {
        if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
        return apiError(reply, 500, 'Failed to set password');
      }
    },
  );

  // PATCH /:id/disable-2fa — Admin force-disables 2FA
  fastify.patch(
    '/:id/disable-2fa',
    { preHandler: [...preHandler, roleGuard('staff', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = getUser(request);
        const service = new UserService(user.tenantSlug);
        const result = await service.adminDisable2FA(id, user.id);
        return apiResponse(reply, 200, result, '2FA disabled successfully');
      } catch (err) {
        if (err instanceof Error && 'statusCode' in err) throw err;
        return apiError(reply, 500, 'Failed to disable 2FA');
      }
    },
  );

  // PATCH /:id/verify-email — Admin marks email as verified
  fastify.patch(
    '/:id/verify-email',
    { preHandler: [...preHandler, roleGuard('staff', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const currentUser = getUser(request);

        const targetUser = await User.findOne({
          _id: id,
          tenantSlug: currentUser.tenantSlug,
        });
        if (!targetUser) {
          return apiError(reply, 404, 'User not found');
        }

        targetUser.isEmailVerified = true;
        targetUser.updatedBy = currentUser.id as unknown as typeof targetUser.updatedBy;
        await targetUser.save();

        return apiResponse(reply, 200, { user: targetUser.toJSON() }, 'Email marked as verified');
      } catch (err) {
        if (err instanceof Error && 'statusCode' in err) throw err;
        return apiError(reply, 500, 'Failed to verify email');
      }
    },
  );

  // PATCH /:id/verify-phone — Admin marks phone as verified
  fastify.patch(
    '/:id/verify-phone',
    { preHandler: [...preHandler, roleGuard('staff', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const currentUser = getUser(request);

        const targetUser = await User.findOne({
          _id: id,
          tenantSlug: currentUser.tenantSlug,
        });
        if (!targetUser) {
          return apiError(reply, 404, 'User not found');
        }
        if (!targetUser.profile.phone) {
          return apiError(reply, 400, 'User has no phone number');
        }

        targetUser.isPhoneVerified = true;
        targetUser.updatedBy = currentUser.id as unknown as typeof targetUser.updatedBy;
        await targetUser.save();

        return apiResponse(reply, 200, { user: targetUser.toJSON() }, 'Phone marked as verified');
      } catch (err) {
        if (err instanceof Error && 'statusCode' in err) throw err;
        return apiError(reply, 500, 'Failed to verify phone');
      }
    },
  );
}
