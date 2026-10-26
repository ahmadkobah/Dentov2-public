/**
 * Notification Service — BullMQ-powered multi-channel notifications
 *
 * Per DENTO_V2_MASTER_PLAN.md §20 - Notifications & Messaging System
 *
 * Features:
 * - In-App notifications (instant via Socket.io)
 * - Email notifications (BullMQ → Resend/Nodemailer)
 * - SMS notifications (BullMQ → Twilio)
 * - WhatsApp notifications (BullMQ → Meta Business API)
 * - Push notifications (BullMQ → FCM/APNs)
 * - Template-based rendering with i18n
 * - User preference checking
 * - Quiet hours support
 * - Retry logic with exponential backoff
 */

import { Queue, Worker, type Job } from 'bullmq';
import type { Connection } from 'mongoose';
import type { IPatient } from '../tenant/models/patient.model.js';
import type {
  NotificationChannel,
  NotificationCategory,
  BilingualContent,
  RelatedEntity,
  EmailJobPayload,
  SmsJobPayload,
  WhatsAppJobPayload,
  PushJobPayload,
  SendNotificationInput,
  CreateInAppNotificationInput,
} from '@dento/shared';
import {
  createNotificationTemplateModel,
  createNotificationModel,
  createNotificationLogModel,
  createNotificationPreferencesModel,
  createDeviceTokenModel,
  type INotificationTemplateDoc,
  type INotificationPreferencesDoc,
} from '../tenant/models/notification.model.js';
import { socketEmitter } from '../plugins/socket.plugin.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import Redis from 'ioredis';

// ── Provider Imports ────────────────────────────────────────
import { sendEmail } from './providers/email.provider.js';
import { sendSms } from './providers/sms.provider.js';
import { sendWhatsApp } from './providers/whatsapp.provider.js';
import { sendPush } from './providers/push.provider.js';
import { sendMobilePush } from './providers/mobile-push.provider.js';
import { ProviderCredentialsService } from './provider-credentials.service.js';
import { getTenantDb } from '../config/database.js';

// ── Redis Connection ────────────────────────────────────────

let redisConnection: Redis | null = null;

function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null, // Required for BullMQ
    });
  }
  return redisConnection;
}

// ── BullMQ Queues ───────────────────────────────────────────

const QUEUE_OPTIONS = {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000, // 2s, 4s, 8s
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs
  },
};

// Lazy-loaded queues (initialized on first use)
let emailQueue: Queue<EmailJobPayload> | null = null;
let smsQueue: Queue<SmsJobPayload> | null = null;
let whatsappQueue: Queue<WhatsAppJobPayload> | null = null;
let pushQueue: Queue<PushJobPayload> | null = null;

export function getEmailQueue(): Queue<EmailJobPayload> {
  if (!emailQueue) {
    emailQueue = new Queue<EmailJobPayload>('notification-email', QUEUE_OPTIONS);
  }
  return emailQueue;
}

export function getSmsQueue(): Queue<SmsJobPayload> {
  if (!smsQueue) {
    smsQueue = new Queue<SmsJobPayload>('notification-sms', QUEUE_OPTIONS);
  }
  return smsQueue;
}

export function getWhatsAppQueue(): Queue<WhatsAppJobPayload> {
  if (!whatsappQueue) {
    whatsappQueue = new Queue<WhatsAppJobPayload>('notification-whatsapp', QUEUE_OPTIONS);
  }
  return whatsappQueue;
}

export function getPushQueue(): Queue<PushJobPayload> {
  if (!pushQueue) {
    pushQueue = new Queue<PushJobPayload>('notification-push', QUEUE_OPTIONS);
  }
  return pushQueue;
}

// ── Variable Replacement ────────────────────────────────────

function replaceVariables(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || `{{${key}}}`);
}

function renderBilingual(
  content: BilingualContent,
  variables: Record<string, string>,
): BilingualContent {
  return {
    en: replaceVariables(content.en, variables),
    ar: replaceVariables(content.ar, variables),
  };
}

