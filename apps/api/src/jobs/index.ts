/**
 * Jobs Module — Entry Point
 *
 * Per IMPLEMENTATION_ROADMAP — Week 13: Notification + Scheduled Jobs
 *
 * Starts all cron jobs and workers.
 */

import { startReminderCron, startReminderWorker } from './crons/reminder.cron.js';
import { startAutoNoShowCron, startAutoNoShowWorker } from './crons/auto-noshow.cron.js';
import { startWalkInNoShowCron, startWalkInNoShowWorker } from './crons/walk-in-no-show.cron.js';
import { startAlertCron, startAlertWorker } from './crons/alert.cron.js';
import { startExpiryCron, startExpiryWorker } from './crons/expiry.cron.js';
import { startOverdueCron, startOverdueWorker } from './crons/overdue.cron.js';
import {
  startRamadanReminderCron,
  startRamadanReminderWorker,
} from './crons/ramadan-reminder.cron.js';
import {
  startRolloutAdvanceCron,
  startRolloutAdvanceWorker,
} from './crons/rollout-advance.cron.js';
import { startSaaSInvoiceCron, startSaaSInvoiceWorker } from './crons/saas-invoice.cron.js';
import { startSaaSOverdueCron, startSaaSOverdueWorker } from './crons/saas-overdue.cron.js';
import { startDunningCron, startDunningWorker } from './crons/dunning.cron.js';
import { startExchangeRateCron, startExchangeRateWorker } from './crons/exchange-rate.cron.js';
import {
  startExpirePendingActivationsCron,
  startExpirePendingActivationsWorker,
} from './crons/expire-pending-activations.cron.js';
import { scheduleSSLExpiryCheck, startSSLExpiryWorker } from './ssl-expiry.cron.js';
import { scheduleBackupRestoreTest, startBackupRestoreWorker } from './backup-restore-test.cron.js';
import { startWorkflowExecutionWorker } from './workers/workflow.worker.js';
import { startChatPushWorker } from './workers/chat-push.worker.js';
import { startNotificationDeliveryWorker } from './workers/notification-delivery.worker.js';
import { startInventoryReorderWorker } from './workers/inventory-reorder.worker.js';
import { logger } from '../utils/logger.js';

/**
 * Start all scheduled jobs and workers.
 * Called once during server bootstrap.
 */
export async function startScheduledJobs() {
  try {
    // Start workers first (they process jobs)
    startReminderWorker();
    startAutoNoShowWorker();
    startWalkInNoShowWorker();
    startAlertWorker();
    startExpiryWorker();
    startOverdueWorker();
    startRamadanReminderWorker();
    startRolloutAdvanceWorker();
    startSaaSInvoiceWorker();
    startSaaSOverdueWorker();
    startDunningWorker();
    startWorkflowExecutionWorker();
    startChatPushWorker();
    startNotificationDeliveryWorker();
    startInventoryReorderWorker();
    startExchangeRateWorker();
    startExpirePendingActivationsWorker();
    startSSLExpiryWorker();
    startBackupRestoreWorker();

    // Then register cron jobs (they produce jobs)
    await startReminderCron();
    await startAutoNoShowCron();
    await startWalkInNoShowCron();
    await startAlertCron();
    await startExpiryCron();
    await startOverdueCron();
    await startRamadanReminderCron();
    await startRolloutAdvanceCron();
    await startSaaSInvoiceCron();
    await startSaaSOverdueCron();
    await startDunningCron();
    await startExchangeRateCron();
    await startExpirePendingActivationsCron();
    await scheduleSSLExpiryCheck();
    await scheduleBackupRestoreTest();

    logger.info('All scheduled jobs and workers started');
  } catch (err) {
    logger.error({ err }, 'Failed to start scheduled jobs');
  }
}

// Re-export for granular control
export { triggerWorkflow } from './workers/workflow.worker.js';
export { enqueueChatPush } from './workers/chat-push.worker.js';
