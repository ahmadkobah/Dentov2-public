/**
 * SSL Expiry Cron — Domain Certificate Monitoring
 *
 * Per PHASE_6_IMPLEMENTATION_PLAN §8.5:
 *   - Runs daily at 06:00 UTC
 *   - Checks SSL status for all active custom domains
 *   - Alerts (logs) when certificates expire within 30 days
 *   - Updates domain model sslStatus + sslExpiresAt
 *
 * Uses BullMQ repeatable job for reliability.
 */

import { Queue, Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { Domain } from '../platform/models/domain.model.js';
import { getSSLStatus, isCloudflareConfigured } from '../services/cloudflare.service.js';

// ── Job Data ────────────────────────────────────────────────

interface SSLCheckJobData {
  type: 'ssl-expiry-check';
}

// ── Queue ───────────────────────────────────────────────────

let sslQueue: Queue<SSLCheckJobData> | null = null;

export function getSSLCheckQueue(): Queue<SSLCheckJobData> {
  if (!sslQueue) {
    const connection = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });

    sslQueue = new Queue<SSLCheckJobData>('ssl-expiry-check', {
      connection,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 60_000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });

    logger.info('SSL expiry check queue initialised');
  }
  return sslQueue;
}

// ── Schedule ────────────────────────────────────────────────

const SSL_CRON = '0 6 * * *'; // Daily at 06:00 UTC
const SSL_EXPIRY_WARNING_DAYS = 30;

/**
 * Schedule the repeating SSL check cron.
 * Call once on server startup.
 */
export async function scheduleSSLExpiryCheck(): Promise<void> {
  if (!isCloudflareConfigured()) {
    logger.info('Cloudflare not configured — SSL expiry cron not scheduled');
    return;
  }

  const queue = getSSLCheckQueue();

  // Upsert repeatable — idempotent across restarts
  await queue.upsertJobScheduler(
    'ssl-expiry-daily',
    { pattern: SSL_CRON },
    {
      name: 'ssl-expiry-check',
      data: { type: 'ssl-expiry-check' },
    },
  );

  logger.info({ cron: SSL_CRON }, 'SSL expiry check cron scheduled');
}

// ── Worker ──────────────────────────────────────────────────

export function startSSLExpiryWorker(): Worker<SSLCheckJobData> {
  const connection = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<SSLCheckJobData>(
    'ssl-expiry-check',
    async (job: Job<SSLCheckJobData>) => {
      logger.info({ jobId: job.id }, 'SSL expiry check started');

      // Fetch all active domains with Cloudflare records
      const domains = await Domain.find({
        isActive: true,
        cloudflareRecordId: { $ne: null },
      }).lean();

      if (!domains.length) {
        logger.info('No active custom domains to check');
        return { checked: 0, warnings: 0 };
      }

      let warnings = 0;

      for (const domain of domains) {
        try {
          const ssl = await getSSLStatus(domain.customDomain);

          if (!ssl) {
            logger.warn({ domain: domain.customDomain }, 'Could not check SSL status');
            continue;
          }

          // Update domain record with current SSL state
          const update: Record<string, unknown> = { sslStatus: ssl.status };
          if (ssl.expiresAt) {
            update.sslExpiresAt = ssl.expiresAt;
          }

          await Domain.updateOne({ _id: domain._id }, { $set: update });

          // Check for upcoming expiry (if tracked)
          if (domain.sslExpiresAt) {
            const daysUntilExpiry = Math.floor(
              (new Date(domain.sslExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
            );

            if (daysUntilExpiry <= SSL_EXPIRY_WARNING_DAYS) {
              warnings++;
              logger.warn(
                {
                  domain: domain.customDomain,
                  tenantSlug: domain.tenantSlug,
                  daysUntilExpiry,
                  sslExpiresAt: domain.sslExpiresAt,
                },
                `SSL certificate expiring in ${daysUntilExpiry} days`,
              );
            }
          }

          // Check for non-active SSL
          if (ssl.status !== 'active') {
            warnings++;
            logger.warn(
              {
                domain: domain.customDomain,
                tenantSlug: domain.tenantSlug,
                sslStatus: ssl.status,
              },
              'SSL certificate is not active',
            );
          }
        } catch (error) {
          logger.error({ error, domain: domain.customDomain }, 'SSL check failed for domain');
        }
      }

      logger.info({ checked: domains.length, warnings }, 'SSL expiry check completed');

      return { checked: domains.length, warnings };
    },
    {
      connection,
      concurrency: 1,
      limiter: { max: 1, duration: 1000 }, // Max 1 job/sec (rate-limit CF API)
    },
  );

  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, error: error.message }, 'SSL expiry check job failed');
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, result: job.returnvalue }, 'SSL expiry check job completed');
  });

  logger.info('SSL expiry check worker started');
  return worker;
}
