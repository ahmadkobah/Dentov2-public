/**
 * BullMQ Backup Worker — Tenant Database Backup Execution
 *
 * Per MASTER_PLAN §34, SECURITY_AND_ENCRYPTION §14:
 *   Flow:
 *     1. Set backup.status = 'running'
 *     2. mongodump --db tenant_{slug} --archive | gzip
 *     3. (Optional) AES-256-GCM encrypt with HKDF-derived tenant key
 *     4. SHA-256 checksum
 *     5. Upload to S3/R2
 *     6. Update backup record (status, fileSize, checksum, completedAt)
 *     7. On error: backup.status = 'failed', backup.error = message
 *
 *   Restore-test flow (monthly):
 *     1. Pick latest completed backup for tenant
 *     2. Download from S3
 *     3. Decrypt (if encrypted)
 *     4. mongorestore to temp DB
 *     5. Verify collection counts match
 *     6. Drop temp DB
 *     7. Log result
 */

import { Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mongoose from 'mongoose';

import type { BackupJobData } from '../queues/backup.queue.js';
import { Backup } from '../platform/models/backup.model.js';
import { getBackupConfig } from '../platform/models/backup-config.model.js';
import { getTenantBackupConfig } from '../platform/models/tenant-backup-config.model.js';
import { uploadToS3, getPresignedDownloadUrl } from '../config/s3.js';
import { deriveBackupKey, encryptBackup, sha256, decryptBackup } from '../utils/backup-crypto.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import {
  BACKUP_GROUP_COLLECTIONS,
  DEFAULT_RETENTION_DAYS,
  DEFAULT_STORAGE_BUCKET,
  type BackupGroup,
} from '@dento/shared';

const execFileAsync = promisify(execFile);

// ── Constants ───────────────────────────────────────────────

const MONGODUMP_PATH = process.env.MONGODUMP_PATH || 'mongodump';
const MONGORESTORE_PATH = process.env.MONGORESTORE_PATH || 'mongorestore';

// ── Helper: Compute excluded collections from backup groups ─

function getExcludedCollections(excludeGroups: BackupGroup[]): string[] {
  const collections: string[] = [];
  for (const group of excludeGroups) {
    const groupCollections = BACKUP_GROUP_COLLECTIONS[group];
    if (groupCollections) {
      collections.push(...groupCollections);
    }
  }
  return collections;
}

// ── Helper: Run mongodump and return the archive buffer ─────

// F-8: tenantSlug flows directly into a child-process arg (`--db=tenant_${tenantSlug}`).
// `execFile` does not invoke a shell, but a malicious slug could still
// inject extra mongodump flags (e.g. `foo --quiet --uri=evil`) by including
// dashes / spaces / equals signs. Restrict to the same shape the tenant
// catalogue enforces: lowercase alphanumerics and single internal dashes.
const TENANT_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function assertSafeTenantSlug(slug: string): void {
  if (typeof slug !== 'string' || !TENANT_SLUG_RE.test(slug)) {
    throw new Error(`Refusing backup operation for unsafe tenantSlug: ${slug}`);
  }
}

