import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Backup } from '../../models/backup.model.js';
import { Tenant } from '../../models/tenant.model.js';
import { getBackupConfig } from '../../models/backup-config.model.js';
import {
  TenantBackupConfig,
  getTenantBackupConfig,
  buildCronExpression,
} from '../../models/tenant-backup-config.model.js';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { logger } from '../../../utils/logger.js';
import {
  DEFAULT_RETENTION_DAYS,
  DEFAULT_STORAGE_BUCKET,
  BACKUP_GROUPS,
  type BackupGroup,
} from '@dento/shared';
import { Types } from 'mongoose';
import {
  enqueueBackup,
  scheduleTenantBackupCron,
  removeTenantBackupCron,
} from '../../../queues/backup.queue.js';
import { getPresignedDownloadUrl, deleteFromS3 } from '../../../config/s3.js';

/**
 * Backup Routes — §34 Per-Tenant Backup/Restore
 *
 * Endpoints for managing tenant database backups:
 * - Trigger manual backup (creates BullMQ job)
 * - List backup history per tenant
 * - Download backup (presigned S3 URL)
 * - Update retention settings
 * - Backup statistics
 *
 * BullMQ Worker Flow:
 *   1. backup.status = 'running'
 *   2. mongodump --db tenant_{slug} --archive | gzip → S3/R2
 *   3. backup.fileSize = size, backup.checksum = SHA-256
 *   4. backup.status = 'completed', backup.completedAt = now()
 *   5. On error: backup.status = 'failed', backup.error = message
 *   6. TTL index auto-deletes after retentionDays
 */

// ── Zod Schemas ─────────────────────────────────────────────

const createBackupSchema = z
  .object({
    tenantSlug: z.string().min(1),
    type: z.enum(['scheduled', 'manual', 'pre-migration', 'pre-delete']).default('manual'),
    retentionDays: z.number().int().positive().max(365).default(DEFAULT_RETENTION_DAYS),
  })
  .strict();

