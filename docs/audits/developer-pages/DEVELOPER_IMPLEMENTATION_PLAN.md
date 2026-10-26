# Developer Portal — Detailed Implementation Plan

> **Generated from:** `DEVELOPER_PAGES_DEEP_SCAN.md` cross-referenced with `BUILD_RULES.md`, `DENTO_V2_MASTER_PLAN.md`, `IMPLEMENTATION_ROADMAP.md`, `SECURITY_AND_ENCRYPTION.md`, `TECH_REQUIREMENTS.md`, `V2_DATABASE.md`, `V2_DECISION_LOG.md`, `V2_STRUCTURE.md`, `PLATFORM_RBAC.md`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Sprint Overview](#2-sprint-overview)
3. [Sprint 1 — P0: Foundation & Data Wiring (Days 1–7)](#3-sprint-1--p0-foundation--data-wiring-days-17)
4. [Sprint 2 — P1: Compliance & Integration (Days 8–11)](#4-sprint-2--p1-compliance--integration-days-811)
5. [Sprint 3 — P2: RTL & Accessibility (Days 12–14)](#5-sprint-3--p2-rtl--accessibility-days-1214)
6. [Sprint 4 — P3: Polish & Edge Cases (Day 15)](#6-sprint-4--p3-polish--edge-cases-day-15)
7. [Sprint 5 — Testing & Verification (Days 16–18)](#7-sprint-5--testing--verification-days-1618)
8. [File Inventory](#8-file-inventory)
9. [Cross-Reference Matrix](#9-cross-reference-matrix)
10. [Verification Checklist](#10-verification-checklist)

---

## 1. Executive Summary

| Metric                      | Value                                                                                            |
| :-------------------------- | :----------------------------------------------------------------------------------------------- |
| Total issues from deep scan | **87**                                                                                           |
| Priority breakdown          | P0: 3 tasks (10 pages) · P1: 4 tasks (13 pages) · P2: 3 tasks (24 files) · P3: 5 tasks (5 pages) |
| Estimated effort            | **15–18 working days** (3.5 weeks)                                                               |
| New files to create         | **~14**                                                                                          |
| Files to modify             | **~35**                                                                                          |
| New lines of code           | **~3,500**                                                                                       |
| Modified lines              | **~1,200**                                                                                       |
| Tests to write              | **~8 hook test files**                                                                           |

### Guiding Principles (from BUILD_RULES §1)

- **Document authority hierarchy:** V2_DECISION_LOG → V2_DATABASE → SECURITY_AND_ENCRYPTION → IMPLEMENTATION_ROADMAP → TECH_REQUIREMENTS → V2_STRUCTURE → DEV_PORTAL_SCREENS → DENTO_V2_MASTER_PLAN
- **Every route connected (§24):** Sidebar → Route → Page → Hook → API → Service → Model
- **Every mutation needs toast (§24):** `toast.success()` on success, `toast.error()` on failure
- **Three required states (§15):** Loading skeleton, Error banner, Empty state — on EVERY data page
- **React Hook Form + Zod (§8.4):** ALL forms must use `useForm({ resolver: zodResolver(schema) })`
- **RTL-first (§11):** Logical properties only — `ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`
- **WCAG 2.1 AA (§13):** `aria-label` on every icon-only button and unlabeled input

---

## 2. Sprint Overview

```
Sprint 1 ██████████████████████████████████ Days 1-7   P0: Foundation & Data Wiring
Sprint 2 ████████████████                   Days 8-11  P1: Compliance & Integration
Sprint 3 ████████████                       Days 12-14 P2: RTL & Accessibility
Sprint 4 ████                               Day  15    P3: Polish & Edge Cases
Sprint 5 ████████████                       Days 16-18 Testing & Verification
```

### Dependency Graph

```
Sprint 1 (P0)
├── 1.1 Split TenantDetailPage ─────────────────┐
├── 1.2 Create hooks for 6 mock-data pages ──────┤──→ Sprint 2 (P1)
├── 1.3 Refactor 2 inline-fetch pages ──────────┘    ├── 2.1 Error states
│                                                      ├── 2.2 Toast feedback
│                                                      ├── 2.3 RHF+Zod forms
│                                                      └── 2.4 Fix PlatformUsers
│                                                           │
│                                                           ▼
│                                                     Sprint 3 (P2) ──→ Sprint 4 (P3)
│                                                     ├── 3.1 RTL fixes       ├── 4.1-4.5 Polish
│                                                     ├── 3.2 Aria labels     │
│                                                     └── 3.3 Empty states    ▼
│                                                                        Sprint 5 (Testing)
```

---

## 3. Sprint 1 — P0: Foundation & Data Wiring (Days 1–7)

> **Goal:** Decompose oversized components, replace ALL mock/hardcoded data with real API-connected React Query hooks, eliminate all inline `fetch()` calls.
>
> **BUILD_RULES refs:** §8.3 (React Query hooks), §8.1 (feature folder structure), §15 (loading/error/empty), §24 (integration rules)
> **IMPLEMENTATION_ROADMAP ref:** Phase 2 Weeks 5–7 — Dev Portal fully functional

---

### Task 1.1 — Split TenantDetailPage (Day 1–2)

**Problem:** `TenantDetailPage.tsx` is 2,402 lines — far exceeds BUILD_RULES file-size limits. Contains 9 inline tab components, mock data objects, local type definitions.

**Target structure** (per V2_STRUCTURE §14 feature folder pattern):

```
features/tenants/
├── pages/
│   ├── index.ts                        (barrel export)
│   ├── TenantsPage.tsx                  (existing — modify later in 1.2)
│   └── TenantDetailPage.tsx            (refactored — ~150 lines orchestrator)
├── components/
│   ├── TenantHeader.tsx                 (~80 lines)
│   ├── TenantOverviewTab.tsx            (~120 lines)
│   ├── TenantUsersTab.tsx               (~150 lines)
│   ├── TenantModulesTab.tsx             (~100 lines)
│   ├── TenantWorkflowsTab.tsx           (~100 lines)
│   ├── TenantSupportTab.tsx             (~120 lines)
│   ├── TenantDatabaseTab.tsx            (~150 lines)
│   ├── TenantBillingTab.tsx             (~100 lines)
│   └── TenantSettingsTab.tsx            (~80 lines)
├── hooks/
│   └── useTenants.ts                    (created in Task 1.2)
└── types/
    └── tenant-detail.types.ts           (~60 lines — local UI types NOT in @dento/shared)
```

**Step-by-step:**

| Step | Action                                                 | Details                                                                                                                                                                                                                                             |
| :--- | :----------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Create `features/tenants/types/tenant-detail.types.ts` | Extract all `interface` / `type` definitions currently at the top of TenantDetailPage. Keep only UI-presentational types here (tab enums, tab component props). Domain types (`Tenant`, `TenantUser`, etc.) should reference `@dento/shared` types. |
| 2    | Create `features/tenants/components/TenantHeader.tsx`  | Extract the header section (tenant name, status badge, action buttons). Props: `{ tenant: Tenant; onStatusChange: () => void }`.                                                                                                                    |
| 3    | Create 7 tab components                                | Extract each `case 'overview':` / `case 'users':` / etc. JSX block into its own component. Each tab receives: `{ tenantId: string; data: TabSpecificData }`. Every tab must handle its own loading/error/empty states via the hook from Task 1.2.   |
| 4    | Refactor `TenantDetailPage.tsx`                        | Reduce to a ~150-line orchestrator: `useParams()` → `useTenantDetail(id)` → `<TenantHeader/>` + `<Tabs>` rendering the 7 tab components. Use React `lazy()` + `Suspense` for tab code-splitting if tabs are heavy.                                  |
| 5    | Update barrel export                                   | `features/tenants/pages/index.ts` must re-export `TenantDetailPage` and `TenantsPage`.                                                                                                                                                              |

**Key patterns to follow:**

```tsx
// TenantDetailPage.tsx — target structure (BUILD_RULES §8.1 + §15)
import { useTenantDetail } from '../hooks/useTenants';
import { TableSkeleton } from '@dento/ui';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner';

export default function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { data: tenant, isLoading, isError, error, refetch } = useTenantDetail(tenantId!);
  const [activeTab, setActiveTab] = useState<TenantTab>('overview');

  if (isLoading) return <TableSkeleton columns={1} rows={6} />;
  if (isError) return <QueryErrorBanner message={error.message} onRetry={refetch} />;
  if (!tenant) return <EmptyState icon={Building2} title="Tenant not found" />;

  return (
    <div>
      <TenantHeader tenant={tenant} />
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Tab triggers */}
        <TabsContent value="overview">
          <TenantOverviewTab tenant={tenant} />
        </TabsContent>
        {/* ... */}
      </Tabs>
    </div>
  );
}
```

**Verification (BUILD_RULES §19):**

- [ ] No file exceeds 400 lines
- [ ] `pnpm tsc --noEmit` passes in `apps/developer`
- [ ] Every extracted component is used in exactly one import
- [ ] TenantDetailPage.tsx ≤ 150 lines

---

### Task 1.2 — Create React Query Hooks for 6 Mock-Data Pages (Days 2–5)

**Problem:** 6 pages display hardcoded mock arrays instead of real API data. Backend routes already exist for ALL of these.

**Backend route verification** (from `apps/api/src/server.ts` and `platform/routes/`):

| Page             | Required API Endpoint                               | Backend Route File                                       | Status |
| :--------------- | :-------------------------------------------------- | :------------------------------------------------------- | :----- |
| DashboardPage    | `GET /api/platform/dashboard/stats`                 | ❌ **MISSING** — needs new route                         | Create |
| TenantsPage      | `GET /api/platform/tenants`                         | ❌ **MISSING** — `db-explorer` exists but no tenant list | Create |
| TenantDetailPage | `GET /api/platform/tenants/:id`                     | ❌ **MISSING** — similar gap                             | Create |
| ApiKeysPage      | `GET /api/api-keys`, `GET /api/api-keys/stats`      | ✅ `platform/routes/api-keys/api-keys.route.ts`          | Exists |
| PricingPage      | `GET /api/pricing/plans`, `/coupons`, `/discounts`  | ✅ `platform/routes/pricing/pricing.route.ts`            | Exists |
| WebhooksPage     | `GET /api/webhooks`, `GET /api/webhooks/deliveries` | ✅ `platform/routes/webhooks/webhooks.route.ts`          | Exists |

> **Decision point:** DashboardPage, TenantsPage, and TenantDetailPage need NEW backend routes, or a new `/api/platform/tenants` route file. This is separate backend work. For the frontend, create the hooks with the correct endpoint paths — the hooks will work once the backend routes are added.

#### 1.2.1 — Create `features/dashboard/hooks/useDashboard.ts`

**New file:** `apps/developer/src/features/dashboard/hooks/useDashboard.ts`

```typescript
// Pattern: BUILD_RULES §8.3 — React Query key factory
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';

interface DashboardStats {
  activeTenants: number;
  apiUsage24h: number;
  activeApiKeys: number;
  openTickets: number;
  // Extend with more stats as backend provides
}

interface DashboardStatsResponse {
  success: boolean;
  data: DashboardStats;
}

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: () => apiClient.get<DashboardStatsResponse>('/api/platform/dashboard/stats'),
    select: (res) => res.data,
    refetchInterval: 30_000, // Refresh every 30s for live dashboard
  });
}
```

**Then update `DashboardPage.tsx`:**

- Replace static `stats` array with `useDashboardStats()` hook
- Add loading skeleton, error banner, empty state (BUILD_RULES §15)
- Map `data.activeTenants` → stat card value, etc.

#### 1.2.2 — Create `features/tenants/hooks/useTenants.ts`

**New file:** `apps/developer/src/features/tenants/hooks/useTenants.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import { apiClient } from '../../../lib/api-client.js';
import type { PaginationMeta } from '@dento/shared';

// ── Types ──────────────────────────────────────────────────────────
// Import from @dento/shared once backend schema types are exported.
// For now, define locally and migrate later.

interface TenantListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  plan?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface TenantListResponse {
  success: boolean;
  data: Tenant[];
  meta: PaginationMeta;
}

interface TenantDetailResponse {
  success: boolean;
  data: TenantDetail;
}

// ── Key factory (BUILD_RULES §8.3) ─────────────────────────────────

export const tenantKeys = {
  all: ['tenants'] as const,
  lists: () => [...tenantKeys.all, 'list'] as const,
  list: (filters: TenantListFilters) => [...tenantKeys.lists(), filters] as const,
  details: () => [...tenantKeys.all, 'detail'] as const,
  detail: (id: string) => [...tenantKeys.details(), id] as const,
  // Sub-resources for TenantDetailPage tabs
  users: (id: string) => [...tenantKeys.detail(id), 'users'] as const,
  modules: (id: string) => [...tenantKeys.detail(id), 'modules'] as const,
  workflows: (id: string) => [...tenantKeys.detail(id), 'workflows'] as const,
  support: (id: string) => [...tenantKeys.detail(id), 'support'] as const,
  database: (id: string) => [...tenantKeys.detail(id), 'database'] as const,
  billing: (id: string) => [...tenantKeys.detail(id), 'billing'] as const,
};

// ── Queries ─────────────────────────────────────────────────────────

export function useTenants(filters: TenantListFilters) {
  return useQuery({
    queryKey: tenantKeys.list(filters),
    queryFn: () =>
      apiClient.get<TenantListResponse>('/api/platform/tenants', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({ items: res.data, meta: res.meta }),
  });
}

export function useTenantDetail(id: string) {
  return useQuery({
    queryKey: tenantKeys.detail(id),
    queryFn: () => apiClient.get<TenantDetailResponse>(`/api/platform/tenants/${id}`),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useTenantUsers(tenantId: string) {
  return useQuery({
    queryKey: tenantKeys.users(tenantId),
    queryFn: () => apiClient.get(`/api/platform/tenants/${tenantId}/users`),
    select: (res: any) => res.data,
    enabled: !!tenantId,
  });
}

export function useTenantModules(tenantId: string) {
  return useQuery({
    queryKey: tenantKeys.modules(tenantId),
    queryFn: () => apiClient.get(`/api/platform/tenants/${tenantId}/modules`),
    select: (res: any) => res.data,
    enabled: !!tenantId,
  });
}

// ... similar hooks for workflows, support, database, billing

// ── Mutations ───────────────────────────────────────────────────────

export function useSuspendTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tenantId: string) =>
      apiClient.post(`/api/platform/tenants/${tenantId}/suspend`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantKeys.lists() });
      toast.success('Tenant suspended successfully');
    },
    onError: () => {
      toast.error('Failed to suspend tenant');
    },
  });
}

export function useActivateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tenantId: string) =>
      apiClient.post(`/api/platform/tenants/${tenantId}/activate`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantKeys.lists() });
      toast.success('Tenant activated successfully');
    },
    onError: () => {
      toast.error('Failed to activate tenant');
    },
  });
}
```

#### 1.2.3 — Create `features/api-keys/hooks/useApiKeys.ts`

**New file:** `apps/developer/src/features/api-keys/hooks/useApiKeys.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import { apiClient } from '../../../lib/api-client.js';
import type { ApiKey, ApiKeyFilters, ApiKeyStats } from '@dento/shared';

interface ApiKeyListResponse {
  success: boolean;
  data: ApiKey[];
  meta: PaginationMeta;
}
interface ApiKeyStatsResponse {
  success: boolean;
  data: ApiKeyStats;
}

export const apiKeyKeys = {
  all: ['api-keys'] as const,
  lists: () => [...apiKeyKeys.all, 'list'] as const,
  list: (filters: ApiKeyFilters) => [...apiKeyKeys.lists(), filters] as const,
  stats: () => [...apiKeyKeys.all, 'stats'] as const,
  detail: (id: string) => [...apiKeyKeys.all, 'detail', id] as const,
};

export function useApiKeys(filters: ApiKeyFilters) {
  return useQuery({
    queryKey: apiKeyKeys.list(filters),
    queryFn: () =>
      apiClient.get<ApiKeyListResponse>('/api/api-keys', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({ items: res.data, meta: res.meta }),
  });
}

export function useApiKeyStats() {
  return useQuery({
    queryKey: apiKeyKeys.stats(),
    queryFn: () => apiClient.get<ApiKeyStatsResponse>('/api/api-keys/stats'),
    select: (res) => res.data,
    refetchInterval: 60_000,
  });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateApiKeyInput) => apiClient.post('/api/api-keys', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: apiKeyKeys.all });
      toast.success('API key created');
    },
    onError: () => toast.error('Failed to create API key'),
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => apiClient.post(`/api/api-keys/${keyId}/revoke`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: apiKeyKeys.all });
      toast.success('API key revoked');
    },
    onError: () => toast.error('Failed to revoke API key'),
  });
}

export function useRegenerateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => apiClient.post(`/api/api-keys/${keyId}/regenerate`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: apiKeyKeys.all });
      toast.success('API key regenerated');
    },
    onError: () => toast.error('Failed to regenerate API key'),
  });
}
```

#### 1.2.4 — Create `features/pricing/hooks/usePricing.ts`

**New file:** `apps/developer/src/features/pricing/hooks/usePricing.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import { apiClient } from '../../../lib/api-client.js';
import type { PricingPlan, Coupon, Discount, PaginationMeta } from '@dento/shared';

export const pricingKeys = {
  all: ['pricing'] as const,
  plans: () => [...pricingKeys.all, 'plans'] as const,
  planList: (filters: any) => [...pricingKeys.plans(), filters] as const,
  coupons: () => [...pricingKeys.all, 'coupons'] as const,
  couponList: (filters: any) => [...pricingKeys.coupons(), filters] as const,
  discounts: () => [...pricingKeys.all, 'discounts'] as const,
  discountList: (filters: any) => [...pricingKeys.discounts(), filters] as const,
  stats: () => [...pricingKeys.all, 'stats'] as const,
};

export function usePricingPlans(filters = {}) {
  return useQuery({
    queryKey: pricingKeys.planList(filters),
    queryFn: () =>
      apiClient.get('/api/pricing/plans', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res: any) => ({ items: res.data, meta: res.meta }),
  });
}

export function useCoupons(filters = {}) {
  return useQuery({
    queryKey: pricingKeys.couponList(filters),
    queryFn: () =>
      apiClient.get('/api/pricing/coupons', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res: any) => ({ items: res.data, meta: res.meta }),
  });
}

export function useDiscounts(filters = {}) {
  return useQuery({
    queryKey: pricingKeys.discountList(filters),
    queryFn: () =>
      apiClient.get('/api/pricing/discounts', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res: any) => ({ items: res.data, meta: res.meta }),
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => apiClient.post('/api/pricing/plans', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pricingKeys.plans() });
      toast.success('Pricing plan created');
    },
    onError: () => toast.error('Failed to create pricing plan'),
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: any) => apiClient.put(`/api/pricing/plans/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pricingKeys.plans() });
      toast.success('Pricing plan updated');
    },
    onError: () => toast.error('Failed to update pricing plan'),
  });
}
```

#### 1.2.5 — Create `features/webhooks/hooks/useWebhooks.ts`

**New file:** `apps/developer/src/features/webhooks/hooks/useWebhooks.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import { apiClient } from '../../../lib/api-client.js';

export const webhookKeys = {
  all: ['webhooks'] as const,
  lists: () => [...webhookKeys.all, 'list'] as const,
  list: (filters: any) => [...webhookKeys.lists(), filters] as const,
  deliveries: () => [...webhookKeys.all, 'deliveries'] as const,
  deliveryList: (filters: any) => [...webhookKeys.deliveries(), filters] as const,
  stats: () => [...webhookKeys.all, 'stats'] as const,
};

export function useWebhooks(filters = {}) {
  return useQuery({
    queryKey: webhookKeys.list(filters),
    queryFn: () =>
      apiClient.get('/api/webhooks', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res: any) => ({ items: res.data, meta: res.meta }),
  });
}

export function useWebhookDeliveries(filters = {}) {
  return useQuery({
    queryKey: webhookKeys.deliveryList(filters),
    queryFn: () =>
      apiClient.get('/api/webhooks/deliveries', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res: any) => ({ items: res.data, meta: res.meta }),
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => apiClient.post('/api/webhooks', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: webhookKeys.all });
      toast.success('Webhook created');
    },
    onError: () => toast.error('Failed to create webhook'),
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (webhookId: string) => apiClient.delete(`/api/webhooks/${webhookId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: webhookKeys.all });
      toast.success('Webhook deleted');
    },
    onError: () => toast.error('Failed to delete webhook'),
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: (webhookId: string) => apiClient.post(`/api/webhooks/${webhookId}/test`, {}),
    onSuccess: () => toast.success('Test webhook sent'),
    onError: () => toast.error('Failed to send test webhook'),
  });
}
```

#### 1.2.6 — Update All 6 Mock-Data Pages

For each page, the refactoring follows the same pattern:

| Page File              | Remove                                       | Add Import                                      | Wire Up                                                    |
| :--------------------- | :------------------------------------------- | :---------------------------------------------- | :--------------------------------------------------------- |
| `DashboardPage.tsx`    | Static `stats` array with `'—'` values       | `useDashboardStats`                             | Map `data.activeTenants` → stat card `value`               |
| `TenantsPage.tsx`      | `mockTenants[7]` array + local types         | `useTenants`                                    | `const { data, isLoading, isError } = useTenants(filters)` |
| `TenantDetailPage.tsx` | 9 mock objects + local types                 | `useTenantDetail` + 6 sub-hooks                 | Each tab component calls its own hook                      |
| `ApiKeysPage.tsx`      | `mockApiKeys[6]` array + stats + local types | `useApiKeys`, `useApiKeyStats`                  | Replace inline data render with hook data                  |
| `PricingPage.tsx`      | 3 mock arrays + stats + local types          | `usePricingPlans`, `useCoupons`, `useDiscounts` | Replace inline data render with hook data                  |
| `WebhooksPage.tsx`     | 2 mock arrays + stats + local types          | `useWebhooks`, `useWebhookDeliveries`           | Replace inline data render with hook data                  |

**Standard refactoring pattern per page (BUILD_RULES §15):**

```tsx
// BEFORE (anti-pattern — mock data)
const mockData = [{ id: '1', ... }];
export default function SomePage() {
  return <div>{mockData.map(...)}</div>;
}

// AFTER (compliant — BUILD_RULES §8.3 + §15)
import { useFeatureList } from '../hooks/useFeature';
import { TableSkeleton } from '@dento/ui';  // or custom skeleton
import { QueryErrorBanner } from '../../../components/QueryErrorBanner';
import { EmptyState } from '../../../components/EmptyState'; // create if missing

export default function SomePage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20 });
  const { data, isLoading, isError, error, refetch } = useFeatureList(filters);

  if (isLoading) return <TableSkeleton columns={5} rows={10} />;
  if (isError) return <QueryErrorBanner message={error.message} onRetry={refetch} />;
  if (!data?.items?.length) return <EmptyState icon={Package} title="No items yet" />;

  return (
    <div>
      {/* Header with filters */}
      {/* Data table / cards */}
    </div>
  );
}
```

---

### Task 1.3 — Refactor 2 Inline-Fetch Pages to React Query (Days 5–6)

**Problem:** `ModulesPage.tsx` and `ApiCatalogPage.tsx` use raw `fetch()` with manual state management instead of `apiClient` + React Query hooks.

#### 1.3.1 — ModulesPage Refactoring

**Current anti-pattern** (in `ModulesPage.tsx`):

```typescript
// ❌ Raw fetch — no auth headers, no caching, manual state
const [modules, setModules] = useState([]);
const [loading, setLoading] = useState(true);
useEffect(() => {
  fetchData();
}, [search, statusFilter]);
const fetchData = async () => {
  const res = await fetch(`${API_BASE_URL}/api/platform/modules?${params}`);
  // ...
};
```

**Step 1 — Create `features/modules/hooks/useModules.ts`:**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import { apiClient } from '../../../lib/api-client.js';

interface ModuleFilters {
  search?: string;
  status?: string;
  type?: string;
}

export const moduleKeys = {
  all: ['modules'] as const,
  lists: () => [...moduleKeys.all, 'list'] as const,
  list: (filters: ModuleFilters) => [...moduleKeys.lists(), filters] as const,
  stats: () => [...moduleKeys.all, 'stats'] as const,
  detail: (id: string) => [...moduleKeys.all, 'detail', id] as const,
};

export function useModules(filters: ModuleFilters) {
  return useQuery({
    queryKey: moduleKeys.list(filters),
    queryFn: () =>
      apiClient.get('/api/platform/modules', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res: any) => ({ modules: res.data?.modules ?? res.data, stats: res.data?.stats }),
  });
}

export function useModuleStats() {
  return useQuery({
    queryKey: moduleKeys.stats(),
    queryFn: () => apiClient.get('/api/platform/modules/stats'),
    select: (res: any) => res.data,
    refetchInterval: 60_000,
  });
}

export function useToggleModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, enabled }: { moduleId: string; enabled: boolean }) =>
      apiClient.patch(`/api/platform/modules/${moduleId}`, { enabled }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: moduleKeys.all });
      toast.success('Module updated');
    },
    onError: () => toast.error('Failed to update module'),
  });
}
```

**Step 2 — Refactor `ModulesPage.tsx`:**

- Remove `useState` for `modules`, `stats`, `loading`
- Remove `useEffect` and `fetchData` function
- Remove `API_BASE_URL` import
- Add `useModules(filters)` and `useModuleStats()`
- Add standard loading/error/empty pattern
- Wire toggle button to `useToggleModule()` mutation

#### 1.3.2 — ApiCatalogPage Refactoring

**Current anti-pattern** (in `ApiCatalogPage.tsx`):

```typescript
// ❌ Raw fetch to /api/openapi.json
useEffect(() => {
  fetch('/api/openapi.json')
    .then((res) => res.json())
    .then(setSpec);
}, []);
```

**Step 1 — Create `features/api-catalog/hooks/useApiCatalog.ts`:**

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';

export const apiCatalogKeys = {
  all: ['api-catalog'] as const,
  spec: () => [...apiCatalogKeys.all, 'spec'] as const,
};

export function useOpenApiSpec() {
  return useQuery({
    queryKey: apiCatalogKeys.spec(),
    queryFn: () => apiClient.get('/api/openapi.json'),
    staleTime: 5 * 60 * 1000, // OpenAPI spec is stable — cache 5 min
  });
}
```

