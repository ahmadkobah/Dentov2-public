/**
 * Scheduled Alert Cron Job
 *
 * Per DENTO_V2_MASTER_PLAN.md §20 — Scheduled Notifications
 * Per IMPLEMENTATION_ROADMAP — Week 13 Task 3
 *
 * Runs every hour. Evaluates alert rules for:
 * - Low stock inventory
 * - Expiring medications/materials
 * - Overdue recall patients
 * - Payment due reminders
 */

import type { Job } from 'bullmq';
import type mongoose from 'mongoose';
import { QUEUE_NAMES, addCronJob, createWorker } from '../queue.js';
import { logger } from '../../utils/logger.js';
import { getTenantDb } from '../../config/database.js';
import {
  createAlertRuleModel,
  createNotificationModel,
} from '../../tenant/models/notification.model.js';
import { getInventoryItemModel } from '../../tenant/models/inventory-item.model.js';
import { getMedicationModel } from '../../tenant/models/medication.model.js';
import { getPatientModel } from '../../tenant/models/patient.model.js';
import { getInvoiceModel } from '../../tenant/models/invoice.model.js';
import { Tenant } from '../../platform/models/index.js';

// ── Cron Registration ─────────────────────────────────────

export async function startAlertCron() {
  await addCronJob(
    QUEUE_NAMES.SCHEDULED_ALERTS,
    'evaluate-alert-rules',
    '0 * * * *', // Every hour
  );

  logger.info('Scheduled Alert cron registered (every hour)');
}

// ── Worker ────────────────────────────────────────────────

export function startAlertWorker() {
  const worker = createWorker(
    QUEUE_NAMES.SCHEDULED_ALERTS,
    async (job: Job) => {
      if (job.name === 'evaluate-alert-rules') {
        await evaluateAlertRules();
        return;
      }

      if (job.name === 'process-alert') {
        await processAlert(job.data);
        return;
      }
    },
    { concurrency: 5 },
  );

  logger.info('Scheduled Alert worker started');
  return worker;
}

// ── Core Logic ────────────────────────────────────────────

async function evaluateAlertRules() {
  const tenants = await Tenant.find({ status: 'active' }).select('slug').lean();

  for (const tenant of tenants) {
    try {
      const tenantDb = await getTenantDb(tenant.slug);

      // Check if alert rule model exists
      let AlertRule: mongoose.Model<any>;
      try {
        AlertRule = createAlertRuleModel(tenantDb);
      } catch {
        // Model not registered for this tenant, skip
        continue;
      }

      const activeRules = await AlertRule.find({ isActive: true }).lean();

      for (const rule of activeRules) {
        try {
          await evaluateRule(tenantDb, tenant.slug, rule);
        } catch (err) {
          logger.error(
            {
              tenantSlug: tenant.slug,
              ruleId: rule._id,
              err,
            },
            'Error evaluating alert rule',
          );
        }
      }
    } catch (err) {
      logger.error({ tenantSlug: tenant.slug, err }, 'Error processing alerts for tenant');
    }
  }
}

async function evaluateRule(tenantDb: mongoose.Connection, tenantSlug: string, rule: any) {
  const trigger = rule.trigger;

  switch (trigger) {
    case 'low_stock': {
      await checkLowStock(tenantDb, tenantSlug, rule);
      break;
    }
    case 'expiring_soon': {
      await checkExpiringSoon(tenantDb, tenantSlug, rule);
      break;
    }
    case 'recall_due': {
      await checkRecallDue(tenantDb, tenantSlug, rule);
      break;
    }
    case 'payment_overdue': {
      await checkPaymentOverdue(tenantDb, tenantSlug, rule);
      break;
    }
    default: {
      logger.debug({ trigger, ruleId: rule._id }, 'Unknown alert rule trigger');
    }
  }
}

async function checkLowStock(tenantDb: mongoose.Connection, tenantSlug: string, rule: any) {
  const threshold = rule.config?.threshold ?? 10;

  try {
    const InventoryItem = getInventoryItemModel(tenantDb);
    const lowStockItems = await InventoryItem.find({
      currentStock: { $lte: threshold },
      isActive: true,
    })
      .select('name currentStock minStock')
      .lean();

    if (lowStockItems.length > 0) {
      const Notification = createNotificationModel(tenantDb);
      // Legacy alert payload shape (string title/body, extra fields); typed
      // loosely so Mongoose 9's stricter create-casting accepts it unchanged.
      const lowStockNotification: Record<string, unknown> = {
        type: 'alert',
        recipientType: 'role',
        recipientRole: 'tenant_admin',
        title: `Low Stock Alert: ${lowStockItems.length} item(s)`,
        body: `Items below threshold (${threshold}): ${lowStockItems.map((i: any) => `${i.name} (${i.currentStock})`).join(', ')}`,
        channels: ['in_app', 'email'],
        priority: 'high',
        data: {
          alertType: 'low_stock',
          ruleId: rule._id.toString(),
          items: lowStockItems.map((i: any) => ({
            id: i._id,
            name: i.name,
            stock: i.currentStock,
          })),
        },
      };
      await Notification.create(lowStockNotification);

      logger.info({ tenantSlug, count: lowStockItems.length }, 'Low stock alert generated');
    }
  } catch {
    // InventoryItem model may not exist yet — silently skip
  }
}

