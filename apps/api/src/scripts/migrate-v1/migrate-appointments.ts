/**
 * migrate-appointments.ts — Step 3: Appointments → appointments
 */

import type { MigrationContext, MigrationStepResult } from './index.js';
import {
  startProgress,
  updateProgress,
  errorProgress,
  finishProgress,
  setIdMapping,
  getIdMapping,
  toDate,
  migrationLog,
} from './utils.js';
import mongoose from 'mongoose';

export async function migrateAppointments(ctx: MigrationContext): Promise<MigrationStepResult> {
  const start = Date.now();
  const { pgPool, dryRun } = ctx;

  const tenantFilter = ctx.tenantSlug ? `WHERE t.slug = $1` : '';
  const params = ctx.tenantSlug ? [ctx.tenantSlug] : [];

  const { rows } = await pgPool.query(
    `SELECT a.*, t.slug as tenant_slug
     FROM appointments a
     LEFT JOIN tenants t ON a.tenant_id = t.id
     ${tenantFilter}
     ORDER BY a.created_at`,
    params,
  );

  const progress = startProgress('appointments', rows.length);
  const docs = [];

  for (const row of rows) {
    try {
      const _id = new mongoose.Types.ObjectId();
      setIdMapping('appointments', row.id, _id);

      docs.push({
        _id,
        tenantSlug: row.tenant_slug,
        patientId: getIdMapping('patients', row.patient_id) || null,
        doctorId: getIdMapping('users', row.doctor_id) || null,
        title: row.title || row.reason || 'Appointment',
        startTime: toDate(row.start_time) ?? toDate(row.appointment_date),
        endTime: toDate(row.end_time),
        duration: row.duration || 30,
        status: mapStatus(row.status),
        type: row.type || 'checkup',
        branchId: row.branch_id || null,
        chairId: row.chair_id || null,
        notes: row.notes || null,
        cancellationReason: row.cancellation_reason || null,
        createdBy: getIdMapping('users', row.created_by) || null,
        createdAt: toDate(row.created_at) ?? new Date(),
        updatedAt: toDate(row.updated_at) ?? new Date(),
      });

      updateProgress('appointments');
    } catch (error) {
      errorProgress('appointments');
      migrationLog.error(`Failed to transform appointment ${row.id}:`, error);
    }
  }

  if (!dryRun && docs.length > 0) {
    const db = mongoose.connection.db!;
    await db
      .collection('appointments')
      .insertMany(docs, { ordered: false })
      .catch(() => {});
  }

  finishProgress('appointments');

  return {
    step: 'appointments',
    total: rows.length,
    migrated: progress.processed,
    skipped: progress.skipped,
    errors: progress.errors,
    durationMs: Date.now() - start,
  };
}

function mapStatus(v1Status: string): string {
  const statusMap: Record<string, string> = {
    scheduled: 'scheduled',
    confirmed: 'confirmed',
    arrived: 'arrived',
    in_progress: 'in_progress',
    completed: 'completed',
    cancelled: 'cancelled',
    no_show: 'no_show',
  };
  return statusMap[v1Status?.toLowerCase()] || 'scheduled';
}
