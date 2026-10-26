#!/usr/bin/env node
/**
 * v1 → v2 Migration CLI
 *
 * One-time migration from Supabase Postgres (v1) to MongoDB Atlas (v2).
 * Per V2_DECISION_LOG §7 — 15-step dependency-ordered migration.
 *
 * Usage:
 *   npx tsx apps/api/src/scripts/migrate-v1/index.ts [options]
 *
 * Options:
 *   --v1-url <postgres-url>   Supabase Postgres connection string  (required)
 *   --v2-url <mongodb-url>    MongoDB Atlas connection string       (default: env.MONGODB_URI)
 *   --tenant <slug>           Migrate a single tenant               (default: all)
 *   --step <name>             Run a specific step only              (e.g., "patients")
 *   --dry-run                 Read from v1, transform, but skip writes
 *   --verbose                 Enable debug logging
 *   --batch-size <n>          Bulk insert batch size                (default: 500)
 *   --skip-verify             Skip post-migration verification
 */

import { parseArgs } from 'util';
import mongoose from 'mongoose';
// @ts-expect-error - pg is an optional dependency for v1 migration
import pg from 'pg';
import { migrationLog, setLogLevel, confirm } from './utils.js';

// ── Migrator Imports ────────────────────────────────────────

import { migrateUsers } from './migrate-users.js';
import { migratePatients } from './migrate-patients.js';
import { migrateAppointments } from './migrate-appointments.js';
import { migrateTreatments } from './migrate-treatments.js';
import { migratePrescriptions } from './migrate-prescriptions.js';
import { migrateInvoices } from './migrate-invoices.js';
import { migrateInventory } from './migrate-inventory.js';
import { migrateXrays } from './migrate-xrays.js';
import { verifyMigration } from './verify.js';

// ── Types ───────────────────────────────────────────────────

export interface MigrationContext {
  pgPool: pg.Pool;
  mongoUri: string;
  tenantSlug: string | null;
  dryRun: boolean;
  batchSize: number;
}

export interface MigrationStepResult {
  step: string;
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  durationMs: number;
}

// ── Migration Steps (dependency order per §7.3) ─────────────

interface MigrationStep {
  name: string;
  description: string;
  fn: (ctx: MigrationContext) => Promise<MigrationStepResult>;
}

const MIGRATION_STEPS: MigrationStep[] = [
  { name: 'users', description: 'Users + roles → users collection', fn: migrateUsers },
  {
    name: 'patients',
    description: 'Patients + allergies + medHistory → patients',
    fn: migratePatients,
  },
  { name: 'appointments', description: 'Appointments → appointments', fn: migrateAppointments },
  {
    name: 'treatments',
    description: 'Treatment plans + items → treatment_plans',
    fn: migrateTreatments,
  },
  {
    name: 'prescriptions',
    description: 'Prescriptions + items → prescriptions',
    fn: migratePrescriptions,
  },
  {
    name: 'invoices',
    description: 'Invoices + items + payments → invoices + payments',
    fn: migrateInvoices,
  },
  {
    name: 'inventory',
    description: 'Inventory categories + items + stock → inventory_*',
    fn: migrateInventory,
  },
  { name: 'xrays', description: 'X-rays + files → xrays', fn: migrateXrays },
];

// ── CLI Argument Parsing ────────────────────────────────────

