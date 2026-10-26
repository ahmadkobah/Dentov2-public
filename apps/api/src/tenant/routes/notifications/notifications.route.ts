/**
 * Notification Routes — RESTful API for notification management
 *
 * Per DENTO_V2_MASTER_PLAN.md §20 - Notifications & Messaging System
 *
 * Endpoints:
 * - GET    /notifications              - List user notifications
 * - GET    /notifications/unread-count - Get unread count
 * - PATCH  /notifications/:id/read     - Mark as read
 * - PATCH  /notifications/read-all     - Mark all as read
 * - PATCH  /notifications/:id/dismiss  - Dismiss notification
 * - POST   /notifications/send         - Send notification (admin)
 * - GET    /notifications/templates    - List templates (admin)
 * - POST   /notifications/templates    - Create template (admin)
 * - GET    /notifications/templates/:id - Get template by ID (admin)
 * - PATCH  /notifications/templates/:id - Update template (admin)
 * - DELETE /notifications/templates/:id - Deactivate template (admin)
 * - GET    /notifications/logs         - Get delivery logs (admin)
 * - GET    /notifications/logs/:id     - Get delivery log by ID (admin)
 * - GET    /notifications/preferences  - Get user preferences
 * - PATCH  /notifications/preferences  - Update preferences
 * - POST   /notifications/alert-rules       - Create alert rule (admin)
 * - GET    /notifications/alert-rules       - List alert rules (admin)
 * - GET    /notifications/alert-rules/:id   - Get alert rule by ID (admin)
 * - PATCH  /notifications/alert-rules/:id   - Update alert rule (admin)
 * - DELETE /notifications/alert-rules/:id   - Deactivate alert rule (admin)
 */

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import type { Connection } from 'mongoose';
import { z } from 'zod';
import { NotificationService } from '../../../services/notification.service.js';
import {
  createNotificationTemplateModel,
  createNotificationLogModel,
  createNotificationPreferencesModel,
  createDeviceTokenModel,
  createAlertRuleModel,
  type IAlertRuleDoc,
} from '../../models/notification.model.js';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, requireAdmin } from '../../middleware/index.js';
import { createAlertRuleSchema, updateAlertRuleSchema } from '@dento/shared';

// ── Zod Schemas ─────────────────────────────────────────────

const listNotificationsSchema = z
  .object({
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().min(0).default(0),
    unreadOnly: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    category: z
      .enum([
        'appointment',
        'payment',
        'clinical',
        'inventory',
        'system',
        'marketing',
        'recall',
        'queue',
      ])
      .optional(),
  })
  .strict();

const sendNotificationSchema = z
  .object({
    templateKey: z.string().min(1),
    recipients: z
      .array(
        z
          .object({
            userId: z.string().optional(),
            patientId: z.string().optional(),
            email: z.string().email().optional(),
            phone: z.string().optional(),
          })
          .strict(),
      )
      .min(1),
    variables: z.record(z.string(), z.string()),
    channels: z.array(z.enum(['email', 'sms', 'whatsapp', 'push', 'inApp'])).optional(),
  })
  .strict();

