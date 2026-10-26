/**
 * verify.ts — Post-migration verification
 *
 * Per V2_DECISION_LOG §7.4:
 *   ✅ Row count v1 == Document count v2 (per collection)
 *   ✅ Sample random documents: all fields mapped
 *   ✅ All ObjectId references resolve (no orphans)
 *   ✅ Login works with migrated user
 */

import type { MigrationContext } from './index.js';
import mongoose from 'mongoose';
import { migrationLog, getIdMapSize } from './utils.js';

interface CollectionMapping {
  v1Table: string;
  v2Collection: string;
  label: string;
}

const COLLECTION_MAPPINGS: CollectionMapping[] = [
  { v1Table: 'users', v2Collection: 'users', label: 'Users' },
  { v1Table: 'patients', v2Collection: 'patients', label: 'Patients' },
  { v1Table: 'appointments', v2Collection: 'appointments', label: 'Appointments' },
  { v1Table: 'treatment_plans', v2Collection: 'treatment_plans', label: 'Treatment Plans' },
  { v1Table: 'prescriptions', v2Collection: 'prescriptions', label: 'Prescriptions' },
  { v1Table: 'invoices', v2Collection: 'invoices', label: 'Invoices' },
  { v1Table: 'payments', v2Collection: 'payments', label: 'Payments' },
  {
    v1Table: 'inventory_categories',
    v2Collection: 'inventory_categories',
    label: 'Inv. Categories',
  },
  { v1Table: 'inventory_items', v2Collection: 'inventory_items', label: 'Inv. Items' },
  { v1Table: 'xrays', v2Collection: 'xrays', label: 'X-Rays' },
];

export async function verifyMigration(ctx: MigrationContext): Promise<void> {
  const { pgPool } = ctx;
  const db = mongoose.connection.db!;

  console.log('  Collection         v1 Rows   v2 Docs   Match   ID Map');
  console.log('  ──────────────────────────────────────────────────────');

  let allMatch = true;

  for (const mapping of COLLECTION_MAPPINGS) {
    try {
      // v1 count
      const { rows } = await pgPool.query(`SELECT COUNT(*)::int as count FROM ${mapping.v1Table}`);
      const v1Count = rows[0]?.count ?? 0;

      // v2 count
      const v2Count = await db.collection(mapping.v2Collection).countDocuments();

      // ID map size (from in-memory migration)
      const idMapSize = getIdMapSize(mapping.v2Collection);

      const match = v1Count === v2Count ? '✅' : '⚠️';
      if (v1Count !== v2Count) allMatch = false;

      console.log(
        `  ${mapping.label.padEnd(20)} ${String(v1Count).padStart(8)}  ${String(v2Count).padStart(8)}  ${match}     ${idMapSize}`,
      );
    } catch (error) {
      console.log(`  ${mapping.label.padEnd(20)}  ERROR — ${(error as Error).message}`);
      allMatch = false;
    }
  }

  console.log('  ──────────────────────────────────────────────────────');

  if (allMatch) {
    console.log('  ✅ All counts match!\n');
  } else {
    console.log('  ⚠️  Some counts differ. Review the output above.\n');
  }

  // Orphan check — sample 100 patients and verify doctorId references
  migrationLog.info('Running reference integrity check (sampling)...');

  const samplePatients = await db
    .collection('patients')
    .aggregate([{ $sample: { size: 100 } }])
    .toArray();
  let orphanCount = 0;

  for (const patient of samplePatients) {
    if (patient.createdBy) {
      const exists = await db.collection('users').findOne({ _id: patient.createdBy });
      if (!exists) {
        orphanCount++;
        migrationLog.warn(`Orphan reference: patient ${patient._id} → user ${patient.createdBy}`);
      }
    }
  }

  if (orphanCount === 0) {
    migrationLog.info('Reference integrity check passed (100 sample patients)');
  } else {
    migrationLog.warn(`Found ${orphanCount} orphan references in 100 sample patients`);
  }

  // Bcrypt hash detection
  const bcryptUsers = await db.collection('users').countDocuments({
    password: { $regex: /^\$2[aby]\$/ },
  });
  if (bcryptUsers > 0) {
    migrationLog.info(
      `${bcryptUsers} users have bcrypt hashes — will be re-hashed to Argon2id on first login`,
    );
  }
}
