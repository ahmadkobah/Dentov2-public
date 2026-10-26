import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';
import type {
  NotificationCategory,
  NotificationTrigger,
  NotificationChannel,
  NotificationStatus,
  NotificationVariant,
  BilingualContent,
  AlertTriggerType,
  AlertConditionOperator,
} from '@dento/shared';

/**
 * Notification Models — Tenant Database (tenant_{slug})
 *
 * Per MASTER_PLAN §20 - Notifications & Messaging System
 *
 * Collections:
 * - notification_templates: Reusable templates for all channels
 * - notifications: In-App notifications (shown in bell dropdown)
 * - notification_logs: Delivery audit trail
 * - notification_preferences: User/Patient channel preferences
 * - device_tokens: Push notification device registration
 * - alert_rules: Configurable automated alerts
 */

// ── Shared Sub-Schemas ──────────────────────────────────────

const bilingualSchema = new Schema<BilingualContent>(
  {
    en: { type: String, required: true },
    ar: { type: String, required: true },
  },
  { _id: false },
);

const relatedEntitySchema = new Schema(
  {
    type: {
      type: String,
      enum: ['appointment', 'patient', 'invoice', 'walk_in', 'treatment_plan', 'stock_item'],
      required: true,
    },
    id: { type: Schema.Types.ObjectId, required: true },
  },
  { _id: false },
);

// ── Notification Template ───────────────────────────────────

