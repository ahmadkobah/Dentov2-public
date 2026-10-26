/**
 * Report Scheduler Service — BullMQ Cron for Automated Report Generation
 *
 * Per DENTO_V2_MASTER_PLAN.md §21 — Report Scheduling
 * Per V2_DECISION_LOG.md — BullMQ for all background jobs
 *
 * Runs a BullMQ repeatable job that:
 * 1. Checks report_schedules for due reports every 5 minutes
 * 2. Creates history entries for each due schedule
 * 3. Queues export jobs via report-export service
 * 4. Updates nextRunAt on each schedule
 */

import { Queue, Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import {
  createReportScheduleModel,
  createReportHistoryModel,
} from '../tenant/models/report.model.js';
import { queueReportExport } from './report-export.service.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

// ── Types ───────────────────────────────────────────────────

interface SchedulerJobData {
  type: 'check-due-reports';
}

// ── BullMQ Queue with Repeatable Job ────────────────────────

let schedulerQueue: Queue<SchedulerJobData> | null = null;

function getSchedulerQueue(): Queue<SchedulerJobData> {
  if (!schedulerQueue) {
    const connection = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    schedulerQueue = new Queue<SchedulerJobData>('report-scheduler', {
      connection,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });
  }
  return schedulerQueue;
}

// ── Calculate Next Run ──────────────────────────────────────

function calculateNextRun(
  frequency: string,
  time: string,
  _timezone: string,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null,
): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const next = new Date(now);

  switch (frequency) {
    case 'daily':
      next.setUTCDate(next.getUTCDate() + 1);
      next.setUTCHours(hours, minutes, 0, 0);
      break;
    case 'weekly':
      next.setUTCDate(next.getUTCDate() + 7);
      if (dayOfWeek !== undefined && dayOfWeek !== null) {
        next.setUTCDate(next.getUTCDate() + 1);
        while (next.getUTCDay() !== dayOfWeek) {
          next.setUTCDate(next.getUTCDate() + 1);
        }
      }
      next.setUTCHours(hours, minutes, 0, 0);
      break;
    case 'monthly':
      next.setUTCMonth(next.getUTCMonth() + 1);
      if (dayOfMonth !== undefined && dayOfMonth !== null) {
        next.setUTCDate(Math.min(dayOfMonth, 28));
      }
      next.setUTCHours(hours, minutes, 0, 0);
      break;
  }

  return next;
}

// ── Worker — Checks for Due Reports ─────────────────────────

export function startReportSchedulerWorker(): void {
  const connection = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  new Worker<SchedulerJobData>(
    'report-scheduler',
    async (_job: Job<SchedulerJobData>) => {
      const now = new Date();
      logger.info('Checking for due report schedules...');

      // Get all tenant database connections from mongoose
      // In production, iterate over all tenant DBs.
      // Phase 2: We check the default connection's models.
      const connections = mongoose.connections.filter(
        (c) => c.readyState === 1 && c.name && c.name.startsWith('tenant_'),
      );

      let totalProcessed = 0;

      for (const conn of connections) {
        try {
          const ReportSchedule = createReportScheduleModel(conn);
          const ReportHistory = createReportHistoryModel(conn);

          // Find all active schedules that are due
          const dueSchedules = await ReportSchedule.find({
            isActive: true,
            nextRunAt: { $lte: now },
          }).lean();

          for (const schedule of dueSchedules) {
            // Create history entry. Mixed ObjectId/string/dynamic values from the
            // lean schedule are stored as-is by Mongoose; payload typed loosely so
            // Mongoose 9's stricter create casting accepts them unchanged.
            const historyDoc: Record<string, unknown> = {
              tenantId: schedule.tenantId,
              scheduleId: schedule._id,
              reportType: schedule.reportType,
              category: schedule.category,
              params: schedule.reportParams,
              status: 'pending',
              format: schedule.format,
              triggeredBy: 'schedule',
              userId: schedule.createdBy,
              generatedAt: new Date(),
            };
            const history = await ReportHistory.create(historyDoc);

            // Queue the export job
            await queueReportExport({
              tenantSlug: conn.name?.replace('tenant_', '') || '',
              tenantId: schedule.tenantId,
              historyId: history._id.toString(),
              reportType: schedule.reportType,
              category: schedule.category,
              params: schedule.reportParams as Record<string, unknown>,
              format: schedule.format as 'csv' | 'excel' | 'pdf',
              userId: schedule.createdBy.toString(),
            });

            // Update nextRunAt
            const nextRun = calculateNextRun(
              schedule.frequency,
              schedule.time,
              schedule.timezone,
              schedule.dayOfWeek,
              schedule.dayOfMonth,
            );

            await ReportSchedule.updateOne(
              { _id: schedule._id },
              { $set: { lastRunAt: now, nextRunAt: nextRun } },
            );

            totalProcessed++;
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          logger.error({ db: conn.name, error: errMsg }, 'Error processing report schedules');
        }
      }

      if (totalProcessed > 0) {
        logger.info({ count: totalProcessed }, 'Processed due report schedules');
      }
    },
    {
      connection,
      concurrency: 1,
    },
  );

  logger.info('✅ Report scheduler worker started');
}

// ── Start Scheduler (BullMQ Repeatable Job) ─────────────────

export async function startReportScheduler(): Promise<void> {
  const queue = getSchedulerQueue();

  // Add a repeatable job that runs every 5 minutes
  await queue.add(
    'check-due-reports',
    { type: 'check-due-reports' },
    {
      repeat: {
        pattern: '*/5 * * * *', // Every 5 minutes
      },
    },
  );

  // Start the worker
  startReportSchedulerWorker();

  logger.info('✅ Report scheduler initialized (cron: every 5 minutes)');
}
