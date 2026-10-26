/**
 * SaaS Dunning Cron Job
 *
 * Per MASTER_PLAN Â§29 â€” SaaS Billing Dunning
 *
 * Runs daily at 5 AM UTC (after the overdue cron at 4 AM).
 * Escalation schedule:
 *   - 3 days overdue  â†’ 'reminder' email
 *   - 7 days overdue  â†’ 'warning' email
 *   - 14 days overdue â†’ 'final_notice' email
 *   - 21 days overdue â†’ 'suspension' email (+ marks tenant suspended)
 */

import type { Job } from 'bullmq';
import { QUEUE_NAMES, addCronJob, createWorker } from '../queue.js';
import { logger } from '../../utils/logger.js';
import { SaaSInvoice } from '../../platform/models/saas-invoice.model.js';
import { Tenant } from '../../platform/models/tenant.model.js';
import { DunningLog, type EscalationLevel } from '../../platform/models/dunning-log.model.js';
import { getEmailQueue } from '../../services/notification.service.js';
import { dunningEmailHtml } from '../../utils/email-templates.js';

// â”€â”€ Escalation Thresholds (days overdue â†’ level) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ESCALATION_THRESHOLDS: Array<{ days: number; level: EscalationLevel }> = [
  { days: 3, level: 'reminder' },
  { days: 7, level: 'warning' },
  { days: 14, level: 'final_notice' },
  { days: 21, level: 'suspension' },
];

// â”€â”€ Cron Registration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function startDunningCron() {
  await addCronJob(QUEUE_NAMES.SAAS_INVOICE_OVERDUE, 'run-dunning-cycle', '0 5 * * *');
  logger.info('SaaS dunning cron registered (daily 5 AM)');
}

// â”€â”€ Worker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function startDunningWorker() {
  const worker = createWorker(
    QUEUE_NAMES.SAAS_INVOICE_OVERDUE,
    async (job: Job) => {
      if (job.name === 'run-dunning-cycle') {
        await runDunningCycle();
        return;
      }
      // Let the existing overdue marker handler pass through
      if (job.name === 'mark-saas-invoices-overdue') {
        return; // Handled by the existing saas-overdue worker
      }
    },
    { concurrency: 1 },
  );

  logger.info('SaaS dunning worker started');
  return worker;
}

// â”€â”€ Core Logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function runDunningCycle() {
  const now = new Date();

  // Find all overdue SaaS invoices
  const overdueInvoices = await SaaSInvoice.find({
    status: 'overdue',
    isActive: true,
  })
    .select('_id tenantId invoiceNumber totalAmount currency dueDate')
    .lean();

  if (overdueInvoices.length === 0) {
    logger.info('No overdue SaaS invoices for dunning');
    return;
  }

  let totalSent = 0;

  for (const invoice of overdueInvoices) {
    try {
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(invoice.dueDate ?? now).getTime()) / (1000 * 60 * 60 * 24),
      );

      // Determine the appropriate escalation level
      let targetLevel: EscalationLevel | null = null;
      for (const threshold of ESCALATION_THRESHOLDS) {
        if (daysOverdue >= threshold.days) {
          targetLevel = threshold.level;
        }
      }

      if (!targetLevel) continue; // Not yet at first threshold

      // Check if we already sent this escalation level for this invoice
      const existingLog = await DunningLog.findOne({
        invoiceId: invoice._id,
        escalationLevel: targetLevel,
        status: { $in: ['sent', 'delivered'] },
      });

      if (existingLog) continue; // Already sent

      // Get tenant info
      const tenant = await Tenant.findById(invoice.tenantId)
        .select('name slug contact status')
        .lean();
      if (!tenant?.contact?.email) continue;

      const tenantName = typeof tenant.name === 'object' ? tenant.name.en : String(tenant.name);
      const invoiceNumber = invoice.invoiceNumber ?? invoice._id.toString();
      const amount = `${invoice.currency ?? 'USD'} ${invoice.total}`;
      const dueDate = new Date(invoice.dueDate ?? now).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Generate and send email
      const html = dunningEmailHtml({
        tenantName,
        invoiceNumber,
        amount,
        dueDate,
        escalationLevel: targetLevel,
        daysOverdue,
      });

      await getEmailQueue().add('send-email', {
        to: tenant.contact.email,
        subject: `${targetLevel === 'suspension' ? 'URGENT: ' : ''}Payment ${targetLevel.replace('_', ' ')} â€” Invoice ${invoiceNumber}`,
        html,
        templateKey: `dunning_${targetLevel}`,
        tenantId: tenant.slug,
        logId: '',
      });

      // Log the dunning action
      const attempt = await DunningLog.countDocuments({ invoiceId: invoice._id });
      await DunningLog.create({
        tenantId: invoice.tenantId,
        invoiceId: invoice._id,
        attempt: attempt + 1,
        channel: 'email',
        sentAt: now,
        status: 'sent',
        escalationLevel: targetLevel,
        nextRetryAt:
          targetLevel !== 'suspension'
            ? new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) // next check in 3 days
            : null,
      });

      // On suspension level, suspend the tenant
      if (targetLevel === 'suspension' && tenant.status === 'active') {
        await Tenant.updateOne({ _id: tenant._id }, { $set: { status: 'suspended' } });
        logger.warn(
          { tenantSlug: tenant.slug, invoiceNumber },
          'Tenant suspended due to non-payment',
        );
      }

      totalSent++;
    } catch (err) {
      logger.error({ err, invoiceId: invoice._id }, 'Dunning processing failed for invoice');
    }
  }

  logger.info({ totalSent, totalOverdue: overdueInvoices.length }, 'Dunning cycle complete');
}