// ── Quiet Hours Check ───────────────────────────────────────

function isInQuietHours(preferences: INotificationPreferencesDoc | null): boolean {
  if (!preferences?.quietHoursStart || !preferences?.quietHoursEnd) {
    return false;
  }

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const start = preferences.quietHoursStart;
  const end = preferences.quietHoursEnd;

  // Handle overnight quiet hours (e.g., 22:00 - 08:00)
  if (start > end) {
    return currentTime >= start || currentTime < end;
  }
  return currentTime >= start && currentTime < end;
}

// ── Channel Validation ──────────────────────────────────────

function isChannelEnabled(
  preferences: INotificationPreferencesDoc | null,
  category: NotificationCategory,
  channel: NotificationChannel,
): boolean {
  if (!preferences) return true; // Default: all enabled

  // Check global channel toggle
  const channelSettings = preferences.channels[channel as keyof typeof preferences.channels];
  if (!channelSettings?.isEnabled) return false;

  // Check category-specific settings
  const categorySettings = preferences.categories[category as keyof typeof preferences.categories];
  if (!categorySettings?.isEnabled) return false;
  if (!categorySettings.channels.includes(channel)) return false;

  return true;
}

// ── Notification Service Class ──────────────────────────────

export class NotificationService {
  private dbConnection: Connection;
  private tenantId: string;

  constructor(dbConnection: Connection, tenantId: string) {
    this.dbConnection = dbConnection;
    this.tenantId = tenantId;
  }

  // ── Send Notification (Main Entry Point) ──────────────────

