/**
 * Storage Types — Platform storage monitoring + tier management
 *
 * Storage tiers: configurable plans (100/200/500/1024 GB + custom).
 * Data sources: tenants.storageUsedMB / storageLimitMB + S3 bucket stats.
 * Region pricing: per-country price overrides (reuses IRegionPrice from pricing.types).
 */

import type { IRegionPrice } from './pricing.types.js';

// ── Storage Tier ────────────────────────────────────────────

export interface IStorageTier {
  _id: string;
  slug: string;
  name: string;
  storageLimitGB: number;
  pricePerMonth: number;
  currency: string; // Default: EUR
  isDefault: boolean;
  isCustom: boolean;
  sortOrder: number;
  isActive: boolean;
  regionPrices: IRegionPrice[];
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_STORAGE_TIERS = [
  { slug: 'basic', name: 'Basic', storageLimitGB: 100, pricePerMonth: 0, sortOrder: 1 },
  { slug: 'standard', name: 'Standard', storageLimitGB: 200, pricePerMonth: 5, sortOrder: 2 },
  {
    slug: 'professional',
    name: 'Professional',
    storageLimitGB: 500,
    pricePerMonth: 10,
    sortOrder: 3,
  },
  { slug: 'enterprise', name: 'Enterprise', storageLimitGB: 1024, pricePerMonth: 20, sortOrder: 4 },
] as const;

// ── Per-Tenant Storage Info ─────────────────────────────────

export interface TenantStorageInfo {
  tenantId: string;
  name: string;
  slug: string;
  status: string;
  storageUsedMB: number;
  storageLimitMB: number;
  usagePercentage: number; // 0–100
  storageTierId?: string;
  tierName?: string;
}

// ── Platform Storage Overview ───────────────────────────────

export interface StorageOverview {
  totalStorageUsedMB: number;
  totalStorageLimitMB: number;
  totalUsagePercentage: number;
  tenantCount: number;
  tenantsOverLimit: number;
  tenantsNearLimit: number; // >80% usage
  averageUsagePercentage: number;
}

// ── S3 Bucket Stats ─────────────────────────────────────────

export interface S3BucketStats {
  bucketName: string;
  isAccessible: boolean;
  objectCount?: number;
  totalSizeBytes?: number;
  totalSizeMB?: number;
  lastCheckedAt: string;
}

// ── Combined Storage Stats Response ─────────────────────────

export interface StorageStats {
  overview: StorageOverview;
  buckets: {
    uploads: S3BucketStats;
    backups: S3BucketStats;
  };
}

// ── Tenant Storage List Response ────────────────────────────

export interface TenantStorageListResponse {
  tenants: TenantStorageInfo[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
