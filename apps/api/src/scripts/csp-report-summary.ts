/**
 * CSP Report Summary — Phase 2 measurement helper.
 *
 * Aggregates Content-Security-Policy violation reports recorded by
 * `cspReportRoutes` (POST /api/csp-report → `logError({ metadata.kind: 'csp-violation' })`)
 * so we can decide whether the strict Report-Only policy is safe to flip
 * to enforced mode.
 *
 * Reads from the platform-level `error_logs` collection. Read-only — never
 * mutates documents.
 *
 * Usage:
 *   pnpm --filter @dento/api exec tsx src/scripts/csp-report-summary.ts
 *   pnpm --filter @dento/api exec tsx src/scripts/csp-report-summary.ts --since=2025-01-01
 *   pnpm --filter @dento/api exec tsx src/scripts/csp-report-summary.ts --json
 *   pnpm --filter @dento/api exec tsx src/scripts/csp-report-summary.ts --top=20
 */

import mongoose from 'mongoose';
import { ErrorLog } from '../platform/models/error-log.model.js';
import { logger } from '../utils/logger.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dento_platform';

const SINCE = (() => {
  const arg = process.argv.find((a) => a.startsWith('--since='));
  if (!arg) return null;
  const d = new Date(arg.slice('--since='.length));
  return Number.isNaN(d.getTime()) ? null : d;
})();

const TOP_N = (() => {
  const arg = process.argv.find((a) => a.startsWith('--top='));
  const n = arg ? Number.parseInt(arg.slice('--top='.length), 10) : 10;
  return Number.isFinite(n) && n > 0 ? n : 10;
})();

const AS_JSON = process.argv.includes('--json');

interface DirectiveRow {
  _id: string;
  occurrences: number;
  fingerprints: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

interface BlockedUriRow {
  _id: string;
  occurrences: number;
  fingerprints: number;
  directives: string[];
}

interface DocumentUriRow {
  _id: string;
  occurrences: number;
  fingerprints: number;
}

async function main(): Promise<void> {
  await mongoose.connect(MONGODB_URI);

  // `metadata.kind === 'csp-violation'` is set by the csp-report route, and
  // the violated-directive is embedded in `message` ("CSP violation: <directive>").
  const baseMatch: Record<string, unknown> = { 'metadata.kind': 'csp-violation' };
  if (SINCE) baseMatch.lastSeenAt = { $gte: SINCE };

  const totals = await ErrorLog.aggregate<{ _id: null; fingerprints: number; occurrences: number }>(
    [
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          fingerprints: { $sum: 1 },
          occurrences: { $sum: '$occurrences' },
        },
      },
    ],
  );

  const byDirective = await ErrorLog.aggregate<DirectiveRow>([
    { $match: baseMatch },
    {
      $group: {
        _id: { $ifNull: ['$message', '(unknown)'] },
        occurrences: { $sum: '$occurrences' },
        fingerprints: { $sum: 1 },
        firstSeenAt: { $min: '$firstSeenAt' },
        lastSeenAt: { $max: '$lastSeenAt' },
      },
    },
    { $sort: { occurrences: -1 } },
  ]);

  const byBlockedUri = await ErrorLog.aggregate<BlockedUriRow>([
    { $match: baseMatch },
    {
      $group: {
        _id: { $ifNull: ['$metadata.blockedUri', '(none)'] },
        occurrences: { $sum: '$occurrences' },
        fingerprints: { $sum: 1 },
        directives: { $addToSet: '$message' },
      },
    },
    { $sort: { occurrences: -1 } },
    { $limit: TOP_N },
  ]);

  const byDocumentUri = await ErrorLog.aggregate<DocumentUriRow>([
    { $match: baseMatch },
    {
      $group: {
        _id: { $ifNull: ['$metadata.documentUri', '(none)'] },
        occurrences: { $sum: '$occurrences' },
        fingerprints: { $sum: 1 },
      },
    },
    { $sort: { occurrences: -1 } },
    { $limit: TOP_N },
  ]);

  const summary = {
    since: SINCE?.toISOString() ?? null,
    generatedAt: new Date().toISOString(),
    totals: totals[0] ?? { fingerprints: 0, occurrences: 0 },
    byDirective,
    topBlockedUris: byBlockedUri,
    topDocumentUris: byDocumentUri,
  };

  if (AS_JSON) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } else {
    printHuman(summary);
  }

  await mongoose.disconnect();
}

function printHuman(s: {
  since: string | null;
  generatedAt: string;
  totals: { fingerprints: number; occurrences: number };
  byDirective: DirectiveRow[];
  topBlockedUris: BlockedUriRow[];
  topDocumentUris: DocumentUriRow[];
}): void {
  const out: string[] = [];
  out.push('');
  out.push('═══ CSP Violation Summary ═══');
  out.push(`Generated: ${s.generatedAt}`);
  out.push(`Window:    ${s.since ?? '(all time)'}`);
  out.push(
    `Totals:    ${s.totals.occurrences} occurrence(s) across ${s.totals.fingerprints} unique fingerprint(s)`,
  );
  out.push('');

  out.push('── By violated directive ──');
  if (s.byDirective.length === 0) {
    out.push('  (none)');
  } else {
    for (const row of s.byDirective) {
      out.push(
        `  ${String(row.occurrences).padStart(6)}  ${row._id}  (${row.fingerprints} fp, last ${row.lastSeenAt.toISOString()})`,
      );
    }
  }
  out.push('');

  out.push(`── Top ${TOP_N} blocked URIs ──`);
  if (s.topBlockedUris.length === 0) {
    out.push('  (none)');
  } else {
    for (const row of s.topBlockedUris) {
      out.push(`  ${String(row.occurrences).padStart(6)}  ${row._id}`);
      out.push(`            directives: ${row.directives.slice(0, 5).join(', ')}`);
    }
  }
  out.push('');

  out.push(`── Top ${TOP_N} document URIs ──`);
  if (s.topDocumentUris.length === 0) {
    out.push('  (none)');
  } else {
    for (const row of s.topDocumentUris) {
      out.push(`  ${String(row.occurrences).padStart(6)}  ${row._id}`);
    }
  }
  out.push('');

  process.stdout.write(`${out.join('\n')}\n`);
}

main().catch((err) => {
  logger.error({ err }, 'CSP report summary failed');
  process.exitCode = 1;
  void mongoose.disconnect();
});
