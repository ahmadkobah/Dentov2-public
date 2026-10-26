/**
 * Chat Service — Business Logic
 *
 * Per DENTO_V2_MASTER_PLAN.md §37 — Internal Staff Chat System
 *
 * Two classes:
 *   - ChatChannelService — Channel CRUD, member management
 *   - ChatMessageService — Message CRUD, read receipts
 */

import type { Connection } from 'mongoose';
import type {
  CreateChannelInput,
  UpdateChannelInput,
  ChannelQueryInput,
  AddMembersInput,
  CreateMessageInput,
  MessageQueryInput,
} from '@dento/shared';
import { getChatChannelModel } from '../models/chat-channel.model.js';
import { getChatMessageModel } from '../models/chat-message.model.js';
import { ApiError } from '../../utils/api-response.js';
import { regexContains } from './search.helpers.js';
import { NotificationService } from '../../services/notification.service.js';
import { logger } from '../../utils/logger.js';
import mongoose from 'mongoose';

// ── Max edit window (15 min) ──────────────────────────────

const EDIT_WINDOW_MS = 15 * 60 * 1000;

// =====================================================================
// Chat Channel Service
// =====================================================================

export class ChatChannelService {
  private ChannelModel;

  constructor(private tenantDb: Connection) {
    this.ChannelModel = getChatChannelModel(tenantDb);
  }

  /**
   * List channels for a user (with unread count)
   */
  async listForUser(userId: string, query: ChannelQueryInput): Promise<unknown> {
    const { type, search, isArchived, page, limit } = query;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      'members.userId': new mongoose.Types.ObjectId(userId),
      isArchived: isArchived ?? false,
    };

    if (type) filter.type = type;
    if (search) {
      filter.$or = [{ 'name.en': regexContains(search) }, { 'name.ar': regexContains(search) }];
    }

