/**
 * Chat Message Model — Tenant DB
 *
 * Per DENTO_V2_MASTER_PLAN.md §37 — Internal Staff Chat System
 * Message types: text, image, file, voice, system
 * TTL: 365 days (configurable)
 */

import type { Connection, Document, Model, Types } from 'mongoose';
import mongoose from 'mongoose';
import { fieldEncryptionPlugin } from '../../utils/mongoose-field-encryption.plugin.js';

// ── Attachment ────────────────────────────────────────────

export interface IChatAttachment {
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  thumbnailUrl?: string;
}

// ── Read Receipt ──────────────────────────────────────────

export interface IReadReceipt {
  userId: Types.ObjectId;
  readAt: Date;
}

// ── Reply Preview (denormalized) ──────────────────────────

export interface IReplyPreview {
  text: string;
  senderName: string;
}

// ── Message Types ─────────────────────────────────────────

export type MessageType = 'text' | 'image' | 'file' | 'voice' | 'system';

// ── Chat Message ──────────────────────────────────────────

export interface IChatMessage extends Document {
  channelId: Types.ObjectId;
  senderId: Types.ObjectId;
  senderName: string;
  senderRole: string;
  senderAvatarUrl: string | null;
  type: MessageType;
  text: string | null;
  attachments: IChatAttachment[];
  replyToId: Types.ObjectId | null;
  replyPreview: IReplyPreview | null;
  readBy: IReadReceipt[];
  isEdited: boolean;
  editedAt: Date | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
}

export type ChatMessageModel = Model<IChatMessage>;

// ── Schema ────────────────────────────────────────────────

const chatAttachmentSchema = new mongoose.Schema<IChatAttachment>(
  {
    filename: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    thumbnailUrl: { type: String },
  },
  { _id: false },
);

const readReceiptSchema = new mongoose.Schema<IReadReceipt>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const replyPreviewSchema = new mongoose.Schema<IReplyPreview>(
  {
    text: { type: String, required: true },
    senderName: { type: String, required: true },
  },
  { _id: false },
);

const chatMessageSchema = new mongoose.Schema<IChatMessage>(
  {
    channelId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'ChatChannel' },
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, required: true },
    senderAvatarUrl: { type: String, default: null },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'voice', 'system'],
      default: 'text',
    },
    text: { type: String, default: null },
    attachments: { type: [chatAttachmentSchema], default: [] },
    replyToId: { type: mongoose.Schema.Types.ObjectId, default: null },
    replyPreview: { type: replyPreviewSchema, default: null },
    readBy: { type: [readReceiptSchema], default: [] },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'chat_messages',
    versionKey: false,
  },
);

// ── Indexes ───────────────────────────────────────────────
chatMessageSchema.index({ channelId: 1, createdAt: -1 });
chatMessageSchema.index({ channelId: 1, senderId: 1, createdAt: -1 });

// TTL Index — 365 days (auto-delete old messages)
chatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// ── Field-Level Encryption (HIPAA/GDPR — C-1) ──────────────────
chatMessageSchema.plugin(fieldEncryptionPlugin, {
  fields: ['text', 'replyPreview.text'],
});

// ── WeakMap Model Cache ───────────────────────────────────

const modelCache = new WeakMap<Connection, ChatMessageModel>();

export function getChatMessageModel(connection: Connection): ChatMessageModel {
  if (!modelCache.has(connection)) {
    const model = connection.model<IChatMessage>('ChatMessage', chatMessageSchema);
    modelCache.set(connection, model);
  }
  return modelCache.get(connection)!;
}
