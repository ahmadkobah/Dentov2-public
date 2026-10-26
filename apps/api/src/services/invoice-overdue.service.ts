/**
 * Invoice Overdue Cron Worker — Day 14 Phase 4
 *
 * Per DENTO_V2_MASTER_PLAN.md §12 - Invoice Management
 * Per IMPLEMENTATION_ROADMAP.md — Phase 4 Day 14
 *
 * BullMQ repeatable job that runs daily at 01:00 UTC:
 * 1. Finds invoices with status 'issued' and dueDate < now
 * 2. Transitions them to 'overdue' status
 * 3. Sends overdue notification to tenant staff via NotificationService
 *
 * Iterates all active tenant DB connections.
 */

import { Queue, Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import { getInvoiceModel } from '../tenant/models/invoice.model.js';
import { NotificationService } from './notification.service.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

// ── Types ───────────────────────────────────────────────────

interface OverdueJobData {
  type: 'check-overdue-invoices';
}

// ── BullMQ Queue ────────────────────────────────────────────

let overdueQueue: Queue<OverdueJobData> | null = null;

function getOverdueQueue(): Queue<OverdueJobData> {
  if (!overdueQueue) {
    const connection = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    overdueQueue = new Queue<OverdueJobData>('invoice-overdue', {
      connection,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });
  }
  return overdueQueue;
}

// ── Worker ──────────────────────────────────────────────────

export function startOverdueInvoiceWorker(): void {
  const connection = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  new Worker<OverdueJobData>(
    'invoice-overdue',
    async (_job: Job<OverdueJobData>) => {
      const now = new Date();
      logger.info('Checking for overdue invoices...');

      // Get all active tenant DB connections
      const connections = mongoose.connections.filter(
        (c) => c.readyState === 1 && c.name && c.name.startsWith('tenant_'),
      );

      let totalOverdue = 0;

      for (const conn of connections) {
        try {
          const Invoice = getInvoiceModel(conn);

          // Find issued invoices where dueDate has passed
          const result = await Invoice.updateMany(
            {
              status: 'issued',
              dueDate: { $lt: now },
            },
            {
              $set: {
                status: 'overdue',
                updatedAt: now,
              },
            },
          );

          const count = result.modifiedCount;
          if (count > 0) {
            logger.info({ db: conn.name, count }, 'Marked invoices as overdue');
            totalOverdue += count;

            // Send overdue notifications via NotificationService
            try {
              const tenantSlug = conn.name?.replace('tenant_', '') || '';
              const notificationService = new NotificationService(conn, tenantSlug);

              // Fetch the newly-overdue invoices for notification details
              const overdueInvoices = await Invoice.find({
                status: 'overdue',
                dueDate: { $lt: now },
              })
                .select('_id invoiceNumber patientId totalAmount balanceDue')
                .populate('patientId', 'firstName lastName')
                .limit(50)
                .lean();

              for (const inv of overdueInvoices) {
                try {
                  const patient = inv.patientId as unknown as {
                    firstName?: string;
                    lastName?: string;
                  } | null;
                  const patientName = patient
                    ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
                    : 'Unknown';

                  await notificationService.send({
                    templateKey: 'invoice.overdue',
                    tenantId: tenantSlug,
                    recipients: [], // In-app to all users with invoices:read
                    variables: {
                      invoiceNumber: inv.invoiceNumber,
                      patientName,
                      balanceDue: String(inv.balanceDue ?? inv.totalAmount),
                    },
                    relatedEntity: {
                      type: 'invoice',
                      id: inv._id.toString(),
                    },
                    channels: ['inApp'],
                  });
                } catch {
                  // Non-critical: individual notification failure shouldn't stop the batch
                }
              }
            } catch (notifErr) {
              const errMsg = notifErr instanceof Error ? notifErr.message : 'Unknown';
              logger.warn({ db: conn.name, error: errMsg }, 'Failed to send overdue notifications');
            }
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          logger.error({ db: conn.name, error: errMsg }, 'Error processing overdue invoices');
        }
      }

      logger.info(
        { totalOverdue },
        `Overdue invoice check complete. ${totalOverdue} invoices marked overdue.`,
      );

      return { processedAt: now.toISOString(), totalOverdue };
    },
    {
      connection,
      concurrency: 1,
    },
  );

  logger.info('✅ Invoice overdue worker started');
}

// ── Start Scheduler ─────────────────────────────────────────

export async function startOverdueInvoiceScheduler(): Promise<void> {
  const queue = getOverdueQueue();

  // Run daily at 01:00 UTC
  await queue.add(
    'check-overdue-invoices',
    { type: 'check-overdue-invoices' },
    {
      repeat: {
        pattern: '0 1 * * *', // Every day at 01:00 UTC
      },
    },
  );

  // Start the worker
  startOverdueInvoiceWorker();

  logger.info('✅ Invoice overdue scheduler initialized (cron: daily at 01:00 UTC)');
}
