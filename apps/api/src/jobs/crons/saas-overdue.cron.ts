/**
 * SaaS Invoice Overdue Escalation Cron
 *
 * Per MASTER_PLAN Â§29 â€” SaaS Billing Phase 7
 *
 * Runs daily at 4 AM UTC. Finds all issued SaaS invoices whose
 * dueDate has passed and marks them as 'overdue'.
 *
 * Escalation rules:
 *   - issued â†’ overdue: when dueDate < now
 *   - Logs a summary for monitoring / future dunning integration
 */

import type { Job } from 'bullmq';
import { QUEUE_NAMES, addCronJob, createWorker } from '../queue.js';
import { logger } from '../../utils/logger.js';
import { SaaSInvoice } from '../../platform/models/saas-invoice.model.js';
import { Tenant } from '../../platform/models/tenant.model.js';
import { getEmailQueue } from '../../services/notification.service.js';
import { saasOverdueEmailHtml } from '../../utils/email-templates.js';

// â”€â”€ Cron Registration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function startSaaSOverdueCron() {
  await addCronJob(
    QUEUE_NAMES.SAAS_INVOICE_OVERDUE,
    'mark-saas-invoices-overdue',
    '0 4 * * *', // Daily 4 AM UTC
  );
  logger.info('SaaS invoice overdue escalation cron registered (daily 4 AM)');
}

// â”€â”€ Worker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function startSaaSOverdueWorker() {
  const worker = createWorker(
    QUEUE_NAMES.SAAS_INVOICE_OVERDUE,
    async (job: Job) => {
      logger.info({ jobId: job.id }, 'Running SaaS invoice overdue escalation');
      await markOverdueSaaSInvoices();
    },
    { concurrency: 1 },
  );

  logger.info('SaaS invoice overdue escalation worker started');
  return worker;
}

// â”€â”€ Core Logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function markOverdueSaaSInvoices() {
  const now = new Date();

  // Find invoices about to be marked overdue (before bulk update)
  const overdueInvoices = await SaaSInvoice.find({
    status: 'issued',
    dueDate: { $lt: now },
    isActive: true,
  })
    .select('_id tenantId invoiceNumber totalAmount currency dueDate')
    .lean();

  if (overdueInvoices.length === 0) {
    logger.info('No SaaS invoices to mark as overdue');
    return;
  }

  // Bulk-update all issued invoices past their due date to overdue
  const result = await SaaSInvoice.updateMany(
    {
      status: 'issued',
      dueDate: { $lt: now },
      isActive: true,
    },
    { $set: { status: 'overdue' } },
  );

  const marked = result.modifiedCount;

  // Send overdue email to each affected tenant
  for (const invoice of overdueInvoices) {
    try {
      const tenant = await Tenant.findById(invoice.tenantId).select('name slug contact').lean();
      if (!tenant?.contact?.email) continue;

      const html = saasOverdueEmailHtml({
        tenantName: typeof tenant.name === 'object' ? tenant.name.en : String(tenant.name),
        invoiceNumber: invoice.invoiceNumber ?? invoice._id.toString(),
        amount: `${invoice.currency ?? 'USD'} ${invoice.total}`,
        dueDate: new Date(invoice.dueDate ?? new Date()).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      });

      await getEmailQueue().add('send-email', {
        to: tenant.contact.email,
        subject: `Invoice ${invoice.invoiceNumber ?? ''} is overdue â€” Dento`,
        html,
        templateKey: 'saas_overdue',
        tenantId: tenant.slug,
        logId: '',
      });
    } catch (err) {
      logger.warn({ err, invoiceId: invoice._id }, 'Failed to send SaaS overdue email');
    }
  }

  logger.info({ marked }, 'SaaS invoice overdue escalation complete');
}
