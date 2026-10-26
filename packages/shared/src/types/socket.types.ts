// ── Socket.io Event Types ───────────────────────────────────
// Based on DENTO_V2_MASTER_PLAN.md §18 (Real-Time via Socket.io)

// ── Room Types ──────────────────────────────────────────────

/**
 * Socket.io room patterns:
 * - `branch:${branchId}:daily-ops` - Daily Operations Hub (queue updates)
 * - `user:${userId}` - User-specific notifications
 * - `tenant:${tenantId}:chairs` - Chair status updates
 */
export type SocketRoom =
  | `branch:${string}:daily-ops`
  | `user:${string}`
  | `tenant:${string}:chairs`
  | `chat:${string}`;

// ── Queue Update Events ─────────────────────────────────────

export type QueueEventType =
  | 'walk_in_created'
  | 'walk_in_status_changed'
  | 'walk_in_registered'
  | 'walk_in_converted'
  | 'queue_reordered'
  | 'patient_called'
  | 'treatment_started'
  | 'treatment_completed'
  | 'patient_no_show'
  | 'patient_cancelled'
  | 'appointment_created'
  | 'appointment_updated'
  | 'appointment_status_changed'
  | 'appointment_arrived'
  | 'appointment_no_show'
  | 'appointment_rescheduled'
  | 'appointment_handoff'
  | 'chair_assigned'
  | 'chair_freed'
  | 'queue_stats_updated';

export interface QueueUpdateEvent {
  type: QueueEventType;
  data: {
    id: string;
    branchId: string;
    timestamp: string;
    // Additional data varies by event type
    [key: string]: unknown;
  };
}

// ── Chair Status Events ─────────────────────────────────────

export type ChairStatus = 'available' | 'occupied' | 'reserved' | 'maintenance';

export interface ChairStatusEvent {
  chairId: string;
  chairNumber: number;
  status: ChairStatus;
  branchId: string;
  floor?: string;
  patientId?: string;
  patientName?: string;
  doctorId?: string;
  doctorName?: string;
  startedAt?: string;
  estimatedEndAt?: string;
}

// ── Notification Events ─────────────────────────────────────

export type NotificationType =
  | 'appointment_reminder'
  | 'appointment_arrived'
  | 'appointment_no_show'
  | 'auto_no_show'
  | 'walk_in_created'
  | 'walk_in_called'
  | 'invoice_paid'
  | 'inventory_low_stock'
  | 'inventory_expiring_soon'
  | 'task_assigned'
  | 'message_received';

export interface InAppNotification {
  _id?: string;
  userId: string;
  tenantId: string;
  type: NotificationType;
  title: {
    en: string;
    ar: string;
  };
  body: {
    en: string;
    ar: string;
  };
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
}

// ── Server-to-Client Events ─────────────────────────────────

export interface ChatMessageEvent {
  message: {
    _id: string;
    channelId: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    senderAvatarUrl: string | null;
    type: 'text' | 'image' | 'file' | 'voice' | 'system';
    text: string | null;
    attachments: Array<{
      filename: string;
      url: string;
      mimeType: string;
      size: number;
      thumbnailUrl?: string;
    }>;
    replyToId: string | null;
    replyPreview: { text: string; senderName: string } | null;
    isEdited: boolean;
    createdAt: string;
  };
  channelId: string;
}

export interface ChatTypingEvent {
  channelId: string;
  userId: string;
  userName: string;
}

export interface ChatReadEvent {
  channelId: string;
  userId: string;
  readAt: string;
}

export interface ServerToClientEvents {
  // Queue/Daily Operations events
  'queue:update': (event: QueueUpdateEvent) => void;

  // Chair status events
  'chair:status': (event: ChairStatusEvent) => void;

  // Notification events
  'notification:new': (notification: InAppNotification) => void;

  // Chat events (§37)
  'chat:message': (event: ChatMessageEvent) => void;
  'chat:typing': (event: ChatTypingEvent) => void;
  'chat:read': (event: ChatReadEvent) => void;
  'chat:message_edited': (event: {
    messageId: string;
    channelId: string;
    text: string;
    editedAt: string;
  }) => void;
  'chat:message_deleted': (event: { messageId: string; channelId: string }) => void;

  // Locale/Settings events
  'locale:changed': (event: { locale: string; tenantId: string }) => void;

  // Connection events
  connected: (data: { socketId: string; userId?: string }) => void;
}

// ── Client-to-Server Events ─────────────────────────────────

export interface ClientToServerEvents {
  // Room management
  join: (data: { room: SocketRoom }) => void;
  leave: (data: { room: SocketRoom }) => void;

  // Notification actions
  'notification:mark_read': (data: { notificationId: string }) => void;
  'notification:dismiss': (data: { notificationId: string }) => void;

  // Chair actions (for real-time status reporting)
  'chair:update_status': (data: {
    chairId: string;
    status: ChairStatus;
    patientId?: string;
  }) => void;

  // Chat actions (§37)
  'chat:send': (data: {
    channelId: string;
    text?: string;
    attachments?: Array<{
      filename: string;
      url: string;
      mimeType: string;
      size: number;
      thumbnailUrl?: string;
    }>;
    replyToId?: string;
  }) => void;
  'chat:typing': (data: { channelId: string }) => void;
  'chat:read': (data: { channelId: string; messageId?: string }) => void;
  'chat:join_channels': () => void;
}

// ── Inter-Server Events (for Redis adapter) ─────────────────

export interface InterServerEvents {
  ping: () => void;
}

// ── Socket Data (attached to each socket) ───────────────────

export interface SocketData {
  userId?: string;
  tenantId?: string;
  branchId?: string;
  joinedRooms: Set<SocketRoom>;
}
