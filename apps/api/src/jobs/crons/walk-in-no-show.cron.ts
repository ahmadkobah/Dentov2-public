/**
 * Walk-in No-Show Cron — Phase 5.8
 *
 * Runs every 10 minutes. Auto-marks walk-in queue entries as 'no_show' if
 * they've been waiting longer than the branch's `walkInTimeoutMinutes`
 * (default 120 min).
 */

import type { Job } from 'bullmq';
import mongoose from 'mongoose';
import { QUEUE_NAMES, addCronJob, createWorker } from '../queue.js';
import { logger } from '../../utils/logger.js';
import { getTenantDb } from '../../config/database.js';
import { getWalkInQueueModel } from '../../tenant/models/walk-in-queue.model.js';
import { getBranchModel } from '../../tenant/models/branch.model.js';
import { socketEmitter } from '../../plugins/socket.plugin.js';

export async function startWalkInNoShowCron() {
  await addCronJob(
    QUEUE_NAMES.WALK_IN_NO_SHOW,
    'scan-overdue-walk-ins',
    '*/10 * * * *', // every 10 minutes
  );
  logger.info('Walk-in No-Show cron registered (every 10 min)');
}

export function startWalkInNoShowWorker() {
  const worker = createWorker(
    QUEUE_NAMES.WALK_IN_NO_SHOW,
    async (job: Job) => {
      if (job.name === 'scan-overdue-walk-ins') {
        await scanAllTenants();
      }
    },
    { concurrency: 2 },
  );
  logger.info('Walk-in No-Show worker started');
  return worker;
}

async function scanAllTenants() {
  const platformDb = mongoose.connection;
  const Tenant = platformDb.model('Tenant');
  const tenants = await Tenant.find({ status: 'active' }).select('slug').lean();

  let totalMarked = 0;

  for (const tenant of tenants as unknown as Array<{ slug: string }>) {
    try {
      const tenantDb = await getTenantDb(tenant.slug);
      const WalkInQueue = getWalkInQueueModel(tenantDb);
      const Branch = getBranchModel(tenantDb);

      const branches = await Branch.find({ isActive: true })
        .select('_id walkInTimeoutMinutes')
        .lean();

      for (const branch of branches) {
        const timeoutMin = branch.walkInTimeoutMinutes ?? 120;
        const cutoff = new Date(Date.now() - timeoutMin * 60_000);

        const overdue = await WalkInQueue.find({
          branchId: branch._id,
          status: 'waiting',
          checkedInAt: { $lte: cutoff },
        }).select('_id branchId queueNumber patientName');

        for (const entry of overdue) {
          entry.set('status', 'no_show');
          await entry.save();
          totalMarked++;

          try {
            socketEmitter.queueUpdate(entry.branchId.toString(), {
              type: 'patient_no_show',
              data: {
                id: entry._id.toString(),
                branchId: entry.branchId.toString(),
                timestamp: new Date().toISOString(),
                queueNumber: entry.queueNumber,
                patientName: entry.patientName,
                status: 'no_show',
                reason: 'auto_timeout',
              },
            });
          } catch {
            /* socket non-fatal */
          }
        }
      }
    } catch (err) {
      logger.warn({ err, tenant: tenant.slug }, 'Walk-in no-show scan failed for tenant');
    }
  }

  if (totalMarked > 0) {
    logger.info({ totalMarked }, 'Walk-in no-show cron auto-marked entries');
  }
}
