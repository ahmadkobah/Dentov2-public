/**
 * Feature Flag Types — Phase 7
 *
 * Per V2_DATABASE §4.8, PHASE_7_IMPLEMENTATION_PLAN Step 3.1
 *
 * Feature flags stored in `dento_platform.feature_flags` collection.
 * Supports global flags (tenantId = null), tenant-scoped flags,
 * percentage rollout, user targeting, and JSON conditions.
 */

// ── Core Interfaces ─────────────────────────────────────────

export interface FeatureFlag {
  _id: string;
  key: string;
  name: string;
  description: string;
  tenantId: string | null;
  enabled: boolean;
  percentageRollout: number | null;
  userIds: string[] | null;
  conditions: Record<string, unknown> | null;
  value: unknown | null;
  createdAt: string;
  updatedAt: string;
}

// ── Input Types ─────────────────────────────────────────────

export type CreateFeatureFlagInput = Pick<FeatureFlag, 'key' | 'name'> &
  Partial<
    Pick<
      FeatureFlag,
      | 'description'
      | 'tenantId'
      | 'enabled'
      | 'percentageRollout'
      | 'userIds'
      | 'conditions'
      | 'value'
    >
  >;

export type UpdateFeatureFlagInput = Partial<
  Pick<
    FeatureFlag,
    | 'name'
    | 'description'
    | 'tenantId'
    | 'enabled'
    | 'percentageRollout'
    | 'userIds'
    | 'conditions'
    | 'value'
  >
>;

// ── List Response ───────────────────────────────────────────

export interface FeatureFlagListResponse {
  items: FeatureFlag[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
