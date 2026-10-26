/**
 * Overdue Detection Cron Jobs — invoices + installments
 *
 * Per IMPLEMENTATION_ROADMAP §6 Week 14 — Auto-overdue detection
 * Per V2_DATABASE.md §5.7 / §7.4 — overdue status tracking
 *
 * Runs daily at 2 AM (invoices) and 3 AM (installments).
 * Iterates all active tenants, calls the existing service methods
 * `InvoiceService.markOverdueInvoices()` and `InstallmentService.markOverdueInstallments()`.
 */

import type { Job } from 'bullmq';
import mongoose from 'mongoose';
import { QUEUE_NAMES, addCronJob, createWorker } from '../queue.js';
import { logger } from '../../utils/logger.js';
import { getTenantDb } from '../../config/database.js';
import type { ITenant } from '../../platform/models/tenant.model.js';
import { InvoiceService } from '../../tenant/services/invoice.service.js';
import { InstallmentService } from '../../tenant/services/installment.service.js';
import { NotificationService } from '../../services/notification.service.js';

// ── Cron Registration ─────────────────────────────────────

export async function startOverdueCron() {
  // Mark overdue invoices daily at 2 AM
  await addCronJob(QUEUE_NAMES.INVOICE_OVERDUE, 'mark-overdue-invoices', '0 2 * * *');

  // Mark overdue installments daily at 3 AM
  await addCronJob(QUEUE_NAMES.INSTALLMENT_OVERDUE, 'mark-overdue-installments', '0 3 * * *');

  logger.info('Overdue detection crons registered (2 AM invoices, 3 AM installments)');
}

// ── Worker ────────────────────────────────────────────────

export function startOverdueWorker() {
  const invoiceWorker = createWorker(
    QUEUE_NAMES.INVOICE_OVERDUE,
    async (job: Job) => {
      logger.info({ jobId: job.id }, 'Running invoice overdue detection');
      await processOverdueInvoices();
    },
    { concurrency: 1 },
  );

  const installmentWorker = createWorker(
    QUEUE_NAMES.INSTALLMENT_OVERDUE,
    async (job: Job) => {
      logger.info({ jobId: job.id }, 'Running installment overdue detection');
      await processOverdueInstallments();
    },
    { concurrency: 1 },
  );

  logger.info('Overdue detection workers started');
  return { invoiceWorker, installmentWorker };
}

// ── Core Logic ────────────────────────────────────────────

async function processOverdueInvoices() {
  const platformDb = mongoose.connection;
  const Tenant = platformDb.model<ITenant>('Tenant');
  const tenants = await Tenant.find({ status: 'active' }).select('slug').lean();

  let totalOverdue = 0;

  for (const tenant of tenants) {
    try {
      const tenantDb = await getTenantDb(tenant.slug);
      const service = new InvoiceService(tenantDb);
      const result = await service.markOverdueInvoices();
      totalOverdue += result.overdueCount;

      if (result.overdueCount > 0) {
        logger.info(
          { tenant: tenant.slug, overdueCount: result.overdueCount },
          'Overdue invoices marked',
        );

        // Send in-app notifications to staff about overdue invoices
        try {
          const notificationService = new NotificationService(tenantDb, tenant.slug);
          await notificationService.send({
            templateKey: 'invoice.overdue',
            tenantId: tenant.slug,
            recipients: [],
            variables: {
              overdueCount: String(result.overdueCount),
            },
            channels: ['inApp'],
          });
        } catch {
          // Non-critical: notification failure shouldn't stop the batch
        }
      }
    } catch (err) {
      logger.error({ tenant: tenant.slug, err }, 'Failed to process overdue invoices for tenant');
    }
  }

  logger.info({ totalOverdue }, 'Invoice overdue detection complete');
}

async function processOverdueInstallments() {
  const platformDb = mongoose.connection;
  const Tenant = platformDb.model<ITenant>('Tenant');
  const tenants = await Tenant.find({ status: 'active' }).select('slug').lean();

  let totalOverdue = 0;

  for (const tenant of tenants) {
    try {
      const tenantDb = await getTenantDb(tenant.slug);
      const service = new InstallmentService(tenantDb);
      const result = await service.markOverdueInstallments();
      totalOverdue += result.overdueCount;

      if (result.overdueCount > 0) {
        logger.info(
          { tenant: tenant.slug, overdueCount: result.overdueCount },
          'Overdue installments marked',
        );
      }
    } catch (err) {
      logger.error(
        { tenant: tenant.slug, err },
        'Failed to process overdue installments for tenant',
      );
    }
  }

  logger.info({ totalOverdue }, 'Installment overdue detection complete');
}
