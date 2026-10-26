import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../../lib/api-client.js';
import { toast } from '@dento/ui';
import type { TenantStatus, PaginationMeta } from '@dento/shared';
import type { TenantDetail } from '../types/tenant-detail.types.js';

/* ------------------------------------------------------------------ */
/*  Local types (TODO: migrate to @dento/shared)                       */
/* ------------------------------------------------------------------ */

export interface Tenant {
  _id: string;
  name: { en: string; ar?: string };
  slug: string;
  status: TenantStatus;
  plan: string;
  country: string;
  countryFlag: string;
  users: number;
  maxUsers: number;
  mrr: number;
  createdAt: string;
  logoUrl: string | null;
}

/** Convert 2-letter ISO country code to flag emoji */
function countryFlag(code: string): string {
  if (!code || code.length < 2) return '';
  const upper = code.toUpperCase();
  return String.fromCodePoint(...Array.from(upper).map((c) => 0x1f1e6 - 65 + c.charCodeAt(0)));
}

/** Map raw API tenant document to Tenant shape */
function mapTenant(raw: Record<string, unknown>): Tenant {
  const contact = (raw.contact ?? {}) as Record<string, unknown>;
  const address = (contact.address ?? {}) as Record<string, string>;
  const branding = (raw.branding ?? {}) as Record<string, unknown>;
  const cc = address.country ?? '';
  return {
    _id: String(raw._id ?? ''),
    name: raw.name as { en: string; ar?: string },
    slug: String(raw.slug ?? ''),
    status: (raw.status as TenantStatus) ?? 'trial',
    plan: String(raw.plan ?? raw.status ?? ''),
    country: cc,
    countryFlag: countryFlag(cc),
    users: Number(raw.userCount ?? 0),
    maxUsers: Number(raw.maxUsers ?? 10),
    mrr: Number(raw.mrr ?? 0),
    createdAt: String(raw.createdAt ?? ''),
    logoUrl: (branding.logoUrl as string | null) ?? null,
  };
}

export interface TenantListFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface TenantsStats {
  totalTenants: number;
  activeTenants: number;
  countries: number;
  totalMrr: number;
}

/* ------------------------------------------------------------------ */
/*  Response types                                                     */
/* ------------------------------------------------------------------ */

interface TenantListResponse {
  success: boolean;
  data: Tenant[];
  meta: PaginationMeta;
}