  async send(input: SendNotificationInput): Promise<{
    inApp: number;
    email: number;
    sms: number;
    whatsapp: number;
    push: number;
  }> {
    const NotificationTemplate = createNotificationTemplateModel(this.dbConnection);
    const NotificationPreferences = createNotificationPreferencesModel(this.dbConnection);

    // 1. Load template
    const template = await NotificationTemplate.findOne({
      key: input.templateKey,
      tenantId: input.tenantId,
      isActive: true,
    });

    if (!template) {
      logger.warn({ templateKey: input.templateKey }, 'Notification template not found');
      throw new Error(`Template not found: ${input.templateKey}`);
    }

    const stats = { inApp: 0, email: 0, sms: 0, whatsapp: 0, push: 0 };

    // 2. Process each recipient
    for (const recipient of input.recipients) {
      // Phase 2.9 — Load patient (if patientId given) to honor opt-out flags,
      // preferred channel, and auto-fill phone/email when not provided.
      let patientDoc: (IPatient & { _id: unknown }) | null = null;
      if (recipient.patientId) {
        try {
          const Patient = (await import('../tenant/models/patient.model.js')).getPatientModel(
            this.dbConnection,
          );
          patientDoc = (await Patient.findById(recipient.patientId)
            .select(
              'phone email smsOptOut emailOptOut whatsappOptOut preferredChannel marketingOptIn',
            )
            .lean()) as (IPatient & { _id: unknown }) | null;

          if (patientDoc) {
            if (!recipient.phone && patientDoc.phone) recipient.phone = patientDoc.phone;
            if (!recipient.email && patientDoc.email) recipient.email = patientDoc.email;
          }
        } catch (err) {
          logger.warn({ err }, 'Failed to load patient for notification opt-out check');
        }
      }

      // Load preferences (for user or patient)
      const preferences = recipient.userId
        ? await NotificationPreferences.findOne({
            userId: recipient.userId,
            tenantId: input.tenantId,
          })
        : recipient.patientId
          ? await NotificationPreferences.findOne({
              patientId: recipient.patientId,
              tenantId: input.tenantId,
            })
          : null;

      // Check quiet hours
      if (isInQuietHours(preferences)) {
        logger.debug({ recipient }, 'Skipping notification - quiet hours');
        continue;
      }

      // Determine channels to use
      let channels = input.channels || this.getEnabledChannels(template);

      // Phase 2.9 — Apply patient opt-outs (hard suppress) and preferredChannel filter
      if (patientDoc) {
        channels = channels.filter((ch) => {
          if (ch === 'sms' && patientDoc!.smsOptOut) return false;
          if (ch === 'email' && patientDoc!.emailOptOut) return false;
          if (ch === 'whatsapp' && patientDoc!.whatsappOptOut) return false;
          return true;
        });

        // If patient has a preferred channel and it's available in the template,
        // restrict to inApp + preferred channel only (so we don't spam every channel).
        const pref = patientDoc.preferredChannel;
        if (pref && channels.includes(pref)) {
          channels = channels.filter((ch) => ch === pref || ch === 'inApp');
        }

        // Suppress all marketing-class notifications when marketingOptIn is false.
        if (template.category === 'marketing' && !patientDoc.marketingOptIn) {
          logger.debug(
            { patientId: recipient.patientId, templateKey: template.key },
            'Skipping marketing notification — marketingOptIn=false',
          );
          continue;
        }
      }

      // 3. Send via each enabled channel
      for (const channel of channels) {
        if (!isChannelEnabled(preferences, template.category, channel)) {
          continue;
        }

        try {
          switch (channel) {
            case 'inApp':
              if (recipient.userId && template.channels.inApp?.isEnabled) {
                await this.sendInApp({
                  userId: recipient.userId,
                  tenantId: input.tenantId,
                  title: renderBilingual(template.channels.inApp.title, input.variables),
                  body: renderBilingual(template.channels.inApp.body, input.variables),
                  icon: template.channels.inApp.icon,
                  category: template.category,
                  actionUrl: template.channels.inApp.actionUrl,
                  relatedEntity: input.relatedEntity,
                  templateKey: template.key,
                });
                stats.inApp++;
              }
              break;

            case 'email':
              if (recipient.email && template.channels.email?.isEnabled) {
                await this.queueEmail({
                  to: recipient.email,
                  subject: replaceVariables(template.channels.email.subject.en, input.variables),
                  html: replaceVariables(template.channels.email.body.en, input.variables),
                  templateKey: template.key,
                  tenantId: input.tenantId,
                  patientId: recipient.patientId,
                  userId: recipient.userId,
                  variables: input.variables,
                  relatedEntity: input.relatedEntity,
                });
                stats.email++;
              }
              break;

            case 'sms':
              if (recipient.phone && template.channels.sms?.isEnabled) {
                await this.queueSms({
                  to: recipient.phone,
                  body: replaceVariables(template.channels.sms.template.en, input.variables),
                  templateKey: template.key,
                  tenantId: input.tenantId,
                  patientId: recipient.patientId,
                  userId: recipient.userId,
                  variables: input.variables,
                  relatedEntity: input.relatedEntity,
                });
                stats.sms++;
              }
              break;

            case 'whatsapp':
              if (recipient.phone && template.channels.whatsapp?.isEnabled) {
                const whatsappBody = (template.channels.whatsapp as Record<string, unknown>)
                  .template
                  ? replaceVariables(
                      (
                        (template.channels.whatsapp as Record<string, unknown>).template as {
                          en: string;
                        }
                      ).en,
                      input.variables,
                    )
                  : undefined;
                await this.queueWhatsApp({
                  to: recipient.phone,
                  templateId: template.channels.whatsapp.templateId || '',
                  variables: input.variables,
                  body: whatsappBody,
                  templateKey: template.key,
                  tenantId: input.tenantId,
                  patientId: recipient.patientId,
                  userId: recipient.userId,
                  relatedEntity: input.relatedEntity,
                });
                stats.whatsapp++;
              }
              break;

            case 'push':
              if (recipient.userId && template.channels.push?.isEnabled) {
                await this.queuePush({
                  userId: recipient.userId,
                  title: replaceVariables(template.channels.push.title.en, input.variables),
                  body: replaceVariables(template.channels.push.body.en, input.variables),
                  templateKey: template.key,
                  tenantId: input.tenantId,
                  variables: input.variables,
                  relatedEntity: input.relatedEntity,
                });
                stats.push++;
              }
              break;
          }
        } catch (error) {
          logger.error({ channel, recipient, error }, 'Failed to queue notification');
        }
      }
    }

    logger.info({ templateKey: input.templateKey, stats }, 'Notification batch sent');
    return stats;
  }

