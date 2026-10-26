/**
 * Chat Channel Model — Tenant DB
 *
 * Per DENTO_V2_MASTER_PLAN.md §37 — Internal Staff Chat System
 * 5 channel types: direct, branch, role, custom, announcement
 */

import type { Connection, Document, Model, Types } from 'mongoose';
import mongoose from 'mongoose';

// ── Channel Member ────────────────────────────────────────

export interface IChannelMember {
  userId: Types.ObjectId;
  role: 'admin' | 'member';
  joinedAt: Date;
  mutedUntil: Date | null;
  lastReadAt: Date;
}

// ── Last Message (denormalized) ───────────────────────────

export interface ILastMessage {
  text: string;
  senderId: Types.ObjectId;
  senderName: string;
  sentAt: Date;
}

// ── Channel Types ─────────────────────────────────────────

export type ChannelType = 'direct' | 'branch' | 'role' | 'custom' | 'announcement';

// ── Chat Channel ──────────────────────────────────────────

export interface IChatChannel extends Document {
  type: ChannelType;
  name: { en: string | null; ar: string | null };
  description: string | null;
  avatarUrl: string | null;
  members: IChannelMember[];
  branchId: Types.ObjectId | null;
  roleFilter: string | null;
  dmParticipants: [Types.ObjectId, Types.ObjectId] | null;
  lastMessage: ILastMessage | null;
  messageCount: number;
  isArchived: boolean;
  isPinned: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type ChatChannelModel = Model<IChatChannel>;

// ── Schema ────────────────────────────────────────────────

const channelMemberSchema = new mongoose.Schema<IChannelMember>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    mutedUntil: { type: Date, default: null },
    lastReadAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const lastMessageSchema = new mongoose.Schema<ILastMessage>(
  {
    text: { type: String, required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    senderName: { type: String, required: true },
    sentAt: { type: Date, required: true },
  },
  { _id: false },
);

const chatChannelSchema = new mongoose.Schema<IChatChannel>(
  {
    type: {
      type: String,
      enum: ['direct', 'branch', 'role', 'custom', 'announcement'],
      required: true,
    },
    name: {
      en: { type: String, default: null },
      ar: { type: String, default: null },
    },
    description: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    members: { type: [channelMemberSchema], default: [] },
    branchId: { type: mongoose.Schema.Types.ObjectId, default: null },
    roleFilter: { type: String, default: null },
    dmParticipants: {
      type: [mongoose.Schema.Types.ObjectId],
      default: null,
    },
    lastMessage: { type: lastMessageSchema, default: null },
    messageCount: { type: Number, default: 0 },
    isArchived: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  {
    timestamps: true,
    collection: 'chat_channels',
    versionKey: false,
  },
);

// ── Indexes ───────────────────────────────────────────────
chatChannelSchema.index({ 'members.userId': 1, type: 1 });
chatChannelSchema.index({ dmParticipants: 1 });
chatChannelSchema.index({ branchId: 1, type: 1 });
chatChannelSchema.index({ 'lastMessage.sentAt': -1 });

// ── WeakMap Model Cache ───────────────────────────────────

const modelCache = new WeakMap<Connection, ChatChannelModel>();

export function getChatChannelModel(connection: Connection): ChatChannelModel {
  if (!modelCache.has(connection)) {
    const model = connection.model<IChatChannel>('ChatChannel', chatChannelSchema);
    modelCache.set(connection, model);
  }
  return modelCache.get(connection)!;
}
