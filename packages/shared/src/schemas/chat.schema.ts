/**
 * Chat Schemas — Zod Validation
 *
 * Per DENTO_V2_MASTER_PLAN.md §37 — Internal Staff Chat System
 */

import { z } from 'zod';

// ── Enums ─────────────────────────────────────────────────

export const channelTypeEnum = z.enum(['direct', 'branch', 'role', 'custom', 'announcement']);
export const messageTypeEnum = z.enum(['text', 'image', 'file', 'voice', 'system']);

// ── Channel Schemas ───────────────────────────────────────

export const createChannelSchema = z
  .object({
    type: channelTypeEnum,
    name: z
      .object({
        en: z.string().min(1).max(100).nullable().optional(),
        ar: z.string().min(1).max(100).nullable().optional(),
      })
      .optional(),
    description: z.string().max(500).nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
    memberIds: z.array(z.string()).min(1).optional(),
    branchId: z.string().nullable().optional(),
    roleFilter: z.string().nullable().optional(),
  })
  .strict();

export const updateChannelSchema = z
  .object({
    name: z
      .object({
        en: z.string().min(1).max(100).nullable().optional(),
        ar: z.string().min(1).max(100).nullable().optional(),
      })
      .optional(),
    description: z.string().max(500).nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
    isPinned: z.boolean().optional(),
  })
  .strict();

export const channelQuerySchema = z.object({
  type: channelTypeEnum.optional(),
  search: z.string().optional(),
  isArchived: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional().prefault('1'),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .optional()
    .prefault('50'),
});

export const addMembersSchema = z
  .object({
    memberIds: z.array(z.string()).min(1).max(50),
  })
  .strict();

// ── Message Schemas ───────────────────────────────────────

export const createMessageSchema = z
  .object({
    type: messageTypeEnum.optional().default('text'),
    text: z.string().max(5000).nullable().optional(),
    attachments: z
      .array(
        z.object({
          filename: z.string(),
          url: z.string().url(),
          mimeType: z.string(),
          size: z.number().int().positive(),
          thumbnailUrl: z.string().url().optional(),
        }),
      )
      .max(10)
      .optional(),
    replyToId: z.string().nullable().optional(),
  })
  .strict();

export const editMessageSchema = z
  .object({
    text: z.string().min(1).max(5000),
  })
  .strict();

export const messageQuerySchema = z.object({
  before: z.string().optional(),
  after: z.string().optional(),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .optional()
    .prefault('50'),
});

// ── Types ─────────────────────────────────────────────────

export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;
export type ChannelQueryInput = z.infer<typeof channelQuerySchema>;
export type AddMembersInput = z.infer<typeof addMembersSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
export type MessageQueryInput = z.infer<typeof messageQuerySchema>;
