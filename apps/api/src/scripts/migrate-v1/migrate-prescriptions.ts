/**
 * migrate-prescriptions.ts — Step 5: Prescriptions + items → prescriptions
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

export async function migratePrescriptions(ctx: MigrationContext): Promise<MigrationStepResult> {
  const start = Date.now();
  const { pgPool, dryRun } = ctx;

  const tenantFilter = ctx.tenantSlug ? `WHERE t.slug = $1` : '';
  const params = ctx.tenantSlug ? [ctx.tenantSlug] : [];

  const { rows: prescriptions } = await pgPool.query(
    `SELECT p.*, t.slug as tenant_slug
     FROM prescriptions p
     LEFT JOIN tenants t ON p.tenant_id = t.id
     ${tenantFilter}
     ORDER BY p.created_at`,
    params,
  );

  const { rows: items } = await pgPool.query(
    `SELECT * FROM prescription_items ORDER BY prescription_id`,
  );

  const itemMap: Record<string, Record<string, unknown>[]> = {};
  for (const item of items) {
    const key = String(item.prescription_id);
    if (!itemMap[key]) itemMap[key] = [];
    itemMap[key].push(item);
  }

  const progress = startProgress('prescriptions', prescriptions.length);
  const docs = [];

  for (const row of prescriptions) {
    try {
      const _id = new mongoose.Types.ObjectId();
      setIdMapping('prescriptions', row.id, _id);

      const rxItems = itemMap[String(row.id)] || [];

      docs.push({
        _id,
        tenantSlug: row.tenant_slug,
        patientId: getIdMapping('patients', row.patient_id) || null,
        doctorId: getIdMapping('users', row.doctor_id) || null,
        appointmentId: getIdMapping('appointments', row.appointment_id) || null,
        items: rxItems.map((item: Record<string, unknown>) => ({
          medicationName: item.medication_name || item.drug_name || '',
          dosage: item.dosage || '',
          frequency: item.frequency || '',
          duration: item.duration || '',
          quantity: parseInt(item.quantity as string) || 1,
          instructions: item.instructions || null,
        })),
        diagnosis: row.diagnosis || null,
        notes: row.notes || null,
        status: row.status || 'active',
        createdBy: getIdMapping('users', row.created_by) || null,
        createdAt: toDate(row.created_at) ?? new Date(),
        updatedAt: toDate(row.updated_at) ?? new Date(),
      });

      updateProgress('prescriptions');
    } catch (error) {
      errorProgress('prescriptions');
      migrationLog.error(`Failed to transform prescription ${row.id}:`, error);
    }
  }

  if (!dryRun && docs.length > 0) {
    const db = mongoose.connection.db!;
    await db
      .collection('prescriptions')
      .insertMany(docs, { ordered: false })
      .catch(() => {});
  }

  finishProgress('prescriptions');

  return {
    step: 'prescriptions',
    total: prescriptions.length,
    migrated: progress.processed,
    skipped: progress.skipped,
    errors: progress.errors,
    durationMs: Date.now() - start,
  };
}
