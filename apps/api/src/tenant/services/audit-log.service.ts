/**
 * Audit Log Service — Business Logic
 *
 * Per V2_DATABASE.md §4.10 — audit_logs
 * Per SECURITY_AND_ENCRYPTION.md §10.1 — Audit Logging
 * Per BUILD_RULES §15.4 — Every data mutation MUST be logged, append-only
 *
 * This service persists audit entries to MongoDB.
 * The audit-logger middleware captures context; this service stores it.
 */

import type { Connection } from 'mongoose';
import type { AuditLogQueryInput, CreateAuditLogInput } from '@dento/shared';
import { getAuditLogModel } from '../models/audit-log.model.js';
import mongoose from 'mongoose';
import { regexContains } from './search.helpers.js';

export class AuditLogService {
  private AuditLogModel;

  constructor(db: Connection) {
    this.AuditLogModel = getAuditLogModel(db);
  }

  /**
   * Create a new audit log entry (append-only)
   */
  async create(input: CreateAuditLogInput): Promise<void> {
    await this.AuditLogModel.create({
      ...input,
      actorId: new mongoose.Types.ObjectId(input.actorId),
      tenantId: input.tenantSlug ? undefined : undefined, // tenantSlug is sufficient
    });
  }

  /**
   * Query audit logs with filters and pagination
   */
  async query(query: AuditLogQueryInput, tenantSlug?: string) {
    const {
      page,
      limit,
      actorId,
      resourceType,
      resourceId,
      action,
      sensitivityLevel,
      status,
      startDate,
      endDate,
      search,
    } = query;

    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};

    if (tenantSlug) filter.tenantSlug = tenantSlug;
    if (actorId) filter.actorId = new mongoose.Types.ObjectId(actorId);
    if (resourceType) filter.resourceType = resourceType;
    if (resourceId) filter.resourceId = resourceId;
    if (action) filter.action = action;
    if (sensitivityLevel) filter.sensitivityLevel = sensitivityLevel;
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) (filter.createdAt as Record<string, unknown>).$gte = new Date(startDate);
      if (endDate) (filter.createdAt as Record<string, unknown>).$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { description: regexContains(search) },
        { resourceType: regexContains(search) },
        { actorEmail: regexContains(search) },
      ];
    }

    const [data, total] = await Promise.all([
      this.AuditLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.AuditLogModel.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single audit log entry by ID
   */
  async getById(id: string) {
    const entry = await this.AuditLogModel.findById(id).lean();
    if (!entry) return null;
    return entry;
  }

  /**
   * Get audit stats for a tenant
   */
  async getStats(tenantSlug: string) {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [today, thisWeek, byAction, bySensitivity, byStatus] = await Promise.all([
      this.AuditLogModel.countDocuments({ tenantSlug, createdAt: { $gte: dayAgo } }),
      this.AuditLogModel.countDocuments({ tenantSlug, createdAt: { $gte: weekAgo } }),
      this.AuditLogModel.aggregate([
        { $match: { tenantSlug, createdAt: { $gte: weekAgo } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.AuditLogModel.aggregate([
        { $match: { tenantSlug, createdAt: { $gte: weekAgo } } },
        { $group: { _id: '$sensitivityLevel', count: { $sum: 1 } } },
      ]),
      this.AuditLogModel.aggregate([
        { $match: { tenantSlug, createdAt: { $gte: weekAgo } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      today,
      thisWeek,
      byAction: Object.fromEntries(byAction.map((a) => [a._id, a.count])),
      bySensitivity: Object.fromEntries(bySensitivity.map((s) => [s._id, s.count])),
      byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    };
  }
}
