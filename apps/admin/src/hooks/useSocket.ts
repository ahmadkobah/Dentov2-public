/**
 * useSocket — Socket.io client hook for real-time events
 *
 * Connects to the API via Socket.io, joins the user's room,
 * and exposes an event listener interface. Auto-reconnects on
 * disconnect and cleans up on unmount.
 *
 * Uses the same API URL as the REST client (VITE_API_URL).
 */

import { useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth.store.js';
import { notificationKeys } from '../features/notifications/hooks/useNotifications.js';
import { playNotificationSound, type SoundPreset } from '../lib/notification-sounds.js';
import { registerPushNotifications } from '../lib/push-notifications.js';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || '';

let globalSocket: Socket | null = null;

/** Current sound preset — updated from preferences */
let currentSoundPreset: SoundPreset = 'chime';

export function setNotificationSoundPreset(preset: SoundPreset) {
  currentSoundPreset = preset;
}

/**
 * Hook that manages Socket.io connection lifecycle and
 * auto-invalidates notification queries on `notification:new`.
 *
 * Mount this ONCE at the app root level (e.g., in App.tsx or AppHeader).
 */
export function useSocket(): {
  socket: Socket | null;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
} {
  const qc = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const { user, accessToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !accessToken) {
      // Disconnect if logged out
      if (globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
        socketRef.current = null;
      }
      return;
    }

    // Subscribe this browser to web push (no-ops gracefully without VAPID key /
    // service-worker / browser support; sends the subscription to the API).
    void registerPushNotifications(API_URL, accessToken);

    // Reuse existing connection if still connected or connecting
    if (globalSocket && !globalSocket.disconnected) {
      socketRef.current = globalSocket;
      return;
    }

    const socket = io(API_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    globalSocket = socket;
    socketRef.current = socket;

    socket.on('connect', () => {
      // Join user-specific room for notifications
      socket.emit('join', { room: `user:${user.id}` });
    });

    // Real-time notification: invalidate React Query cache + play sound
    socket.on('notification:new', (notification) => {
      qc.invalidateQueries({ queryKey: notificationKeys.lists() });
      qc.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      playNotificationSound(currentSoundPreset);
      // Surface a toast for the live notification (persistent list shows the
      // locale-resolved text; this transient toast uses the EN title).
      toast(notification?.title?.en ?? 'New notification');
    });

    // No cleanup disconnect — this is a global singleton that should
    // survive React Strict Mode double-invokes. Disconnection is
    // handled by the auth guard at the top of this effect when
    // credentials change or the user logs out.
  }, [isAuthenticated, user?.id, accessToken, qc]);

  const joinRoom = useCallback((room: string) => {
    socketRef.current?.emit('join', { room });
  }, []);

  const leaveRoom = useCallback((room: string) => {
    socketRef.current?.emit('leave', { room });
  }, []);

  return { socket: socketRef.current, joinRoom, leaveRoom };
}