  // ── Get Enabled Channels from Template ────────────────────

  private getEnabledChannels(template: INotificationTemplateDoc): NotificationChannel[] {
    const channels: NotificationChannel[] = [];
    if (template.channels.inApp?.isEnabled) channels.push('inApp');
    if (template.channels.email?.isEnabled) channels.push('email');
    if (template.channels.sms?.isEnabled) channels.push('sms');
    if (template.channels.whatsapp?.isEnabled) channels.push('whatsapp');
    if (template.channels.push?.isEnabled) channels.push('push');
    return channels;
  }

  // ── Send In-App Notification (Instant) ────────────────────

  async sendInApp(input: CreateInAppNotificationInput): Promise<string> {
    const Notification = createNotificationModel(this.dbConnection);

    // relatedEntity.id is a string here; Mongoose casts it to ObjectId on write.
    // The payload is typed loosely so Mongoose 9's stricter create-casting (which
    // rejects the string id against the schema's ObjectId field) accepts it as-is.
    const notificationDoc: Record<string, unknown> = {
      userId: input.userId,
      title: input.title,
      body: input.body,
      icon: input.icon || 'bell',
      variant: input.variant || 'info',
      category: input.category,
      actionUrl: input.actionUrl,
      actionLabel: input.actionLabel,
      relatedEntity: input.relatedEntity,
      templateKey: input.templateKey,
      tenantId: input.tenantId,
      expiresAt: input.expiresAt,
      isRead: false,
      isDismissed: false,
    };
    const notification = await Notification.create(notificationDoc);

    // Emit via Socket.io for instant delivery
    socketEmitter.notification(input.userId, {
      _id: notification._id.toString(),
      userId: input.userId,
      tenantId: input.tenantId,
      type: 'task_assigned', // Map category to type
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl,
      isRead: false,
      isDismissed: false,
      createdAt: notification.createdAt.toISOString(),
    });

    logger.debug(
      { userId: input.userId, notificationId: notification._id },
      'In-App notification sent',
    );
    return notification._id.toString();
  }

  // ── Queue Email ───────────────────────────────────────────

  private async queueEmail(data: {
    to: string;
    subject: string;
    html: string;
    templateKey: string;
    tenantId: string;
    patientId?: string;
    userId?: string;
    variables: Record<string, string>;
    relatedEntity?: RelatedEntity;
  }): Promise<void> {
    const NotificationLog = createNotificationLogModel(this.dbConnection);

    // Create log entry first. relatedEntity.id is a string cast to ObjectId on
    // write; the payload is typed loosely so Mongoose 9's create-casting accepts it.
    const logEntry: Record<string, unknown> = {
      templateKey: data.templateKey,
      channel: 'email',
      recipient: data.to,
      patientId: data.patientId,
      userId: data.userId,
      subject: data.subject,
      body: data.html,
      variables: data.variables,
      status: 'pending',
      relatedEntity: data.relatedEntity,
      tenantId: data.tenantId,
    };
    const log = await NotificationLog.create(logEntry);

    // Queue job
    await getEmailQueue().add('send-email', {
      to: data.to,
      subject: data.subject,
      html: data.html,
      templateKey: data.templateKey,
      tenantId: data.tenantId,
      logId: log._id.toString(),
    });
  }

  // ── Queue SMS ─────────────────────────────────────────────

