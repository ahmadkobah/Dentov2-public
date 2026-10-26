/**
 * Socket.io Plugin for Fastify
 * Real-time communication for Daily Operations, Notifications, Chair Status
 * Based on DENTO_V2_MASTER_PLAN.md §18 & §22
 */

import fp from 'fastify-plugin';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type { FastifyInstance } from 'fastify';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  SocketRoom,
  QueueUpdateEvent,
  ChairStatusEvent,
  InAppNotification,
} from '@dento/shared';
import { isValidObjectId } from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { getTenantConnection } from '../tenant/middleware/tenant-db.js';
import { getBranchModel } from '../tenant/models/branch.model.js';
import { ChatMessageService, ChatChannelService } from '../tenant/services/chat.service.js';

// Type-safe Socket.io server
export type TypedSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

// Global reference for emitting events from anywhere
let io: TypedSocketServer | null = null;

export function getSocketServer(): TypedSocketServer {
  if (!io) {
    throw new Error('Socket.io not initialized. Call socketPlugin first.');
  }
  return io;
}

/**
 * Authorize a `join` request against the socket's authenticated identity.
 * Prevents a client from joining another user's notification room or another
 * tenant's rooms (the cross-user / cross-tenant leak before handshake auth).
 */
async function isRoomAuthorized(data: SocketData, room: string): Promise<boolean> {
  const { userId, tenantId } = data;
  if (!userId || !tenantId) return false;
  // A user may only join their own personal notification room.
  if (room.startsWith('user:')) return room === `user:${userId}`;
  // Tenant-scoped rooms (chairs, etc.) must belong to the authenticated tenant.
  if (room.startsWith('tenant:')) return room.startsWith(`tenant:${tenantId}:`);
  // Branch daily-ops rooms (format `branch:<branchId>:daily-ops`): the access
  // token carries no branch claim, so verify the branch actually belongs to the
  // socket's authenticated tenant before allowing the join. Branch ids are
  // per-tenant ObjectIds, so a branch id belonging to another tenant will not be
  // found in this tenant's DB — closing the cross-tenant queue/chair leak (#70).
  if (room.startsWith('branch:')) {
    const branchId = room.split(':')[1];
    if (!branchId || !isValidObjectId(branchId)) return false;
    try {
      const Branch = getBranchModel(getTenantConnection(tenantId));
      const exists = await Branch.exists({ _id: branchId });
      return exists !== null;
    } catch (err) {
      logger.error({ err, tenantId, room }, 'Socket branch-room ownership check failed');
      return false;
    }
  }
  // Deny anything else by default.
  return false;
}

// ── Utility Functions for Emitting Events ───────────────────

export const socketEmitter = {
  /**
   * Emit queue update to Daily Operations Hub
   */
  queueUpdate(branchId: string, event: QueueUpdateEvent): void {
    const room: SocketRoom = `branch:${branchId}:daily-ops`;
    getSocketServer().to(room).emit('queue:update', event);
    logger.debug({ room, event: event.type }, 'Socket: queue:update emitted');
  },

  /**
   * Emit chair status change
   */
  chairStatus(tenantId: string, event: ChairStatusEvent): void {
    const room: SocketRoom = `tenant:${tenantId}:chairs`;
    getSocketServer().to(room).emit('chair:status', event);
    logger.debug(
      { room, chairId: event.chairId, status: event.status },
      'Socket: chair:status emitted',
    );
  },

  /**
   * Emit notification to specific user
   */
  notification(userId: string, notification: InAppNotification): void {
    const room: SocketRoom = `user:${userId}`;
    getSocketServer().to(room).emit('notification:new', notification);
    logger.debug({ room, type: notification.type }, 'Socket: notification:new emitted');
  },

  /**
   * Broadcast to all sockets in a room
   */
  toRoom<E extends keyof ServerToClientEvents>(
    room: SocketRoom,
    event: E,
    data: Parameters<ServerToClientEvents[E]>[0],
  ): void {
    getSocketServer()
      .to(room)
      .emit(event as any, data as any);
  },
};

