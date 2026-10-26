/**
 * Notification React Query Hooks
 *
 * Per ADMIN_PORTAL_SCREENS.md §20 — Notifications & Messaging System
 * API: GET/PATCH /api/notifications/* (11 endpoints in notifications.route.ts)
 *
 * Pattern: query key factory → useQuery → useMutation + invalidateQueries
 * Reference: usePatients.ts (BUILD_RULES §8.3)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import { apiClient } from '@/lib/api-client.js';
import { useAuthStore } from '@/stores/auth.store.js';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/types.js';

// ── Types ───────────────────────────────────────────────────

export interface Notification {
  _id: string;
  // Matches the API NotificationModel fields (category + body), not type/message
  category:
    | 'appointment'
    | 'payment'
    | 'clinical'
    | 'inventory'
    | 'system'
    | 'marketing'
    | 'recall'
    | 'queue';
  title: string | { en: string; ar: string };
  body: string | { en: string; ar: string };
  isRead: boolean;
  isDismissed: boolean;
  actionUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationListFilters {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  category?: Notification['category'];
}

interface NotificationListResponse {
  success: true;
  data: Notification[];
  meta?: PaginationMeta;
}

interface UnreadCountResponse {
  success: true;
  data: { unreadCount: number };
}

// ── Query Keys ──────────────────────────────────────────────

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: NotificationListFilters) => [...notificationKeys.lists(), filters] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

// ── Query Hooks ─────────────────────────────────────────────

export function useNotificationList(filters: NotificationListFilters = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const params: Record<string, string> = {};
  if (filters.limit) params.limit = String(filters.limit);
  if (filters.offset) params.offset = String(filters.offset);
  if (filters.unreadOnly !== undefined) params.unreadOnly = String(filters.unreadOnly);
  if (filters.category) params.category = filters.category;

  return useQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: () => apiClient.get<NotificationListResponse>('/api/notifications', { params }),
    select: (res) => ({
      notifications: res.data,
      pagination: res.meta,
    }),
    enabled: isAuthenticated,
  });
}

export function useUnreadCount() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => apiClient.get<UnreadCountResponse>('/api/notifications/unread-count'),
    select: (res) => res.data.unreadCount,
    refetchInterval: 30_000, // poll every 30 s
    enabled: isAuthenticated,
  });
}

// ── Mutation Hooks ──────────────────────────────────────────

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<ApiSuccessResponse<{ marked: boolean }>>(`/api/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.lists() });
      qc.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      toast.success('Marked as read');
    },
    onError: () => {
      toast.error('Failed to mark as read');
    },
  });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.patch<ApiSuccessResponse<{ markedCount: number }>>('/api/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.lists() });
      qc.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      toast.success('All notifications marked as read');
    },
    onError: () => {
      toast.error('Failed to mark all as read');
    },
  });
}

export function useDismissNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<ApiSuccessResponse<{ dismissed: boolean }>>(
        `/api/notifications/${id}/dismiss`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.lists() });
      qc.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      toast.success('Notification dismissed');
    },
    onError: () => {
      toast.error('Failed to dismiss notification');
    },
  });
}