**Step 2 — Refactor `ApiCatalogPage.tsx`:**

- Remove `useState`/`useEffect`/`fetch`
- Use `useOpenApiSpec()` hook
- Add loading skeleton, error banner

---

### Task 1.3.3 — Create Shared EmptyState Component (Day 6)

**Check:** Does `apps/developer/src/components/EmptyState.tsx` exist?

If not, create it per BUILD_RULES §15:

**New file:** `apps/developer/src/components/EmptyState.tsx`

```tsx
import { Button } from '@dento/ui';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center" role="status">
      <div className="mb-4 rounded-full bg-muted p-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
```

**Sprint 1 Deliverables Summary:**

| #         | Deliverable                   | New Files                   | Modified Files      | Est. Lines |
| :-------- | :---------------------------- | :-------------------------- | :------------------ | :--------- |
| 1.1       | TenantDetailPage split        | 9 components + 1 types file | 1 page restructured | ~1,000     |
| 1.2       | 5 new hook files              | 5 hook files                | 6 page files        | ~800       |
| 1.3       | 2 new hook files + EmptyState | 3 files                     | 2 page files        | ~300       |
| **Total** |                               | **~18 files**               | **~9 files**        | **~2,100** |

---

## 4. Sprint 2 — P1: Compliance & Integration (Days 8–11)

