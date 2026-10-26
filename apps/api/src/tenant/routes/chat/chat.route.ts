/**
 * Chat Routes — REST API
 *
 * Per DENTO_V2_MASTER_PLAN.md §37 — Internal Staff Chat System
 *
 * Endpoints (13 total):
 *   Channels:
 *     GET    /api/chat/channels                      — List user channels
 *     POST   /api/chat/channels                      — Create channel
 *     GET    /api/chat/channels/:id                  — Channel detail
 *     PATCH  /api/chat/channels/:id                  — Edit channel
 *     DELETE /api/chat/channels/:id                  — Archive channel
 *     POST   /api/chat/channels/:id/members          — Add members
 *     DELETE /api/chat/channels/:id/members/:userId  — Remove member
 *     POST   /api/chat/channels/:id/read             — Mark channel as read
 *
 *   Messages:
 *     GET    /api/chat/channels/:id/messages          — Load messages
 *     POST   /api/chat/channels/:id/messages          — Send message (REST)
 *     PATCH  /api/chat/messages/:id                   — Edit message
 *     DELETE /api/chat/messages/:id                   — Delete message
 *
 *   Uploads:
 *     POST   /api/chat/upload                         — Pre-signed URL for chat attachment
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import {
  createChannelSchema,
  updateChannelSchema,
  channelQuerySchema,
  addMembersSchema,
  createMessageSchema,
  editMessageSchema,
  messageQuerySchema,
} from '@dento/shared';
import { apiResponse, apiError, ApiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware } from '../../middleware/index.js';
import { ChatChannelService, ChatMessageService } from '../../services/chat.service.js';
import { UploadService } from '../../services/upload.service.js';
import { enqueueChatPush } from '../../../jobs/index.js';
import { User } from '../../../platform/models/index.js';

function getTenantDb(req: unknown): Connection {
  return (req as Record<string, unknown>).tenantDb as Connection;
}

interface JwtUser {
  userId: string;
  email: string;
  role: string;
  tenantSlug: string;
}

function getJwtUser(req: unknown): JwtUser {
  return (req as Record<string, unknown>).user as JwtUser;
}

/** Resolve display name from the platform User model. */
async function resolveUserName(userId: string): Promise<{ en: string; ar: string }> {
  const u = await User.findById(userId).select('profile').lean();
  const p = u?.profile as
    | { firstName?: { en?: string; ar?: string }; lastName?: { en?: string; ar?: string } }
    | undefined;
  const en = [p?.firstName?.en, p?.lastName?.en].filter(Boolean).join(' ') || 'User';
  const ar = [p?.firstName?.ar, p?.lastName?.ar].filter(Boolean).join(' ') || en;
  return { en, ar };
}

