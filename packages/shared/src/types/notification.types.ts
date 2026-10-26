// ── Notification System Types ───────────────────────────────
// Based on DENTO_V2_MASTER_PLAN.md §20 (Notifications & Messaging System)

// ── Notification Categories ─────────────────────────────────

export type NotificationCategory =
  | 'appointment'
  | 'payment'
  | 'clinical'
  | 'inventory'
  | 'system'
  | 'marketing'
  | 'recall'
  | 'queue';

export type NotificationTrigger = 'automatic' | 'manual' | 'scheduled';

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'push' | 'inApp';

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';

export type NotificationVariant = 'info' | 'success' | 'warning' | 'error';

// ── Bilingual Content Type ──────────────────────────────────

export interface BilingualContent {
  en: string;
  ar: string;
}

// ── Template Variable ───────────────────────────────────────

export interface TemplateVariable {
  key: string;
  label: BilingualContent;
  isRequired: boolean;
}

// ── Channel-Specific Templates ──────────────────────────────

export interface EmailChannelTemplate {
  isEnabled: boolean;
  subject: BilingualContent;
  body: BilingualContent; // HTML with variables
}

export interface SmsChannelTemplate {
  isEnabled: boolean;
  template: BilingualContent; // Plaintext, max 160 chars
}

export interface WhatsAppChannelTemplate {
  isEnabled: boolean;
  template: BilingualContent;
  templateId?: string; // WhatsApp Business Template ID
}

export interface PushChannelTemplate {
  isEnabled: boolean;
  title: BilingualContent;
  body: BilingualContent;
}

export interface InAppChannelTemplate {
  isEnabled: boolean;
  title: BilingualContent;
  body: BilingualContent;
  icon?: string; // Lucide icon name
  actionUrl?: string;
}

export interface NotificationChannels {
  email?: EmailChannelTemplate | null;
  sms?: SmsChannelTemplate | null;
  whatsapp?: WhatsAppChannelTemplate | null;
  push?: PushChannelTemplate | null;
  inApp?: InAppChannelTemplate | null;
}

// ── Template Schedule ───────────────────────────────────────

export interface TemplateSchedule {
  beforeMinutes?: number; // e.g., 1440 = 24h before appointment
  afterMinutes?: number; // e.g., 60 = 1h after treatment
  cronExpression?: string; // e.g., "0 18 * * *" for daily recalls
}

// ── Notification Template ───────────────────────────────────

