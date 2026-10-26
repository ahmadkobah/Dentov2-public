/**
 * Feature Flags Service — Phase 7
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 3.4
 *
 * Standalone exported async functions (matches platform service pattern).
 * Provides CRUD + toggle + paginated list with search/filter.
 */

import { FeatureFlag, type IFeatureFlag } from '../models/index.js';
import { logger } from '../../utils/logger.js';
import type { QueryFilter } from 'mongoose';

// ── List (paginated + filtered) ─────────────────────────────

export interface ListFeatureFlagsOptions {
  page: number;
  limit: number;
  search?: string;
  tenantId?: string;
  enabled?: boolean;
}

export async function listFeatureFlags(opts: ListFeatureFlagsOptions) {
  const { page, limit, search, tenantId, enabled } = opts;
  const filter: QueryFilter<IFeatureFlag> = {};

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [{ key: regex }, { name: regex }, { description: regex }];
  }

  if (tenantId !== undefined) {
    filter.tenantId = tenantId;
  }

  if (enabled !== undefined) {
    filter.enabled = enabled;
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    FeatureFlag.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    FeatureFlag.countDocuments(filter),
  ]);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

// ── Get by ID ───────────────────────────────────────────────

export async function getFeatureFlagById(id: string) {
  return FeatureFlag.findById(id).lean();
}

// ── Create ──────────────────────────────────────────────────

export async function createFeatureFlag(data: Record<string, unknown>) {
  const flag = new FeatureFlag(data);
  const saved = await flag.save();
  logger.info({ key: saved.key }, 'Feature flag created');
  return saved.toObject();
}

// ── Update ──────────────────────────────────────────────────

export async function updateFeatureFlag(id: string, updates: Record<string, unknown>) {
  const flag = await FeatureFlag.findById(id);
  if (!flag) return null;

  Object.assign(flag, updates);
  const saved = await flag.save();
  logger.info({ key: saved.key }, 'Feature flag updated');
  return saved.toObject();
}

// ── Toggle ──────────────────────────────────────────────────

export async function toggleFeatureFlag(id: string, enabled: boolean) {
  const flag = await FeatureFlag.findById(id);
  if (!flag) return null;

  flag.enabled = enabled;
  const saved = await flag.save();
  logger.info({ key: saved.key, enabled: saved.enabled }, 'Feature flag toggled');
  return saved.toObject();
}

// ── Delete ──────────────────────────────────────────────────

export async function deleteFeatureFlag(id: string) {
  const flag = await FeatureFlag.findByIdAndDelete(id).lean();
  if (flag) {
    logger.info({ key: flag.key }, 'Feature flag deleted');
  }
  return flag;
}