async function checkExpiringSoon(tenantDb: mongoose.Connection, tenantSlug: string, rule: any) {
  const daysAhead = rule.config?.daysAhead ?? 30;
  const expiryDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

  try {
    const Medication = getMedicationModel(tenantDb);
    const expiringMeds = await Medication.find({
      expiryDate: { $lte: expiryDate, $gte: new Date() },
      isActive: true,
    })
      .select('name expiryDate')
      .lean();

    if (expiringMeds.length > 0) {
      const Notification = createNotificationModel(tenantDb);
      const expiryNotification: Record<string, unknown> = {
        type: 'alert',
        recipientType: 'role',
        recipientRole: 'tenant_admin',
        title: `Expiry Alert: ${expiringMeds.length} medications expiring within ${daysAhead} days`,
        body: expiringMeds
          .map((m: any) => `${m.name} (${new Date(m.expiryDate).toLocaleDateString()})`)
          .join(', '),
        channels: ['in_app', 'email'],
        priority: 'medium',
        data: {
          alertType: 'expiring_soon',
          ruleId: rule._id.toString(),
          medications: expiringMeds.map((m: any) => ({
            id: m._id,
            name: m.name,
            expiryDate: m.expiryDate,
          })),
        },
      };
      await Notification.create(expiryNotification);

      logger.info({ tenantSlug, count: expiringMeds.length }, 'Expiry alert generated');
    }
  } catch {
    // Model may not exist
  }
}

async function checkRecallDue(tenantDb: mongoose.Connection, tenantSlug: string, rule: any) {
  const daysOverdue = rule.config?.daysOverdue ?? 180; // 6 months
  const cutoffDate = new Date(Date.now() - daysOverdue * 24 * 60 * 60 * 1000);

  try {
    const Patient = getPatientModel(tenantDb);
    const overduePatients = await Patient.find({
      lastVisitDate: { $lte: cutoffDate },
      isActive: true,
    })
      .select('firstName lastName lastVisitDate phone email')
      .limit(100) // Cap to prevent huge batches
      .lean();

    if (overduePatients.length > 0) {
      const Notification = createNotificationModel(tenantDb);
      const recallNotification: Record<string, unknown> = {
        type: 'alert',
        recipientType: 'role',
        recipientRole: 'tenant_admin',
        title: `Recall Due: ${overduePatients.length} patient(s) overdue for visit`,
        body: `${overduePatients.length} patients haven't visited in ${daysOverdue}+ days`,
        channels: ['in_app', 'email'],
        priority: 'low',
        data: {
          alertType: 'recall_due',
          ruleId: rule._id.toString(),
          patientCount: overduePatients.length,
        },
      };
      await Notification.create(recallNotification);

      logger.info({ tenantSlug, count: overduePatients.length }, 'Recall due alert generated');
    }
  } catch {
    // Model may not exist
  }
}

async function checkPaymentOverdue(tenantDb: mongoose.Connection, tenantSlug: string, rule: any) {
  const daysOverdue = rule.config?.daysOverdue ?? 30;
  const cutoffDate = new Date(Date.now() - daysOverdue * 24 * 60 * 60 * 1000);

  try {
    const Invoice = getInvoiceModel(tenantDb);
    // `pending` is a legacy (v1-migrated) status that is not part of the current
    // InvoiceStatus union, so the filter is typed loosely to preserve the query.
    const overdueFilter: Record<string, unknown> = {
      dueDate: { $lte: cutoffDate },
      status: { $in: ['pending', 'partially_paid'] },
    };
    const overdueInvoices = await Invoice.find(overdueFilter)
      .select('invoiceNumber patientId totalAmount paidAmount dueDate')
      .lean();

    if (overdueInvoices.length > 0) {
      const Notification = createNotificationModel(tenantDb);
      const totalOverdue = overdueInvoices.reduce(
        (acc: number, inv: any) => acc + (inv.totalAmount - (inv.paidAmount || 0)),
        0,
      );

      const overdueNotification: Record<string, unknown> = {
        type: 'alert',
        recipientType: 'role',
        recipientRole: 'tenant_admin',
        title: `Payment Overdue: ${overdueInvoices.length} invoices`,
        body: `Total outstanding: ${totalOverdue.toFixed(2)} — oldest ${daysOverdue}+ days overdue`,
        channels: ['in_app', 'email'],
        priority: 'high',
        data: {
          alertType: 'payment_overdue',
          ruleId: rule._id.toString(),
          invoiceCount: overdueInvoices.length,
          totalOverdue,
        },
      };
      await Notification.create(overdueNotification);

      logger.info(
        { tenantSlug, count: overdueInvoices.length, totalOverdue },
        'Payment overdue alert generated',
      );
    }
  } catch {
    // Model may not exist
  }
}

async function processAlert(data: Record<string, unknown>) {
  // Individual alert processing (e.g., send email/push)
  logger.debug({ data }, 'Processing scheduled alert');
}
