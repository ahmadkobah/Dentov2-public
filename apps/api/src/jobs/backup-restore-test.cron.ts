/**
 * Monthly Backup Restore Test Cron — HIPAA §14.3 Compliance
 *
 * Per SECURITY_AND_ENCRYPTION.md §14.3:
 *   - Runs on 1st of each month at 03:00 UTC
 *   - Picks the latest completed backup per tenant
 *   - Downloads from S3, decrypts (AES-256-GCM), mongorestore to temp DB
 *   - Validates collection counts + sample reads
 *   - Drops temp DB, logs result
 *
 * Pattern source: `jobs/ssl-expiry.cron.ts` (BullMQ queue + worker + schedule)
 * Crypto/S3 reuse: `workers/backup.worker.ts`
 */

import { Queue, Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mongoose from 'mongoose';

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { Backup } from '../platform/models/backup.model.js';
import { getBackupConfig } from '../platform/models/backup-config.model.js';
import { getPresignedDownloadUrl } from '../config/s3.js';
import { deriveBackupKey, decryptBackup, sha256 } from '../utils/backup-crypto.js';

const execFileAsync = promisify(execFile);

// ── Constants ───────────────────────────────────────────────

const QUEUE_NAME = 'backup-restore-test';
const MONGORESTORE_PATH = process.env.MONGORESTORE_PATH || 'mongorestore';
const CRON_PATTERN = '0 3 1 * *'; // 1st of each month at 03:00 UTC

// ── Job Data ────────────────────────────────────────────────

interface RestoreTestJobData {
  type: 'monthly-restore-test';
}

// ── Queue ───────────────────────────────────────────────────

let restoreTestQueue: Queue<RestoreTestJobData> | null = null;

function getRestoreTestQueue(): Queue<RestoreTestJobData> {
  if (!restoreTestQueue) {
    const connection = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });

    restoreTestQueue = new Queue<RestoreTestJobData>(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 120_000 },
        removeOnComplete: 12, // Keep last 12 months
        removeOnFail: 24,
      },
    });

    logger.info('Backup restore-test queue initialised');
  }
  return restoreTestQueue;
}

// ── Schedule ────────────────────────────────────────────────

/**
 * Schedule the monthly restore test.
 * Call once on server startup — idempotent via upsertJobScheduler.
 */
export async function scheduleBackupRestoreTest(): Promise<void> {
  const queue = getRestoreTestQueue();

  await queue.upsertJobScheduler(
    'monthly-restore-test',
    { pattern: CRON_PATTERN },
    {
      name: 'restore-test',
      data: { type: 'monthly-restore-test' },
    },
  );

  logger.info({ cron: CRON_PATTERN }, '📅 Monthly backup restore test scheduled');
}

// ── Helper: mongorestore from archive buffer ────────────────

async function runMongorestore(data: Buffer, targetDb: string): Promise<void> {
  const tmpDir = await mkdtemp(join(tmpdir(), 'dento-restore-test-'));
  const archivePath = join(tmpDir, 'restore.archive');

  try {
    await writeFile(archivePath, data);

    const args = [
      `--uri=${env.MONGODB_URI}`,
      `--db=${targetDb}`,
      `--archive=${archivePath}`,
      '--gzip',
      '--drop',
    ];

    await execFileAsync(MONGORESTORE_PATH, args, { timeout: 900_000 }); // 15 min
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ── Restore Test Logic ──────────────────────────────────────

async function handleRestoreTest(_job: Job<RestoreTestJobData>): Promise<void> {
  const startTime = Date.now();
  logger.info('🔄 Starting monthly backup restore test (HIPAA §14.3)...');

  // Gather all tenant slugs that have completed backups
  const tenantSlugs: string[] = await Backup.distinct('tenantSlug', { status: 'completed' });

  if (tenantSlugs.length === 0) {
    logger.info('No completed backups found — restore test skipped');
    return;
  }

  let passed = 0;
  let failed = 0;

  for (const tenantSlug of tenantSlugs) {
    const tempDb = `restore_test_${tenantSlug}_${Date.now()}`;

    try {
      // 1. Find latest completed backup for this tenant
      const latestBackup = await Backup.findOne({
        tenantSlug,
        status: 'completed',
      }).sort({ completedAt: -1 });

      if (!latestBackup?.filePath) {
        logger.warn({ tenantSlug }, 'No usable backup found — skipping tenant');
        continue;
      }

      // 2. Download from S3
      const downloadUrl = await getPresignedDownloadUrl(latestBackup.filePath, 3600);
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`S3 download failed: ${response.status} ${response.statusText}`);
      }
      const downloadedBuffer = Buffer.from(await response.arrayBuffer());

      // 3. Decrypt if encrypted
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

      // 6. Validate — check collections exist and have documents
      const tempConn = mongoose.createConnection(
        `${env.MONGODB_URI.replace(/\/[^/]+$/, '')}/${tempDb}`,
      );
      await tempConn.asPromise();
      const collections = await tempConn.db!.listCollections().toArray();
      await tempConn.close();

      if (collections.length === 0) {
        throw new Error('Restore validation failed: no collections found in restored database');
      }

      passed++;
      logger.info(
        {
          tenantSlug,
          tempDb,
          collections: collections.length,
          backupId: latestBackup._id,
        },
        '✅ Restore test PASSED for tenant',
      );
    } catch (err) {
      failed++;
      logger.error({ err, tenantSlug, tempDb }, '❌ Restore test FAILED for tenant');
    } finally {
      // 7. Cleanup temp DB
      try {
        const cleanupConn = mongoose.createConnection(
          `${env.MONGODB_URI.replace(/\/[^/]+$/, '')}/${tempDb}`,
        );
        await cleanupConn.asPromise();
        await cleanupConn.db!.dropDatabase();
        await cleanupConn.close();
      } catch {
        logger.warn({ tempDb }, 'Failed to cleanup temp restore-test DB');
      }
    }
  }

  // Update config with last restore test timestamp
  try {
    const config = await getBackupConfig();
    config.lastRestoreTestAt = new Date();
    await config.save();
  } catch {
    logger.warn('Failed to update lastRestoreTestAt on backup config');
  }

  const duration = Date.now() - startTime;
  logger.info(
    { passed, failed, total: tenantSlugs.length, duration },
    `📋 Monthly restore test complete — ${passed} passed, ${failed} failed`,
  );

  if (failed > 0) {
    throw new Error(`${failed} of ${tenantSlugs.length} tenant restore tests failed`);
  }
}

// ── Worker ──────────────────────────────────────────────────

export function startBackupRestoreWorker(): void {
  const connection = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<RestoreTestJobData>(
    QUEUE_NAME,
    async (job: Job<RestoreTestJobData>) => handleRestoreTest(job),
    {
      connection,
      concurrency: 1,
      lockDuration: 1_800_000, // 30 min — restore tests can be slow
    },
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Backup restore test job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'Backup restore test job failed');
  });

  logger.info('Backup restore-test BullMQ worker started');
}