export async function chatRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // ── Channel Endpoints ───────────────────────────────────

  // GET /channels — List user's channels
  fastify.get('/channels', { preHandler }, async (request, reply) => {
    try {
      const query = channelQuerySchema.parse(request.query);
      const user = getJwtUser(request);
      const svc = new ChatChannelService(getTenantDb(request));
      const result = await svc.listForUser(user.userId, query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list channels');
    }
  });

  // POST /channels — Create channel
  fastify.post('/channels', { preHandler }, async (request, reply) => {
    try {
      const data = createChannelSchema.parse(request.body);
      const user = getJwtUser(request);
      const userName = await resolveUserName(user.userId);
      const svc = new ChatChannelService(getTenantDb(request));
      const channel = await svc.create(data, user.userId, userName.en);
      return apiResponse(reply, 201, { channel });
    } catch (err) {
      if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
      return apiError(reply, 500, 'Failed to create channel');
    }
  });

  // GET /channels/:id — Channel detail
  fastify.get('/channels/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = getJwtUser(request);
      const svc = new ChatChannelService(getTenantDb(request));
      const channel = await svc.getById(id, user.userId);
      return apiResponse(reply, 200, { channel });
    } catch (err) {
      if (err instanceof Error && 'statusCode' in err) throw err;
      return apiError(reply, 500, 'Failed to get channel');
    }
  });

  // PATCH /channels/:id — Edit channel
  fastify.patch('/channels/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateChannelSchema.parse(request.body);
      const user = getJwtUser(request);
      const svc = new ChatChannelService(getTenantDb(request));
      const channel = await svc.update(id, data, user.userId);
      return apiResponse(reply, 200, { channel });
    } catch (err) {
      if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
      return apiError(reply, 500, 'Failed to update channel');
    }
  });

  // DELETE /channels/:id — Archive channel
  fastify.delete('/channels/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = getJwtUser(request);
      const svc = new ChatChannelService(getTenantDb(request));
      await svc.archive(id, user.userId);
      return apiResponse(reply, 200, { message: 'Channel archived' });
    } catch (err) {
      if (err instanceof Error && 'statusCode' in err) throw err;
      return apiError(reply, 500, 'Failed to archive channel');
    }
  });

  // POST /channels/:id/members — Add members
  fastify.post('/channels/:id/members', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = addMembersSchema.parse(request.body);
      const user = getJwtUser(request);
      const svc = new ChatChannelService(getTenantDb(request));
      const channel = await svc.addMembers(id, data, user.userId);
      return apiResponse(reply, 200, { channel });
    } catch (err) {
      if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
      return apiError(reply, 500, 'Failed to add members');
    }
  });

  // DELETE /channels/:id/members/:userId — Remove member
  fastify.delete('/channels/:id/members/:userId', { preHandler }, async (request, reply) => {
    try {
      const { id, userId } = request.params as { id: string; userId: string };
      const user = getJwtUser(request);
      const svc = new ChatChannelService(getTenantDb(request));
      const channel = await svc.removeMember(id, userId, user.userId);
      return apiResponse(reply, 200, { channel });
    } catch (err) {
      if (err instanceof Error && 'statusCode' in err) throw err;
      return apiError(reply, 500, 'Failed to remove member');
    }
  });

  // POST /channels/:id/read — Mark as read
  fastify.post('/channels/:id/read', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = getJwtUser(request);
      const messageSvc = new ChatMessageService(getTenantDb(request));
      await messageSvc.markRead(id, user.userId);
      return apiResponse(reply, 200, { message: 'Channel marked as read' });
    } catch (err) {
      return apiError(reply, 500, 'Failed to mark channel as read');
    }
  });

  // ── Message Endpoints ───────────────────────────────────

  // GET /channels/:id/messages — Load messages (paginated)
  fastify.get('/channels/:id/messages', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const query = messageQuerySchema.parse(request.query);
      const user = getJwtUser(request);
      const svc = new ChatMessageService(getTenantDb(request));
      const result = await svc.list(id, user.userId, query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
      return apiError(reply, 500, 'Failed to load messages');
    }
  });

  // POST /channels/:id/messages — Send message (REST fallback)
  fastify.post('/channels/:id/messages', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = createMessageSchema.parse(request.body);
      const user = getJwtUser(request);
      const userName = await resolveUserName(user.userId);
      const svc = new ChatMessageService(getTenantDb(request));
      const message = await svc.send(id, data, {
        userId: user.userId,
        name: userName.en,
        role: user.role,
      });

      // Emit via Socket.io
      try {
        const socketServer = fastify.io;
        if (socketServer) {
          socketServer.to(`chat:${id}`).emit('chat:message' as any, {
            message: message.toObject(),
            channelId: id,
          });

          // Enqueue push notifications for offline channel members
          try {
            const channelSvc = new ChatChannelService(getTenantDb(request));
            const channel = await channelSvc.getById(id, user.userId);
            const members: string[] =
              ((channel as any).channel ?? channel)?.members?.map((m: any) =>
                m.userId?.toString(),
              ) ?? [];
            const otherMembers = members.filter((uid: string) => uid !== user.userId);

            if (otherMembers.length > 0) {
              const sockets = await socketServer.in(`chat:${id}`).fetchSockets();
              const connectedUserIds = new Set(
                sockets.map((s) => (s.data as any)?.userId as string).filter(Boolean),
              );
              const offlineRecipients = otherMembers.filter(
                (uid: string) => !connectedUserIds.has(uid),
              );

              if (offlineRecipients.length > 0) {
                const tenantSlug = (request as unknown as Record<string, unknown>)
                  .tenantSlug as string;
                await enqueueChatPush({
                  tenantSlug,
                  channelId: id,
                  messageId: (message as any)._id?.toString() ?? '',
                  senderName: userName.en,
                  text: typeof data.text === 'string' ? data.text : '',
                  recipientIds: offlineRecipients,
                });
              }
            }
          } catch {
            // Push enqueue is best-effort
          }
        }
      } catch {
        // Socket emission is best-effort
      }

      return apiResponse(reply, 201, { message });
    } catch (err) {
      if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
      return apiError(reply, 500, 'Failed to send message');
    }
  });

  // PATCH /messages/:id — Edit message
  fastify.patch('/messages/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = editMessageSchema.parse(request.body);
      const user = getJwtUser(request);
      const svc = new ChatMessageService(getTenantDb(request));
      const message = await svc.edit(id, data.text, user.userId);

      // Emit via Socket.io
      try {
        const socketServer = fastify.io;
        if (socketServer) {
          const channelId = message.channelId?.toString();
          socketServer.to(`chat:${channelId}`).emit('chat:message_edited' as any, {
            messageId: id,
            channelId,
            text: data.text,
            editedAt: message.editedAt?.toISOString() ?? new Date().toISOString(),
          });
        }
      } catch {
        // Socket emission is best-effort
      }

      return apiResponse(reply, 200, { message });
    } catch (err) {
      if (err instanceof Error && ('statusCode' in err || err.name === 'ZodError')) throw err;
      return apiError(reply, 500, 'Failed to edit message');
    }
  });

  // DELETE /messages/:id — Delete message (soft-delete)
  fastify.delete('/messages/:id', { preHandler }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = getJwtUser(request);
      const svc = new ChatMessageService(getTenantDb(request));
      const message = await svc.delete(id, user.userId);

      // Emit via Socket.io
      try {
        const socketServer = fastify.io;
        if (socketServer) {
          const channelId = (message as any)?.channelId?.toString();
          if (channelId) {
            socketServer.to(`chat:${channelId}`).emit('chat:message_deleted' as any, {
              messageId: id,
              channelId,
            });
          }
        }
      } catch {
        // Socket emission is best-effort
      }

      return apiResponse(reply, 200, { message: 'Message deleted' });
    } catch (err) {
      if (err instanceof Error && 'statusCode' in err) throw err;
      return apiError(reply, 500, 'Failed to delete message');
    }
  });

  // ── Upload Endpoint ─────────────────────────────────────

  // POST /upload — Get pre-signed URL for chat attachment upload
  fastify.post('/upload', { preHandler }, async (request, reply) => {
    try {
      const { filename, contentType } = request.body as {
        filename: string;
        contentType: string;
      };

      if (!filename || !contentType) {
        throw ApiError.badRequest('filename and contentType are required');
      }

      const tenantSlug = (request as unknown as Record<string, unknown>).tenantSlug as string;
      const service = new UploadService(tenantSlug);
      const result = await service.getUploadUrl(filename, 'chatAttachment', contentType);

      return apiResponse(reply, 200, result, 'Pre-signed URL generated');
    } catch (err) {
      if (err instanceof ApiError) throw err;
      return apiError(reply, 500, 'Failed to generate upload URL');
    }
  });
}