> **Goal:** Add missing error states, toast feedback, convert forms to RHF+Zod, fix mutation patterns.
>
> **BUILD_RULES refs:** §15 (loading/error/empty), §24 (toast on every mutation), §8.4 (RHF+Zod), §17 (auth patterns)

---

### Task 2.1 — Add Missing Error States to 5 Pages (Day 8)

**Problem:** 5 pages that already use React Query hooks are missing error handling:

| Page                    | Hook                     | Current Error Handling  | Fix                                         |
| :---------------------- | :----------------------- | :---------------------- | :------------------------------------------ |
| `PlatformUsersPage.tsx` | `usePlatformUsers`       | ❌ None                 | Add `isError` check with `QueryErrorBanner` |
| `SupportPage.tsx`       | `useSupport`             | ❌ None                 | Add `isError` check with `QueryErrorBanner` |
| `BackupsPage.tsx`       | `useBackups`             | ❌ None                 | Add `isError` check with `QueryErrorBanner` |
| `DomainsPage.tsx`       | `useDomains`             | ❌ None                 | Add `isError` check with `QueryErrorBanner` |
| `ModulesPage.tsx`       | (post-Sprint 1 refactor) | ❌ `console.error` only | Now handled by React Query                  |

**Pattern to apply to each page:**

```tsx
// Add after existing loading check, before data render
import { QueryErrorBanner } from '../../../components/QueryErrorBanner';

// In the component body:
const { data, isLoading, isError, error, refetch } = useFeatureHook(filters);

if (isLoading) return <TableSkeleton columns={...} rows={...} />;
if (isError) return <QueryErrorBanner message={error.message} onRetry={refetch} />;
// ... existing render
```

