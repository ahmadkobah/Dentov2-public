/**
 * BullMQ Queue Infrastructure — Shared Configuration
 *
 * Per TECH_REQUIREMENTS.md — BullMQ for job scheduling
 * Per V2_STRUCTURE.md — Centralized jobs directory
 *
 * All cron/worker queues share this configuration.
 */

import {
  Queue,
  Worker,
  type ConnectionOptions,
  type QueueOptions,
  type WorkerOptions,
} from 'bullmq';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// ── Queue Names ─────────────────────────────────────────────

export const QUEUE_NAMES = {
  APPOINTMENT_REMINDERS: 'appointment-reminders',
  AUTO_NO_SHOW: 'auto-no-show',
  WALK_IN_NO_SHOW: 'walk-in-no-show',
  SCHEDULED_ALERTS: 'scheduled-alerts',
  WORKFLOW_EXECUTION: 'workflow-execution',
  NOTIFICATION_DELIVERY: 'notification-delivery',
  INVENTORY_EXPIRY: 'inventory-expiry',
  INVENTORY_AUTO_REORDER: 'inventory-auto-reorder',
  INVOICE_OVERDUE: 'invoice-overdue',
  INSTALLMENT_OVERDUE: 'installment-overdue',
  CHAT_PUSH: 'chat-push',
  RAMADAN_REMINDER: 'ramadan-reminder',
  EXCHANGE_RATE_REFRESH: 'exchange-rate-refresh',
  ROLLOUT_ADVANCE: 'rollout-advance',
  SAAS_INVOICE_GENERATE: 'saas-invoice-generate',
  SAAS_INVOICE_OVERDUE: 'saas-invoice-overdue',
  EXPIRE_PENDING_ACTIVATIONS: 'expire-pending-activations',
} as const;

// ── Shared Connection ─────────────────────────────────────

function getConnection(): ConnectionOptions {
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname || 'localhost',
    port: Number(url.port) || 6379,
    password: url.password || undefined,
    tls: url.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
  };
}

// ── Queue Factory ─────────────────────────────────────────

const queueCache = new Map<string, Queue>();

export function getQueue(name: string, opts?: Partial<QueueOptions>): Queue {
  if (queueCache.has(name)) return queueCache.get(name)!;

  const queue = new Queue(name, {
    connection: getConnection(),
    defaultJobOptions: {
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
    ...opts,
  });

  queue.on('error', (err) => {
    logger.error({ queue: name, err }, 'Queue error');
  });

  queueCache.set(name, queue);
  return queue;
}

// ── Worker Factory ────────────────────────────────────────

export function createWorker(
  name: string,
  processor: (job: any) => Promise<any>,
  opts?: Partial<WorkerOptions>,
): Worker {
  const worker = new Worker(name, processor, {
    connection: getConnection(),
    concurrency: 5,
    // ── Redis cost optimization ────────────────────────────
    // These are cron/low-latency-tolerant queues; poll less to
    // reduce Upstash command usage. (defaults: drainDelay 5s,
    // stalledInterval 30s) → ~12× fewer poll commands.
    drainDelay: 60,
    stalledInterval: 120_000,
    maxStalledCount: 1,
    ...opts,
  });

  worker.on('completed', (job) => {
    logger.debug({ queue: name, jobId: job.id }, 'Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ queue: name, jobId: job?.id, err }, 'Job failed');
  });

  worker.on('error', (err) => {
    logger.error({ queue: name, err }, 'Worker error');
  });

  return worker;
}

// ── Cron Helper ───────────────────────────────────────────

export async function addCronJob(
  queueName: string,
  jobName: string,
  cronExpression: string,
  data: Record<string, unknown> = {},
) {
  const queue = getQueue(queueName);

  // Remove existing repeatable job with same name
  const repeatableJobs = await queue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === jobName) {
      await queue.removeRepeatableByKey(job.key);
    }
  }

  await queue.add(jobName, data, {
    repeat: { pattern: cronExpression },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  });

  logger.info({ queue: queueName, job: jobName, cron: cronExpression }, 'Cron job registered');
}