export interface INotificationTemplate {
  _id: string;
  key: string; // Unique key (e.g., "appointment_reminder_24h")
  name: BilingualContent;
  description?: string;
  category: NotificationCategory;
  trigger: NotificationTrigger;
  channels: NotificationChannels;
  variables: TemplateVariable[];
  schedule?: TemplateSchedule;
  isActive: boolean;
  isSystem: boolean; // System templates cannot be deleted
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

// ── In-App Notification (Extended) ──────────────────────────

export interface RelatedEntity {
  type: 'appointment' | 'patient' | 'invoice' | 'walk_in' | 'treatment_plan' | 'stock_item';
  id: string;
}

export interface INotification {
  _id: string;
  userId: string;
  recipientRole?: string;
  title: BilingualContent;
  body: BilingualContent;
  icon?: string;
  variant: NotificationVariant;
  actionUrl?: string;
  actionLabel?: BilingualContent;
  category: NotificationCategory;
  relatedEntity?: RelatedEntity;
  isRead: boolean;
  readAt?: string;
  isDismissed: boolean;
  templateKey?: string;
  tenantId: string;
  createdAt: string;
  expiresAt?: string;
}

// ── Notification Log ────────────────────────────────────────

export interface INotificationLog {
  _id: string;
  templateKey: string;
  channel: NotificationChannel;
  recipient: string; // Email/phone/device token
  patientId?: string;
  userId?: string;
  subject?: string; // Only for email
  body: string; // Rendered message
  variables: Record<string, string>;
  status: NotificationStatus;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string;
  relatedEntity?: RelatedEntity;
  providerMessageId?: string; // Twilio SID, Resend ID, etc.
  providerResponse?: Record<string, unknown>;
  tenantId: string;
  createdAt: string;
}

// ── Notification Preferences ────────────────────────────────

export interface ChannelPreference {
  isEnabled: boolean;
  address?: string; // Override email/phone
}

export interface CategoryPreference {
  isEnabled: boolean;
  channels: NotificationChannel[];
}

export interface INotificationPreferences {
  _id: string;
  userId?: string;
  patientId?: string;
  channels: {
    email: ChannelPreference;
    sms: ChannelPreference;
    whatsapp: ChannelPreference;
    push: { isEnabled: boolean };
    inApp: { isEnabled: boolean };
  };
  categories: {
    appointment: CategoryPreference;
    payment: CategoryPreference;
    clinical: CategoryPreference;
    inventory: CategoryPreference;
    system: CategoryPreference;
    marketing: CategoryPreference;
    recall: CategoryPreference;
  };
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string; // "08:00"
  timezone?: string; // "Africa/Cairo"
  digestMode: 'realtime' | 'daily' | 'weekly';
  digestTime?: string; // "09:00"
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

// ── Device Token (for Push Notifications) ───────────────────

export interface IDeviceToken {
  _id: string;
  userId: string;
  token: string;
  platform: 'web' | 'ios' | 'android';
  deviceName?: string;
  isActive: boolean;
  lastUsedAt: string;
  tenantId: string;
  createdAt: string;
}

// ── Alert Rule ──────────────────────────────────────────────

export type AlertTriggerType =
  | 'inventory_low_stock'
  | 'inventory_expiring'
  | 'invoice_overdue'
  | 'no_show_rate_high'
  | 'revenue_drop'
  | 'appointment_utilization_low'
  | 'payment_pending'
  | 'custom';

export type AlertConditionOperator = 'lt' | 'lte' | 'gt' | 'gte' | 'eq';

export interface AlertCondition {
  metric: string;
  operator: AlertConditionOperator;
  threshold: number;
  timeWindowDays?: number;
}

export interface AlertScope {
  branchId?: string;
  categoryId?: string;
  doctorId?: string;
}

export interface AlertAction {
  type: 'notify_roles' | 'notify_users' | 'webhook' | 'email';
  target: string[]; // Role names or User IDs
  channel?: NotificationChannel;
}

export interface IAlertRule {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: AlertTriggerType;
  condition: AlertCondition;
  scope?: AlertScope;
  actions: AlertAction[];
  cooldownMinutes: number;
  lastTriggeredAt?: string;
  triggerCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── BullMQ Job Payloads ─────────────────────────────────────

export interface EmailJobPayload {
  to: string;
  subject: string;
  html: string;
  templateKey: string;
  tenantId: string;
  logId: string;
}

export interface SmsJobPayload {
  to: string;
  body: string;
  templateKey: string;
  tenantId: string;
  logId: string;
}

export interface WhatsAppJobPayload {
  to: string;
  templateId: string;
  variables: Record<string, string>;
  body?: string;
  templateKey: string;
  tenantId: string;
  logId: string;
}

export interface PushJobPayload {
  tokens: string[];
  /** Parallel array — platform per token ('web' | 'ios' | 'android'). Falls back to 'web' if absent. */
  tokenPlatforms?: Array<'web' | 'ios' | 'android'>;
  title: string;
  body: string;
  data?: Record<string, string>;
  templateKey: string;
  tenantId: string;
  logId: string;
}

// ── Service Input Types ─────────────────────────────────────

export interface SendNotificationInput {
  templateKey: string;
  tenantId: string;
  recipients: {
    userId?: string;
    patientId?: string;
    email?: string;
    phone?: string;
  }[];
  variables: Record<string, string>;
  relatedEntity?: RelatedEntity;
  channels?: NotificationChannel[]; // Override template channels
  scheduledAt?: Date; // For delayed sending
}

export interface CreateInAppNotificationInput {
  userId: string;
  tenantId: string;
  title: BilingualContent;
  body: BilingualContent;
  icon?: string;
  variant?: NotificationVariant;
  category: NotificationCategory;
  actionUrl?: string;
  actionLabel?: BilingualContent;
  relatedEntity?: RelatedEntity;
  templateKey?: string;
  expiresAt?: Date;
}