**Per-page specifics:**

1. **PlatformUsersPage.tsx** — Uses `usePlatformUsers()`. Add error check after the loading skeleton block. Also check `inviteUsers` mutation for error handling (see Task 2.2).

2. **SupportPage.tsx** — Uses `useSupport()`. Note: `SessionsTab.tsx` sub-component may also need error state. Check if the hook is called at the page level or within the tab.

3. **BackupsPage.tsx** — Uses `useBackups()`. The `BackupConfigPanel.tsx` sub-component may handle its own data — verify if panel needs independent error handling.

4. **DomainsPage.tsx** — Uses `useDomains()`. The `AddDomainDialog.tsx` and `DomainDetailSheet.tsx` sub-components should show inline errors on mutation failure (via `toast.error`), not the page-level error banner.

5. **ModulesPage.tsx** — After Sprint 1 refactor to `useModules()`, error state will be part of the standard pattern. No additional work if Sprint 1 was done correctly.

---

### Task 2.2 — Add Missing Toast Feedback on Mutations (Day 9)

**Problem:** 8 pages perform mutations without `toast.success` / `toast.error` feedback.

**BUILD_RULES §24:** "All mutations need `toast.success`/`toast.error`."

| Page                   | Mutation        | Current     | Required                                                                            |
| :--------------------- | :-------------- | :---------- | :---------------------------------------------------------------------------------- |
| `BillingPage.tsx`      | `sendReminder`  | ❌ No toast | `toast.success('Payment reminder sent')` / `toast.error('Failed to send reminder')` |
| `FeatureFlagsPage.tsx` | create flag     | ❌ No toast | `toast.success('Feature flag created')`                                             |
| `FeatureFlagsPage.tsx` | update flag     | ❌ No toast | `toast.success('Feature flag updated')`                                             |
| `FeatureFlagsPage.tsx` | toggle flag     | ❌ No toast | `toast.success('Feature flag toggled')`                                             |
| `UserSessionsPage.tsx` | `revokeSession` | ❌ No toast | `toast.success('Session revoked')` / `toast.error('Failed to revoke session')`      |
| `DeploymentsPage.tsx`  | `rollback`      | ❌ No toast | `toast.success('Rollback initiated')`                                               |
| `ErrorListPage.tsx`    | resolve error   | ❌ No toast | `toast.success('Error resolved')`                                                   |
| `ErrorListPage.tsx`    | unresolve error | ❌ No toast | `toast.success('Error unresolved')`                                                 |

**Two approaches depending on where mutations are defined:**

**Approach A — Toast in hook (preferred):**
If the mutation is in a hook file, add toast there:

```typescript
// In the hook file
export function useSendReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ...,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.invoices() });
      toast.success('Payment reminder sent');   // ✅ Add
    },
    onError: () => {
      toast.error('Failed to send reminder');    // ✅ Add
    },
  });
}
```

**Approach B — Toast in page (if mutation is inline):**
If the page calls `apiClient` directly without a custom hook, add toast at callsite:

```typescript
try {
  await apiClient.post(`/api/...`);
  toast.success('Action completed');
} catch {
  toast.error('Action failed');
}
```

**File-by-file action plan:**

1. **BillingPage.tsx** → Check `useBilling.ts` — `useSendReminder` hook already has toast in the hook file ✅. **Verify** the page actually calls this hook (not a direct apiClient call).

2. **FeatureFlagsPage.tsx** → Check `useFeatureFlags.ts` — are `useCreateFlag`, `useUpdateFlag`, `useToggleFlag` mutations defined? If so, add `toast` calls in hook. If mutations are inline in the page, move them to the hook file first.

3. **UserSessionsPage.tsx** → Check `useUserSessions.ts` — is `useRevokeSession` defined? Add toast.

4. **DeploymentsPage.tsx** → Check `useDeployments.ts` — is rollback mutation defined? Add toast.

5. **ErrorListPage.tsx** → Check `useResolveError.ts` — resolve/unresolve mutations should have toast.

---

### Task 2.3 — Convert 3 Forms to RHF + Zod (Days 9–10)

**Problem:** 3 forms use raw `useState` instead of React Hook Form + Zod validation.

**BUILD_RULES §8.4:** All forms must use `useForm({ resolver: zodResolver(schema) })` with schemas from `@dento/shared`.

#### 2.3.1 — DevLoginPage.tsx

**Current anti-pattern:**

```tsx
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const handleSubmit = async (e) => {
  e.preventDefault(); /* raw apiClient.post */
};
```

**Refactor to:**

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@dento/shared';
// loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) })