  private async queueSms(data: {
    to: string;
    body: string;
    templateKey: string;
    tenantId: string;
    patientId?: string;
    userId?: string;
    variables: Record<string, string>;
    relatedEntity?: RelatedEntity;
  }): Promise<void> {
    const NotificationLog = createNotificationLogModel(this.dbConnection);

    const logEntry: Record<string, unknown> = {
      templateKey: data.templateKey,
      channel: 'sms',
      recipient: data.to,
      patientId: data.patientId,
      userId: data.userId,
      body: data.body,
      variables: data.variables,
      status: 'pending',
      relatedEntity: data.relatedEntity,
      tenantId: data.tenantId,
    };
    const log = await NotificationLog.create(logEntry);

    await getSmsQueue().add('send-sms', {
      to: data.to,
      body: data.body,
      templateKey: data.templateKey,
      tenantId: data.tenantId,
      logId: log._id.toString(),
    });
  }

  // ── Queue WhatsApp ────────────────────────────────────────

  private async queueWhatsApp(data: {
    to: string;
    templateId: string;
    variables: Record<string, string>;
    body?: string;
    templateKey: string;
    tenantId: string;
    patientId?: string;
    userId?: string;
    relatedEntity?: RelatedEntity;
  }): Promise<void> {
    const NotificationLog = createNotificationLogModel(this.dbConnection);

    const logEntry: Record<string, unknown> = {
      templateKey: data.templateKey,
      channel: 'whatsapp',
      recipient: data.to,
      patientId: data.patientId,
      userId: data.userId,
      body: `WhatsApp Template: ${data.templateId}`,
      variables: data.variables,
      status: 'pending',
      relatedEntity: data.relatedEntity,
      tenantId: data.tenantId,
    };
    const log = await NotificationLog.create(logEntry);

    await getWhatsAppQueue().add('send-whatsapp', {
      to: data.to,
      templateId: data.templateId,
      variables: data.variables,
      body: data.body,
      templateKey: data.templateKey,
      tenantId: data.tenantId,
      logId: log._id.toString(),
    });
  }

  // ── Queue Push ────────────────────────────────────────────

  private async queuePush(data: {
    userId: string;
    title: string;
    body: string;
    templateKey: string;
    tenantId: string;
    variables: Record<string, string>;
    relatedEntity?: RelatedEntity;
  }): Promise<void> {
    const DeviceToken = createDeviceTokenModel(this.dbConnection);
    const NotificationLog = createNotificationLogModel(this.dbConnection);

    // Get all active device tokens for user
    const tokens = await DeviceToken.find({
      userId: data.userId,
      isActive: true,
      tenantId: data.tenantId,
    });

    if (tokens.length === 0) {
      logger.debug({ userId: data.userId }, 'No active device tokens for push');
      return;
    }

    const logEntry: Record<string, unknown> = {
      templateKey: data.templateKey,
      channel: 'push',
      recipient: data.userId,
      userId: data.userId,
      body: data.body,
      variables: data.variables,
      status: 'pending',
      relatedEntity: data.relatedEntity,
      tenantId: data.tenantId,
    };
    const log = await NotificationLog.create(logEntry);

    await getPushQueue().add('send-push', {
      tokens: tokens.map((t) => t.token),
      tokenPlatforms: tokens.map((t) => t.platform as 'web' | 'ios' | 'android'),
      title: data.title,
      body: data.body,
      templateKey: data.templateKey,
      tenantId: data.tenantId,
      logId: log._id.toString(),
    });
  }

  // ── Get Unread Count ──────────────────────────────────────

  async getUnreadCount(userId: string): Promise<number> {
    const Notification = createNotificationModel(this.dbConnection);
    return Notification.countDocuments({
      userId,
      isRead: false,
      isDismissed: false,
      tenantId: this.tenantId,
    });
  }

  // ── Get User Notifications ────────────────────────────────

