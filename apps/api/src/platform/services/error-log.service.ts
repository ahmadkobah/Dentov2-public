import crypto from 'node:crypto';
import {
  ErrorLog,
  type IErrorLog,
  type ErrorLevel,
  type ErrorSource,
} from '../models/error-log.model.js';
import { logger } from '../../utils/logger.js';
import { regexContains } from '../../tenant/services/search.helpers.js';

/**
 * Error Log Service — Phase 6 (Task 1.6)
 *
 * Per V2_DATABASE §4.11, MASTER_PLAN §7 — Gap G1
 *
 * - Logs errors with dedup (fingerprint = SHA-256(message+stack+source), truncated)
 * - On duplicate: increment occurrences + update lastSeenAt
 * - Query with filters, pagination, aggregation
 */

// ── Types ───────────────────────────────────────────────────

export interface LogErrorInput {
  level: ErrorLevel;
  message: string;
  stack?: string | null;
  source: ErrorSource;
  endpoint?: string | null;
  method?: string | null;
  statusCode?: number | null;
  userId?: string | null;
  tenantSlug?: string | null;
  requestId?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ErrorLogFilter {
  source?: ErrorSource;
  level?: ErrorLevel;
  tenantSlug?: string;
  resolved?: boolean;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

// ── Helpers ────────────────────────────────────────────────

function generateFingerprint(message: string, stack: string | null, source: string): string {
  const input = `${message}|${stack ?? ''}|${source}`;
  // L-1: SHA-256 (truncated to 32 hex chars / 128 bits) replaces MD5.
  // 128 bits of collision resistance is plenty for an error-dedup key, and
  // the truncation keeps the index size identical to the previous MD5 hex output.
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 32);
}

// ── Service Functions ──────────────────────────────────────

/**
 * Log an error — insert new or increment existing (dedup by fingerprint)
 */
export async function logError(input: LogErrorInput): Promise<IErrorLog> {
  const fingerprint = generateFingerprint(input.message, input.stack ?? null, input.source);
  const now = new Date();

  try {
    // Upsert: increment occurrences if fingerprint exists, else create new
    const errorLog = await ErrorLog.findOneAndUpdate(
      { fingerprint },
      {
        $inc: { occurrences: 1 },
        $set: {
          lastSeenAt: now,
          level: input.level,
          endpoint: input.endpoint ?? null,
          method: input.method ?? null,
          statusCode: input.statusCode ?? null,
          userId: input.userId ?? null,
          tenantSlug: input.tenantSlug ?? null,
          requestId: input.requestId ?? null,
          userAgent: input.userAgent ?? null,
          ip: input.ip ?? null,
          metadata: input.metadata ?? null,
          // Unresolve if new occurrence of previously resolved error
          resolved: false,
          resolvedAt: null,
          resolvedBy: null,
        },
        $setOnInsert: {
          fingerprint,
          message: input.message,
          stack: input.stack ?? null,
          source: input.source,
          firstSeenAt: now,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return errorLog;
  } catch (err) {
    logger.error({ err }, 'Failed to write error log');
    throw err;
  }
}

/**
 * Query error logs with filters + pagination
 */
export async function queryErrorLogs(filter: ErrorLogFilter) {
  const query: Record<string, unknown> = {};

  if (filter.source) query.source = filter.source;
  if (filter.level) query.level = filter.level;
  if (filter.tenantSlug) query.tenantSlug = filter.tenantSlug;
  if (filter.resolved !== undefined) query.resolved = filter.resolved;

  if (filter.startDate || filter.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (filter.startDate) dateFilter.$gte = filter.startDate;
    if (filter.endDate) dateFilter.$lte = filter.endDate;
    query.createdAt = dateFilter;
  }

  if (filter.search) {
    const rx = regexContains(filter.search);
    query.$or = [{ message: rx }, { endpoint: rx }, { fingerprint: filter.search }];
  }

  const page = filter.page ?? 1;
  const limit = filter.limit ?? 20;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    ErrorLog.find(query).sort({ lastSeenAt: -1 }).skip(skip).limit(limit).lean(),
    ErrorLog.countDocuments(query),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get error log by fingerprint
 */
export async function getErrorByFingerprint(fingerprint: string) {
  return ErrorLog.findOne({ fingerprint }).lean();
}

/**
 * Get error log by ID
 */
export async function getErrorById(id: string) {
  return ErrorLog.findById(id).lean();
}

/**
 * Resolve an error log
 */
export async function resolveError(id: string, resolvedBy: string) {
  return ErrorLog.findByIdAndUpdate(
    id,
    {
      $set: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy,
      },
    },
    { new: true },
  ).lean();
}

/**
 * Unresolve an error log
 */
export async function unresolveError(id: string) {
  return ErrorLog.findByIdAndUpdate(
    id,
    {
      $set: {
        resolved: false,
        resolvedAt: null,
        resolvedBy: null,
      },
    },
    { new: true },
  ).lean();
}

/**
 * Aggregated stats — for monitoring dashboard
 */
export async function getErrorStats(hours: number = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [totalErrors, unresolvedCount, bySource, byLevel, timeline] = await Promise.all([
    // Total errors in window
    ErrorLog.countDocuments({ lastSeenAt: { $gte: since } }),

    // Unresolved count
    ErrorLog.countDocuments({ resolved: false }),

    // Group by source
    ErrorLog.aggregate([
      { $match: { lastSeenAt: { $gte: since } } },
      { $group: { _id: '$source', count: { $sum: '$occurrences' }, unique: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    // Group by level
    ErrorLog.aggregate([
      { $match: { lastSeenAt: { $gte: since } } },
      { $group: { _id: '$level', count: { $sum: '$occurrences' } } },
    ]),

    // Timeline (hourly buckets for the last 24h)
    ErrorLog.aggregate([
      { $match: { lastSeenAt: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%dT%H:00:00Z', date: '$lastSeenAt' },
          },
          count: { $sum: '$occurrences' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  return {
    totalErrors,
    unresolvedCount,
    bySource,
    byLevel,
    timeline,
    window: `${hours}h`,
  };
}