// ── Plugin Implementation ───────────────────────────────────

async function socketPluginImpl(fastify: FastifyInstance) {
  // Create Socket.io server attached to Fastify's HTTP server
  io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    fastify.server,
    {
      cors: {
        origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    },
  );

  // ── Redis Adapter for Multi-Instance Support ──────────────
  if (env.REDIS_URL) {
    const pubClient = new Redis(env.REDIS_URL);
    // Subscriber client must disable readyCheck to prevent INFO command
    // after entering subscriber mode (causes crash with Upstash/serverless Redis)
    const subClient = pubClient.duplicate({ enableReadyCheck: false });

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        pubClient.on('connect', resolve);
        pubClient.on('error', reject);
      }),
      new Promise<void>((resolve, reject) => {
        subClient.on('connect', resolve);
        subClient.on('error', reject);
      }),
    ]);

    io.adapter(createAdapter(pubClient, subClient));
    logger.info('✅ Socket.io Redis adapter connected');
  }

  // ── Handshake Authentication ──────────────────────────────
  // Verify the access token (same verifier as the REST authGuard) and pin the
  // socket to its identity. Without this, socket.data.userId/tenantId were never
  // set, so any client could join another user's `user:<id>` room (cross-user
  // notification leak) and the tenant-scoped chat/chair handlers silently no-op'd.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        next(new Error('Unauthorized: missing access token'));
        return;
      }
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.userId;
      socket.data.tenantId = payload.tenantSlug;
      socket.data.joinedRooms = new Set();
      next();
    } catch {
      next(new Error('Unauthorized: invalid access token'));
    }
  });

  // ── Connection Handling ───────────────────────────────────
  io.on('connection', (socket) => {
    // Initialize socket data
    socket.data.joinedRooms = new Set();

    logger.debug({ socketId: socket.id }, 'Socket connected');

    // Emit connection acknowledgment
    socket.emit('connected', {
      socketId: socket.id,
      userId: socket.data.userId,
    });

    // ── Join Room (authorized) ────────────────────────────────
    socket.on('join', async ({ room }) => {
      if (!(await isRoomAuthorized(socket.data, room))) {
        logger.warn(
          { socketId: socket.id, room, userId: socket.data.userId },
          'Socket join denied: room not owned by the authenticated user/tenant',
        );
        return;
      }
      socket.join(room);
      socket.data.joinedRooms.add(room);
      logger.debug({ socketId: socket.id, room }, 'Socket joined room');
    });

    // ── Leave Room ────────────────────────────────────────────
    socket.on('leave', ({ room }) => {
      socket.leave(room);
      socket.data.joinedRooms.delete(room);
      logger.debug({ socketId: socket.id, room }, 'Socket left room');
    });

    // ── Notification Actions ──────────────────────────────────
    socket.on('notification:mark_read', ({ notificationId }) => {
      // This event is handled by the notification service
      // The actual DB update happens via REST API
      logger.debug({ socketId: socket.id, notificationId }, 'Notification mark read requested');
    });

    socket.on('notification:dismiss', ({ notificationId }) => {
      logger.debug({ socketId: socket.id, notificationId }, 'Notification dismiss requested');
    });

    // ── Chair Status Update ───────────────────────────────────
    socket.on('chair:update_status', ({ chairId, status, patientId }) => {
      // This would typically trigger a database update
      // and then broadcast to the room
      logger.debug(
        { socketId: socket.id, chairId, status, patientId },
        'Chair status update requested',
      );
    });

    // ── Chat Handlers (§37) ───────────────────────────────────

    // Typing indicator — throttled to max 1 per 2s per user per channel
    const typingThrottle = new Map<string, number>();

    socket.on('chat:typing', ({ channelId }) => {
      const userId = socket.data.userId;
      if (!userId) return;

      const key = `${channelId}:${userId}`;
      const now = Date.now();
      const last = typingThrottle.get(key) ?? 0;
      if (now - last < 2000) return;
      typingThrottle.set(key, now);

      const room: SocketRoom = `chat:${channelId}`;
      socket.to(room).emit('chat:typing', {
        channelId,
        userId,
        userName: '', // client-side resolved from userId
      });
      logger.debug({ socketId: socket.id, channelId }, 'Socket: chat:typing relay');
    });

    // Mark messages as read in a channel
    socket.on('chat:read', async ({ channelId }) => {
      const userId = socket.data.userId;
      const tenantId = socket.data.tenantId;
      if (!userId || !tenantId) return;

      try {
        const tenantDb = getTenantConnection(tenantId);
        const msgSvc = new ChatMessageService(tenantDb);
        await msgSvc.markRead(channelId, userId);

        const room: SocketRoom = `chat:${channelId}`;
        socket.to(room).emit('chat:read', {
          channelId,
          userId,
          readAt: new Date().toISOString(),
        });
        logger.debug({ socketId: socket.id, channelId }, 'Socket: chat:read processed');
      } catch (err) {
        logger.error({ socketId: socket.id, channelId, err }, 'Socket: chat:read failed');
      }
    });

    // Send a message via socket (alternative to REST POST /channels/:id/messages)
    socket.on('chat:send', async ({ channelId, text, attachments, replyToId }) => {
      const userId = socket.data.userId;
      const tenantId = socket.data.tenantId;
      if (!userId || !tenantId) return;

      try {
        const tenantDb = getTenantConnection(tenantId);
        const msgSvc = new ChatMessageService(tenantDb);
        const message = await msgSvc.send(
          channelId,
          {
            text: text ?? undefined,
            attachments,
            replyToId,
            type: attachments?.length ? 'file' : 'text',
          },
          { userId, name: '', role: '', avatarUrl: undefined },
        );

        const room: SocketRoom = `chat:${channelId}`;
        io!.to(room).emit('chat:message', {
          message: message.toObject() as unknown as never,
          channelId,
        });
        logger.debug(
          { socketId: socket.id, channelId, messageId: message._id },
          'Socket: chat:send processed',
        );
      } catch (err) {
        logger.error({ socketId: socket.id, channelId, err }, 'Socket: chat:send failed');
      }
    });

    // Join all user's chat channels on connect
    socket.on('chat:join_channels', async () => {
      const userId = socket.data.userId;
      const tenantId = socket.data.tenantId;
      if (!userId || !tenantId) return;

      try {
        const tenantDb = getTenantConnection(tenantId);
        const channelSvc = new ChatChannelService(tenantDb);
        const result = (await channelSvc.listForUser(userId, {
          page: 1,
          limit: 200,
          isArchived: false,
        })) as { channels: Array<{ _id: string }> };

        for (const ch of result.channels) {
          const room: SocketRoom = `chat:${ch._id}`;
          socket.join(room);
          socket.data.joinedRooms.add(room);
        }

        logger.debug(
          { socketId: socket.id, channelCount: result.channels.length },
          'Socket: chat:join_channels completed',
        );
      } catch (err) {
        logger.error({ socketId: socket.id, err }, 'Socket: chat:join_channels failed');
      }
    });

    // ── Disconnect ────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      logger.debug({ socketId: socket.id, reason }, 'Socket disconnected');
    });

    // ── Error Handling ────────────────────────────────────────
    socket.on('error', (error) => {
      logger.error({ socketId: socket.id, error }, 'Socket error');
    });
  });

  // ── Decorate Fastify with Socket.io ───────────────────────
  fastify.decorate('io', io);

  // ── Graceful Shutdown ─────────────────────────────────────
  fastify.addHook('onClose', async () => {
    logger.info('Closing Socket.io connections...');
    io?.close();
  });

  logger.info('✅ Socket.io initialized');
}

// Export as Fastify plugin
export default fp(socketPluginImpl, {
  name: 'socket-io',
  fastify: '5.x',
});

// ── Type Augmentation for Fastify ───────────────────────────
declare module 'fastify' {
  interface FastifyInstance {
    io: TypedSocketServer;
  }
}
