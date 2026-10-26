/**
 * migrate-patients.ts — Step 2: Patients + allergies + medHistory → patients
 *
 * Maps v1 normalized patient tables → v2 embedded patient document.
 * PII fields (phone, email, nationalId) are stored as-is during migration;
 * the v2 encryption middleware encrypts them on save.
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

export async function migratePatients(ctx: MigrationContext): Promise<MigrationStepResult> {
  const start = Date.now();
  const { pgPool, dryRun } = ctx;

  const tenantFilter = ctx.tenantSlug ? `WHERE t.slug = $1` : '';
  const params = ctx.tenantSlug ? [ctx.tenantSlug] : [];

  // Fetch patients
  const { rows: patients } = await pgPool.query(
    `SELECT p.*, t.slug as tenant_slug
     FROM patients p
     LEFT JOIN tenants t ON p.tenant_id = t.id
     ${tenantFilter}
     ORDER BY p.created_at`,
    params,
  );

  // Fetch related data in bulk
  const { rows: allergies } = await pgPool.query(
    `SELECT * FROM patient_allergies ORDER BY patient_id`,
  );
  const { rows: medHistory } = await pgPool.query(
    `SELECT * FROM medical_history ORDER BY patient_id`,
  );

  // Group by patient_id
  const allergyMap = groupBy(allergies, 'patient_id');
  const historyMap = groupBy(medHistory, 'patient_id');

  const progress = startProgress('patients', patients.length);
  const docs = [];

  for (const row of patients) {
    try {
      const _id = new mongoose.Types.ObjectId();
      setIdMapping('patients', row.id, _id);

      const patientAllergies = allergyMap[row.id] || [];
      const patientHistory = historyMap[row.id] || [];

      docs.push({
        _id,
        tenantSlug: row.tenant_slug,
        fileNumber: row.file_number || `MIG-${row.id}`,
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        dateOfBirth: toDate(row.date_of_birth),
        gender: row.gender || 'unknown',
        phone: row.phone || null,
        email: row.email?.toLowerCase() || null,
        nationalId: row.national_id || null,
        address: row.address || null,
        bloodType: row.blood_type || null,
        allergies: patientAllergies.map((a: Record<string, unknown>) => ({
          name: a.allergen || a.name,
          severity: a.severity || 'mild',
          notes: a.notes || null,
        })),
        medicalHistory: patientHistory.map((h: Record<string, unknown>) => ({
          condition: h.condition || h.diagnosis,
          diagnosedAt: toDate(h.diagnosed_at as string),
          status: h.status || 'active',
          notes: h.notes || null,
        })),
        insuranceProvider: row.insurance_provider || null,
        insurancePolicyNumber: row.insurance_policy_number || null,
        emergencyContact: row.emergency_contact_name
          ? {
              name: row.emergency_contact_name,
              phone: row.emergency_contact_phone,
              relationship: row.emergency_contact_relationship || 'other',
            }
          : null,
        referredBy: row.referred_by || null,
        notes: row.notes || null,
        isActive: row.is_active ?? true,
        createdBy: getIdMapping('users', row.created_by) || null,
        createdAt: toDate(row.created_at) ?? new Date(),
        updatedAt: toDate(row.updated_at) ?? new Date(),
      });

      updateProgress('patients');
    } catch (error) {
      errorProgress('patients');
      migrationLog.error(`Failed to transform patient ${row.id}:`, error);
    }
  }

  if (!dryRun && docs.length > 0) {
    const db = mongoose.connection.db!;
    const collection = db.collection('patients');
    try {
      await collection.insertMany(docs, { ordered: false });
    } catch {
      // Partial inserts
    }
  }

  finishProgress('patients');

  return {
    step: 'patients',
    total: patients.length,
    migrated: progress.processed,
    skipped: progress.skipped,
    errors: progress.errors,
    durationMs: Date.now() - start,
  };
}

function groupBy(
  rows: Record<string, unknown>[],
  key: string,
): Record<string, Record<string, unknown>[]> {
  const map: Record<string, Record<string, unknown>[]> = {};
  for (const row of rows) {
    const k = String(row[key]);
    if (!map[k]) map[k] = [];
    map[k].push(row);
  }
  return map;
}