    const [channels, total] = await Promise.all([
      this.ChannelModel.find(filter)
        .sort({ isPinned: -1, 'lastMessage.sentAt': -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.ChannelModel.countDocuments(filter),
    ]);

    // Compute unread counts
    const channelsWithUnread = channels.map((ch) => {
      const member = ch.members.find((m) => m.userId.toString() === userId);
      const lastReadAt = member?.lastReadAt ?? new Date(0);
      return {
        ...ch,
        unreadCount: 0, // Will be computed via aggregation below
        isMuted: member?.mutedUntil ? new Date(member.mutedUntil) > new Date() : false,
        lastReadAt,
      };
    });

    // Batch compute unread counts via aggregation
    if (channelsWithUnread.length > 0) {
      const MessageModel = getChatMessageModel(this.tenantDb);
      for (const ch of channelsWithUnread) {
        const unread = await MessageModel.countDocuments({
          channelId: ch._id,
          createdAt: { $gt: ch.lastReadAt },
          senderId: { $ne: new mongoose.Types.ObjectId(userId) },
          isDeleted: false,
        });
        ch.unreadCount = unread;
      }
    }

    return {
      channels: channelsWithUnread,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get channel by ID (with membership check)
   */
  async getById(channelId: string, userId: string) {
    const channel = await this.ChannelModel.findById(channelId).lean();
    if (!channel) throw new ApiError(404, 'Channel not found', 'CHANNEL_NOT_FOUND');

    const isMember = channel.members.some((m) => m.userId.toString() === userId);
    if (!isMember) throw new ApiError(403, 'Not a member of this channel', 'NOT_CHANNEL_MEMBER');

    return channel;
  }

  /**
   * Create a new channel
   */
  async create(data: CreateChannelInput, userId: string, _userName: string) {
    // Direct messages — find or create
    if (data.type === 'direct') {
      if (!data.memberIds || data.memberIds.length !== 1) {
        throw new ApiError(400, 'DM requires exactly one other member', 'INVALID_DM_MEMBERS');
      }
      const otherId = data.memberIds[0];
      if (otherId === userId) {
        throw new ApiError(400, 'Cannot create DM with yourself', 'SELF_DM');
      }

      // Check for existing DM
      const existing = await this.ChannelModel.findOne({
        type: 'direct',
        dmParticipants: {
          $all: [new mongoose.Types.ObjectId(userId), new mongoose.Types.ObjectId(otherId)],
        },
      });
      if (existing) return existing;

      const channel = await this.ChannelModel.create({
        type: 'direct',
        name: { en: null, ar: null },
        dmParticipants: [new mongoose.Types.ObjectId(userId), new mongoose.Types.ObjectId(otherId)],
        members: [
          { userId: new mongoose.Types.ObjectId(userId), role: 'admin' },
          { userId: new mongoose.Types.ObjectId(otherId), role: 'member' },
        ],
        createdBy: new mongoose.Types.ObjectId(userId),
      });
      return channel;
    }

    // Custom or announcement channels
    if (data.type !== 'custom' && data.type !== 'announcement') {
      throw new ApiError(
        400,
        'Only direct, custom, and announcement channels can be manually created',
        'INVALID_CHANNEL_TYPE',
      );
    }

    const members = [
      { userId: new mongoose.Types.ObjectId(userId), role: 'admin' as const },
      ...(data.memberIds ?? [])
        .filter((id) => id !== userId)
        .map((id) => ({
          userId: new mongoose.Types.ObjectId(id),
          role: 'member' as const,
        })),
    ];

    const channel = await this.ChannelModel.create({
      type: data.type,
      name: data.name ?? { en: null, ar: null },
      description: data.description ?? null,
      avatarUrl: data.avatarUrl ?? null,
      members,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    return channel;
  }

  /**
   * Update channel (name, description, avatar, pin)
   */
  async update(channelId: string, data: UpdateChannelInput, userId: string) {
    const channel = await this.ChannelModel.findById(channelId);
    if (!channel) throw new ApiError(404, 'Channel not found', 'CHANNEL_NOT_FOUND');

    const member = channel.members.find((m) => m.userId.toString() === userId);
    if (!member) throw new ApiError(403, 'Not a member', 'NOT_CHANNEL_MEMBER');
    if (member.role !== 'admin' && channel.type !== 'direct') {
      throw new ApiError(403, 'Only channel admins can update', 'NOT_CHANNEL_ADMIN');
    }

    if (data.name) channel.name = data.name as typeof channel.name;
    if (data.description !== undefined) channel.description = data.description ?? null;
    if (data.avatarUrl !== undefined) channel.avatarUrl = data.avatarUrl ?? null;
    if (data.isPinned !== undefined) channel.isPinned = data.isPinned;

    await channel.save();
    return channel;
  }

  /**
   * Archive channel (soft-delete)
   */
  async archive(channelId: string, userId: string) {
    const channel = await this.ChannelModel.findById(channelId);
    if (!channel) throw new ApiError(404, 'Channel not found', 'CHANNEL_NOT_FOUND');

    const member = channel.members.find((m) => m.userId.toString() === userId);
    if (!member || member.role !== 'admin') {
      throw new ApiError(403, 'Only channel admins can archive', 'NOT_CHANNEL_ADMIN');
    }

    channel.isArchived = true;
    await channel.save();
    return channel;
  }

  /**
   * Add members to channel
   */
  async addMembers(channelId: string, data: AddMembersInput, userId: string) {
    const channel = await this.ChannelModel.findById(channelId);
    if (!channel) throw new ApiError(404, 'Channel not found', 'CHANNEL_NOT_FOUND');

    if (channel.type === 'direct') {
      throw new ApiError(400, 'Cannot add members to DM', 'INVALID_DM_OPERATION');
    }

    const member = channel.members.find((m) => m.userId.toString() === userId);
    if (!member || member.role !== 'admin') {
      throw new ApiError(403, 'Only admins can add members', 'NOT_CHANNEL_ADMIN');
    }

    const existingIds = new Set(channel.members.map((m) => m.userId.toString()));
    const newMembers = data.memberIds
      .filter((id) => !existingIds.has(id))
      .map((id) => ({
        userId: new mongoose.Types.ObjectId(id),
        role: 'member' as const,
        joinedAt: new Date(),
        mutedUntil: null,
        lastReadAt: new Date(),
      }));

    if (newMembers.length > 0) {
      channel.members.push(...newMembers);
      await channel.save();
    }

    return channel;
  }

  /**
   * Remove member from channel
   */
  async removeMember(channelId: string, targetUserId: string, userId: string) {
    const channel = await this.ChannelModel.findById(channelId);
    if (!channel) throw new ApiError(404, 'Channel not found', 'CHANNEL_NOT_FOUND');

    if (channel.type === 'direct') {
      throw new ApiError(400, 'Cannot remove members from DM', 'INVALID_DM_OPERATION');
    }

    const member = channel.members.find((m) => m.userId.toString() === userId);
    const isAdminOrSelf = member?.role === 'admin' || targetUserId === userId;
    if (!isAdminOrSelf) {
      throw new ApiError(403, 'Only admins can remove members', 'NOT_CHANNEL_ADMIN');
    }

    channel.members = channel.members.filter(
      (m) => m.userId.toString() !== targetUserId,
    ) as typeof channel.members;
    await channel.save();

    return channel;
  }

  /**
   * Mark channel as read
   */
  async markRead(channelId: string, userId: string) {
    await this.ChannelModel.updateOne(
      { _id: channelId, 'members.userId': new mongoose.Types.ObjectId(userId) },
      { $set: { 'members.$.lastReadAt': new Date() } },
    );
  }

  /**
   * Create auto-channels (branch/role/announcement)
   * Called during tenant/branch/user provisioning
   */
  async createAutoChannel(
    type: 'branch' | 'role' | 'announcement',
    opts: {
      name: { en: string; ar?: string };
      branchId?: string;
      roleFilter?: string;
      createdBy: string;
      memberIds: string[];
    },
  ) {
    return this.ChannelModel.create({
      type,
      name: { en: opts.name.en, ar: opts.name.ar ?? null },
      branchId: opts.branchId ? new mongoose.Types.ObjectId(opts.branchId) : null,
      roleFilter: opts.roleFilter ?? null,
      members: opts.memberIds.map((id) => ({
        userId: new mongoose.Types.ObjectId(id),
        role: 'member' as const,
      })),
      createdBy: new mongoose.Types.ObjectId(opts.createdBy),
    });
  }
}

// =====================================================================
// Chat Message Service
// =====================================================================

export class ChatMessageService {
  private MessageModel;
  private ChannelModel;

  constructor(private tenantDb: Connection) {
    this.MessageModel = getChatMessageModel(tenantDb);
    this.ChannelModel = getChatChannelModel(tenantDb);
  }

  /**
   * List messages (paginated cursor-based)
   */
  async list(channelId: string, userId: string, query: MessageQueryInput) {
    // Verify membership
    const channel = await this.ChannelModel.findById(channelId).lean();
    if (!channel) throw new ApiError(404, 'Channel not found', 'CHANNEL_NOT_FOUND');

    const isMember = channel.members.some((m) => m.userId.toString() === userId);
    if (!isMember) throw new ApiError(403, 'Not a member', 'NOT_CHANNEL_MEMBER');

    const filter: Record<string, unknown> = {
      channelId: new mongoose.Types.ObjectId(channelId),
    };

    // Cursor-based pagination
    if (query.before) {
      filter.createdAt = { $lt: new Date(query.before) };
    } else if (query.after) {
      filter.createdAt = { $gt: new Date(query.after) };
    }

    const messages = await this.MessageModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(query.limit)
      .lean();

    return {
      messages: messages.reverse(), // oldest first
      hasMore: messages.length === query.limit,
    };
  }

  /**
   * Send a message
   */
  async send(
    channelId: string,
    data: CreateMessageInput,
    sender: { userId: string; name: string; role: string; avatarUrl?: string },
  ) {
    // Verify membership
    const channel = await this.ChannelModel.findById(channelId);
    if (!channel) throw new ApiError(404, 'Channel not found', 'CHANNEL_NOT_FOUND');

    const isMember = channel.members.some((m) => m.userId.toString() === sender.userId);
    if (!isMember) throw new ApiError(403, 'Not a member', 'NOT_CHANNEL_MEMBER');

    // Announcement channels: only admins can send
    if (channel.type === 'announcement') {
      const member = channel.members.find((m) => m.userId.toString() === sender.userId);
      if (member?.role !== 'admin') {
        throw new ApiError(
          403,
          'Only admins can post in announcement channels',
          'NOT_ANNOUNCEMENT_ADMIN',
        );
      }
    }

    // Build reply preview if replying
    let replyPreview = null;
    if (data.replyToId) {
      const original = await this.MessageModel.findById(data.replyToId).lean();
      if (original) {
        replyPreview = {
          text: original.text?.substring(0, 100) || '[attachment]',
          senderName: original.senderName,
        };
      }
    }

    const message = await this.MessageModel.create({
      channelId: new mongoose.Types.ObjectId(channelId),
      senderId: new mongoose.Types.ObjectId(sender.userId),
      senderName: sender.name,
      senderRole: sender.role,
      senderAvatarUrl: sender.avatarUrl ?? null,
      type: data.type ?? 'text',
      text: data.text ?? null,
      attachments: data.attachments ?? [],
      replyToId: data.replyToId ? new mongoose.Types.ObjectId(data.replyToId) : null,
      replyPreview,
      readBy: [{ userId: new mongoose.Types.ObjectId(sender.userId), readAt: new Date() }],
    });

    // Update channel last message + increment count
    await this.ChannelModel.findByIdAndUpdate(channelId, {
      lastMessage: {
        text: data.text || `[${data.type ?? 'file'}]`,
        senderId: new mongoose.Types.ObjectId(sender.userId),
        senderName: sender.name,
        sentAt: message.createdAt,
      },
      $inc: { messageCount: 1 },
    });

    // Notify other channel members (fire-and-forget)
    const otherMembers = channel.members
      .filter((m) => m.userId.toString() !== sender.userId)
      .map((m) => ({ userId: m.userId.toString() }));

    if (otherMembers.length > 0) {
      const tenantSlug = this.tenantDb.name?.replace('tenant_', '') || '';
      const svc = new NotificationService(this.tenantDb, tenantSlug);
      svc
        .send({
          templateKey: 'chat.message_received',
          tenantId: tenantSlug,
          recipients: otherMembers,
          variables: {
            senderName: sender.name,
            messagePreview: (data.text || `[${data.type ?? 'file'}]`).substring(0, 100),
            channelName:
              (typeof channel.name === 'object'
                ? (channel.name as { en?: string }).en
                : (channel.name as string)) || 'Direct Message',
          },
        })
        .catch((err) => {
          logger.warn(
            { error: err instanceof Error ? err.message : 'unknown' },
            'Chat notification failed (non-fatal)',
          );
        });
    }

    return message;
  }

  /**
   * Edit a message (own message, within 15 min)
   */
  async edit(messageId: string, text: string, userId: string) {
    const message = await this.MessageModel.findById(messageId);
    if (!message) throw new ApiError(404, 'Message not found', 'MESSAGE_NOT_FOUND');
    if (message.senderId.toString() !== userId) {
      throw new ApiError(403, 'Can only edit your own messages', 'NOT_MESSAGE_OWNER');
    }
    if (message.isDeleted) {
      throw new ApiError(400, 'Cannot edit deleted message', 'MESSAGE_DELETED');
    }

    const age = Date.now() - message.createdAt.getTime();
    if (age > EDIT_WINDOW_MS) {
      throw new ApiError(400, 'Edit window expired (15 min)', 'EDIT_WINDOW_EXPIRED');
    }

    message.text = text;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    return message;
  }

  /**
   * Soft-delete a message
   */
  async delete(messageId: string, userId: string, isAdmin = false) {
    const message = await this.MessageModel.findById(messageId);
    if (!message) throw new ApiError(404, 'Message not found', 'MESSAGE_NOT_FOUND');

    if (message.senderId.toString() !== userId && !isAdmin) {
      throw new ApiError(403, 'Can only delete your own messages', 'NOT_MESSAGE_OWNER');
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.text = null;
    message.attachments = [];
    await message.save();

    return message;
  }

  /**
   * Mark messages as read
   */
  async markRead(channelId: string, userId: string) {
    const objectUserId = new mongoose.Types.ObjectId(userId);

    // Mark all unread messages in channel as read
    await this.MessageModel.updateMany(
      {
        channelId: new mongoose.Types.ObjectId(channelId),
        'readBy.userId': { $ne: objectUserId },
        isDeleted: false,
      },
      {
        $push: { readBy: { userId: objectUserId, readAt: new Date() } },
      },
    );

    // Also update channel member's lastReadAt
    await this.ChannelModel.updateOne(
      { _id: channelId, 'members.userId': objectUserId },
      { $set: { 'members.$.lastReadAt': new Date() } },
    );
  }
}