export interface INotificationTemplateDoc extends Document {
  key: string;
  name: { en: string; ar: string };
  description?: string;
  category: NotificationCategory;
  trigger: NotificationTrigger;
  channels: {
    email?: {
      isEnabled: boolean;
      subject: { en: string; ar: string };
      body: { en: string; ar: string };
    };
    sms?: {
      isEnabled: boolean;
      template: { en: string; ar: string };
    };
    whatsapp?: {
      isEnabled: boolean;
      template: { en: string; ar: string };
      templateId?: string;
    };
    push?: {
      isEnabled: boolean;
      title: { en: string; ar: string };
      body: { en: string; ar: string };
    };
    inApp?: {
      isEnabled: boolean;
      title: { en: string; ar: string };
      body: { en: string; ar: string };
      icon?: string;
      actionUrl?: string;
    };
  };
  variables: Array<{
    key: string;
    label: { en: string; ar: string };
    isRequired: boolean;
  }>;
  schedule?: {
    beforeMinutes?: number;
    afterMinutes?: number;
    cronExpression?: string;
  };
  isActive: boolean;
  isSystem: boolean;
  tenantId: string;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationTemplateSchema = new Schema<INotificationTemplateDoc>(
  {
    key: { type: String, required: true },
    name: { type: bilingualSchema, required: true },
    description: { type: String },
    category: {
      type: String,
      enum: [
        'appointment',
        'payment',
        'clinical',
        'inventory',
        'system',
        'marketing',
        'recall',
        'queue',
      ],
      required: true,
    },
    trigger: {
      type: String,
      enum: ['automatic', 'manual', 'scheduled'],
      required: true,
    },
    channels: {
      email: {
        isEnabled: { type: Boolean, default: false },
        subject: bilingualSchema,
        body: bilingualSchema,
      },
      sms: {
        isEnabled: { type: Boolean, default: false },
        template: bilingualSchema,
      },
      whatsapp: {
        isEnabled: { type: Boolean, default: false },
        template: bilingualSchema,
        templateId: String,
      },
      push: {
        isEnabled: { type: Boolean, default: false },
        title: bilingualSchema,
        body: bilingualSchema,
      },
      inApp: {
        isEnabled: { type: Boolean, default: true },
        title: bilingualSchema,
        body: bilingualSchema,
        icon: String,
        actionUrl: String,
      },
    },
    variables: [
      {
        key: { type: String, required: true },
        label: bilingualSchema,
        isRequired: { type: Boolean, default: false },
      },
    ],
    schedule: {
      beforeMinutes: Number,
      afterMinutes: Number,
      cronExpression: String,
    },
    isActive: { type: Boolean, default: true },
    isSystem: { type: Boolean, default: false },
    tenantId: { type: String, required: true },

    // Standard Fields
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

notificationTemplateSchema.index({ key: 1, tenantId: 1 }, { unique: true });
notificationTemplateSchema.index({ category: 1, trigger: 1, isActive: 1 });

// ── In-App Notification ─────────────────────────────────────

export interface INotificationDoc extends Document {
  userId: Types.ObjectId;
  recipientRole?: string;
  title: { en: string; ar: string };
  body: { en: string; ar: string };
  icon?: string;
  variant: NotificationVariant;
  actionUrl?: string;
  actionLabel?: { en: string; ar: string };
  category: NotificationCategory;
  relatedEntity?: {
    type: string;
    id: Types.ObjectId;
  };
  isRead: boolean;
  readAt?: Date;
  isDismissed: boolean;
  templateKey?: string;
  tenantId: string;
  expiresAt?: Date;
  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
}

const notificationSchema = new Schema<INotificationDoc>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    recipientRole: String,
    title: { type: bilingualSchema, required: true },
    body: { type: bilingualSchema, required: true },
    icon: String,
    variant: {
      type: String,
      enum: ['info', 'success', 'warning', 'error'],
      default: 'info',
    },
    actionUrl: String,
    actionLabel: bilingualSchema,
    category: {
      type: String,
      enum: [
        'appointment',
        'payment',
        'clinical',
        'inventory',
        'system',
        'marketing',
        'recall',
        'queue',
      ],
      required: true,
    },
    relatedEntity: relatedEntitySchema,
    isRead: { type: Boolean, default: false },
    readAt: Date,
    isDismissed: { type: Boolean, default: false },
    templateKey: String,
    tenantId: { type: String, required: true },
    expiresAt: Date,

    // Standard Fields
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, category: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1, expiresAt: 1 });
notificationSchema.index({ tenantId: 1, createdAt: -1 });

// ── Notification Log ────────────────────────────────────────

export interface INotificationLogDoc extends Document {
  templateKey: string;
  channel: NotificationChannel;
  recipient: string;
  patientId?: Types.ObjectId;
  userId?: Types.ObjectId;
  subject?: string;
  body: string;
  variables: Record<string, string>;
  status: NotificationStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  relatedEntity?: {
    type: string;
    id: Types.ObjectId;
  };
  providerMessageId?: string;
  providerResponse?: Record<string, unknown>;
  tenantId: string;
  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
}

const notificationLogSchema = new Schema<INotificationLogDoc>(
  {
    templateKey: { type: String, required: true },
    channel: {
      type: String,
      enum: ['email', 'sms', 'whatsapp', 'push'],
      required: true,
    },
    recipient: { type: String, required: true },
    patientId: Schema.Types.ObjectId,
    userId: Schema.Types.ObjectId,
    subject: String,
    body: { type: String, required: true },
    variables: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'],
      default: 'pending',
    },
    sentAt: Date,
    deliveredAt: Date,
    failedAt: Date,
    errorMessage: String,
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    nextRetryAt: Date,
    relatedEntity: relatedEntitySchema,
    providerMessageId: String,
    providerResponse: Schema.Types.Mixed,
    tenantId: { type: String, required: true },

    // Standard Fields
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

notificationLogSchema.index({ tenantId: 1, createdAt: -1 });
notificationLogSchema.index({ channel: 1, status: 1 });
notificationLogSchema.index({ patientId: 1, createdAt: -1 });
notificationLogSchema.index({ templateKey: 1, status: 1, createdAt: -1 });
notificationLogSchema.index({ status: 1, nextRetryAt: 1 }); // For retry worker

// ── Notification Preferences ────────────────────────────────

export interface INotificationPreferencesDoc extends Document {
  userId?: Types.ObjectId;
  patientId?: Types.ObjectId;
  channels: {
    email: { isEnabled: boolean; address?: string };
    sms: { isEnabled: boolean; phone?: string };
    whatsapp: { isEnabled: boolean; phone?: string };
    push: { isEnabled: boolean };
    inApp: { isEnabled: boolean };
  };
  categories: {
    appointment: { isEnabled: boolean; channels: NotificationChannel[] };
    payment: { isEnabled: boolean; channels: NotificationChannel[] };
    clinical: { isEnabled: boolean; channels: NotificationChannel[] };
    inventory: { isEnabled: boolean; channels: NotificationChannel[] };
    system: { isEnabled: boolean; channels: NotificationChannel[] };
    marketing: { isEnabled: boolean; channels: NotificationChannel[] };
    recall: { isEnabled: boolean; channels: NotificationChannel[] };
  };
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
  digestMode: 'realtime' | 'daily' | 'weekly';
  digestTime?: string;
  soundPreset: 'chime' | 'bell' | 'drop' | 'pulse' | 'none';
  tenantId: string;
  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const channelPreferenceSchema = new Schema(
  {
    isEnabled: { type: Boolean, default: true },
    address: String,
    phone: String,
  },
  { _id: false },
);

const categoryPreferenceSchema = new Schema(
  {
    isEnabled: { type: Boolean, default: true },
    channels: [{ type: String, enum: ['email', 'sms', 'whatsapp', 'push', 'inApp'] }],
  },
  { _id: false },
);

const notificationPreferencesSchema = new Schema<INotificationPreferencesDoc>(
  {
    userId: Schema.Types.ObjectId,
    patientId: Schema.Types.ObjectId,
    channels: {
      email: { type: channelPreferenceSchema, default: () => ({ isEnabled: true }) },
      sms: { type: channelPreferenceSchema, default: () => ({ isEnabled: true }) },
      whatsapp: { type: channelPreferenceSchema, default: () => ({ isEnabled: true }) },
      push: { isEnabled: { type: Boolean, default: true } },
      inApp: { isEnabled: { type: Boolean, default: true } },
    },
    categories: {
      appointment: {
        type: categoryPreferenceSchema,
        default: () => ({ isEnabled: true, channels: ['email', 'whatsapp', 'inApp'] }),
      },
      payment: {
        type: categoryPreferenceSchema,
        default: () => ({ isEnabled: true, channels: ['email', 'inApp'] }),
      },
      clinical: {
        type: categoryPreferenceSchema,
        default: () => ({ isEnabled: true, channels: ['inApp'] }),
      },
      inventory: {
        type: categoryPreferenceSchema,
        default: () => ({ isEnabled: true, channels: ['inApp', 'email'] }),
      },
      system: {
        type: categoryPreferenceSchema,
        default: () => ({ isEnabled: true, channels: ['inApp'] }),
      },
      marketing: {
        type: categoryPreferenceSchema,
        default: () => ({ isEnabled: true, channels: ['email', 'whatsapp'] }),
      },
      recall: {
        type: categoryPreferenceSchema,
        default: () => ({ isEnabled: true, channels: ['whatsapp', 'sms', 'email'] }),
      },
    },
    quietHoursStart: String, // "22:00"
    quietHoursEnd: String, // "08:00"
    timezone: String,
    digestMode: {
      type: String,
      enum: ['realtime', 'daily', 'weekly'],
      default: 'realtime',
    },
    digestTime: String,
    soundPreset: {
      type: String,
      enum: ['chime', 'bell', 'drop', 'pulse', 'none'],
      default: 'chime',
    },
    tenantId: { type: String, required: true },

    // Standard Fields
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

notificationPreferencesSchema.index({ userId: 1, tenantId: 1 }, { unique: true, sparse: true });
notificationPreferencesSchema.index({ patientId: 1, tenantId: 1 }, { unique: true, sparse: true });

// ── Device Token ────────────────────────────────────────────

export interface IDeviceTokenDoc extends Document {
  userId: Types.ObjectId;
  token: string;
  platform: 'web' | 'ios' | 'android';
  deviceName?: string;
  isActive: boolean;
  lastUsedAt: Date;
  tenantId: string;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
}

const deviceTokenSchema = new Schema<IDeviceTokenDoc>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    token: { type: String, required: true },
    platform: {
      type: String,
      enum: ['web', 'ios', 'android'],
      required: true,
    },
    deviceName: String,
    isActive: { type: Boolean, default: true },
    lastUsedAt: { type: Date, default: Date.now },
    tenantId: { type: String, required: true },

    // Standard Fields
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

deviceTokenSchema.index({ userId: 1, platform: 1 });
deviceTokenSchema.index({ token: 1 }, { unique: true });
deviceTokenSchema.index({ isActive: 1, lastUsedAt: 1 });

// ── Alert Rule ──────────────────────────────────────────────

export interface IAlertRuleDoc extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: AlertTriggerType;
  condition: {
    metric: string;
    operator: AlertConditionOperator;
    threshold: number;
    timeWindowDays?: number;
  };
  scope?: {
    branchId?: Types.ObjectId;
    categoryId?: Types.ObjectId;
    doctorId?: Types.ObjectId;
  };
  actions: Array<{
    type: 'notify_roles' | 'notify_users' | 'webhook' | 'email';
    target: string[];
    channel?: NotificationChannel;
  }>;
  cooldownMinutes: number;
  lastTriggeredAt?: Date;
  triggerCount: number;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId | null;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

const alertRuleSchema = new Schema<IAlertRuleDoc>(
  {
    name: { type: String, required: true },
    description: String,
    isActive: { type: Boolean, default: true },
    triggerType: {
      type: String,
      enum: [
        'inventory_low_stock',
        'inventory_expiring',
        'invoice_overdue',
        'no_show_rate_high',
        'revenue_drop',
        'appointment_utilization_low',
        'payment_pending',
        'custom',
      ],
      required: true,
    },
    condition: {
      metric: { type: String, required: true },
      operator: {
        type: String,
        enum: ['lt', 'lte', 'gt', 'gte', 'eq'],
        required: true,
      },
      threshold: { type: Number, required: true },
      timeWindowDays: Number,
    },
    scope: {
      branchId: Schema.Types.ObjectId,
      categoryId: Schema.Types.ObjectId,
      doctorId: Schema.Types.ObjectId,
    },
    actions: [
      {
        type: {
          type: String,
          enum: ['notify_roles', 'notify_users', 'webhook', 'email'],
          required: true,
        },
        target: [String],
        channel: {
          type: String,
          enum: ['email', 'sms', 'whatsapp', 'push', 'inApp'],
        },
      },
    ],
    cooldownMinutes: { type: Number, default: 60 },
    lastTriggeredAt: Date,
    triggerCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, required: true },
    tenantId: { type: String, required: true },

    // Standard Fields
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

alertRuleSchema.index({ triggerType: 1, isActive: 1 });
alertRuleSchema.index({ lastTriggeredAt: 1 });
alertRuleSchema.index({ tenantId: 1 });

// ── Model Factory Functions ─────────────────────────────────

export function createNotificationTemplateModel(
  connection: Connection,
): Model<INotificationTemplateDoc> {
  return (connection.models.NotificationTemplate ||
    connection.model(
      'NotificationTemplate',
      notificationTemplateSchema,
    )) as Model<INotificationTemplateDoc>;
}

export function createNotificationModel(connection: Connection): Model<INotificationDoc> {
  return (connection.models.Notification ||
    connection.model('Notification', notificationSchema)) as Model<INotificationDoc>;
}

export function createNotificationLogModel(connection: Connection): Model<INotificationLogDoc> {
  return (connection.models.NotificationLog ||
    connection.model('NotificationLog', notificationLogSchema)) as Model<INotificationLogDoc>;
}

export function createNotificationPreferencesModel(
  connection: Connection,
): Model<INotificationPreferencesDoc> {
  return (connection.models.NotificationPreferences ||
    connection.model(
      'NotificationPreferences',
      notificationPreferencesSchema,
    )) as Model<INotificationPreferencesDoc>;
}

export function createDeviceTokenModel(connection: Connection): Model<IDeviceTokenDoc> {
  return (connection.models.DeviceToken ||
    connection.model('DeviceToken', deviceTokenSchema)) as Model<IDeviceTokenDoc>;
}

export function createAlertRuleModel(connection: Connection): Model<IAlertRuleDoc> {
  return (connection.models.AlertRule ||
    connection.model('AlertRule', alertRuleSchema)) as Model<IAlertRuleDoc>;
}