export default function DevLoginPage() {
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/api/auth/login', values);
      setAuth(res.data.user, res.data.accessToken);
      navigate('/');
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit}>
      <Input
        {...form.register('email')}
        type="email"
        aria-label="Email address"
        error={form.formState.errors.email?.message}
      />
      <Input
        {...form.register('password')}
        type="password"
        aria-label="Password"
        error={form.formState.errors.password?.message}
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
```

**Shared schema check:** Verify `loginSchema` exists in `packages/shared/src/schemas/auth.schema.ts`. If not, create it.

#### 2.3.2 — AcceptInvitePage.tsx

**Current:** Raw `useState` for form fields (password, confirmPassword).

**Refactor to:** `useForm<AcceptInviteInput>({ resolver: zodResolver(acceptInviteSchema) })`

**Shared schema needed:**

```typescript
// packages/shared/src/schemas/platform-user.schema.ts (or auth.schema.ts)
export const acceptInviteSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
```

#### 2.3.3 — PlatformUsersPage.tsx (Invite Form)

**Current:** Raw `inviteForm` state object with `useState`.

**Refactor to:** Extract invite form into a `<InviteUserDialog>` component with RHF+Zod.

**Shared schema needed:**

```typescript
// packages/shared/src/schemas/platform-user.schema.ts
export const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['platform_admin', 'platform_viewer']),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});
```

---

### Task 2.4 — Fix PlatformUsersPage Mutation Pattern (Day 10)

**Problem:** `PlatformUsersPage.tsx` uses `window.location.reload()` after suspend/activate actions instead of React Query cache invalidation.

**Current anti-pattern:**

```typescript
const handleSuspend = async (userId: string) => {
  await apiClient.post(`/api/platform/users/${userId}/suspend`);
  window.location.reload(); // ❌ Full page reload
};
```

**Refactor:**

```typescript
// In use-platform-users.ts hook:
export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiClient.post(`/api/platform/users/${userId}/suspend`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformUserKeys.all });
      toast.success('User suspended');
    },
    onError: () => toast.error('Failed to suspend user'),
  });
}

export function useActivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiClient.post(`/api/platform/users/${userId}/activate`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformUserKeys.all });
      toast.success('User activated');
    },
    onError: () => toast.error('Failed to activate user'),
  });
}

// In PlatformUsersPage.tsx:
const suspendUser = useSuspendUser();
const activateUser = useActivateUser();
// Button onClick: () => suspendUser.mutate(userId)
```

**Sprint 2 Deliverables Summary:**

| #         | Deliverable             | Files Modified                    | Est. Lines Changed |
| :-------- | :---------------------- | :-------------------------------- | :----------------- |
| 2.1       | Error states on 5 pages | 5 page files                      | ~50                |
| 2.2       | Toast on 8 mutations    | ~5 hook files + ~3 page files     | ~80                |
| 2.3       | 3 forms → RHF+Zod       | 3 page files + 1–2 shared schemas | ~200               |
| 2.4       | PlatformUsers mutations | 1 hook file + 1 page file         | ~60                |
| **Total** |                         | **~18 files**                     | **~390**           |

---

## 5. Sprint 3 — P2: RTL & Accessibility (Days 12–14)

> **Goal:** Fix all RTL violations, add WCAG-required aria labels, add missing empty states.
>
> **BUILD_RULES refs:** §11 (RTL — complete mapping table), §13 (Accessibility — WCAG 2.1 AA), §15 (empty states)

---

### Task 3.1 — Fix 24 RTL Violations (Day 12)

**BUILD_RULES §11 — Logical Property Mapping:**

| ❌ Physical (Remove) | ✅ Logical (Replace With) |
| :------------------- | :------------------------ |
| `ml-`                | `ms-`                     |
| `mr-`                | `me-`                     |
| `pl-`                | `ps-`                     |
| `pr-`                | `pe-`                     |
| `left-`              | `start-`                  |
| `right-`             | `end-`                    |
| `text-left`          | `text-start`              |
| `text-right`         | `text-end`                |
| `border-l`           | `border-s`                |
| `border-r`           | `border-e`                |
| `rounded-l`          | `rounded-s`               |
| `rounded-r`          | `rounded-e`               |

**File-by-file fix list:**

| #   | File                                                       | Violations | Specific Fixes                                                                   |
| :-- | :--------------------------------------------------------- | :--------- | :------------------------------------------------------------------------------- |
| 1   | `features/support/pages/SupportPage.tsx`                   | 6          | `mr-2`→`me-2` (×3), `ml-auto`→`ms-auto`, `pl-4`→`ps-4`, `text-left`→`text-start` |
| 2   | `features/platform-users/pages/PlatformUsersPage.tsx`      | 5          | `mr-2`→`me-2` (×2), `ml-2`→`ms-2`, `pl-3`→`ps-3`, `text-right`→`text-end`        |
| 3   | `features/backups/components/BackupConfigPanel.tsx`        | 3          | `mr-2`→`me-2`, `ml-auto`→`ms-auto`, `pl-4`→`ps-4`                                |
| 4   | `features/domains/pages/DomainsPage.tsx`                   | 3          | `mr-2`→`me-2`, `ml-2`→`ms-2`, `text-left`→`text-start`                           |
| 5   | `features/user-sessions/components/SessionDetailSheet.tsx` | 2          | `mr-2`→`me-2`, `ml-auto`→`ms-auto`                                               |
| 6   | `features/domains/components/DomainDetailSheet.tsx`        | 2          | `mr-1`→`me-1`, `text-right`→`text-end`                                           |
| 7   | `features/backups/pages/BackupsPage.tsx`                   | 3          | `mr-2`→`me-2` (×2), `ml-auto`→`ms-auto`                                          |

**Total: 24 violations across 7 files.**

**Execution approach:** Use find-and-replace within each file. Each replacement is a simple class name swap.

**Validation command:**

```bash
cd apps/developer
grep -rn "mr-\|ml-\|pl-\|pr-\|text-left\|text-right\|border-l\|border-r\|rounded-l\|rounded-r\|left-\|right-" src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" | grep -v ".test."
```

After fixes, this command should return **zero results** for non-compliant physical direction classes.

---

### Task 3.2 — Add Aria Labels (Day 13)

**BUILD_RULES §13:** "Every icon-only button must have `aria-label`." "Every unlabeled input must have `aria-label`."

#### 3.2.1 — Icon-Only Buttons (6+ pages)

**Pattern to identify:** `<Button>` or `<button>` containing ONLY an icon with no visible text.

```tsx
// ❌ Before
<Button variant="ghost" size="icon" onClick={onDelete}>
  <Trash2 className="h-4 w-4" />
</Button>

// ✅ After
<Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete item">
  <Trash2 className="h-4 w-4" />
</Button>
```

**Pages requiring icon-button aria-labels:**

| Page                                          | Buttons to Label                        |
| :-------------------------------------------- | :-------------------------------------- |
| `ApiKeysPage.tsx`                             | Copy key, Regenerate, Revoke, Show/Hide |
| `WebhooksPage.tsx`                            | Edit, Delete, Test webhook              |
| `DeploymentsPage.tsx`                         | Rollback, View details                  |
| `BillingPage.tsx`                             | Send reminder, View invoice             |
| `MonitoringPage.tsx` (all sub-pages)          | Resolve error, View details             |
| `monitoring/components/RecentErrorsTable.tsx` | View error detail, Resolve              |

#### 3.2.2 — Search Inputs (~10 pages)

**Pattern to identify:** `<Input>` with `placeholder="Search..."` but no `<Label>` wrapping or associated via `htmlFor`.

```tsx
// ❌ Before
<Input placeholder="Search tenants..." value={search} onChange={...} />

