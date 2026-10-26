/**
 * v1 → v2 Migration Utilities
 *
 * Shared helpers for the migration CLI scripts.
 * Per V2_DECISION_LOG §7 — ETL from Supabase Postgres → MongoDB Atlas.
 */

import { createInterface } from 'readline';
import type mongoose from 'mongoose';

// ── Progress Tracker ────────────────────────────────────────

export interface MigrationProgress {
  collection: string;
  total: number;
  processed: number;
  skipped: number;
  errors: number;
  startedAt: Date;
}

const progressMap = new Map<string, MigrationProgress>();

export function startProgress(collection: string, total: number): MigrationProgress {
  const progress: MigrationProgress = {
    collection,
    total,
    processed: 0,
    skipped: 0,
    errors: 0,
    startedAt: new Date(),
  };
  progressMap.set(collection, progress);
  return progress;
}

export function updateProgress(collection: string, increment = 1): void {
  const p = progressMap.get(collection);
  if (!p) return;
  p.processed += increment;
  const pct = Math.round((p.processed / p.total) * 100);
  const elapsed = ((Date.now() - p.startedAt.getTime()) / 1000).toFixed(1);
  process.stdout.write(`\r  [${collection}] ${p.processed}/${p.total} (${pct}%) — ${elapsed}s`);
}

export function skipProgress(collection: string, increment = 1): void {
  const p = progressMap.get(collection);
  if (p) p.skipped += increment;
}

export function errorProgress(collection: string, increment = 1): void {
  const p = progressMap.get(collection);
  if (p) p.errors += increment;
}

export function finishProgress(collection: string): MigrationProgress | undefined {
  const p = progressMap.get(collection);
  if (p) {
    const elapsed = ((Date.now() - p.startedAt.getTime()) / 1000).toFixed(1);
    console.log(
      `\n  ✅ ${collection}: ${p.processed} migrated, ${p.skipped} skipped, ${p.errors} errors (${elapsed}s)`,
    );
  }
  return p;
}

// ── ID Mapping ──────────────────────────────────────────────

/** Map v1 integer IDs → v2 ObjectId for cross-collection referencing */
const idMaps = new Map<string, Map<number | string, mongoose.Types.ObjectId>>();

export function setIdMapping(
  collection: string,
  v1Id: number | string,
  v2Id: mongoose.Types.ObjectId,
): void {
  if (!idMaps.has(collection)) idMaps.set(collection, new Map());
  idMaps.get(collection)!.set(v1Id, v2Id);
}

export function getIdMapping(
  collection: string,
  v1Id: number | string,
): mongoose.Types.ObjectId | undefined {
  return idMaps.get(collection)?.get(v1Id);
}

export function getIdMappingOrThrow(
  collection: string,
  v1Id: number | string,
): mongoose.Types.ObjectId {
  const id = getIdMapping(collection, v1Id);
  if (!id) throw new Error(`Missing ID mapping: ${collection}[${v1Id}]`);
  return id;
}

export function getIdMapSize(collection: string): number {
  return idMaps.get(collection)?.size ?? 0;
}

// ── Batch Insert ────────────────────────────────────────────

const DEFAULT_BATCH_SIZE = 500;

/**
 * Insert documents in batches with ordered: false (continue on dupe errors).
 */
export async function batchInsert<T>(
  model: mongoose.Model<T>,
  docs: Record<string, unknown>[],
  batchSize = DEFAULT_BATCH_SIZE,
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    try {
      const result = await model.insertMany(batch, { ordered: false });
      inserted += result.length;
    } catch (err: unknown) {
      // BulkWriteError — some docs may have inserted
      if (err && typeof err === 'object' && 'insertedDocs' in err) {
        const bwe = err as { insertedDocs: unknown[] };
        inserted += bwe.insertedDocs.length;
        errors += batch.length - bwe.insertedDocs.length;
      } else {
        errors += batch.length;
      }
    }
  }

  return { inserted, errors };
}

// ── User Confirmation ───────────────────────────────────────

export async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

// ── Date Conversion ─────────────────────────────────────────

/** Convert Postgres timestamp string → Date, handling null */
export function toDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// ── Logging ─────────────────────────────────────────────────

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
let currentLevel: keyof typeof LOG_LEVELS = 'info';

export function setLogLevel(level: keyof typeof LOG_LEVELS): void {
  currentLevel = level;
}

export const migrationLog = {
  debug: (msg: string, ...args: unknown[]) => {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.debug) console.log(`  🔍 ${msg}`, ...args);
  },
  info: (msg: string, ...args: unknown[]) => {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.info) console.log(`  ℹ️  ${msg}`, ...args);
  },
  warn: (msg: string, ...args: unknown[]) => {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.warn) console.warn(`  ⚠️  ${msg}`, ...args);
  },
  error: (msg: string, ...args: unknown[]) => {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.error) console.error(`  ❌ ${msg}`, ...args);
  },
};
