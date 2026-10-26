/**
 * Rollout Auto-Advance Cron — Module Versioning System
 *
 * Per MASTER_PLAN §24 — Canary Rollout System
 *
 * Runs every hour. For each active rollout:
 *   1. Check if monitoringHours have elapsed since the current stage started
 *   2. Check error rate (from stages[] entries)
 *   3. If error rate exceeds threshold → auto-rollback
 *   4. If monitoring period elapsed and error rate OK → advance to next stage
 *
 * Stage progression: canary → rolling_25 → rolling_50 → rolling_100 → completed
 */

import type { Job } from 'bullmq';
import { QUEUE_NAMES, addCronJob, createWorker } from '../queue.js';
import { logger } from '../../utils/logger.js';
import { RolloutPlan } from '../../platform/models/rollout-plan.model.js';
import { TenantModule } from '../../platform/models/tenant-module.model.js';

// ── Stage Order ─────────────────────────────────────────────

const STAGE_ORDER = ['canary', 'rolling_25', 'rolling_50', 'rolling_100', 'completed'] as const;
type RolloutStage = (typeof STAGE_ORDER)[number];

const STAGE_PERCENTS: Record<string, number> = {
  rolling_25: 25,
  rolling_50: 50,
  rolling_100: 100,
  completed: 100,
};

// ── Cron Registration ─────────────────────────────────────

export async function startRolloutAdvanceCron() {
  await addCronJob(
    QUEUE_NAMES.ROLLOUT_ADVANCE,
    'rollout-auto-advance',
    '0 * * * *', // Every hour
  );

  logger.info('Rollout auto-advance cron registered (every hour)');
}

// ── Worker ────────────────────────────────────────────────

export function startRolloutAdvanceWorker() {
  const worker = createWorker(
    QUEUE_NAMES.ROLLOUT_ADVANCE,
    async (job: Job) => {
      logger.info({ jobId: job.id }, 'Running rollout auto-advance check');
      await processActiveRollouts();
    },
    { concurrency: 1 },
  );

  logger.info('Rollout auto-advance worker started');
  return worker;
}

// ── Core Logic ────────────────────────────────────────────

async function processActiveRollouts(): Promise<void> {
  const activeRollouts = await RolloutPlan.find({
    stage: { $nin: ['completed', 'rolled_back'] },
  });

  if (activeRollouts.length === 0) {
    logger.debug('No active rollouts to process');
    return;
  }

  logger.info({ count: activeRollouts.length }, 'Processing active rollouts');

  for (const rollout of activeRollouts) {
    try {
      await processRollout(rollout);
    } catch (err) {
      logger.error(
        { err, moduleSlug: rollout.moduleSlug, rolloutId: rollout._id },
        'Failed to process rollout',
      );
    }
  }
}

async function processRollout(rollout: InstanceType<typeof RolloutPlan>): Promise<void> {
  const slug = rollout.moduleSlug;

  // Get current stage entry
  const currentStageEntry = rollout.stages[rollout.stages.length - 1];
  if (!currentStageEntry) {
    logger.warn({ slug }, 'Rollout has no stage entries — skipping');
    return;
  }

  // Check if monitoring period has elapsed
  const stageStartedAt = currentStageEntry.startedAt;
  const hoursElapsed = (Date.now() - new Date(stageStartedAt).getTime()) / (1000 * 60 * 60);

  if (hoursElapsed < rollout.monitoringHours) {
    logger.debug(
      { slug, hoursElapsed: hoursElapsed.toFixed(1), required: rollout.monitoringHours },
      'Monitoring period not yet elapsed — skipping',
    );
    return;
  }

  // Check error rate on current stage
  const errorRate = currentStageEntry.errorRate ?? 0;
  if (errorRate > rollout.errorRateThreshold) {
    logger.warn(
      { slug, errorRate, threshold: rollout.errorRateThreshold },
      'Error rate exceeds threshold — auto-rolling back',
    );
    await autoRollback(
      rollout,
      `Auto-rollback: error rate ${errorRate}% exceeds threshold ${rollout.errorRateThreshold}%`,
    );
    return;
  }

  // Advance to next stage
  const currentIdx = STAGE_ORDER.indexOf(rollout.stage as RolloutStage);
  if (currentIdx === -1 || currentIdx >= STAGE_ORDER.length - 1) {
    return; // Already at final stage
  }

  const nextStage = STAGE_ORDER[currentIdx + 1];
  logger.info({ slug, from: rollout.stage, to: nextStage }, 'Auto-advancing rollout');

  const totalTenants = await TenantModule.countDocuments({ moduleSlug: slug });

  if (nextStage !== 'completed') {
    const targetPercent = STAGE_PERCENTS[nextStage] || 100;
    const targetCount = Math.ceil(totalTenants * (targetPercent / 100));

    const notUpdated = await TenantModule.find({
      moduleSlug: slug,
      installedVersion: { $ne: rollout.toVersion },
    })
      .limit(targetCount)
      .lean();

    if (notUpdated.length > 0) {
      await TenantModule.updateMany(
        { _id: { $in: notUpdated.map((t) => t._id) } },
        {
          $set: { installedVersion: rollout.toVersion },
          $push: {
            updateHistory: {
              from: notUpdated[0].installedVersion,
              to: rollout.toVersion,
              at: new Date(),
              status: 'success',
            },
          },
        },
      );
    }

    // Record new stage entry
    rollout.stages.push({
      stage: nextStage as 'canary' | 'rolling_25' | 'rolling_50' | 'rolling_100',
      startedAt: new Date(),
      completedAt: null,
      tenantsAffected: notUpdated.length,
      errorRate: 0,
    });
  }

  // Mark previous stage as completed
  if (currentStageEntry) {
    currentStageEntry.completedAt = new Date();
  }

  rollout.stage = nextStage;
  if (nextStage === 'completed') {
    rollout.completedAt = new Date();
  }

  await rollout.save();
  logger.info({ slug, stage: nextStage, totalTenants }, 'Rollout advanced successfully');
}

// ── Auto-Rollback ─────────────────────────────────────────

async function autoRollback(
  rollout: InstanceType<typeof RolloutPlan>,
  reason: string,
): Promise<void> {
  const slug = rollout.moduleSlug;

  const result = await TenantModule.updateMany(
    { moduleSlug: slug, installedVersion: rollout.toVersion },
    {
      $set: { installedVersion: rollout.fromVersion },
      $push: {
        updateHistory: {
          from: rollout.toVersion,
          to: rollout.fromVersion,
          at: new Date(),
          status: 'rolled_back',
          error: reason,
        },
      },
    },
  );

  rollout.stage = 'rolled_back';
  rollout.rolledBackAt = new Date();
  rollout.rollbackReason = reason;
  await rollout.save();

  logger.warn(
    { slug, tenantsRolledBack: result.modifiedCount, reason },
    'Rollout auto-rolled back',
  );
}