async function runMongodump(
  tenantSlug: string,
  excludeCollections: string[] = [],
): Promise<Buffer> {
  assertSafeTenantSlug(tenantSlug);
  const dbName = `tenant_${tenantSlug}`;
  const tmpDir = await mkdtemp(join(tmpdir(), 'dento-backup-'));
  const archivePath = join(tmpDir, `${dbName}.archive`);

  try {
    const args = [
      `--uri=${env.MONGODB_URI}`,
      `--db=${dbName}`,
      `--archive=${archivePath}`,
      '--gzip',
    ];

    // Add --excludeCollection for each excluded collection
    for (const col of excludeCollections) {
      args.push(`--excludeCollection=${col}`);
    }

    await execFileAsync(MONGODUMP_PATH, args, { timeout: 600_000 }); // 10 min timeout

    // Read the archive into memory (for encryption + upload)
    const { createReadStream: fsRead } = await import('node:fs');
    const chunks: Buffer[] = [];
    for await (const chunk of fsRead(archivePath)) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ── Helper: Run mongorestore from archive buffer ────────────

async function runMongorestore(data: Buffer, targetDb: string): Promise<void> {
  // F-8: targetDb flows into a child-process arg. Allow `tenant_<safe-slug>`,
  // `tenant_<safe-slug>__restore_<digits>`, or the platform DB name.
  const RESTORE_DB_RE =
    /^(?:dento_platform|tenant_[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:__restore_\d+)?)$/;
  if (!RESTORE_DB_RE.test(targetDb)) {
    throw new Error(`Refusing restore for unsafe targetDb: ${targetDb}`);
  }
  const tmpDir = await mkdtemp(join(tmpdir(), 'dento-restore-'));
  const archivePath = join(tmpDir, 'restore.archive');

  try {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(archivePath, data);

    const args = [
      `--uri=${env.MONGODB_URI}`,
      `--db=${targetDb}`,
      `--archive=${archivePath}`,
      '--gzip',
      '--drop', // Drop existing collections before restoring
    ];

    await execFileAsync(MONGORESTORE_PATH, args, { timeout: 600_000 });
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ── Tenant Backup Job Handler ───────────────────────────────

async function handleTenantBackup(job: Job<BackupJobData>): Promise<void> {
  const { tenantSlug, encrypt, initiatedBy } = job.data;
  // F-8: gate the entire job on a safe slug — also guards path-construction
  // (`backups/${tenantSlug}/...`) and the encryption-key derivation below.
  assertSafeTenantSlug(tenantSlug);
  let { backupId } = job.data;

  // Scheduled cron jobs are enqueued without a backupId (the same job payload
  // repeats on every fire). Create a fresh Backup record per execution so each
  // run produces exactly one ordered, uniquely-tracked record (no duplicates,
  // no clobbering, no orphan files).
  if (!backupId) {
    const date = new Date().toISOString().replace(/[:.]/g, '-');
    const created = await Backup.create({
      tenantSlug,
      type: 'scheduled',
      status: 'pending',
      filePath: `backups/${tenantSlug}/scheduled_${date}.gz`,
      storageBucket: DEFAULT_STORAGE_BUCKET,
      retentionDays: DEFAULT_RETENTION_DAYS,
      initiatedBy: initiatedBy || 'system',
    });
    backupId = created._id.toString();
    logger.info(
      { backupId, tenantSlug, jobId: job.id },
      'Created Backup record for scheduled cron job',
    );
  }

  const backup = await Backup.findById(backupId);
  if (!backup) throw new Error(`Backup record not found: ${backupId}`);

  // 1. Mark as running
  backup.status = 'running';
  backup.startedAt = new Date();
  await backup.save();

  try {
    // 2. Compute excluded collections from per-tenant config
    const tenantConfig = await getTenantBackupConfig(tenantSlug);
    const excludeCollections = tenantConfig?.excludeGroups.length
      ? getExcludedCollections(tenantConfig.excludeGroups)
      : [];

    // 3. Run mongodump → gzipped archive buffer
    logger.info({ backupId, tenantSlug, excludeCollections }, 'Starting mongodump');
    const archiveBuffer = await runMongodump(tenantSlug, excludeCollections);

    // 4. Compute checksum of plaintext
    const checksum = sha256(archiveBuffer);

    // 5. Optionally encrypt
    let uploadBuffer: Buffer;
    if (encrypt) {
      const key = deriveBackupKey(env.PAYLOAD_SECRET, tenantSlug);
      uploadBuffer = encryptBackup(archiveBuffer, key);
      logger.info({ backupId }, 'Backup encrypted');
    } else {
      uploadBuffer = archiveBuffer;
    }

    // 6. Upload to S3/R2
    const s3Key = backup.filePath || `backups/${tenantSlug}/manual_${Date.now()}.gz`;
    await uploadToS3(s3Key, uploadBuffer, 'application/gzip');
    logger.info({ backupId, s3Key, size: uploadBuffer.length }, 'Backup uploaded to S3');

    // 6. Update backup record
    backup.status = 'completed';
    backup.completedAt = new Date();
    backup.fileSize = uploadBuffer.length;
    backup.checksum = checksum;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + backup.retentionDays);
    backup.expiresAt = expiresAt;

    await backup.save();

    logger.info(
      { backupId, tenantSlug, fileSize: uploadBuffer.length, checksum: checksum.slice(0, 12) },
      'Backup completed successfully',
    );
  } catch (err) {
    // 7. On error → mark failed
    backup.status = 'failed';
    backup.error = err instanceof Error ? err.message : String(err);
    await backup.save();

    logger.error({ err, backupId, tenantSlug }, 'Backup failed');
    throw err; // BullMQ will retry
  }
}

// ── Restore Test Job Handler ────────────────────────────────

async function handleRestoreTest(job: Job<BackupJobData>): Promise<void> {
  const { tenantSlug } = job.data;
  const tempDb = `restore_test_${tenantSlug}_${Date.now()}`;

  logger.info({ tenantSlug, tempDb }, 'Starting monthly restore test');

  try {
    // 1. Find latest completed backup
    const latestBackup = await Backup.findOne({
      tenantSlug,
      status: 'completed',
    }).sort({ completedAt: -1 });

    if (!latestBackup) {
      logger.warn({ tenantSlug }, 'No completed backup found for restore test — skipping');
      return;
    }

    // 2. Download from S3
    const downloadUrl = await getPresignedDownloadUrl(latestBackup.filePath!, 3600);

    // Fetch the file
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error(`S3 download failed: ${response.status}`);
    const downloadedBuffer = Buffer.from(await response.arrayBuffer());

    // 3. Decrypt if backup was encrypted
    let archiveBuffer: Buffer;
    const config = await getBackupConfig();
    if (config.encryptionEnabled) {
      const key = deriveBackupKey(env.PAYLOAD_SECRET, tenantSlug);
      archiveBuffer = decryptBackup(downloadedBuffer, key);
    } else {
      archiveBuffer = downloadedBuffer;
    }

    // 4. Verify checksum
    const checksum = sha256(archiveBuffer);
    if (latestBackup.checksum && checksum !== latestBackup.checksum) {
      throw new Error(`Checksum mismatch: expected ${latestBackup.checksum}, got ${checksum}`);
    }

    // 5. Restore to temp DB
    await runMongorestore(archiveBuffer, tempDb);

    // 6. Verify — check that at least some collections exist
    const tempConn = mongoose.createConnection(
      `${env.MONGODB_URI.replace(/\/[^/]+$/, '')}/${tempDb}`,
    );
    await tempConn.asPromise();
    const collections = await tempConn.db!.listCollections().toArray();
    await tempConn.close();

    if (collections.length === 0) {
      throw new Error('Restore test failed: no collections found in restored database');
    }

    logger.info(
      { tenantSlug, tempDb, collections: collections.length, backupId: latestBackup._id },
      'Restore test PASSED ✓',
    );

    // Update backup config with last restore test time
    config.lastRestoreTestAt = new Date();
    await config.save();
  } catch (err) {
    logger.error({ err, tenantSlug, tempDb }, 'Restore test FAILED ✗');
    throw err;
  } finally {
    // 7. Cleanup temp DB
    try {
      const cleanupConn = mongoose.createConnection(
        `${env.MONGODB_URI.replace(/\/[^/]+$/, '')}/${tempDb}`,
      );
      await cleanupConn.asPromise();
      await cleanupConn.db!.dropDatabase();
      await cleanupConn.close();
      logger.info({ tempDb }, 'Temp restore-test DB dropped');
    } catch {
      logger.warn({ tempDb }, 'Failed to cleanup temp restore-test DB');
    }
  }
}

// ── Production Restore Job Handler ──────────────────────────

async function handleProductionRestore(job: Job<BackupJobData>): Promise<void> {
  const { backupId, tenantSlug } = job.data;
  if (!backupId) throw new Error('backupId is required for production-restore jobs');

  const backup = await Backup.findById(backupId);
  if (!backup) throw new Error(`Backup record not found: ${backupId}`);
  if (backup.status !== 'completed') throw new Error('Only completed backups can be restored');
  if (!backup.filePath) throw new Error('Backup file path not available');

  const targetDb = `tenant_${tenantSlug}`;

  logger.info({ backupId, tenantSlug, targetDb }, 'Starting production restore');

  // 1. Create a safety backup before restoring
  logger.info({ tenantSlug }, 'Creating pre-restore safety backup');
  const safetyBackup = await Backup.create({
    tenantSlug,
    type: 'pre-migration' as const,
    status: 'pending',
    filePath: `backups/${tenantSlug}/pre-restore_${Date.now()}.gz`,
    storageBucket: backup.storageBucket,
    retentionDays: backup.retentionDays,
    initiatedBy: job.data.initiatedBy || null,
  });

  try {
    const safetyBuffer = await runMongodump(tenantSlug);
    const safetyChecksum = sha256(safetyBuffer);
    const config = await getBackupConfig();
    let safetyUpload: Buffer;
    if (config.encryptionEnabled) {
      const key = deriveBackupKey(env.PAYLOAD_SECRET, tenantSlug);
      safetyUpload = encryptBackup(safetyBuffer, key);
    } else {
      safetyUpload = safetyBuffer;
    }
    await uploadToS3(safetyBackup.filePath!, safetyUpload, 'application/gzip');
    safetyBackup.status = 'completed';
    safetyBackup.completedAt = new Date();
    safetyBackup.startedAt = new Date();
    safetyBackup.fileSize = safetyUpload.length;
    safetyBackup.checksum = safetyChecksum;
    const safetyExpires = new Date();
    safetyExpires.setDate(safetyExpires.getDate() + safetyBackup.retentionDays);
    safetyBackup.expiresAt = safetyExpires;
    await safetyBackup.save();
    logger.info({ safetyBackupId: safetyBackup._id }, 'Pre-restore safety backup completed');
  } catch (err) {
    safetyBackup.status = 'failed';
    safetyBackup.error = err instanceof Error ? err.message : String(err);
    await safetyBackup.save();
    throw new Error(`Cannot restore: pre-restore safety backup failed — ${safetyBackup.error}`);
  }

  // 2. Download the target backup from S3
  const downloadUrl = await getPresignedDownloadUrl(backup.filePath!, 3600);
  const response = await fetch(downloadUrl);
  if (!response.ok) throw new Error(`S3 download failed: ${response.status}`);
  const downloadedBuffer = Buffer.from(await response.arrayBuffer());

  // 3. Decrypt if needed
  let archiveBuffer: Buffer;
  const config = await getBackupConfig();
  if (config.encryptionEnabled) {
    const key = deriveBackupKey(env.PAYLOAD_SECRET, tenantSlug);
    archiveBuffer = decryptBackup(downloadedBuffer, key);
  } else {
    archiveBuffer = downloadedBuffer;
  }

  // 4. Verify checksum
  if (backup.checksum) {
    const checksum = sha256(archiveBuffer);
    if (checksum !== backup.checksum) {
      throw new Error(`Checksum mismatch: expected ${backup.checksum}, got ${checksum}`);
    }
  }

  // 5. Restore to production tenant DB (--drop replaces existing collections)
  logger.info({ tenantSlug, targetDb, backupId }, 'Restoring to production database');
  await runMongorestore(archiveBuffer, targetDb);

  logger.info(
    { backupId, tenantSlug, safetyBackupId: safetyBackup._id },
    'Production restore completed ✓ (safety backup created)',
  );
}

// ── Start Worker ────────────────────────────────────────────

export function startBackupWorker(): void {
  const connection = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<BackupJobData>(
    'tenant-backup',
    async (job: Job<BackupJobData>) => {
      switch (job.data.type) {
        case 'tenant-backup':
          return handleTenantBackup(job);
        case 'restore-test':
          return handleRestoreTest(job);
        case 'production-restore':
          return handleProductionRestore(job);
        default:
          logger.warn({ jobId: job.id, type: (job.data as any).type }, 'Unknown backup job type');
      }
    },
    {
      connection,
      concurrency: 1, // One backup at a time to avoid overwhelming disk/network
      lockDuration: 900_000, // 15 min lock (backups can be slow)
      // Redis cost optimization — backups are daily/monthly cron jobs.
      drainDelay: 60,
      stalledInterval: 120_000,
      maxStalledCount: 1,
    },
  );

  worker.on('completed', (job) => {
    logger.info(
      { jobId: job.id, type: job.data.type, tenantSlug: job.data.tenantSlug },
      'Backup job completed',
    );
  });

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, type: job?.data.type, tenantSlug: job?.data.tenantSlug, err: err.message },
      'Backup job failed',
    );
  });

  logger.info('Backup BullMQ worker started (concurrency: 1)');
}
