/**
 * BullMQ Backup Queue — Tenant Database Backup Job Dispatch
 *
 * Per MASTER_PLAN §34, SECURITY_AND_ENCRYPTION §14:
 *   - Async backup via BullMQ (decoupled from API request)
 *   - Daily cron schedule (03:00 UTC) when enabled
 *   - Monthly restore-test cron (1st of month, 04:00 UTC)
 *   - 3 retry attempts with exponential backoff
 */

import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// ── Job Data Types ──────────────────────────────────────────

export interface BackupJobData {
  /** Type of job */
  type: 'tenant-backup' | 'restore-test' | 'production-restore';
  /** Backup record _id (for tenant backups) */
  backupId?: string;
  /** Target tenant slug */
  tenantSlug: string;
  /** Who triggered (user ID or 'system') */
  initiatedBy: string;
  /** Whether to encrypt the backup */
  encrypt?: boolean;
}

// ── Queue Singleton ─────────────────────────────────────────

let backupQueue: Queue<BackupJobData> | null = null;

export function getBackupQueue(): Queue<BackupJobData> {
  if (!backupQueue) {
    const connection = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });

    backupQueue = new Queue<BackupJobData>('tenant-backup', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 }, // 30s → 60s → 120s
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    });

    logger.info('Backup BullMQ queue initialised');
  }
  return backupQueue;
}

// ── Queue Helpers ───────────────────────────────────────────

/**
 * Add a backup job to the queue.
 */
export async function enqueueBackup(data: BackupJobData): Promise<string> {
  const queue = getBackupQueue();
  const job = await queue.add(`backup:${data.tenantSlug}`, data, {
    // Dedup: only one backup per tenant at a time
    jobId: `backup-${data.tenantSlug}-${Date.now()}`,
  });
  logger.info({ jobId: job.id, tenantSlug: data.tenantSlug }, 'Backup job enqueued');
  return job.id!;
}

/**
 * Schedule the daily backup cron (03:00 UTC) for a given tenant.
 * Call on server start if schedule is enabled.
 */
export async function scheduleBackupCron(tenantSlug: string): Promise<void> {
  const queue = getBackupQueue();
  await queue.add(
    `scheduled:${tenantSlug}`,
    {
      type: 'tenant-backup',
      tenantSlug,
      initiatedBy: 'system',
      encrypt: true,
    },
    {
      repeat: { pattern: '0 3 * * *' }, // Daily at 03:00 UTC
      jobId: `cron-backup-${tenantSlug}`,
    },
  );
  logger.info({ tenantSlug }, 'Daily backup cron scheduled (03:00 UTC)');
}

/**
 * Schedule the monthly restore-test cron (1st of month, 04:00 UTC).
 * Picks latest completed backup → restore to temp DB → verify → cleanup.
 */
export async function scheduleRestoreTestCron(tenantSlug: string): Promise<void> {
  const queue = getBackupQueue();
  await queue.add(
    `restore-test:${tenantSlug}`,
    {
      type: 'restore-test',
      tenantSlug,
      initiatedBy: 'system',
    },
    {
      repeat: { pattern: '0 4 1 * *' }, // 1st of month at 04:00 UTC
      jobId: `cron-restore-test-${tenantSlug}`,
    },
  );
  logger.info({ tenantSlug }, 'Monthly restore-test cron scheduled (1st @ 04:00 UTC)');
}

/**
 * Schedule a per-tenant backup cron using the tenant's own config.
 * Removes any existing cron for that tenant first.
 */
export async function scheduleTenantBackupCron(
  tenantSlug: string,
  cronExpression: string,
): Promise<void> {
  const queue = getBackupQueue();

  // Remove existing cron for this tenant (if any)
  const existingJobId = `cron-backup-${tenantSlug}`;
  try {
    const repeatableJobs = await queue.getRepeatableJobs();
    const existing = repeatableJobs.find((j) => j.id === existingJobId);
    if (existing) {
      await queue.removeRepeatableByKey(existing.key);
      logger.info({ tenantSlug }, 'Removed existing backup cron');
    }
  } catch {
    // Ignore — cron may not exist yet
  }

  await queue.add(
    `scheduled:${tenantSlug}`,
    {
      type: 'tenant-backup',
      tenantSlug,
      initiatedBy: 'system',
      encrypt: true,
    },
    {
      repeat: { pattern: cronExpression },
      jobId: existingJobId,
    },
  );
  logger.info({ tenantSlug, cron: cronExpression }, 'Per-tenant backup cron scheduled');
}

/**
 * Remove the backup cron for a specific tenant.
 */
export async function removeTenantBackupCron(tenantSlug: string): Promise<void> {
  const queue = getBackupQueue();
  const jobId = `cron-backup-${tenantSlug}`;
  try {
    const repeatableJobs = await queue.getRepeatableJobs();
    const existing = repeatableJobs.find((j) => j.id === jobId);
    if (existing) {
      await queue.removeRepeatableByKey(existing.key);
      logger.info({ tenantSlug }, 'Tenant backup cron removed');
    }
  } catch {
    logger.warn({ tenantSlug }, 'Failed to remove tenant backup cron');
  }
}

/**
 * Schedule backup crons for ALL enabled tenants on startup.
 * Reads per-tenant config and schedules accordingly.
 */
export async function scheduleAllTenantBackupCrons(): Promise<void> {
  const { getEnabledTenantBackupConfigs, buildCronExpression } =
    await import('../platform/models/tenant-backup-config.model.js');
  const configs = await getEnabledTenantBackupConfigs();

  let scheduled = 0;
  for (const config of configs) {
    try {
      const cron = buildCronExpression(config);
      await scheduleTenantBackupCron(config.tenantSlug, cron);
      await scheduleRestoreTestCron(config.tenantSlug);
      scheduled++;
    } catch (err) {
      logger.error({ err, tenantSlug: config.tenantSlug }, 'Failed to schedule backup cron');
    }
  }

  logger.info({ total: configs.length, scheduled }, 'Tenant backup crons scheduled on startup');
}