const backupQuerySchema = z
  .object({
    tenantSlug: z.string().optional(),
    status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
    type: z.enum(['scheduled', 'manual', 'pre-migration', 'pre-delete']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

const updateRetentionSchema = z
  .object({
    retentionDays: z.number().int().positive().max(365),
  })
  .strict();

// ── Interface ───────────────────────────────────────────────

// ── Helper: Generate S3 key ─────────────────────────────────

function generateBackupPath(tenantSlug: string, type: string): string {
  const date = new Date().toISOString().replace(/[:.]/g, '-');
  return `backups/${tenantSlug}/${type}_${date}.gz`;
}

// ── Routes ──────────────────────────────────────────────────

// ── Route Helpers ───────────────────────────────────────────

function getUser(request: unknown): Record<string, string> {
  return ((request as unknown as Record<string, unknown>).user ?? {}) as Record<string, string>;
}

export async function backupRoutes(fastify: FastifyInstance) {
  /**
   * POST / — Trigger a backup for a tenant
   *
   * Creates a pending backup record and dispatches BullMQ job.
   */
  fastify.post(
    '/',
    { preHandler: [authGuard, platformGuard('platform_backups', 'create')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = createBackupSchema.parse(request.body);
      const user = getUser(request);

      // Verify tenant exists
      const tenant = await Tenant.findOne({ slug: body.tenantSlug });
      if (!tenant) {
        return apiError(reply, 404, `Tenant '${body.tenantSlug}' not found`);
      }

      // Check if there is already a running backup for this tenant
      const runningBackup = await Backup.findOne({
        tenantSlug: body.tenantSlug,
        status: { $in: ['pending', 'running'] },
      });
      if (runningBackup) {
        return apiError(reply, 409, `Backup already in progress for tenant '${body.tenantSlug}'`);
      }

      // Create backup record
      const filePath = generateBackupPath(body.tenantSlug, body.type);
      const backup = await Backup.create({
        tenantSlug: body.tenantSlug,
        type: body.type,
        status: 'pending',
        filePath,
        storageBucket: DEFAULT_STORAGE_BUCKET,
        retentionDays: body.retentionDays,
        initiatedBy: user.id,
      });

      // Dispatch to BullMQ backup worker
      const config = await getBackupConfig();
      await enqueueBackup({
        type: 'tenant-backup',
        backupId: backup._id.toString(),
        tenantSlug: body.tenantSlug,
        initiatedBy: user.id || 'unknown',
        encrypt: config.encryptionEnabled,
      });

      logger.info(
        { backupId: backup._id, tenantSlug: body.tenantSlug, type: body.type },
        'Backup triggered',
      );
      return apiResponse(reply, 201, backup);
    },
  );

  /**
   * GET / — List backups (with filters)
   */
  fastify.get(
    '/',
    { preHandler: [authGuard, platformGuard('platform_backups', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = backupQuerySchema.parse(request.query);
      const filter: Record<string, unknown> = {};

      if (query.tenantSlug) filter.tenantSlug = query.tenantSlug;
      if (query.status) filter.status = query.status;
      if (query.type) filter.type = query.type;

      const skip = (query.page - 1) * query.limit;
      const [backups, total] = await Promise.all([
        Backup.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean(),
        Backup.countDocuments(filter),
      ]);

      return apiResponse(reply, 200, backups, undefined, {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      });
    },
  );

  /**
   * GET /:id — Get single backup details
   */
  fastify.get(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_backups', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const backup = await Backup.findById(id).lean();

      if (!backup) {
        return apiError(reply, 404, 'Backup not found');
      }

      return apiResponse(reply, 200, backup);
    },
  );

  /**
   * GET /:id/download — Get presigned download URL
   */
  fastify.get(
    '/:id/download',
    // A backup download mints a presigned URL to a full tenant mongodump (all
    // PHI) — require restore-level privilege, not plain 'read' (held by platform_viewer).
    { preHandler: [authGuard, platformGuard('platform_backups', 'create')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const backup = await Backup.findById(id).lean();

      if (!backup) {
        return apiError(reply, 404, 'Backup not found');
      }
      if (backup.status !== 'completed') {
        return apiError(reply, 400, 'Backup not yet completed');
      }
      if (!backup.filePath) {
        return apiError(reply, 400, 'Backup file path not available');
      }

      // Generate real presigned S3 download URL (1 hour TTL)
      const downloadUrl = await getPresignedDownloadUrl(backup.filePath!, 3600);

      logger.info(
        { backupId: id, tenantSlug: backup.tenantSlug, userId: getUser(request).id },
        'Backup download URL generated (audit)',
      );

      return apiResponse(reply, 200, {
        downloadUrl,
        filePath: backup.filePath,
        fileSize: backup.fileSize,
        checksum: backup.checksum,
        expiresIn: 3600,
      });
    },
  );

  /**
   * PATCH /:id/retention — Update retention days for a backup
   */
  fastify.patch(
    '/:id/retention',
    { preHandler: [authGuard, platformGuard('platform_backups', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = updateRetentionSchema.parse(request.body);

      const backup = await Backup.findById(id);
      if (!backup) {
        return apiError(reply, 404, 'Backup not found');
      }

      backup.retentionDays = body.retentionDays;

      // Recalculate expiration
      if (backup.completedAt) {
        const expiresAt = new Date(backup.completedAt);
        expiresAt.setDate(expiresAt.getDate() + body.retentionDays);
        backup.expiresAt = expiresAt;
      }

      await backup.save();

      return apiResponse(reply, 200, {
        id,
        retentionDays: backup.retentionDays,
        expiresAt: backup.expiresAt,
      });
    },
  );

  /**
   * DELETE /:id — Delete a backup (and its S3 file)
   */
  fastify.delete(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_backups', 'delete')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const backup = await Backup.findById(id);

      if (!backup) {
        return apiError(reply, 404, 'Backup not found');
      }

      // Delete from S3/R2 if file exists
      if (backup.filePath) {
        try {
          await deleteFromS3(backup.filePath);
        } catch (err) {
          logger.warn({ err, backupId: id, filePath: backup.filePath }, 'Failed to delete S3 file');
        }
      }

      await backup.deleteOne();

      logger.info({ backupId: id, tenantSlug: backup.tenantSlug }, 'Backup deleted');
      return apiResponse(reply, 200, { id, deleted: true });
    },
  );

  /**
   * GET /stats/summary — Backup statistics
   */
  fastify.get(
    '/stats/summary',
    { preHandler: [authGuard, platformGuard('platform_backups', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantSlug = (request.query as { tenantSlug?: string }).tenantSlug;
      const matchFilter: Record<string, unknown> = {};
      if (tenantSlug) matchFilter.tenantSlug = tenantSlug;

      const [stats] = await Backup.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalBackups: { $sum: 1 },
            completedBackups: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            failedBackups: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
            },
            totalStorageBytes: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$fileSize', 0] },
            },
          },
        },
      ]);

      // Get latest backup
      const latestBackup = await Backup.findOne(
        tenantSlug ? { tenantSlug, status: 'completed' } : { status: 'completed' },
      )
        .sort({ completedAt: -1 })
        .lean();

      // Per-tenant breakdown
      const byTenant = await Backup.aggregate([
        { $match: { status: 'completed', ...matchFilter } },
        {
          $group: {
            _id: '$tenantSlug',
            count: { $sum: 1 },
            totalSize: { $sum: '$fileSize' },
            latestBackup: { $max: '$completedAt' },
          },
        },
        { $sort: { totalSize: -1 } },
      ]);

      return apiResponse(reply, 200, {
        overview: stats || {
          totalBackups: 0,
          completedBackups: 0,
          failedBackups: 0,
          totalStorageBytes: 0,
        },
        latestBackup,
        byTenant,
      });
    },
  );

  // ── GET /api/backups/config ─────────────────────────────
  // Backup configuration (Gap G7 — Task 3.9)
  fastify.get(
    '/config',
    {
      preHandler: [authGuard, platformGuard('platform_backups', 'read')],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const config = await getBackupConfig();
      return apiResponse(reply, 200, config);
    },
  );

  // ── PUT /api/backups/config ─────────────────────────────
  fastify.put(
    '/config',
    {
      preHandler: [authGuard, platformGuard('platform_backups', 'update')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const updateConfigSchema = z
        .object({
          scheduleEnabled: z.boolean().optional(),
          scheduleCron: z.string().min(9).max(100).optional(),
          retentionDays: z.number().int().min(1).max(365).optional(),
          encryptionEnabled: z.boolean().optional(),
          storageProvider: z.enum(['s3', 'r2']).optional(),
          bucket: z.string().min(1).max(255).optional(),
          region: z.string().min(1).max(50).optional(),
          maxBackupSizeGB: z.number().positive().optional(),
          notifyOnFailure: z.boolean().optional(),
          notifyEmail: z.string().email().nullable().optional(),
        })
        .strict();

      const data = updateConfigSchema.parse(request.body);

      const config = await getBackupConfig();
      Object.assign(config, data, { updatedBy: request.user!.userId });
      await config.save();

      logger.info({ msg: 'Backup config updated', changes: Object.keys(data) });
      return apiResponse(reply, 200, config, 'Backup configuration updated');
    },
  );

  /**
   * POST /:id/restore — Production restore a backup
   *
   * Downloads the backup from S3, creates a pre-restore safety backup,
   * decrypts if needed, and restores via mongorestore to the live tenant DB.
   * This is a destructive operation — requires platform_backups:create permission.
   */
  fastify.post(
    '/:id/restore',
    { preHandler: [authGuard, platformGuard('platform_backups', 'create')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const user = getUser(request);

      const backup = await Backup.findById(id);
      if (!backup) {
        return apiError(reply, 404, 'Backup not found');
      }
      if (backup.status !== 'completed') {
        return apiError(reply, 400, 'Only completed backups can be restored');
      }
      if (!backup.filePath) {
        return apiError(reply, 400, 'Backup file path not available');
      }

      // Dispatch a production-restore job (creates safety backup automatically)
      await enqueueBackup({
        type: 'production-restore',
        backupId: backup._id.toString(),
        tenantSlug: backup.tenantSlug,
        initiatedBy: user.id || 'unknown',
      });

      logger.info(
        { backupId: id, tenantSlug: backup.tenantSlug, initiatedBy: user.id },
        'Production restore job dispatched',
      );

      return apiResponse(reply, 202, {
        id,
        tenantSlug: backup.tenantSlug,
        message: 'Production restore job has been queued. A safety backup will be created first.',
      });
    },
  );

  // ── Per-Tenant Backup Config CRUD ───────────────────────

  const tenantBackupConfigSchema = z
    .object({
      tenantSlug: z.string().min(1),
      backupEnabled: z.boolean().default(true),
      frequency: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
      hour: z.number().int().min(0).max(23).default(3),
      dayOfWeek: z.number().int().min(0).max(6).nullable().default(null),
      dayOfMonth: z.number().int().min(1).max(28).nullable().default(null),
      retentionDays: z.number().int().min(1).max(365).default(DEFAULT_RETENTION_DAYS),
      excludeGroups: z
        .array(z.enum(BACKUP_GROUPS as unknown as [BackupGroup, ...BackupGroup[]]))
        .default([]),
      autoBackupOnMigration: z.boolean().default(true),
      autoBackupOnDelete: z.boolean().default(true),
    })
    .strict();

  const updateTenantBackupConfigSchema = z
    .object({
      backupEnabled: z.boolean().optional(),
      frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
      hour: z.number().int().min(0).max(23).optional(),
      dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
      dayOfMonth: z.number().int().min(1).max(28).nullable().optional(),
      retentionDays: z.number().int().min(1).max(365).optional(),
      excludeGroups: z.array(z.enum(BACKUP_GROUPS as unknown as [string, ...string[]])).optional(),
      autoBackupOnMigration: z.boolean().optional(),
      autoBackupOnDelete: z.boolean().optional(),
    })
    .strict();

  /**
   * GET /tenant-config — List all per-tenant backup configs
   */
  fastify.get(
    '/tenant-config',
    { preHandler: [authGuard, platformGuard('platform_backups', 'read')] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const configs = await TenantBackupConfig.find().sort({ tenantSlug: 1 }).lean();
      return apiResponse(reply, 200, configs);
    },
  );

  /**
   * GET /tenant-config/:tenantSlug — Get per-tenant backup config
   */
  fastify.get(
    '/tenant-config/:tenantSlug',
    { preHandler: [authGuard, platformGuard('platform_backups', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantSlug } = request.params as { tenantSlug: string };
      const config = await getTenantBackupConfig(tenantSlug);
      if (!config) {
        return apiError(reply, 404, `No backup config found for tenant '${tenantSlug}'`);
      }
      return apiResponse(reply, 200, config);
    },
  );

  /**
   * POST /tenant-config — Create per-tenant backup config
   */
  fastify.post(
    '/tenant-config',
    { preHandler: [authGuard, platformGuard('platform_backups', 'create')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = tenantBackupConfigSchema.parse(request.body);
      const user = getUser(request);

      // Verify tenant exists
      const tenant = await Tenant.findOne({ slug: body.tenantSlug });
      if (!tenant) {
        return apiError(reply, 404, `Tenant '${body.tenantSlug}' not found`);
      }

      // Check for existing config
      const existing = await getTenantBackupConfig(body.tenantSlug);
      if (existing) {
        return apiError(reply, 409, `Backup config already exists for tenant '${body.tenantSlug}'`);
      }

      const config = await TenantBackupConfig.create({
        ...body,
        updatedBy: user.id ? new Types.ObjectId(user.id) : null,
      });

      // Schedule cron if enabled
      if (config.backupEnabled) {
        const cron = buildCronExpression(config);
        await scheduleTenantBackupCron(config.tenantSlug, cron);
      }

      logger.info({ tenantSlug: body.tenantSlug }, 'Per-tenant backup config created');
      return apiResponse(reply, 201, config);
    },
  );

  /**
   * PATCH /tenant-config/:tenantSlug — Update per-tenant backup config
   */
  fastify.patch(
    '/tenant-config/:tenantSlug',
    { preHandler: [authGuard, platformGuard('platform_backups', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantSlug } = request.params as { tenantSlug: string };
      const body = updateTenantBackupConfigSchema.parse(request.body);
      const user = getUser(request);

      const config = await getTenantBackupConfig(tenantSlug);
      if (!config) {
        return apiError(reply, 404, `No backup config found for tenant '${tenantSlug}'`);
      }

      Object.assign(config, body, { updatedBy: user.id });
      await config.save();

      // Reschedule cron based on new config
      if (config.backupEnabled) {
        const cron = buildCronExpression(config);
        await scheduleTenantBackupCron(tenantSlug, cron);
      } else {
        await removeTenantBackupCron(tenantSlug);
      }

      logger.info({ tenantSlug, changes: Object.keys(body) }, 'Per-tenant backup config updated');
      return apiResponse(reply, 200, config);
    },
  );

  /**
   * DELETE /tenant-config/:tenantSlug — Delete per-tenant backup config
   */
  fastify.delete(
    '/tenant-config/:tenantSlug',
    { preHandler: [authGuard, platformGuard('platform_backups', 'delete')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantSlug } = request.params as { tenantSlug: string };

      const config = await getTenantBackupConfig(tenantSlug);
      if (!config) {
        return apiError(reply, 404, `No backup config found for tenant '${tenantSlug}'`);
      }

      // Remove cron job
      await removeTenantBackupCron(tenantSlug);
      await config.deleteOne();

      logger.info({ tenantSlug }, 'Per-tenant backup config deleted');
      return apiResponse(reply, 200, { tenantSlug, deleted: true });
    },
  );
}
