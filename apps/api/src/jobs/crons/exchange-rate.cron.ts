/**
 * Exchange Rate Refresh Cron — Fetches live rates daily at 6 AM UTC
 *
 * Uses the exchange-rate.service.ts to pull rates from exchangerate-api.com
 * and update the platform currencies singleton in MongoDB.
 *
 * Schedule: Daily 06:00 UTC (covers Middle East / Europe business hours)
 */

import type { Job } from 'bullmq';
import { QUEUE_NAMES, addCronJob, createWorker } from '../queue.js';
import { logger } from '../../utils/logger.js';
import { refreshExchangeRates } from '../../platform/services/exchange-rate.service.js';

// ── Cron Registration ─────────────────────────────────────

export async function startExchangeRateCron() {
  await addCronJob(
    QUEUE_NAMES.EXCHANGE_RATE_REFRESH,
    'refresh-exchange-rates',
    '0 6 * * *', // Daily at 06:00 UTC
  );

  logger.info('Exchange rate refresh cron registered (daily 06:00 UTC)');
}

// ── Worker ────────────────────────────────────────────────

export function startExchangeRateWorker() {
  const worker = createWorker(QUEUE_NAMES.EXCHANGE_RATE_REFRESH, async (job: Job) => {
    logger.info({ jobId: job.id }, 'Running exchange rate refresh');

    try {
      const result = await refreshExchangeRates();
      logger.info(
        { baseCurrency: result.baseCurrency, updated: result.updated },
        'Exchange rates refreshed successfully',
      );
    } catch (err) {
      logger.error({ err }, 'Exchange rate refresh failed');
      throw err; // Let BullMQ retry
    }
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Exchange rate refresh job failed');
  });

  return worker;
}
