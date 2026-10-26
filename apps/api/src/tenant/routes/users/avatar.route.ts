import type { FastifyInstance } from 'fastify';
import { handleAvatarUpload } from '../../../services/avatar-upload.service.js';
import { apiResponse, ApiError } from '../../../utils/api-response.js';
import { authGuard } from '../../middleware/index.js';

/**
 * Per MASTER_PLAN §22 - File Storage
 *
 * Avatar Upload Routes
 *
 * POST /api/users/:userId/avatar - Upload avatar
 * DELETE /api/users/:userId/avatar - Delete avatar
 *
 * Note: Authentication middleware (verifyToken) will be added once
 * JWT auth decorator is implemented in Phase 2.
 */

export async function avatarRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/users/:userId/avatar
   *
   * Upload a user avatar. Requires authentication.
   * The user can only upload their own avatar (or admin).
   */
  fastify.post(
    '/users/:userId/avatar',
    {
      schema: {
        tags: ['users'],
        summary: 'Upload user avatar',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
          },
        },
        consumes: ['multipart/form-data'],
      },
      preHandler: [authGuard],
    },
    async (request, reply) => {
      const { userId } = request.params as { userId: string };

      // Check permission: user can only upload their own avatar (or admin)
      const currentUser = (request as unknown as { user: { id: string; role: string } }).user;
      if (
        currentUser.id !== userId &&
        currentUser.role !== 'tenant_admin' &&
        currentUser.role !== 'platform_admin'
      ) {
        throw new ApiError(403, 'FORBIDDEN', 'You can only upload your own avatar');
      }

      try {
        const result = await handleAvatarUpload(request, reply, userId);

        // TODO: Update user record with new avatar URL
        // await User.findByIdAndUpdate(userId, { avatarUrl: result.url });

        return apiResponse(reply, 200, {
          message: 'Avatar uploaded successfully',
          avatar: result,
        });
      } catch (error) {
        throw new ApiError(
          400,
          'UPLOAD_FAILED',
          error instanceof Error ? error.message : 'Avatar upload failed',
        );
      }
    },
  );

  /**
   * DELETE /api/users/:userId/avatar
   *
   * Delete a user avatar. Requires authentication.
   */
  fastify.delete(
    '/users/:userId/avatar',
    {
      schema: {
        tags: ['users'],
        summary: 'Delete user avatar',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
          },
        },
      },
      preHandler: [authGuard],
    },
    async (request, reply) => {
      const { userId } = request.params as { userId: string };

      // Check permission: user can only delete their own avatar (or admin)
      const currentUser = (request as unknown as { user: { id: string; role: string } }).user;
      if (
        currentUser.id !== userId &&
        currentUser.role !== 'tenant_admin' &&
        currentUser.role !== 'platform_admin'
      ) {
        throw new ApiError(403, 'FORBIDDEN', 'You can only delete your own avatar');
      }

      // TODO: Delete from storage and clear user's avatar URL
      // const service = getAvatarUploadService();
      // await service.delete(user.avatarKey);
      // await User.findByIdAndUpdate(userId, { avatarUrl: null, avatarKey: null });

      return apiResponse(reply, 200, {
        message: 'Avatar deleted successfully',
        userId,
      });
    },
  );
}
