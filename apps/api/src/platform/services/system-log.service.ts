import { ErrorLog, type ErrorLevel, type ErrorSource } from '../models/error-log.model.js';
import { regexContains } from '../../tenant/services/search.helpers.js';

/**
 * System Log Service — Phase 6 (Gap A3)
 *
 * Provides a system-log view over the existing error_logs collection.
 * The System Logs page focuses on log levels/services rather than
 * error management (resolve/unresolve).
 *
 * Pattern: standalone exported async functions (per error-log.service.ts)
 */

// ── Types ───────────────────────────────────────────────────

export interface SystemLogFilter {
  level?: ErrorLevel;
  source?: ErrorSource;
  tenantSlug?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

// ── Service Functions ──────────────────────────────────────

/**
 * Query system logs (error_logs collection) with filters + pagination
 */
export async function querySystemLogs(filter: SystemLogFilter) {
  const query: Record<string, unknown> = {};

  if (filter.level) query.level = filter.level;
  if (filter.source) query.source = filter.source;
  if (filter.tenantSlug) query.tenantSlug = filter.tenantSlug;

  if (filter.startDate || filter.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (filter.startDate) dateFilter.$gte = filter.startDate;
    if (filter.endDate) dateFilter.$lte = filter.endDate;
    query.createdAt = dateFilter;
  }

  if (filter.search) {
    const rx = regexContains(filter.search);
    query.$or = [{ message: rx }, { endpoint: rx }, { stack: rx }];
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
 * Get system log stats — log volume by level and source
 */
export async function getSystemLogStats(hours: number = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalLogs, byLevel, bySource, timeline, errorCount] = await Promise.all([
    // Total logs in window
    ErrorLog.countDocuments({ lastSeenAt: { $gte: since } }),

    // Group by level
    ErrorLog.aggregate([
      { $match: { lastSeenAt: { $gte: since } } },
      { $group: { _id: '$level', count: { $sum: '$occurrences' } } },
      { $sort: { count: -1 } },
    ]),

    // Group by source
    ErrorLog.aggregate([
      { $match: { lastSeenAt: { $gte: since } } },
      { $group: { _id: '$source', count: { $sum: '$occurrences' } } },
      { $sort: { count: -1 } },
    ]),

    // Timeline (hourly buckets)
    ErrorLog.aggregate([
      { $match: { lastSeenAt: { $gte: weekAgo } } },
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

    // Error + fatal count
    ErrorLog.countDocuments({
      lastSeenAt: { $gte: since },
      level: { $in: ['error', 'fatal'] },
    }),
  ]);

  const totalOccurrences = byLevel.reduce((sum: number, l: { count: number }) => sum + l.count, 0);

  return {
    totalLogs,
    byLevel,
    bySource,
    logTimeline: timeline,
    errorRate: totalOccurrences > 0 ? (errorCount / totalOccurrences) * 100 : 0,
    window: `${hours}h`,
  };
}