const createTemplateSchema = z
  .object({
    key: z.string().min(1),
    name: z
      .object({
        en: z.string().min(1),
        ar: z.string().min(1),
      })
      .strict(),
    description: z.string().optional(),
    category: z.enum([
      'appointment',
      'payment',
      'clinical',
      'inventory',
      'system',
      'marketing',
      'recall',
      'queue',
    ]),
    trigger: z.enum(['automatic', 'manual', 'scheduled']),
    channels: z
      .object({
        email: z
          .object({
            isEnabled: z.boolean(),
            subject: z.object({ en: z.string(), ar: z.string() }).strict().optional(),
            body: z.object({ en: z.string(), ar: z.string() }).strict().optional(),
          })
          .strict()
          .optional(),
        sms: z
          .object({
            isEnabled: z.boolean(),
            template: z.object({ en: z.string(), ar: z.string() }).strict().optional(),
          })
          .strict()
          .optional(),
        whatsapp: z
          .object({
            isEnabled: z.boolean(),
            template: z.object({ en: z.string(), ar: z.string() }).strict().optional(),
            templateId: z.string().optional(),
          })
          .strict()
          .optional(),
        push: z
          .object({
            isEnabled: z.boolean(),
            title: z.object({ en: z.string(), ar: z.string() }).strict().optional(),
            body: z.object({ en: z.string(), ar: z.string() }).strict().optional(),
          })
          .strict()
          .optional(),
        inApp: z
          .object({
            isEnabled: z.boolean(),
            title: z.object({ en: z.string(), ar: z.string() }).strict().optional(),
            body: z.object({ en: z.string(), ar: z.string() }).strict().optional(),
            icon: z.string().optional(),
            actionUrl: z.string().optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    variables: z
      .array(
        z
          .object({
            key: z.string(),
            label: z.object({ en: z.string(), ar: z.string() }).strict(),
            isRequired: z.boolean().default(false),
          })
          .strict(),
      )
      .default([]),
    schedule: z
      .object({
        beforeMinutes: z.number().optional(),
        afterMinutes: z.number().optional(),
        cronExpression: z.string().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const updateTemplateSchema = createTemplateSchema.partial();

const updatePreferencesSchema = z
  .object({
    channels: z
      .object({
        email: z
          .object({ isEnabled: z.boolean(), address: z.string().optional() })
          .strict()
          .optional(),
        sms: z.object({ isEnabled: z.boolean(), phone: z.string().optional() }).strict().optional(),
        whatsapp: z
          .object({ isEnabled: z.boolean(), phone: z.string().optional() })
          .strict()
          .optional(),
        push: z.object({ isEnabled: z.boolean() }).strict().optional(),
        inApp: z.object({ isEnabled: z.boolean() }).strict().optional(),
      })
      .strict()
      .optional(),
    categories: z
      .record(
        z.string(),
        z
          .object({
            isEnabled: z.boolean(),
            channels: z.array(z.enum(['email', 'sms', 'whatsapp', 'push', 'inApp'])),
          })
          .strict(),
      )
      .optional(),
    quietHoursStart: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional()
      .nullable(),
    quietHoursEnd: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional()
      .nullable(),
    timezone: z.string().optional(),
    digestMode: z.enum(['realtime', 'daily', 'weekly']).optional(),
    digestTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    soundPreset: z.enum(['chime', 'bell', 'drop', 'pulse', 'none']).optional(),
  })
  .strict();

const registerDeviceSchema = z
  .object({
    token: z.string().min(1),
    platform: z.enum(['web', 'ios', 'android']),
    deviceName: z.string().optional(),
  })
  .strict();

// ── Route Definitions ───────────────────────────────────────

const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply auth + tenant middleware to all notification routes
  fastify.addHook('preHandler', authGuard);
  fastify.addHook('preHandler', tenantDbMiddleware);

  // Admin-only routes require tenant_admin/platform_admin (#75). User-facing
  // routes (list, unread-count, :id/read, read-all, :id/dismiss, preferences,
  // push-subscription, devices) stay open to any authenticated tenant user.
  const ADMIN_PATH_SEGMENTS = ['/send', '/bulk', '/templates', '/logs', '/alert-rules'];
  fastify.addHook('preHandler', async (request, reply) => {
    const routeUrl = (request.routeOptions?.url ?? request.url) || '';
    if (ADMIN_PATH_SEGMENTS.some((seg) => routeUrl.includes(seg))) {
      return requireAdmin(request, reply);
    }
  });

  // ── GET /notifications ────────────────────────────────────
  fastify.get(
    '/',
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof listNotificationsSchema> }>,
      reply: FastifyReply,
    ) => {
      const query = listNotificationsSchema.parse(request.query);
      const userId = (request as unknown as { user: { userId: string } }).user.userId;
      const tenantId = (request as unknown as { tenantSlug: string }).tenantSlug;
      const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

      const service = new NotificationService(dbConnection, tenantId);
      const { notifications, total } = await service.getUserNotifications(userId, {
        limit: query.limit,
        offset: query.offset,
        unreadOnly: query.unreadOnly,
        category: query.category,
      });

      const page = Math.floor(query.offset / query.limit) + 1;
      return apiResponse(reply, 200, notifications, undefined, {
        page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      });
    },
  );

  // ── GET /notifications/unread-count ───────────────────────
  fastify.get('/unread-count', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as unknown as { user: { userId: string } }).user.userId;
    const tenantId = (request as unknown as { tenantSlug: string }).tenantSlug;
    const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

    const service = new NotificationService(dbConnection, tenantId);
    const count = await service.getUnreadCount(userId);

    return apiResponse(reply, 200, { unreadCount: count });
  });

  // ── PATCH /notifications/:id/read ─────────────────────────
  fastify.patch(
    '/:id/read',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const userId = (request as unknown as { user: { userId: string } }).user.userId;
      const tenantId = (request as unknown as { tenantSlug: string }).tenantSlug;
      const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

      const service = new NotificationService(dbConnection, tenantId);
      const success = await service.markAsRead(id, userId);

      if (!success) {
        return apiError(reply, 404, 'Notification not found');
      }

      return apiResponse(reply, 200, { marked: true });
    },
  );

  // ── PATCH /notifications/read-all ─────────────────────────
  fastify.patch('/read-all', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as unknown as { user: { userId: string } }).user.userId;
    const tenantId = (request as unknown as { tenantSlug: string }).tenantSlug;
    const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

    const service = new NotificationService(dbConnection, tenantId);
    const count = await service.markAllAsRead(userId);

    return apiResponse(reply, 200, { markedCount: count });
  });

  // ── PATCH /notifications/:id/dismiss ──────────────────────
  fastify.patch(
    '/:id/dismiss',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const userId = (request as unknown as { user: { userId: string } }).user.userId;
      const tenantId = (request as unknown as { tenantSlug: string }).tenantSlug;
      const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

      const service = new NotificationService(dbConnection, tenantId);
      const success = await service.dismiss(id, userId);

      if (!success) {
        return apiError(reply, 404, 'Notification not found');
      }

      return apiResponse(reply, 200, { dismissed: true });
    },
  );

  // ── POST /notifications/send (Admin) ──────────────────────
  fastify.post(
    '/send',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof sendNotificationSchema> }>,
      reply: FastifyReply,
    ) => {
      const body = sendNotificationSchema.parse(request.body);
      const tenantId = (request as unknown as { tenantSlug: string }).tenantSlug;
      const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

      const service = new NotificationService(dbConnection, tenantId);
      const stats = await service.send({
        templateKey: body.templateKey,
        tenantId,
        recipients: body.recipients,
        variables: body.variables,
        channels: body.channels,
      });

      return apiResponse(reply, 200, { sent: true, stats });
    },
  );

  // ── GET /notifications/templates (Admin) ──────────────────
  fastify.get('/templates', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as unknown as { tenantSlug: string }).tenantSlug;
    const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

    const NotificationTemplate = createNotificationTemplateModel(dbConnection);

    const templates = await NotificationTemplate.find({ tenantId })
      .sort({ category: 1, key: 1 })
      .lean();

    return apiResponse(reply, 200, templates);
  });

  // ── POST /notifications/templates (Admin) ─────────────────
  fastify.post(
    '/templates',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createTemplateSchema> }>,
      reply: FastifyReply,
    ) => {
      const body = createTemplateSchema.parse(request.body);
      const tenantId = (request as unknown as { tenantSlug: string }).tenantSlug;
      const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

      const NotificationTemplate = createNotificationTemplateModel(dbConnection);

      // Check for duplicate key
      const existing = await NotificationTemplate.findOne({ key: body.key, tenantId });
      if (existing) {
        return apiError(reply, 400, `Template with key "${body.key}" already exists`);
      }

      const template = await NotificationTemplate.create({
        ...body,
        isActive: true,
        isSystem: false,
        tenantId,
      });

      return apiResponse(reply, 201, template, 'Template created');
    },
  );

  // ── GET /notifications/templates/:id (Admin) ──────────────
  fastify.get(
    '/templates/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

      const NotificationTemplate = createNotificationTemplateModel(dbConnection);
      const template = await NotificationTemplate.findById(id).lean();

      if (!template) {
        return apiError(reply, 404, 'Template not found');
      }

      return apiResponse(reply, 200, template);
    },
  );

  // ── PATCH /notifications/templates/:id (Admin) ────────────
  fastify.patch(
    '/templates/:id',
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>,
      reply: FastifyReply,
    ) => {
      const { id } = request.params;
      const body = updateTemplateSchema.parse(request.body);
      const userId = (request as unknown as { user: { userId: string } }).user.userId;
      const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

      const NotificationTemplate = createNotificationTemplateModel(dbConnection);

      const template = await NotificationTemplate.findByIdAndUpdate(
        id,
        { $set: { ...body, updatedBy: userId } },
        { new: true, runValidators: true },
      ).lean();

      if (!template) {
        return apiError(reply, 404, 'Template not found');
      }

      return apiResponse(reply, 200, template, 'Template updated');
    },
  );

  // ── DELETE /notifications/templates/:id (Admin) ───────────
  fastify.delete(
    '/templates/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const userId = (request as unknown as { user: { userId: string } }).user.userId;
      const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

      const NotificationTemplate = createNotificationTemplateModel(dbConnection);

      // Soft-delete: deactivate instead of hard delete
      const template = await NotificationTemplate.findByIdAndUpdate(
        id,
        { $set: { isActive: false, updatedBy: userId } },
        { new: true },
      ).lean();

      if (!template) {
        return apiError(reply, 404, 'Template not found');
      }

      return apiResponse(reply, 200, { deleted: true }, 'Template deactivated');
    },
  );

  // ── GET /notifications/logs (Admin) ───────────────────────
  fastify.get(
    '/logs',
    async (
      request: FastifyRequest<{
        Querystring: {
          limit?: string;
          offset?: string;
          channel?: string;
          status?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const { limit = '50', offset = '0', channel, status } = request.query;
      const tenantId = (request as unknown as { tenantSlug: string }).tenantSlug;
      const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

      const NotificationLog = createNotificationLogModel(dbConnection);

      const query: Record<string, unknown> = { tenantId };
      if (channel) query.channel = channel;
      if (status) query.status = status;

      const [logs, total] = await Promise.all([
        NotificationLog.find(query)
          .sort({ createdAt: -1 })
          .skip(parseInt(offset))
          .limit(parseInt(limit))
          .lean(),
        NotificationLog.countDocuments(query),
      ]);

      const parsedLimit = parseInt(limit);
      const page = Math.floor(parseInt(offset) / parsedLimit) + 1;
      return apiResponse(reply, 200, logs, undefined, {
        page,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      });
    },
  );

  // ── GET /notifications/logs/:id (Admin) ───────────────────
  fastify.get(
    '/logs/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

      const NotificationLog = createNotificationLogModel(dbConnection);
      const log = await NotificationLog.findById(id).lean();

      if (!log) {
        return apiError(reply, 404, 'Notification log not found');
      }

      return apiResponse(reply, 200, log);
    },
  );

  // ── GET /notifications/preferences ────────────────────────
  fastify.get('/preferences', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as unknown as { user: { userId: string } }).user.userId;
    const tenantId = (request as unknown as { tenantSlug: string }).tenantSlug;
    const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

    const NotificationPreferences = createNotificationPreferencesModel(dbConnection);
    let preferences = await NotificationPreferences.findOne({ userId, tenantId }).lean();

    // Return defaults if no preferences exist
    if (!preferences) {
      preferences = {
        _id: null,
        userId,
        channels: {
          email: { isEnabled: true },
          sms: { isEnabled: true },
          whatsapp: { isEnabled: true },
          push: { isEnabled: true },
          inApp: { isEnabled: true },
        },
        categories: {
          appointment: { isEnabled: true, channels: ['email', 'whatsapp', 'inApp'] },
          payment: { isEnabled: true, channels: ['email', 'inApp'] },
          clinical: { isEnabled: true, channels: ['inApp'] },
          inventory: { isEnabled: true, channels: ['inApp', 'email'] },
          system: { isEnabled: true, channels: ['inApp'] },
          marketing: { isEnabled: true, channels: ['email', 'whatsapp'] },
          recall: { isEnabled: true, channels: ['whatsapp', 'sms', 'email'] },
        },
        quietHoursStart: null,
        quietHoursEnd: null,
        timezone: null,
        digestMode: 'realtime',
        digestTime: null,
        soundPreset: 'chime',
        tenantId,
      } as unknown as typeof preferences;
    }

    return apiResponse(reply, 200, preferences);
  });

  // ── PATCH /notifications/preferences ──────────────────────
  fastify.patch(
    '/preferences',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof updatePreferencesSchema> }>,
      reply: FastifyReply,
    ) => {
      const updates = updatePreferencesSchema.parse(request.body);
      const userId = (request as unknown as { user: { userId: string } }).user.userId;
      const tenantId = (request as unknown as { tenantSlug: string }).tenantSlug;
      const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

      const NotificationPreferences = createNotificationPreferencesModel(dbConnection);

      const preferences = await NotificationPreferences.findOneAndUpdate(
        { userId, tenantId },
        { $set: updates },
        { new: true, upsert: true },
      ).lean();

      return apiResponse(reply, 200, preferences);
    },
  );

  // ── POST /notifications/push-subscription ─────────────────
  // Web Push subscription registration from Service Worker
  fastify.post('/push-subscription', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = z
      .object({
        subscription: z.object({
          endpoint: z.string().url(),
          keys: z.object({
            p256dh: z.string(),
            auth: z.string(),
          }),
        }),
        platform: z.enum(['web', 'ios', 'android']).default('web'),
        deviceName: z.string().max(200).optional(),
      })
      .parse(request.body);

    const userId = (request as unknown as { user: { userId: string } }).user.userId;
    const tenantId = (request as unknown as { tenantSlug: string }).tenantSlug;
    const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

    const DeviceToken = createDeviceTokenModel(dbConnection);

    // Store the full push subscription as the token (JSON stringified)
    const token = JSON.stringify(body.subscription);

    const device = await DeviceToken.findOneAndUpdate(
      { token, userId, tenantId },
      {
        userId,
        token,
        platform: body.platform,
        deviceName: body.deviceName || 'Web Browser',
        isActive: true,
        lastUsedAt: new Date(),
        tenantId,
      },
      { new: true, upsert: true },
    ).lean();

    return apiResponse(reply, 201, device, 'Push subscription registered');
  });

  // ── POST /notifications/devices ───────────────────────────
  fastify.post(
    '/devices',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof registerDeviceSchema> }>,
      reply: FastifyReply,
    ) => {
      const body = registerDeviceSchema.parse(request.body);
      const userId = (request as unknown as { user: { userId: string } }).user.userId;
      const tenantId = (request as unknown as { tenantSlug: string }).tenantSlug;
      const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

      const DeviceToken = createDeviceTokenModel(dbConnection);

      // Upsert device token
      const device = await DeviceToken.findOneAndUpdate(
        { token: body.token },
        {
          userId,
          token: body.token,
          platform: body.platform,
          deviceName: body.deviceName,
          isActive: true,
          lastUsedAt: new Date(),
          tenantId,
        },
        { new: true, upsert: true },
      ).lean();

      return apiResponse(reply, 200, device);
    },
  );

  // ── DELETE /notifications/devices/:token ──────────────────
  fastify.delete(
    '/devices/:token',
    async (request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) => {
      const { token } = request.params;
      const userId = (request as unknown as { user: { userId: string } }).user.userId;
      const tenantId = (request as unknown as { tenantSlug: string }).tenantSlug;
      const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

      const DeviceToken = createDeviceTokenModel(dbConnection);

      const result = await DeviceToken.deleteOne({
        token,
        userId,
        tenantId,
      });

      if (result.deletedCount === 0) {
        return apiError(reply, 404, 'Device token not found');
      }

      return apiResponse(reply, 200, { deleted: true });
    },
  );

  // ── POST /notifications/bulk — Bulk notification send (Day 13) ──
  const bulkNotificationSchema = z
    .object({
      templateKey: z.string().min(1),
      audienceType: z.enum(['all_patients', 'all_staff', 'patient_group', 'custom']),
      audienceFilter: z
        .object({
          patientIds: z.array(z.string()).optional(),
          userIds: z.array(z.string()).optional(),
          tags: z.array(z.string()).optional(),
          lastVisitBefore: z.string().datetime().optional(),
          lastVisitAfter: z.string().datetime().optional(),
        })
        .optional(),
      variables: z.record(z.string(), z.string()),
      channels: z.array(z.enum(['email', 'sms', 'whatsapp', 'push', 'inApp'])).min(1),
      scheduledAt: z.string().datetime().optional(),
    })
    .strict();

  fastify.post(
    '/bulk',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof bulkNotificationSchema> }>,
      reply: FastifyReply,
    ) => {
      try {
        const body = bulkNotificationSchema.parse(request.body);
        const tenantId = (request as unknown as { tenantSlug: string }).tenantSlug;
        const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

        // Build recipient list based on audience type
        const recipients: Array<{
          userId?: string;
          patientId?: string;
          email?: string;
          phone?: string;
        }> = [];

        if (body.audienceType === 'custom' && body.audienceFilter) {
          // Custom: use provided IDs
          if (body.audienceFilter.patientIds) {
            for (const pid of body.audienceFilter.patientIds) {
              recipients.push({ patientId: pid });
            }
          }
          if (body.audienceFilter.userIds) {
            for (const uid of body.audienceFilter.userIds) {
              recipients.push({ userId: uid });
            }
          }
        } else if (body.audienceType === 'all_patients') {
          // Query all active patients (paginated for performance)
          const PatientModel = dbConnection.models.Patient;
          if (PatientModel) {
            const patients = await PatientModel.find(
              { tenantId, isActive: true },
              { _id: 1, email: 1, 'phone.primary': 1 },
            )
              .limit(5000)
              .lean();

            for (const p of patients) {
              recipients.push({
                patientId: String((p as { _id: unknown })._id),
                email: (p as Record<string, unknown>).email as string | undefined,
                phone: ((p as Record<string, unknown>).phone as Record<string, unknown>)
                  ?.primary as string | undefined,
              });
            }
          }
        } else if (body.audienceType === 'all_staff') {
          // Query all active staff users
          const UserModel = dbConnection.models.User;
          if (UserModel) {
            const users = await UserModel.find(
              { tenantId, isActive: true },
              { _id: 1, email: 1, phone: 1 },
            )
              .limit(1000)
              .lean();

            for (const u of users) {
              recipients.push({
                userId: String((u as { _id: unknown })._id),
                email: (u as Record<string, unknown>).email as string | undefined,
                phone: (u as Record<string, unknown>).phone as string | undefined,
              });
            }
          }
        }

        if (recipients.length === 0) {
          return apiError(reply, 400, 'No recipients found for the selected audience');
        }

        // Send via notification service
        const service = new NotificationService(dbConnection, tenantId);
        const stats = await service.send({
          templateKey: body.templateKey,
          tenantId,
          recipients,
          variables: body.variables,
          channels: body.channels,
        });

        return apiResponse(reply, 200, {
          recipientCount: recipients.length,
          stats,
          message: {
            en: `Bulk notification sent to ${recipients.length} recipients`,
            ar: `تم إرسال الإشعار الجماعي إلى ${recipients.length} مستلم`,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return apiError(reply, 400, 'Validation failed', error.issues);
        }
        throw error;
      }
    },
  );

  // ══════════════════════════════════════════════════════════
  // ── Alert Rules — Configurable Automated Alerts (Admin) ───
  // ══════════════════════════════════════════════════════════

  // ── POST /notifications/alert-rules ───────────────────────
  fastify.post('/alert-rules', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = createAlertRuleSchema.parse(request.body);
      const tenantId = (request as unknown as { tenantSlug: string }).tenantSlug;
      const userId = (request as unknown as { user: { userId: string } }).user.userId;
      const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

      const AlertRule = createAlertRuleModel(dbConnection);

      // NOTE: the validated request body (CreateAlertRuleInput) and the persisted
      // IAlertRuleDoc shape genuinely diverge — e.g. bilingual `name` ({ en, ar })
      // vs `name: string`, and `conditions`/`thresholds`/`schedule` vs
      // `condition`/`actions`. This pre-dates the mongoose-9 migration and lives in
      // the shared Zod schema + model (neither owned here); the document is stored
      // as-is to preserve existing runtime behaviour. mongoose 8 accepted this only
      // because its create() typing was looser. Bridge the typed payload to the
      // model's documented create input (Partial<IAlertRuleDoc>) through `unknown`.
      const alertRulePayload = {
        ...body,
        tenantId,
        createdBy: userId,
      };
      const rule = await AlertRule.create(alertRulePayload as unknown as Partial<IAlertRuleDoc>);

      return apiResponse(reply, 201, rule, 'Alert rule created');
    } catch (error) {
      if (error instanceof z.ZodError) {
        return apiError(reply, 400, 'Validation failed', error.issues);
      }
      throw error;
    }
  });

  // ── GET /notifications/alert-rules ────────────────────────
  fastify.get('/alert-rules', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as unknown as { tenantSlug: string }).tenantSlug;
    const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

    const AlertRule = createAlertRuleModel(dbConnection);
    const rules = await AlertRule.find({ tenantId }).sort({ createdAt: -1 }).lean();

    return apiResponse(reply, 200, rules);
  });

  // ── GET /notifications/alert-rules/:id ────────────────────
  fastify.get(
    '/alert-rules/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

      const AlertRule = createAlertRuleModel(dbConnection);
      const rule = await AlertRule.findById(id).lean();

      if (!rule) {
        return apiError(reply, 404, 'Alert rule not found');
      }

      return apiResponse(reply, 200, rule);
    },
  );

  // ── PATCH /notifications/alert-rules/:id ──────────────────
  fastify.patch(
    '/alert-rules/:id',
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>,
      reply: FastifyReply,
    ) => {
      try {
        const { id } = request.params;
        const body = updateAlertRuleSchema.parse(request.body);
        const userId = (request as unknown as { user: { userId: string } }).user.userId;
        const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

        const AlertRule = createAlertRuleModel(dbConnection);

        const rule = await AlertRule.findByIdAndUpdate(
          id,
          { $set: { ...body, updatedBy: userId } },
          { new: true, runValidators: true },
        ).lean();

        if (!rule) {
          return apiError(reply, 404, 'Alert rule not found');
        }

        return apiResponse(reply, 200, rule, 'Alert rule updated');
      } catch (error) {
        if (error instanceof z.ZodError) {
          return apiError(reply, 400, 'Validation failed', error.issues);
        }
        throw error;
      }
    },
  );

  // ── DELETE /notifications/alert-rules/:id ─────────────────
  fastify.delete(
    '/alert-rules/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const userId = (request as unknown as { user: { userId: string } }).user.userId;
      const dbConnection = (request as unknown as { tenantDb: Connection }).tenantDb;

      const AlertRule = createAlertRuleModel(dbConnection);

      // Soft-delete: deactivate instead of hard delete
      const rule = await AlertRule.findByIdAndUpdate(
        id,
        { $set: { isActive: false, updatedBy: userId } },
        { new: true },
      ).lean();

      if (!rule) {
        return apiError(reply, 404, 'Alert rule not found');
      }

      return apiResponse(reply, 200, { deleted: true }, 'Alert rule deactivated');
    },
  );
};

export default notificationRoutes;