interface TenantsStatsResponse {
  success: boolean;
  data: TenantsStats;
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const tenantKeys = {
  all: ['tenants'] as const,
  lists: () => [...tenantKeys.all, 'list'] as const,
  list: (filters: TenantListFilters) => [...tenantKeys.lists(), filters] as const,
  details: () => [...tenantKeys.all, 'detail'] as const,
  detail: (id: string) => [...tenantKeys.details(), id] as const,
  stats: () => [...tenantKeys.all, 'stats'] as const,
};

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useTenants(filters: TenantListFilters) {
  return useQuery({
    queryKey: tenantKeys.list(filters),
    queryFn: () =>
      apiClient.get<TenantListResponse>('/api/platform/tenants', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({
      items: (res.data as unknown as Record<string, unknown>[]).map(mapTenant),
      meta: res.meta,
    }),
  });
}

export function useTenantsStats() {
  return useQuery({
    queryKey: tenantKeys.stats(),
    queryFn: () => apiClient.get<TenantsStatsResponse>('/api/platform/tenants/stats'),
    select: (res) => res.data,
    refetchInterval: 30_000,
  });
}

/* ------------------------------------------------------------------ */
/*  Tenant Detail                                                      */
/* ------------------------------------------------------------------ */

interface TenantDetailResponse {
  success: boolean;
  data: Record<string, unknown>;
}

export function useTenantDetail(id: string | undefined) {
  return useQuery({
    queryKey: tenantKeys.detail(id!),
    queryFn: () => apiClient.get<TenantDetailResponse>(`/api/platform/tenants/${id}`),
    enabled: !!id,
    select: (res) => {
      const d = res.data as Record<string, unknown>;
      const contact = (d.contact ?? {}) as Record<string, unknown>;
      const address = (contact.address ?? {}) as Record<string, unknown>;
      const settings = (d.settings ?? {}) as Record<string, unknown>;
      const branding = (d.branding ?? {}) as Record<string, unknown>;
      const name = (d.name ?? {}) as Record<string, string | undefined>;

      return {
        id: String(d._id ?? id),
        name: { en: name.en ?? '', ar: name.ar },
        slug: String(d.slug ?? ''),
        status: (d.status as TenantDetail['status']) ?? 'trial',
        plan: String(d.plan ?? d.status ?? 'N/A'),
        email: String(contact.email ?? ''),
        phone: String(contact.phone ?? ''),
        country: String(address.country ?? ''),
        timezone: String(settings.timezone ?? ''),
        language: String(settings.defaultLanguage ?? settings.locale ?? 'en'),
        supportedLanguages: (Array.isArray(settings.supportedLanguages)
          ? settings.supportedLanguages
          : [settings.defaultLanguage ?? settings.locale ?? 'en']) as string[],
        currency: String(settings.currency ?? ''),
        createdAt: d.createdAt ? new Date(d.createdAt as string).toLocaleDateString() : '',
        users: Number(d.userCount ?? 0),
        maxUsers: Number(d.maxUsers ?? 0),
        maxBranches: Number(d.maxBranches ?? 1),
        mrr: Number(d.mrr ?? 0),
        branding: {
          primaryColor: String(branding.primaryColor ?? '#4f46e5'),
          accentColor: String(branding.accentColor ?? '#10b981'),
          logo: (branding.logoUrl as string | null) ?? null,
          logoDark: (branding.logoDarkUrl as string | null) ?? null,
          favicon: (branding.faviconUrl as string | null) ?? null,
        },
        address: {
          street: String(address.street ?? ''),
          city: String(address.city ?? ''),
          state: String(address.state ?? ''),
          country: String(address.country ?? ''),
          postalCode: String(address.postalCode ?? ''),
        },
        modules: (d.enabledModules as string[]) ?? [],
        billingDay: Number(d.billingDay ?? 1),
        gracePeriodDays: Number(d.gracePeriodDays ?? 7),
        redeemedCoupons: Array.isArray(d.redeemedCoupons)
          ? (d.redeemedCoupons as Record<string, unknown>[]).map((r) => ({
              couponCode: String(r.couponCode ?? ''),
              redeemedAt: String(r.redeemedAt ?? ''),
              discountType: (r.discountType as 'percent' | 'fixed_amount') ?? 'percent',
              discountPercent: Number(r.discountPercent ?? 0),
              discountAmount: Number(r.discountAmount ?? 0),
              duration: (r.duration as 'once' | 'repeating' | 'forever') ?? 'once',
              durationMonths: Number(r.durationMonths ?? 0),
              remainingMonths: Number(r.remainingMonths ?? 0),
            }))
          : [],
        lastActivity: d.lastActivityAt
          ? new Date(d.lastActivityAt as string).toLocaleDateString()
          : 'N/A',
        dbSize: `${((d.dbSizeMB as number) ?? 0).toFixed(1)} MB`,
        storageUsed: `${((d.storageUsedMB as number) ?? 0).toFixed(1)} / ${(d.storageLimitMB as number) ?? 0} MB`,
        storageTierId: (d.storageTierId as string) ?? null,
        storageTierName: String(d.storageTierName ?? 'Basic (Default)'),
        storageLimitMB: Number(d.storageLimitMB ?? 102400),
        storageUsedMB: Number(d.storageUsedMB ?? 0),
        sessionLimits: (settings.sessionLimits as TenantDetail['sessionLimits']) ?? {
          maxDesktop: 1,
          maxMobile: 1,
          maxTablet: 1,
        },
        platformEnforce2FA: Boolean(
          (settings as Record<string, unknown>).platformEnforce2FA ?? false,
        ),
      };
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post('/api/platform/tenants', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantKeys.all });
      toast.success('Tenant created');
    },
    onError: () => {
      toast.error('Failed to create tenant');
    },
  });
}

export function useDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/platform/tenants/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantKeys.all });
      toast.success('Tenant deleted');
    },
    onError: (error: unknown) => {
      qc.invalidateQueries({ queryKey: tenantKeys.all });
      const message = error instanceof ApiError ? error.message : 'Failed to delete tenant';
      toast.error(message);
    },
  });
}

export function useUpdateTenantModules(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabledModules: string[]) =>
      apiClient.patch(`/api/platform/tenants/${tenantId}`, { enabledModules }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantKeys.detail(tenantId) });
      toast.success('Modules updated');
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.message : 'Failed to update modules';
      toast.error(message);
    },
  });
}

