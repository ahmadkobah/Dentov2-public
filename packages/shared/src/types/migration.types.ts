/**
 * migration.types.ts — V1→V2 migration type definitions
 *
 * Used by the migration CLI scripts in apps/api/src/scripts/migrate-v1/
 * Per V2_DECISION_LOG §7 — ETL from Supabase Postgres → MongoDB Atlas.
 */

// ── Migration Run ───────────────────────────────────────────

export interface MigrationRun {
  id: string;
  startedAt: Date;
  completedAt?: Date;
  tenantSlug?: string;
  dryRun: boolean;
  steps: MigrationStepRecord[];
  status: 'running' | 'completed' | 'failed' | 'partial';
  summary?: MigrationSummary;
}

export interface MigrationStepRecord {
  step: MigrationStepName;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  durationMs: number;
  errorDetails?: string[];
}

export type MigrationStepName =
  | 'users'
  | 'patients'
  | 'appointments'
  | 'treatments'
  | 'prescriptions'
  | 'invoices'
  | 'inventory'
  | 'xrays';

// ── Migration Summary ───────────────────────────────────────

export interface MigrationSummary {
  totalRecords: number;
  totalMigrated: number;
  totalSkipped: number;
  totalErrors: number;
  totalDurationMs: number;
  steps: MigrationStepRecord[];
}

// ── Migration Config ────────────────────────────────────────

export interface MigrationConfig {
  v1Url: string; // Postgres connection string
  v2Url: string; // MongoDB connection string
  tenantSlug?: string; // Migrate specific tenant only
  dryRun: boolean;
  batchSize: number;
  verbose: boolean;
  skipVerify: boolean;
  steps?: MigrationStepName[]; // Only run specific steps
}

// ── ID Mapping ──────────────────────────────────────────────

export interface IdMappingEntry {
  collection: string;
  v1Id: number | string;
  v2Id: string; // ObjectId as hex string
}

// ── Password Migration ──────────────────────────────────────

export type PasswordHashAlgorithm = 'bcrypt' | 'argon2id';

export interface PasswordMigrationInfo {
  /** Total users with bcrypt hashes (pending re-hash on first login) */
  bcryptCount: number;
  /** Total users already using argon2id */
  argon2idCount: number;
}