  async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      category?: NotificationCategory;
    } = {},
  ): Promise<{ notifications: unknown[]; total: number }> {
    const Notification = createNotificationModel(this.dbConnection);
    const { limit = 20, offset = 0, unreadOnly = false, category } = options;

    const query: Record<string, unknown> = {
      userId,
      tenantId: this.tenantId,
      isDismissed: false,
    };

    if (unreadOnly) query.isRead = false;
    if (category) query.category = category;

    const [notifications, total] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      Notification.countDocuments(query),
    ]);

    return { notifications, total };
  }

  // ── Mark as Read ──────────────────────────────────────────

  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const Notification = createNotificationModel(this.dbConnection);
    const result = await Notification.updateOne(
      { _id: notificationId, userId, tenantId: this.tenantId },
      { $set: { isRead: true, readAt: new Date() } },
    );
    return result.modifiedCount > 0;
  }

  // ── Mark All as Read ──────────────────────────────────────

  async markAllAsRead(userId: string): Promise<number> {
    const Notification = createNotificationModel(this.dbConnection);
    const result = await Notification.updateMany(
      { userId, isRead: false, tenantId: this.tenantId },
      { $set: { isRead: true, readAt: new Date() } },
    );
    return result.modifiedCount;
  }

  // ── Dismiss Notification ──────────────────────────────────

  async dismiss(notificationId: string, userId: string): Promise<boolean> {
    const Notification = createNotificationModel(this.dbConnection);
    const result = await Notification.updateOne(
      { _id: notificationId, userId, tenantId: this.tenantId },
      { $set: { isDismissed: true } },
    );
    return result.modifiedCount > 0;
  }
}

// ── BullMQ Workers ──────────────────────────────────────────

