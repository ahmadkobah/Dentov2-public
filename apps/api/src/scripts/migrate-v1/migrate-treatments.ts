/**
 * migrate-treatments.ts — Step 4: Treatment plans + items → treatment_plans
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

export async function migrateTreatments(ctx: MigrationContext): Promise<MigrationStepResult> {
  const start = Date.now();
  const { pgPool, dryRun } = ctx;

  const tenantFilter = ctx.tenantSlug ? `WHERE t.slug = $1` : '';
  const params = ctx.tenantSlug ? [ctx.tenantSlug] : [];

  const { rows: plans } = await pgPool.query(
    `SELECT tp.*, t.slug as tenant_slug
     FROM treatment_plans tp
     LEFT JOIN tenants t ON tp.tenant_id = t.id
     ${tenantFilter}
     ORDER BY tp.created_at`,
    params,
  );

  const { rows: items } = await pgPool.query(
    `SELECT * FROM treatment_plan_items ORDER BY treatment_plan_id`,
  );

  const itemMap: Record<string, Record<string, unknown>[]> = {};
  for (const item of items) {
    const key = String(item.treatment_plan_id);
    if (!itemMap[key]) itemMap[key] = [];
    itemMap[key].push(item);
  }

  const progress = startProgress('treatments', plans.length);
  const docs = [];

  for (const row of plans) {
    try {
      const _id = new mongoose.Types.ObjectId();
      setIdMapping('treatments', row.id, _id);

      const planItems = itemMap[String(row.id)] || [];

      docs.push({
        _id,
        tenantSlug: row.tenant_slug,
        patientId: getIdMapping('patients', row.patient_id) || null,
        doctorId: getIdMapping('users', row.doctor_id) || null,
        title: row.title || 'Treatment Plan',
        status: row.status || 'draft',
        totalCost: parseFloat(row.total_cost) || 0,
        items: planItems.map((item: Record<string, unknown>) => ({
          toothNumber: item.tooth_number || null,
          procedure: item.procedure_name || item.procedure || '',
          status: (item.status as string) || 'pending',
          cost: parseFloat(item.cost as string) || 0,
          notes: item.notes || null,
        })),
        notes: row.notes || null,
        createdBy: getIdMapping('users', row.created_by) || null,
        createdAt: toDate(row.created_at) ?? new Date(),
        updatedAt: toDate(row.updated_at) ?? new Date(),
      });

      updateProgress('treatments');
    } catch (error) {
      errorProgress('treatments');
      migrationLog.error(`Failed to transform treatment plan ${row.id}:`, error);
    }
  }

  if (!dryRun && docs.length > 0) {
    const db = mongoose.connection.db!;
    await db
      .collection('treatment_plans')
      .insertMany(docs, { ordered: false })
      .catch(() => {});
  }

  finishProgress('treatments');

  return {
    step: 'treatments',
    total: plans.length,
    migrated: progress.processed,
    skipped: progress.skipped,
    errors: progress.errors,
    durationMs: Date.now() - start,
  };
}