function parseCliArgs() {
  const { values } = parseArgs({
    options: {
      'v1-url': { type: 'string' },
      'v2-url': { type: 'string' },
      tenant: { type: 'string' },
      step: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      verbose: { type: 'boolean', default: false },
      'batch-size': { type: 'string', default: '500' },
      'skip-verify': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
    strict: false,
  });

  return values as {
    'v1-url'?: string;
    'v2-url'?: string;
    tenant?: string;
    step?: string;
    'dry-run'?: boolean;
    verbose?: boolean;
    'batch-size'?: string;
    'skip-verify'?: boolean;
    help?: boolean;
  };
}

function printHelp() {
  console.log(`
  🦷 Dento v1 → v2 Migration CLI

  Usage:
    npx tsx apps/api/src/scripts/migrate-v1/index.ts --v1-url <postgres-url> [options]

  Options:
    --v1-url <url>       Supabase Postgres connection string (required)
    --v2-url <url>       MongoDB connection string (default: MONGODB_URI env)
    --tenant <slug>      Migrate single tenant (default: all)
    --step <name>        Run specific step: ${MIGRATION_STEPS.map((s) => s.name).join(', ')}
    --dry-run            Transform only, skip writes
    --verbose            Enable debug logging
    --batch-size <n>     Bulk insert batch size (default: 500)
    --skip-verify        Skip post-migration verification
    --help               Show this help
  `);
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  const args = parseCliArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.verbose) setLogLevel('debug');

  console.log('\n  🦷 Dento v1 → v2 Migration CLI\n');
  console.log('  ─────────────────────────────────────────\n');

  // Validate required args
  const v1Url = args['v1-url'] || process.env.V1_DATABASE_URL;
  const v2Url =
    args['v2-url'] || process.env.MONGODB_URI || 'mongodb://localhost:27017/dento_platform';
  const dryRun = args['dry-run'] ?? false;
  const batchSize = parseInt(args['batch-size'] || '500', 10);
  const tenantSlug = args.tenant ?? null;
  const stepFilter = args.step ?? null;
  const skipVerify = args['skip-verify'] ?? false;

  if (!v1Url) {
    migrationLog.error('--v1-url is required (or set V1_DATABASE_URL env var)');
    printHelp();
    process.exit(1);
  }

  // Summary
  console.log(`  Source (v1):  ${v1Url.replace(/:[^:@]+@/, ':***@')}`);
  console.log(`  Target (v2):  ${v2Url.replace(/:[^:@]+@/, ':***@')}`);
  console.log(`  Tenant:       ${tenantSlug ?? 'all'}`);
  console.log(`  Dry run:      ${dryRun}`);
  console.log(`  Batch size:   ${batchSize}`);
  if (stepFilter) console.log(`  Step filter:  ${stepFilter}`);
  console.log('');

  if (!dryRun) {
    const ok = await confirm('  ⚠️  This will write to the target database. Continue?');
    if (!ok) {
      console.log('  Aborted.\n');
      process.exit(0);
    }
  }

  // Connect to databases
  migrationLog.info('Connecting to v1 Postgres...');
  const pgPool = new pg.Pool({ connectionString: v1Url });
  await pgPool.query('SELECT 1'); // Verify connection
  migrationLog.info('Connected to v1 Postgres ✓');

  migrationLog.info('Connecting to v2 MongoDB...');
  await mongoose.connect(v2Url);
  migrationLog.info('Connected to v2 MongoDB ✓\n');

  const ctx: MigrationContext = { pgPool, mongoUri: v2Url, tenantSlug, dryRun, batchSize };

  // Run migration steps
  const results: MigrationStepResult[] = [];
  const steps = stepFilter ? MIGRATION_STEPS.filter((s) => s.name === stepFilter) : MIGRATION_STEPS;

  if (stepFilter && steps.length === 0) {
    migrationLog.error(`Unknown step: ${stepFilter}`);
    migrationLog.info(`Available steps: ${MIGRATION_STEPS.map((s) => s.name).join(', ')}`);
    process.exit(1);
  }

  const totalStart = Date.now();

  for (const step of steps) {
    console.log(`\n  ┌─ Step: ${step.name}`);
    console.log(`  │  ${step.description}`);

    try {
      const result = await step.fn(ctx);
      results.push(result);
      console.log(`  └─ ✅ Done (${result.durationMs}ms)\n`);
    } catch (error) {
      migrationLog.error(`Step "${step.name}" failed:`, error);
      results.push({
        step: step.name,
        total: 0,
        migrated: 0,
        skipped: 0,
        errors: 1,
        durationMs: 0,
      });
      console.log(`  └─ ❌ Failed\n`);
    }
  }

  // Verification
  if (!skipVerify && !dryRun) {
    console.log('\n  ━━━ Post-Migration Verification ━━━\n');
    await verifyMigration(ctx);
  }

  // Summary
  const totalMs = Date.now() - totalStart;
  console.log('\n  ━━━ Migration Summary ━━━\n');
  console.log('  Step             Total    Migrated  Skipped  Errors   Time');
  console.log('  ────────────────────────────────────────────────────────────');
  for (const r of results) {
    console.log(
      `  ${r.step.padEnd(17)} ${String(r.total).padStart(6)}  ${String(r.migrated).padStart(9)}  ${String(r.skipped).padStart(7)}  ${String(r.errors).padStart(6)}   ${r.durationMs}ms`,
    );
  }
  console.log('  ────────────────────────────────────────────────────────────');
  console.log(`  Total duration: ${(totalMs / 1000).toFixed(1)}s`);
  console.log(`  Dry run: ${dryRun}\n`);

  // Cleanup
  await pgPool.end();
  await mongoose.disconnect();

  const hasErrors = results.some((r) => r.errors > 0);
  process.exit(hasErrors ? 1 : 0);
}

main().catch((err) => {
  console.error('  ❌ Migration CLI failed:', err);
  process.exit(1);
});
