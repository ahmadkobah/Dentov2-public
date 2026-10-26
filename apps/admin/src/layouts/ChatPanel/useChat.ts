/**
 * useChat — React Query hooks for Staff Chat (§37).
 *
 * Endpoints per chat.route.ts:
 *   GET    /api/chat/channels              — list channels for user
 *   POST   /api/chat/channels              — create channel
 *   GET    /api/chat/channels/:id          — get channel
 *   PATCH  /api/chat/channels/:id          — update channel
 *   DELETE /api/chat/channels/:id          — archive channel
 *   POST   /api/chat/channels/:id/members  — add members
 *   DELETE /api/chat/channels/:id/members/:userId — remove member
 *   POST   /api/chat/channels/:id/read     — mark read
 *   GET    /api/chat/channels/:id/messages — list messages (cursor-based)
 *   POST   /api/chat/channels/:id/messages — send message
 *   PATCH  /api/chat/messages/:id          — edit message
 *   DELETE /api/chat/messages/:id          — delete message
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import { apiClient } from '@/lib/api-client.js';
import type { PaginationMeta } from '@/lib/types.js';

// ── Types ──────────────────────────────────────────────────

export type ChannelType = 'direct' | 'branch' | 'role' | 'custom' | 'announcement';
export type MessageType = 'text' | 'image' | 'file' | 'voice' | 'system';

export interface ChannelMember {
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
  mutedUntil?: string;
  lastReadAt?: string;
}

export interface LastMessage {
  text: string;
  senderId: string;
  senderName: string;
  sentAt: string;
}

export interface ChatChannel {
  _id: string;
  type: ChannelType;
  name?: { en: string; ar: string };
  description?: string;
  avatarUrl?: string;
  members: ChannelMember[];
  branchId?: string;
  roleFilter?: string;
  dmParticipants?: string[];
  lastMessage?: LastMessage;
  messageCount: number;
  isArchived: boolean;
  isPinned: boolean;
  createdBy: string;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatAttachment {
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  thumbnailUrl?: string;
}

export interface ChatMessage {
  _id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderAvatarUrl?: string;
  type: MessageType;
  text?: string;
  attachments: ChatAttachment[];
  replyToId?: string;
  replyPreview?: { text: string; senderName: string };
  readBy: { userId: string; readAt: string }[];
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
}

export interface ChannelQuery {
  type?: ChannelType;
  search?: string;
  isArchived?: boolean;
  page?: number;
  limit?: number;
}

export interface MessageQuery {
  before?: string;
  after?: string;
  limit?: number;
}

export interface CreateChannelInput {
  type: ChannelType;
  name?: { en: string; ar: string };
  description?: string;
  memberIds?: string[];
  branchId?: string;
  roleFilter?: string;
}

export interface CreateMessageInput {
  type?: MessageType;
  text?: string;
  attachments?: { filename: string; url: string; mimeType: string; size: number }[];
  replyToId?: string;
}

// ── Response Types ─────────────────────────────────────────

interface ChannelListResponse {
  success: true;
  data: { channels: ChatChannel[]; pagination: PaginationMeta };
}

interface ChannelResponse {
  success: true;
  data: { channel: ChatChannel };
}

interface MessageListResponse {
  success: true;
  data: { messages: ChatMessage[]; hasMore: boolean };
}

interface MessageResponse {
  success: true;
  data: { message: ChatMessage };
}

// ── Query Keys ─────────────────────────────────────────────

export const chatKeys = {
  all: ['chat'] as const,
  channels: () => [...chatKeys.all, 'channels'] as const,
  channelList: (q: ChannelQuery) => [...chatKeys.channels(), q] as const,
  channel: (id: string) => [...chatKeys.channels(), id] as const,
  messages: (channelId: string) => [...chatKeys.all, 'messages', channelId] as const,
};

// ── Channel Queries ────────────────────────────────────────

export function useChannelList(query: ChannelQuery = {}, enabled = true) {
  return useQuery({
    queryKey: chatKeys.channelList(query),
    queryFn: () =>
      apiClient.get<ChannelListResponse>('/api/chat/channels', {
        params: query as unknown as Record<string, string>,
      }),
    select: (res) => ({
      channels: res.data.channels,
      meta: res.data.pagination,
    }),
    enabled,
    refetchInterval: enabled ? 30_000 : false, // poll every 30s only when active
  });
}

export function useChannelDetail(id: string) {
  return useQuery({
    queryKey: chatKeys.channel(id),
    queryFn: () => apiClient.get<ChannelResponse>(`/api/chat/channels/${id}`),
    select: (res) => res.data.channel,
    enabled: !!id,
  });
}

// ── Message Queries (infinite scroll, cursor-based) ────────

export function useMessageList(channelId: string) {
  return useInfiniteQuery({
    queryKey: chatKeys.messages(channelId),
    queryFn: ({ pageParam }) =>
      apiClient.get<MessageListResponse>(`/api/chat/channels/${channelId}/messages`, {
        params: {
          ...(pageParam ? { before: pageParam } : {}),
          limit: '50',
        } as Record<string, string>,
      }),
    getNextPageParam: (lastPage) => {
      if (!lastPage.data.hasMore || lastPage.data.messages.length === 0) return undefined;
      return lastPage.data.messages[lastPage.data.messages.length - 1]._id;
    },
    initialPageParam: undefined as string | undefined,
    enabled: !!channelId,
  });
}

// ── Channel Mutations ──────────────────────────────────────

export function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateChannelInput) =>
      apiClient.post<ChannelResponse>('/api/chat/channels', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chatKeys.channels() });
      toast.success('Channel created');
    },
    onError: () => {
      toast.error('Failed to create channel');
    },
  });
}

export function useArchiveChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) =>
      apiClient.delete<ChannelResponse>(`/api/chat/channels/${channelId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chatKeys.channels() });
      toast.success('Channel archived');
    },
    onError: () => {
      toast.error('Failed to archive channel');
    },
  });
}

// ── Message Mutations ──────────────────────────────────────

export function useSendMessage(channelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMessageInput) =>
      apiClient.post<MessageResponse>(`/api/chat/channels/${channelId}/messages`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chatKeys.messages(channelId) });
      qc.invalidateQueries({ queryKey: chatKeys.channels() });
    },
    onError: () => {
      toast.error('Failed to send message');
    },
  });
}

export function useEditMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, text }: { messageId: string; text: string }) =>
      apiClient.patch<MessageResponse>(`/api/chat/messages/${messageId}`, { text }),
    onSuccess: () => {
      // We don't know the channelId here, invalidate all messages
      qc.invalidateQueries({ queryKey: chatKeys.all });
    },
    onError: () => {
      toast.error('Failed to edit message');
    },
  });
}

export function useDeleteMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) =>
      apiClient.delete<MessageResponse>(`/api/chat/messages/${messageId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chatKeys.all });
    },
    onError: () => {
      toast.error('Failed to delete message');
    },
  });
}

export function useMarkChannelRead(channelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<{ success: true }>(`/api/chat/channels/${channelId}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chatKeys.channels() });
    },
  });
}

// ── Upload Mutation ────────────────────────────────────────

interface UploadUrlResponse {
  success: true;
  data: {
    uploadUrl: string;
    fileUrl: string;
    key: string;
  };
}

export interface ChatUploadResult {
  filename: string;
  url: string;
  mimeType: string;
  size: number;
}

/**
 * Two-step upload: 1) get pre-signed URL from API, 2) PUT file to the URL.
 * Returns the public file URL + metadata for sending as a message attachment.
 */
export function useChatUpload() {
  return useMutation({
    mutationFn: async (file: File): Promise<ChatUploadResult> => {
      // Step 1 – request a pre-signed upload URL
      const { data } = await apiClient.post<UploadUrlResponse>('/api/chat/upload', {
        filename: file.name,
        contentType: file.type,
      });

      // Step 2 – upload the file directly to storage
      await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      return {
        filename: file.name,
        url: data.fileUrl,
        mimeType: file.type,
        size: file.size,
      };
    },
  });
}