export function useUpdateTenant(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.patch(`/api/platform/tenants/${tenantId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantKeys.detail(tenantId) });
      toast.success('Tenant updated');
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.message : 'Failed to update tenant';
      toast.error(message);
    },
  });
}

export function useUpdateTenantStatus(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { status: string; reason?: string }) =>
      apiClient.patch(`/api/platform/tenants/${tenantId}/status`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: tenantKeys.all });
      toast.success(`Tenant status changed to ${variables.status}`);
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.message : 'Failed to update tenant status';
      toast.error(message);
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Tenant Branding (reads/writes tenant DB settings collection)       */
/* ------------------------------------------------------------------ */

export function useTenantBranding(tenantId: string) {
  return useQuery({
    queryKey: [...tenantKeys.detail(tenantId), 'branding'],
    queryFn: () =>
      apiClient.get<{ data: { branding: Record<string, unknown> } }>(
        `/api/platform/tenants/${tenantId}/branding`,
      ),
    enabled: !!tenantId,
  });
}

export function useUpdateTenantBranding(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.patch(`/api/platform/tenants/${tenantId}/branding`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...tenantKeys.detail(tenantId), 'branding'] });
      toast.success('Tenant branding updated');
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.message : 'Failed to update branding';
      toast.error(message);
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Tenant Security Settings (reads/writes tenant DB settings)         */
/* ------------------------------------------------------------------ */

export function useTenantSecuritySettings(tenantId: string) {
  return useQuery({
    queryKey: [...tenantKeys.detail(tenantId), 'security-settings'],
    queryFn: () =>
      apiClient.get<{ data: { security: Record<string, unknown> } }>(
        `/api/platform/tenants/${tenantId}/security-settings`,
      ),
    enabled: !!tenantId,
  });
}

export function useUpdateTenantSecuritySettings(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.patch(`/api/platform/tenants/${tenantId}/security-settings`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...tenantKeys.detail(tenantId), 'security-settings'] });
      toast.success('Security settings updated');
    },
    onError: (error: unknown) => {
      const message =
        error instanceof ApiError ? error.message : 'Failed to update security settings';
      toast.error(message);
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Billing                                                            */
/* ------------------------------------------------------------------ */

export function useTenantInvoices(tenantId: string) {
  return useQuery({
    queryKey: [...tenantKeys.detail(tenantId), 'invoices'],
    queryFn: () =>
      apiClient.get<{ data: unknown[]; meta: unknown }>('/api/platform/billing/invoices', {
        params: { tenantId, limit: 50 },
      }),
    enabled: !!tenantId,
  });
}

/* ------------------------------------------------------------------ */
/*  Support                                                            */
/* ------------------------------------------------------------------ */

export function useTenantTickets(tenantId: string) {
  return useQuery({
    queryKey: [...tenantKeys.detail(tenantId), 'tickets'],
    queryFn: () =>
      apiClient.get<{ data: unknown[]; meta: unknown }>(
        `/api/support/tenants/${tenantId}/tickets`,
        { params: { limit: 50 } },
      ),
    enabled: !!tenantId,
  });
}

/* ------------------------------------------------------------------ */
/*  Database Explorer                                                  */
/* ------------------------------------------------------------------ */

export function useTenantDbStats(slug: string) {
  return useQuery({
    queryKey: ['db-explorer', slug, 'stats'],
    queryFn: () =>
      apiClient.get<{ data: Record<string, unknown> }>(`/api/db-explorer/${slug}/stats`),
    enabled: !!slug,
  });
}

export function useTenantDbCollections(slug: string) {
  return useQuery({
    queryKey: ['db-explorer', slug, 'collections'],
    queryFn: () =>
      apiClient.get<{ data: { collections: unknown[]; total: number } }>(
        `/api/db-explorer/${slug}/collections`,
      ),
    enabled: !!slug,
  });
}

export function useTenantDbDocuments(slug: string, collection: string) {
  return useQuery({
    queryKey: ['db-explorer', slug, collection, 'documents'],
    queryFn: () =>
      apiClient.get<{ data: { documents: unknown[]; pagination: unknown } }>(
        `/api/db-explorer/${slug}/${collection}/documents`,
        { params: { limit: 20 } },
      ),
    enabled: !!slug && !!collection,
  });
}
