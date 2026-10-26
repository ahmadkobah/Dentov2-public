/**
 * Expire Pending Activations Cron — H-3 step 2
 *
 * Per HIPAA §164.308(a)(4)(ii)(B) — terminate dormant accounts.
 *
 * Pending-activation accounts (status === 'pending_activation') older than
 * `MAX_AGE_DAYS` are flipped to 'deactivated' so a stale activation link can
 * never be redeemed weeks/months after registration. The activation token
 * itself already has a 24-hour expiry — this job is the longer-tail cleanup
 * that removes the account record from the active-pool entirely.
 *
 * Idempotent: re-running it on the same data is a no-op.
 *
 * Schedule: daily at 03:00 UTC (off-peak).
 */

import type { Job } from 'bullmq';
import { QUEUE_NAMES, addCronJob, createWorker } from '../queue.js';
import { logger } from '../../utils/logger.js';
import { User } from '../../platform/models/index.js';

const MAX_AGE_DAYS = 7;

// ── Cron Registration ─────────────────────────────────────

export async function startExpirePendingActivationsCron() {
  await addCronJob(
    QUEUE_NAMES.EXPIRE_PENDING_ACTIVATIONS,
    'expire-pending-activations',
    '0 3 * * *', // Daily at 03:00 UTC
  );

  logger.info('Expire-Pending-Activations cron registered (daily at 03:00 UTC)');
}

// ── Worker ────────────────────────────────────────────────

export function startExpirePendingActivationsWorker() {
  const worker = createWorker(
    QUEUE_NAMES.EXPIRE_PENDING_ACTIVATIONS,
    async (job: Job) => {
      if (job.name === 'expire-pending-activations') {
        await expirePendingActivations();
      }
    },
    { concurrency: 1 },
  );

  logger.info('Expire-Pending-Activations worker started');
  return worker;
}

// ── Core Logic ────────────────────────────────────────────

async function expirePendingActivations(): Promise<void> {
  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

  const result = await User.updateMany(
    {
      status: 'pending_activation',
      createdAt: { $lt: cutoff },
    },
    {
      $set: { status: 'deactivated' },
      // Drop the now-useless activation token so it can't ever be looked up.
      $unset: { activationToken: 1, activationTokenExpiresAt: 1 },
    },
  );

  logger.info(
    {
      cutoff: cutoff.toISOString(),
      maxAgeDays: MAX_AGE_DAYS,
      matched: result.matchedCount,
      modified: result.modifiedCount,
    },
    'Expired pending-activation accounts',
  );
}
