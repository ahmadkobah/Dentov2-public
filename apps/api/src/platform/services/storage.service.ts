/**
 * Storage Service — Platform storage monitoring + tier-aware
 *
 * Aggregation of tenant storage data + S3 bucket health checks.
 * Data sources: tenants.storageUsedMB / storageLimitMB / storageTierId + S3 HeadBucket.
 */

import { HeadBucketCommand } from '@aws-sdk/client-s3';
import type {
  StorageStats,
  StorageOverview,
  TenantStorageInfo,
  TenantStorageListResponse,
  S3BucketStats,
  StorageTenantsQuery,
} from '@dento/shared';
import { Tenant } from '../models/tenant.model.js';
import { StorageTier } from '../models/storage-tier.model.js';
import { getS3Client } from '../../config/s3.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { regexContains } from '../../tenant/services/search.helpers.js';

// ── Constants ───────────────────────────────────────────────

const NEAR_LIMIT_THRESHOLD = 80; // 80% usage = near limit

// ── Storage Overview ────────────────────────────────────────

export async function getStorageStats(): Promise<StorageStats> {
  const [overview, uploads, backups] = await Promise.all([
    getStorageOverview(),
    checkBucket(env.S3_BUCKET, 'uploads'),
    checkBucket(env.S3_BACKUP_BUCKET, 'backups'),
  ]);

  return {
    overview,
    buckets: { uploads, backups },
  };
}

// ── Per-Tenant Breakdown ────────────────────────────────────

export async function getTenantStorageList(
  query: StorageTenantsQuery,
): Promise<TenantStorageListResponse> {
  const { page, limit, search, sortBy, sortOrder } = query;

  // Build filter
  const filter: Record<string, unknown> = {};
  if (search) {
    const rx = regexContains(search);
    filter.$or = [{ 'name.en': rx }, { 'name.ar': rx }, { slug: rx }];
  }

  const [tenants, total] = await Promise.all([
    Tenant.find(filter)
      .select('name slug status storageUsedMB storageLimitMB storageTierId')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Tenant.countDocuments(filter),
  ]);

  // Build tier name map
  const tierIds = [...new Set(tenants.map((t) => t.storageTierId).filter(Boolean))];
  const tiers = tierIds.length
    ? await StorageTier.find({ _id: { $in: tierIds } })
        .select('name')
        .lean()
    : [];
  const tierMap = new Map(tiers.map((t) => [String(t._id), t.name]));

  // Map to TenantStorageInfo with computed fields
  const mapped: TenantStorageInfo[] = tenants.map((t) => {
    const usedMB = t.storageUsedMB || 0;
    const limitMB = t.storageLimitMB || 102400;
    const usagePercentage = limitMB > 0 ? Math.round((usedMB / limitMB) * 100 * 100) / 100 : 0;

    return {
      tenantId: String(t._id),
      name: t.name?.en || t.slug,
      slug: t.slug,
      status: t.status,
      storageUsedMB: Math.round(usedMB * 100) / 100,
      storageLimitMB: limitMB,
      usagePercentage,
      storageTierId: t.storageTierId ? String(t.storageTierId) : undefined,
      tierName: t.storageTierId ? tierMap.get(String(t.storageTierId)) : undefined,
    };
  });

  // Sort computed fields in-memory (MongoDB can't sort on computed fields)
  const sortMultiplier = sortOrder === 'asc' ? 1 : -1;
  if (sortBy === 'usagePercentage') {
    mapped.sort((a, b) => (a.usagePercentage - b.usagePercentage) * sortMultiplier);
  } else if (sortBy === 'name') {
    mapped.sort((a, b) => a.name.localeCompare(b.name) * sortMultiplier);
  } else {
    // storageUsedMB — default
    mapped.sort((a, b) => (a.storageUsedMB - b.storageUsedMB) * sortMultiplier);
  }

  return {
    tenants: mapped,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ── Internal Helpers ────────────────────────────────────────

async function getStorageOverview(): Promise<StorageOverview> {
  const tenants = await Tenant.find().select('storageUsedMB storageLimitMB').lean();

  let totalUsed = 0;
  let totalLimit = 0;
  let tenantsOverLimit = 0;
  let tenantsNearLimit = 0;

  for (const t of tenants) {
    const used = t.storageUsedMB || 0;
    const limit = t.storageLimitMB || 102400;
    totalUsed += used;
    totalLimit += limit;

    const pct = limit > 0 ? (used / limit) * 100 : 0;
    if (used > limit) {
      tenantsOverLimit++;
    }
    if (pct >= NEAR_LIMIT_THRESHOLD && used <= limit) {
      tenantsNearLimit++;
    }
  }

  const tenantCount = tenants.length;
  const avgPct =
    tenantCount > 0 && totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100 * 100) / 100 : 0;

  return {
    totalStorageUsedMB: Math.round(totalUsed * 100) / 100,
    totalStorageLimitMB: Math.round(totalLimit * 100) / 100,
    totalUsagePercentage: avgPct,
    tenantCount,
    tenantsOverLimit,
    tenantsNearLimit,
    averageUsagePercentage: avgPct,
  };
}

async function checkBucket(bucketName: string, label: string): Promise<S3BucketStats> {
  const now = new Date().toISOString();

  if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY) {
    return {
      bucketName,
      isAccessible: false,
      lastCheckedAt: now,
    };
  }

  try {
    const s3 = getS3Client();
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }));

    return {
      bucketName,
      isAccessible: true,
      lastCheckedAt: now,
    };
  } catch (error) {
    logger.warn({ bucket: bucketName, label, error }, 'S3 bucket health check failed');
    return {
      bucketName,
      isAccessible: false,
      lastCheckedAt: now,
    };
  }
}
