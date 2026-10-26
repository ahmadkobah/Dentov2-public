/**
 * Module Versioning Types — §24 Module Versioning System
 *
 * Two platform-level collections:
 * 1. modules — Module definitions with SemVer versioning
 * 2. tenant_modules — Per-tenant module installations & rollout state
 *
 * Lifecycle: DEVELOPMENT → BETA → ACTIVE → DEPRECATED → RETIRED
 * Rollout:   Canary 5% → 25% → 50% → 100% (with auto-rollback)
 */

// ── Module Lifecycle ────────────────────────────────────────

export type ModuleStatus = 'development' | 'beta' | 'active' | 'deprecated' | 'retired';

export const MODULE_LIFECYCLE_ORDER: ModuleStatus[] = [
  'development',
  'beta',
  'active',
  'deprecated',
  'retired',
];

// ── Module Types ────────────────────────────────────────────

export type ModuleType = 'core' | 'paid';

export interface ChangelogEntry {
  version: string;
  date: string; // ISO date
  changes: string[];
}

export interface MigrationEntry {
  version: string;
  type: 'addField' | 'removeField' | 'addIndex' | 'addCollection' | 'migrateData';
  collection: string;
  field?: string;
  description?: string;
}

export interface IModule {
  _id: string;
  slug: string;
  name: { en: string; ar?: string };
  description: { en: string; ar?: string };
  version: string; // SemVer (e.g. "2.1.0")
  status: ModuleStatus;
  type: ModuleType;
  changelog: ChangelogEntry[];
  dependsOn: string[]; // Module slugs that must be active
  conflictsWith: string[]; // Module slugs that cannot coexist
  migrations: MigrationEntry[];
  icon?: string; // Lucide icon name
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Tenant Module Types ─────────────────────────────────────

export type UpdatePolicy = 'auto' | 'manual' | 'pinned';

export interface UpdateHistoryEntry {
  from: string;
  to: string;
  at: string; // ISO date
  status: 'success' | 'failed' | 'rolled_back';
  error?: string;
}

export interface ITenantModule {
  _id: string;
  tenantId: string;
  moduleSlug: string;
  installedVersion: string; // SemVer currently running
  availableVersion: string; // Latest available version
  updatePolicy: UpdatePolicy;
  pinnedVersion: string | null; // e.g. "2.0.x" or null
  isCanary: boolean; // Part of canary rollout group

  // Per-tenant pricing override (§28 cross-ref)
  priceOverride: number | null; // null = use standard price from pricing_config
  discountPercent: number; // 0-100
  discountExpiresAt: string | null; // ISO date or null

  // History
  updateHistory: UpdateHistoryEntry[];

  // Metadata
  installedAt: string;
  updatedAt: string;
}

// ── Canary Rollout Types ────────────────────────────────────

export type RolloutStage =
  | 'canary'
  | 'rolling_25'
  | 'rolling_50'
  | 'rolling_100'
  | 'completed'
  | 'rolled_back';

export interface IRolloutPlan {
  _id: string;
  moduleSlug: string;
  fromVersion: string;
  toVersion: string;
  stage: RolloutStage;
  canaryPercent: number; // 5
  errorRateThreshold: number; // 1.0 (percent)
  monitoringHours: number; // 24
  startedAt: string;
  completedAt: string | null;
  rolledBackAt: string | null;
  rollbackReason: string | null;
  stages: {
    stage: RolloutStage;
    startedAt: string;
    completedAt: string | null;
    tenantsAffected: number;
    errorRate: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

// ── Rollout Stages Configuration ────────────────────────────

export const ROLLOUT_STAGES = [
  { stage: 'canary' as const, percent: 5, label: 'Canary (5%)' },
  { stage: 'rolling_25' as const, percent: 25, label: 'Rolling (25%)' },
  { stage: 'rolling_50' as const, percent: 50, label: 'Rolling (50%)' },
  { stage: 'rolling_100' as const, percent: 100, label: 'Rolling (100%)' },
] as const;

// ── API Request/Response Types ──────────────────────────────

export interface CreateModuleInput {
  slug: string;
  name: { en: string; ar?: string };
  description: { en: string; ar?: string };
  version: string;
  type: ModuleType;
  dependsOn?: string[];
  conflictsWith?: string[];
  icon?: string;
}

export interface UpdateModuleVersionInput {
  version: string;
  changelog: { changes: string[] };
  migrations?: MigrationEntry[];
}

export interface ModuleVersionValidation {
  valid: boolean;
  errors: string[];
}

export interface InstallModuleInput {
  tenantId: string;
  moduleSlug: string;
  updatePolicy?: UpdatePolicy;
  isCanary?: boolean;
}

export interface StartRolloutInput {
  moduleSlug: string;
  toVersion: string;
  canaryPercent?: number;
  monitoringHours?: number;
  errorRateThreshold?: number;
}

// ── SemVer Utility Types ────────────────────────────────────

export const SEMVER_REGEX =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/**
 * Compare two SemVer strings.
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareSemVer(a: string, b: string): -1 | 0 | 1 {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}