export function startNotificationWorkers(): void {
  const connection = getRedisConnection();

  // Email Worker
  new Worker<EmailJobPayload>(
    'notification-email',
    async (job: Job<EmailJobPayload>) => {
      const { to, subject, html, logId: _logId, tenantId } = job.data;
      logger.info({ jobId: job.id, to, subject }, 'Processing email job');

      // Lookup tenant credentials if tenantId is available
      let emailConfig;
      if (tenantId) {
        try {
          const tenantDb = getTenantDb(tenantId);
          const credService = new ProviderCredentialsService(tenantDb);
          emailConfig = await credService.getChannelConfig('email');
        } catch (err) {
          logger.warn(
            { err, tenantId },
            'Failed to load tenant email config, using platform default',
          );
        }
      }

      const result = await sendEmail({ to, subject, html }, emailConfig);
      if (!result.success) {
        throw new Error(`Email delivery failed: ${result.error}`);
      }

      logger.info(
        { jobId: job.id, to, provider: result.provider, messageId: result.messageId },
        'Email sent',
      );
    },
    {
      connection,
      concurrency: 5,
      limiter: {
        max: 50,
        duration: 60000, // 50 emails per minute
      },
    },
  );

  // SMS Worker
  new Worker<SmsJobPayload>(
    'notification-sms',
    async (job: Job<SmsJobPayload>) => {
      const { to, body, logId: _logId, tenantId } = job.data;
      logger.info({ jobId: job.id, to }, 'Processing SMS job');

      let smsConfig;
      if (tenantId) {
        try {
          const tenantDb = getTenantDb(tenantId);
          const credService = new ProviderCredentialsService(tenantDb);
          smsConfig = await credService.getChannelConfig('sms');
        } catch (err) {
          logger.warn(
            { err, tenantId },
            'Failed to load tenant SMS config, using platform default',
          );
        }
      }

      const result = await sendSms({ to, body }, smsConfig);
      if (!result.success) {
        throw new Error(`SMS delivery failed: ${result.error}`);
      }

      logger.info({ jobId: job.id, to, sid: result.sid }, 'SMS sent');
    },
    {
      connection,
      concurrency: 3,
      limiter: {
        max: 30,
        duration: 60000, // 30 SMS per minute
      },
    },
  );

  // WhatsApp Worker
  new Worker<WhatsAppJobPayload>(
    'notification-whatsapp',
    async (job: Job<WhatsAppJobPayload>) => {
      const { to, templateId, logId: _logId, tenantId } = job.data;
      logger.info({ jobId: job.id, to, templateId }, 'Processing WhatsApp job');

      let whatsappConfig;
      if (tenantId) {
        try {
          const tenantDb = getTenantDb(tenantId);
          const credService = new ProviderCredentialsService(tenantDb);
          whatsappConfig = await credService.getChannelConfig('whatsapp');
        } catch (err) {
          logger.warn(
            { err, tenantId },
            'Failed to load tenant WhatsApp config, using platform default',
          );
        }
      }

      const variables = (job.data as unknown as Record<string, unknown>).variables as
        | string[]
        | undefined;
      const body = job.data.body;
      const result = await sendWhatsApp({ to, templateId, variables, body }, whatsappConfig);
      if (!result.success) {
        throw new Error(`WhatsApp delivery failed: ${result.error}`);
      }

      logger.info({ jobId: job.id, to, messageId: result.messageId }, 'WhatsApp message sent');
    },
    {
      connection,
      concurrency: 3,
      limiter: {
        max: 20,
        duration: 60000, // 20 WhatsApp messages per minute
      },
    },
  );

  // Push Worker — routes to web-push or mobile-push based on token platform
  new Worker<PushJobPayload>(
    'notification-push',
    async (job: Job<PushJobPayload>) => {
      const { tokens, tokenPlatforms, title, body, logId: _logId, tenantId } = job.data;
      logger.info({ jobId: job.id, tokenCount: tokens.length }, 'Processing push job');

      let pushConfig;
      if (tenantId) {
        try {
          const tenantDb = getTenantDb(tenantId);
          const credService = new ProviderCredentialsService(tenantDb);
          pushConfig = await credService.getChannelConfig('push');
        } catch (err) {
          logger.warn(
            { err, tenantId },
            'Failed to load tenant push config, using platform default',
          );
        }
      }

      // Split tokens by platform
      const webTokens: string[] = [];
      const mobileTokens: Array<{ token: string; platform: 'ios' | 'android' }> = [];

      for (let i = 0; i < tokens.length; i++) {
        const platform = tokenPlatforms?.[i] ?? 'web';
        if (platform === 'web') {
          webTokens.push(tokens[i]);
        } else {
          mobileTokens.push({ token: tokens[i], platform });
        }
      }

      // Send web push via VAPID
      if (webTokens.length > 0) {
        const webResult = await sendPush({ tokens: webTokens, title, body }, pushConfig);
        if (!webResult.success) {
          logger.warn({ errors: webResult.errors }, 'Web push partial failure');
        }
        logger.info({ sent: webResult.sent, failed: webResult.failed }, 'Web push dispatched');
      }

      // Send mobile push via Expo/FCM
      if (mobileTokens.length > 0) {
        const mobileResult = await sendMobilePush({ tokens: mobileTokens, title, body });
        if (!mobileResult.success) {
          logger.warn({ errors: mobileResult.errors }, 'Mobile push partial failure');
        }
        logger.info(
          { sent: mobileResult.sent, failed: mobileResult.failed, provider: mobileResult.provider },
          'Mobile push dispatched',
        );
      }
    },
    {
      connection,
      concurrency: 10,
      limiter: {
        max: 100,
        duration: 60000, // 100 push per minute
      },
    },
  );

  logger.info('✅ Notification workers started (email, sms, whatsapp, push)');
}

// ── Cleanup Function ────────────────────────────────────────

export async function closeNotificationQueues(): Promise<void> {
  await Promise.all([
    emailQueue?.close(),
    smsQueue?.close(),
    whatsappQueue?.close(),
    pushQueue?.close(),
  ]);
  await redisConnection?.quit();
  logger.info('Notification queues closed');
}