// ✅ After
<Input placeholder="Search tenants..." value={search} onChange={...} aria-label="Search tenants" />
```

**Pages requiring search input aria-labels:**

| Page                    | Fix                                 |
| :---------------------- | :---------------------------------- |
| `TenantsPage.tsx`       | `aria-label="Search tenants"`       |
| `PlatformUsersPage.tsx` | `aria-label="Search users"`         |
| `ApiKeysPage.tsx`       | `aria-label="Search API keys"`      |
| `WebhooksPage.tsx`      | `aria-label="Search webhooks"`      |
| `PricingPage.tsx`       | `aria-label="Search pricing plans"` |
| `BillingPage.tsx`       | `aria-label="Search invoices"`      |
| `AuditLogsPage.tsx`     | `aria-label="Search audit logs"`    |
| `SystemLogsPage.tsx`    | `aria-label="Search system logs"`   |
| `FeatureFlagsPage.tsx`  | `aria-label="Search feature flags"` |
| `CustomFieldsPage.tsx`  | `aria-label="Search custom fields"` |

---

### Task 3.3 — Add Missing Empty States (Day 14)

**Problem:** 4 pages don't show an empty state when data returns an empty array.

| Page                             | Empty State Needed                | Icon         | Title                | Description                                                             |
| :------------------------------- | :-------------------------------- | :----------- | :------------------- | :---------------------------------------------------------------------- |
| `StoragePage.tsx`                | When no tenants have storage data | `HardDrive`  | "No storage data"    | "Storage statistics will appear once tenants start using file uploads." |
| `MonitoringPage.tsx`             | When no monitoring stats exist    | `Activity`   | "No monitoring data" | "Monitoring metrics will populate once the system starts tracking."     |
| `HealthStatusPage.tsx`           | When no component statuses exist  | `HeartPulse` | "No health checks"   | "Health check data will appear once monitoring is configured."          |
| `BillingPage.tsx` (overview tab) | When no billing data exists       | `CreditCard` | "No billing data"    | "Billing information will appear once tenants subscribe."               |

**Pattern (using EmptyState component from Task 1.3.3):**

```tsx
if (!data?.items?.length) {
  return (
    <EmptyState
      icon={HardDrive}
      title="No storage data"
      description="Storage statistics will appear once tenants start using file uploads."
    />
  );
}
```

**Sprint 3 Deliverables Summary:**

| #         | Deliverable               | Files Modified | Est. Changes         |
| :-------- | :------------------------ | :------------- | :------------------- |
| 3.1       | RTL fixes (24 violations) | 7 files        | 24 class swaps       |
| 3.2       | Aria labels               | ~16 files      | ~35 attributes added |
| 3.3       | Empty states              | 4 files        | ~40 lines            |
| **Total** |                           | **~27 files**  | **~100 changes**     |

---

## 6. Sprint 4 — P3: Polish & Edge Cases (Day 15)

> **Goal:** Minor UX and standards compliance fixes.
>
> **BUILD_RULES refs:** §13 (a11y), §9 (interactions), §8.1 (state management)

---

### Task 4.1 — BillingPage Tab Accessibility

**Problem:** Tab panels may not have proper `role="tabpanel"` and `aria-labelledby` attributes.

**Fix:** If using Radix UI `<Tabs>`, these are automatic. Verify and add if using custom tabs.

```tsx
// Verify tabs use @radix-ui/react-tabs (via @dento/ui)
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="invoices">Invoices</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">...</TabsContent>
  <TabsContent value="invoices">...</TabsContent>
</Tabs>
```

If custom tabs, add: `role="tablist"` on container, `role="tab"` + `aria-selected` on triggers, `role="tabpanel"` + `aria-labelledby` on content.

---

### Task 4.2 — SettingsPage Null Guard

**Problem:** `SettingsPage.tsx` may crash if settings data is null/undefined when accessing nested properties.

**Fix:** Add optional chaining on all `settings.` property accesses:

```tsx
// ❌ Before
<p>{settings.clinicName}</p>

// ✅ After
<p>{settings?.clinicName ?? '—'}</p>
```

Also ensure the page shows a loading state while `useSystemSettings()` is loading:

```tsx
const { data: settings, isLoading, isError, error, refetch } = useSystemSettings();
if (isLoading) return <SettingsSkeleton />;
if (isError) return <QueryErrorBanner message={error.message} onRetry={refetch} />;
```

---

### Task 4.3 — MonitoringOverview Stat Cards

**Problem:** Stat cards may show `undefined` or `NaN` when stats data hasn't loaded.

**Fix:** Add fallback values:

```tsx
<p className="text-2xl font-bold">{stats?.totalErrors?.toLocaleString() ?? '—'}</p>
```

---

### Task 4.4 — Sidebar Store Reactivity

**Problem:** `AppSidebar.tsx` (or `Sidebar.tsx`) uses `useAuthStore.getState()` instead of the hook, causing the sidebar to not reactively update when permissions change.

**Fix:**

```tsx
// ❌ Before (non-reactive)
const user = useAuthStore.getState().user;

// ✅ After (reactive)
const user = useAuthStore((state) => state.user);
```

This ensures the sidebar re-renders when the user logs in/out or permissions change.

---

### Task 4.5 — HealthStatusPage Native Button

**Problem:** Uses a native `<button>` instead of the `<Button>` component from `@dento/ui`, breaking consistent styling.

**Fix:**

```tsx
// ❌ Before
<button className="..." onClick={...}>Refresh Status</button>

