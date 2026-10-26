/**
 * migrate-xrays.ts — Step 8: X-rays + file references → xrays
 *
 * File blobs are NOT migrated (assumed already in S3/R2).
 * Only metadata and S3 keys are mapped.
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

export async function migrateXrays(ctx: MigrationContext): Promise<MigrationStepResult> {
  const start = Date.now();
  const { pgPool, dryRun } = ctx;

  const tenantFilter = ctx.tenantSlug ? `WHERE t.slug = $1` : '';
  const params = ctx.tenantSlug ? [ctx.tenantSlug] : [];

  const { rows } = await pgPool.query(
    `SELECT x.*, t.slug as tenant_slug
     FROM xrays x
     LEFT JOIN tenants t ON x.tenant_id = t.id
     ${tenantFilter}
     ORDER BY x.created_at`,
    params,
  );

  const progress = startProgress('xrays', rows.length);
  const docs = [];

  for (const row of rows) {
    try {
      const _id = new mongoose.Types.ObjectId();
      setIdMapping('xrays', row.id, _id);

      docs.push({
        _id,
        tenantSlug: row.tenant_slug,
        patientId: getIdMapping('patients', row.patient_id) || null,
        doctorId: getIdMapping('users', row.doctor_id) || null,
        appointmentId: getIdMapping('appointments', row.appointment_id) || null,
        type: row.type || 'panoramic',
        toothNumbers: row.tooth_numbers || [],
        fileKey: row.file_key || row.file_path || null,
        fileName: row.file_name || null,
        fileSize: parseInt(row.file_size) || null,
        mimeType: row.mime_type || 'image/jpeg',
        notes: row.notes || null,
        findings: row.findings || null,
        takenAt: toDate(row.taken_at) ?? toDate(row.created_at),
        createdBy: getIdMapping('users', row.created_by) || null,
        createdAt: toDate(row.created_at) ?? new Date(),
        updatedAt: toDate(row.updated_at) ?? new Date(),
      });

      updateProgress('xrays');
    } catch (error) {
      errorProgress('xrays');
      migrationLog.error(`Failed to transform xray ${row.id}:`, error);
    }
  }

  if (!dryRun && docs.length > 0) {
    const db = mongoose.connection.db!;
    await db
      .collection('xrays')
      .insertMany(docs, { ordered: false })
      .catch(() => {});
  }

  finishProgress('xrays');

  return {
    step: 'xrays',
    total: rows.length,
    migrated: progress.processed,
    skipped: progress.skipped,
    errors: progress.errors,
    durationMs: Date.now() - start,
  };
}