// ✅ After
import { Button } from '@dento/ui';
<Button variant="outline" onClick={...}>Refresh Status</Button>
```

**Sprint 4 Deliverables Summary:**

| #         | Deliverable                | Files Modified    | Est. Changes  |
| :-------- | :------------------------- | :---------------- | :------------ |
| 4.1       | BillingPage tab a11y       | 1 file            | ~10 lines     |
| 4.2       | SettingsPage null guard    | 1 file + sub-tabs | ~20 lines     |
| 4.3       | Monitoring stat fallbacks  | 1 file            | ~10 lines     |
| 4.4       | Sidebar reactivity         | 1–2 files         | ~5 lines      |
| 4.5       | HealthStatus native button | 1 file            | ~3 lines      |
| **Total** |                            | **~6 files**      | **~48 lines** |

---

## 7. Sprint 5 — Testing & Verification (Days 16–18)

> **Goal:** Write tests for all new hooks, run full build verification, compliance scan.
>
> **BUILD_RULES refs:** §18 (Testing — Vitest + MSW + Testing Library), §19 (Build verification checklist), §28 (Compliance scan)

---

### Task 5.1 — Write Hook Tests for New Hooks (Days 16–17)

**Existing tested hooks for reference pattern:**

| Hook                 | Test File                    | Status |
| :------------------- | :--------------------------- | :----- |
| `useAuditLogs`       | `useAuditLogs.test.ts`       | ✅     |
| `useBilling`         | `useBilling.test.ts`         | ✅     |
| `useCustomFields`    | `useCustomFields.test.ts`    | ✅     |
| `useDeployments`     | `useDeployments.test.ts`     | ✅     |
| `useFeatureFlags`    | `useFeatureFlags.test.ts`    | ✅     |
| `useErrorLogs`       | `useErrorLogs.test.ts`       | ✅     |
| `useMonitoringStats` | `useMonitoringStats.test.ts` | ✅     |
| `useResolveError`    | `useResolveError.test.ts`    | ✅     |
| `useSystemLogs`      | `useSystemLogs.test.ts`      | ✅     |
| `useStorageStats`    | `useStorageStats.test.ts`    | ✅     |
| `useSystemSettings`  | `useSystemSettings.test.ts`  | ✅     |
| `useUserSessions`    | `useUserSessions.test.ts`    | ✅     |

**New hooks to test (from Sprint 1):**

| New Hook        | Test File to Create     | Test Cases                                                                                          |
| :-------------- | :---------------------- | :-------------------------------------------------------------------------------------------------- |
| `useDashboard`  | `useDashboard.test.ts`  | stats query success, stats query error, refetch interval                                            |
| `useTenants`    | `useTenants.test.ts`    | list query, detail query, sub-resource queries, suspend mutation + toast, activate mutation + toast |
| `useApiKeys`    | `useApiKeys.test.ts`    | list query, stats query, create mutation + toast, revoke mutation + toast, regenerate + toast       |
| `usePricing`    | `usePricing.test.ts`    | plans query, coupons query, discounts query, create plan mutation + toast                           |
| `useWebhooks`   | `useWebhooks.test.ts`   | list query, deliveries query, create mutation + toast, delete + toast, test webhook + toast         |
| `useModules`    | `useModules.test.ts`    | list query with filters, stats query, toggle mutation + toast                                       |
| `useApiCatalog` | `useApiCatalog.test.ts` | spec query, staleTime config                                                                        |

**Test pattern (from existing tests — BUILD_RULES §18):**

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { useFeatureList } from './useFeature';

const server = setupServer(
  http.get('*/api/platform/feature', () =>
    HttpResponse.json({
      success: true,
      data: [{ id: '1', name: 'Test' }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useFeatureList', () => {
  it('fetches and selects data correctly', async () => {
    const { result } = renderHook(() => useFeatureList({}), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
  });

  it('handles fetch error', async () => {
    server.use(http.get('*/api/platform/feature', () => HttpResponse.error()));
    const { result } = renderHook(() => useFeatureList({}), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

**Also test mutation toast calls:**

```typescript
import { toast } from '@dento/ui';
vi.mock('@dento/ui', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

it('shows success toast on mutation', async () => {
  const { result } = renderHook(() => useCreateFeature(), { wrapper });
  await act(() => result.current.mutateAsync({ name: 'test' }));
  expect(toast.success).toHaveBeenCalledWith('Feature created');
});
```

---

### Task 5.2 — Build Verification Checklist (Day 17)

**BUILD_RULES §19 — 6-Step Checklist:**

```bash
# Step 1: TypeScript compilation
cd apps/developer && pnpm tsc --noEmit

# Step 2: Lint
pnpm lint

# Step 3: Tests
pnpm test --run

# Step 4: Build
pnpm build

# Step 5: RTL scan (no physical direction classes)
grep -rn "mr-\|ml-\|pl-\|pr-\|text-left\|text-right\|border-l\|border-r" src/ --include="*.tsx" | wc -l
# Expected: 0

# Step 6: Accessibility check
npx eslint --rule 'jsx-a11y/label-has-associated-control: error' src/
```

---

### Task 5.3 — Post-Implementation Compliance Scan (Day 18)

**BUILD_RULES §28 — Mandatory Compliance Scan Items:**

| Check                        | Tool                                                            | Expected                                              |
| :--------------------------- | :-------------------------------------------------------------- | :---------------------------------------------------- |
| TypeScript strict            | `tsc --noEmit`                                                  | 0 errors                                              |
| No `any` in hook files       | `grep -r "any" src/features/*/hooks/`                           | AUDIT each match — replace with proper type           |
| All queries have error state | Manual review of all page files                                 | Every `useQuery` has matching `isError` check         |
| All mutations have toast     | `grep -rn "useMutation" src/ --include="*.ts"`                  | Every mutation has `onSuccess` + `onError` with toast |
| No mock data in pages        | `grep -rn "mock\|Mock\|MOCK\|hardcoded" src/ --include="*.tsx"` | 0 results (except test files)                         |
| No inline fetch              | `grep -rn "fetch(" src/ --include="*.tsx"`                      | 0 results                                             |
| RTL clean                    | See Step 5 above                                                | 0 physical direction classes                          |
| Empty states                 | Manual review                                                   | Every list page has empty state                       |
| Forms use RHF+Zod            | `grep -rn "useState.*email\|useState.*password" src/`           | 0 results                                             |
| Sidebar reactive             | Code review of Sidebar.tsx                                      | Uses hook, not `getState()`                           |

---

## 8. File Inventory

### New Files to Create (~14)

| #     | File Path                                            | Sprint | Purpose                               | Est. Lines |
| :---- | :--------------------------------------------------- | :----- | :------------------------------------ | :--------- |
| 1     | `features/tenants/types/tenant-detail.types.ts`      | 1.1    | UI types for tenant detail tabs       | ~60        |
| 2     | `features/tenants/components/TenantHeader.tsx`       | 1.1    | Tenant header component               | ~80        |
| 3     | `features/tenants/components/TenantOverviewTab.tsx`  | 1.1    | Overview tab                          | ~120       |
| 4     | `features/tenants/components/TenantUsersTab.tsx`     | 1.1    | Users tab                             | ~150       |
| 5     | `features/tenants/components/TenantModulesTab.tsx`   | 1.1    | Modules tab                           | ~100       |
| 6     | `features/tenants/components/TenantWorkflowsTab.tsx` | 1.1    | Workflows tab                         | ~100       |
| 7     | `features/tenants/components/TenantSupportTab.tsx`   | 1.1    | Support tab                           | ~120       |
| 8     | `features/tenants/components/TenantDatabaseTab.tsx`  | 1.1    | Database tab                          | ~150       |
| 9     | `features/tenants/components/TenantBillingTab.tsx`   | 1.1    | Billing tab                           | ~100       |
| 10    | `features/tenants/components/TenantSettingsTab.tsx`  | 1.1    | Settings tab                          | ~80        |
| 11    | `features/dashboard/hooks/useDashboard.ts`           | 1.2    | Dashboard stats hook                  | ~40        |
| 12    | `features/tenants/hooks/useTenants.ts`               | 1.2    | Tenant list/detail/sub-resource hooks | ~180       |
| 13    | `features/api-keys/hooks/useApiKeys.ts`              | 1.2    | API key hooks + mutations             | ~120       |
| 14    | `features/pricing/hooks/usePricing.ts`               | 1.2    | Pricing plans/coupons/discounts hooks | ~150       |
| 15    | `features/webhooks/hooks/useWebhooks.ts`             | 1.2    | Webhook hooks + mutations             | ~120       |
| 16    | `features/modules/hooks/useModules.ts`               | 1.3    | Module list/stats/toggle hooks        | ~80        |
| 17    | `features/api-catalog/hooks/useApiCatalog.ts`        | 1.3    | OpenAPI spec hook                     | ~25        |
| 18    | `components/EmptyState.tsx`                          | 1.3    | Shared empty state component          | ~30        |
| 19-25 | 7 hook test files (`*.test.ts`)                      | 5.1    | Test coverage for all new hooks       | ~700       |

### Files to Modify (~35)

| #     | File Path                                                                                                                        | Sprint  | Changes                            |
| :---- | :------------------------------------------------------------------------------------------------------------------------------- | :------ | :--------------------------------- |
| 1     | `features/tenants/pages/TenantDetailPage.tsx`                                                                                    | 1.1     | 2,402→~150 lines (decompose)       |
| 2     | `features/tenants/pages/index.ts`                                                                                                | 1.1     | Update barrel exports              |
| 3     | `features/dashboard/pages/DashboardPage.tsx`                                                                                     | 1.2     | Wire useDashboardStats hook        |
| 4     | `features/tenants/pages/TenantsPage.tsx`                                                                                         | 1.2     | Wire useTenants hook, remove mock  |
| 5     | `features/api-keys/pages/ApiKeysPage.tsx`                                                                                        | 1.2     | Wire useApiKeys hook, remove mock  |
| 6     | `features/pricing/pages/PricingPage.tsx`                                                                                         | 1.2     | Wire usePricing hook, remove mock  |
| 7     | `features/webhooks/pages/WebhooksPage.tsx`                                                                                       | 1.2     | Wire useWebhooks hook, remove mock |
| 8     | `features/modules/pages/ModulesPage.tsx`                                                                                         | 1.3     | Replace fetch() with useModules    |
| 9     | `features/api-catalog/pages/ApiCatalogPage.tsx`                                                                                  | 1.3     | Replace fetch() with useApiCatalog |
| 10    | `features/platform-users/pages/PlatformUsersPage.tsx`                                                                            | 2.1+2.4 | Error state + mutation fix         |
| 11    | `features/support/pages/SupportPage.tsx`                                                                                         | 2.1     | Add error state                    |
| 12    | `features/backups/pages/BackupsPage.tsx`                                                                                         | 2.1     | Add error state                    |
| 13    | `features/domains/pages/DomainsPage.tsx`                                                                                         | 2.1     | Add error state                    |
| 14    | `features/feature-flags/hooks/useFeatureFlags.ts`                                                                                | 2.2     | Add toast to mutations             |
| 15    | `features/user-sessions/hooks/useUserSessions.ts`                                                                                | 2.2     | Add toast to revoke mutation       |
| 16    | `features/deployments/hooks/useDeployments.ts`                                                                                   | 2.2     | Add toast to rollback mutation     |
| 17    | `features/monitoring/hooks/useResolveError.ts`                                                                                   | 2.2     | Add toast to resolve/unresolve     |
| 18    | `features/auth/pages/DevLoginPage.tsx`                                                                                           | 2.3     | RHF+Zod refactor                   |
| 19    | `features/auth/pages/AcceptInvitePage.tsx`                                                                                       | 2.3     | RHF+Zod refactor                   |
| 20    | `features/platform-users/hooks/use-platform-users.ts`                                                                            | 2.4     | Add suspend/activate mutations     |
| 21-27 | 7 RTL files (SupportPage, PlatformUsersPage, BackupConfigPanel, DomainsPage, SessionDetailSheet, DomainDetailSheet, BackupsPage) | 3.1     | Class name swaps                   |
| 28-37 | ~10 a11y files (icon buttons + search inputs)                                                                                    | 3.2     | Add aria-label attributes          |
| 38-41 | 4 empty state files (StoragePage, MonitoringPage, HealthStatusPage, BillingPage)                                                 | 3.3     | Add EmptyState component           |
| 42    | `features/billing/pages/BillingPage.tsx`                                                                                         | 4.1     | Tab a11y fix                       |
| 43    | `features/settings/pages/SettingsPage.tsx`                                                                                       | 4.2     | Null guard                         |
| 44    | `features/monitoring/pages/MonitoringPage.tsx`                                                                                   | 4.3     | Stat fallbacks                     |
| 45    | `components/AppSidebar.tsx` (or `Sidebar.tsx`)                                                                                   | 4.4     | Reactive hook                      |
| 46    | `features/monitoring/pages/HealthStatusPage.tsx`                                                                                 | 4.5     | Native button → `<Button>`         |

### Shared Package Changes (if needed)

| File                                                  | Change                                       | Sprint |
| :---------------------------------------------------- | :------------------------------------------- | :----- |
| `packages/shared/src/schemas/auth.schema.ts`          | Add `loginSchema` if missing                 | 2.3    |
| `packages/shared/src/schemas/platform-user.schema.ts` | Add `acceptInviteSchema`, `inviteUserSchema` | 2.3    |
| `packages/shared/src/schemas/index.ts`                | Re-export new schemas                        | 2.3    |

---

## 9. Cross-Reference Matrix

This matrix maps every task to its authorizing document(s):

| Task                   | BUILD_RULES                          | IMPLEMENTATION_ROADMAP | PLATFORM_RBAC | V2_DATABASE   | V2_STRUCTURE     | SECURITY         |
| :--------------------- | :----------------------------------- | :--------------------- | :------------ | :------------ | :--------------- | :--------------- |
| 1.1 TenantDetail split | §8.1 feature folders, §14 file sizes | Phase 2 Dev Portal     | —             | Tenant schema | §14 structure    | —                |
| 1.2 React Query hooks  | §8.3 hook pattern                    | Phase 2 wk 5–7         | —             | API endpoints | §8 frontend arch | —                |
| 1.3 Remove fetch()     | §8.3, §24 integration                | Phase 2                | —             | —             | —                | §16.5 CORS       |
| 2.1 Error states       | §15 required states                  | —                      | —             | —             | —                | —                |
| 2.2 Toast feedback     | §24 mutation rules                   | —                      | —             | —             | —                | —                |
| 2.3 RHF+Zod forms      | §8.4 form pattern                    | —                      | Invite form   | —             | —                | §16.3 validation |
| 2.4 Platform mutations | §8.3 mutations                       | —                      | User mgmt     | —             | —                | —                |
| 3.1 RTL fixes          | §11 full mapping                     | —                      | —             | —             | —                | —                |
| 3.2 Aria labels        | §13 WCAG AA                          | —                      | —             | —             | —                | —                |
| 3.3 Empty states       | §15 required states                  | —                      | —             | —             | —                | —                |
| 4.1–4.5 Polish         | §9, §13                              | —                      | —             | —             | —                | —                |
| 5.1 Hook tests         | §18 Vitest+MSW                       | —                      | —             | —             | —                | —                |
| 5.2 Build verify       | §19 checklist                        | —                      | —             | —             | —                | —                |
| 5.3 Compliance         | §28 scan                             | —                      | —             | —             | —                | —                |

---

## 10. Verification Checklist

Run after ALL sprints are complete:

### A. Build & Type Safety

- [ ] `pnpm tsc --noEmit` — 0 errors in `apps/developer`
- [ ] `pnpm build` — clean build, no warnings
- [ ] `pnpm lint` — 0 lint errors

### B. Data Layer

- [ ] 0 mock data arrays remain in non-test files
- [ ] 0 inline `fetch()` calls remain in non-test files
- [ ] All 27 pages use React Query hooks for data
- [ ] Every `useQuery` has loading + error + empty state handling
- [ ] Every `useMutation` has `onSuccess` toast + `onError` toast + cache invalidation
- [ ] No `window.location.reload()` calls

### C. Forms

- [ ] All forms use `useForm` + `zodResolver`
- [ ] All schemas come from `@dento/shared`
- [ ] Form field names match Zod schema keys match API body keys

### D. RTL Compliance

- [ ] 0 physical direction classes (`mr-`, `ml-`, `pl-`, `pr-`, `text-left`, `text-right`, `border-l`, `border-r`, `rounded-l`, `rounded-r`, `left-`, `right-`)
- [ ] All `ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-` logical classes used

### E. Accessibility (WCAG 2.1 AA)

- [ ] Every icon-only button has `aria-label`
- [ ] Every search input has `aria-label`
- [ ] Every tab uses `role="tabpanel"` (or Radix Tabs)
- [ ] `jsx-a11y` ESLint plugin reports 0 violations

### F. Component Structure

- [ ] No file exceeds 400 lines
- [ ] TenantDetailPage decomposed into ~10 sub-components
- [ ] Every feature follows: `pages/` + `hooks/` + `components/` structure
- [ ] Sidebar uses reactive `useAuthStore()` hook

### G. Testing

- [ ] All new hooks have test files
- [ ] All tests pass (`pnpm test --run`)
- [ ] Coverage meets 60% threshold for new hook files

### H. Integration (BUILD_RULES §24)

- [ ] Every sidebar item links to a working route
- [ ] Every route renders a page component
- [ ] Every page component calls at least one hook
- [ ] Every hook calls an API endpoint via `apiClient`
- [ ] Every button has an `onClick` handler
- [ ] Every form has a working submit handler

---

## Appendix A — Backend Route Gaps

The following API routes are required by the frontend but may not exist yet on the backend:

| Frontend Hook          | Expected API Endpoint                   | Backend Route File        | Exists?            |
| :--------------------- | :-------------------------------------- | :------------------------ | :----------------- |
| `useDashboardStats`    | `GET /api/platform/dashboard/stats`     | ❌ No `dashboard/` route  | **Need to create** |
| `useTenants`           | `GET /api/platform/tenants`             | ❌ No tenant list route   | **Need to create** |
| `useTenantDetail`      | `GET /api/platform/tenants/:id`         | ❌                        | **Need to create** |
| `useTenantUsers`       | `GET /api/platform/tenants/:id/users`   | ❌                        | **Need to create** |
| `useTenantModules`     | `GET /api/platform/tenants/:id/modules` | ❌                        | **Need to create** |
| `useApiKeys`           | `GET /api/api-keys`                     | ✅ `api-keys.route.ts`    | Exists             |
| `useApiKeyStats`       | `GET /api/api-keys/stats`               | ⚠️ Verify endpoint exists | Check              |
| `usePricingPlans`      | `GET /api/pricing/plans`                | ✅ `pricing.route.ts`     | Exists             |
| `useCoupons`           | `GET /api/pricing/coupons`              | ⚠️ Verify                 | Check              |
| `useDiscounts`         | `GET /api/pricing/discounts`            | ⚠️ Verify                 | Check              |
| `useWebhooks`          | `GET /api/webhooks`                     | ✅ `webhooks.route.ts`    | Exists             |
| `useWebhookDeliveries` | `GET /api/webhooks/deliveries`          | ⚠️ Verify                 | Check              |
| `useModules`           | `GET /api/platform/modules`             | ✅ `modules.route.ts`     | Exists             |
| `useOpenApiSpec`       | `GET /api/openapi.json`                 | ✅ Swagger plugin         | Exists             |

**Recommendation:** Create a new `apps/api/src/platform/routes/tenants/tenants.route.ts` that provides LIST, GET, and sub-resource endpoints for the developer portal's tenant management pages. This is distinct from the existing `db-explorer` route which serves a different purpose.

---

## Appendix B — Risk Assessment

| Risk                                                         | Likelihood | Impact                                                | Mitigation                                                                                                  |
| :----------------------------------------------------------- | :--------- | :---------------------------------------------------- | :---------------------------------------------------------------------------------------------------------- |
| Backend routes missing for tenant management                 | High       | Blocks DashboardPage + TenantsPage + TenantDetailPage | Create hooks with correct paths now; they will error gracefully via QueryErrorBanner until backend is ready |
| @dento/shared type mismatches                                | Medium     | TypeScript errors when wiring hooks                   | Define types locally first with `// TODO: migrate to @dento/shared` comment, then create shared types       |
| TenantDetailPage decomposition breaks existing functionality | Medium     | Regression in tenant detail view                      | Test each tab component independently; compare before/after screenshots                                     |
| RTL fixes cause visual regression                            | Low        | UI layout breaks                                      | Review each change in browser; RTL fixes are 1:1 class swaps with identical visual output in LTR            |
| Test infrastructure missing MSW handlers                     | Medium     | Tests fail on API calls                               | Use existing test patterns from `useAuditLogs.test.ts` as template                                          |

---

_End of Implementation Plan_
_Generated: Cross-referencing DEVELOPER_PAGES_DEEP_SCAN.md with 9 planning documents_
_Next action: Begin Sprint 1, Task 1.1 — Split TenantDetailPage_
