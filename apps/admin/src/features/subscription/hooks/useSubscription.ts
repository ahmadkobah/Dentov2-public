import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';

// ── Types ──────────────────────────────────────────────────

export interface SubscriptionPlan {
  name: string;
  tier: 'free' | 'basic' | 'professional' | 'enterprise';
  maxUsers: number;
  maxBranches: number;
  maxStorageGB: number;
  enabledModules: string[];
  billingCycle: 'monthly' | 'yearly';
  pricePerMonth?: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  status: 'active' | 'trial' | 'past_due' | 'canceled';
}

export interface UsageStats {
  users: { current: number; max: number };
  branches: { current: number; max: number };
  storage: { currentMB: number; maxMB: number; tierName?: string };
}

export interface BillingEntry {
  id: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  status: 'paid' | 'pending' | 'failed';
}

export interface SaaSInvoiceSummary {
  _id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string | null;
  paidAt: string | null;
  source: string;
  createdAt: string;
}

// ── Response Types ─────────────────────────────────────────

interface SettingsResponse {
  success: true;
  data: {
    key: string;
    settings: Record<string, unknown>;
  };
}

// ── Query Keys ─────────────────────────────────────────────

export const subscriptionKeys = {
  all: ['subscription'] as const,
  plan: () => [...subscriptionKeys.all, 'plan'] as const,
  billing: () => [...subscriptionKeys.all, 'billing'] as const,
  invoices: () => [...subscriptionKeys.all, 'saas-invoices'] as const,
  invoiceDetail: (id: string) => [...subscriptionKeys.all, 'saas-invoices', id] as const,
};

// ── Queries ────────────────────────────────────────────────

/**
 * Get subscription/billing settings from tenant-settings (key = 'billing')
 * Per MASTER_PLAN §28 — Module-only pricing, free tier (10 users, 1 branch, 1GB)
 */
export function useSubscriptionPlan() {
  return useQuery({
    queryKey: subscriptionKeys.plan(),
    queryFn: () => apiClient.get<SettingsResponse>('/api/tenant-settings/billing'),
    select: (res) => {
      const v = res.data?.settings || {};
      return {
        plan: {
          name: (v.planName as string) || 'Free',
          tier: (v.tier as SubscriptionPlan['tier']) || 'free',
          maxUsers: (v.maxUsers as number) || 10,
          maxBranches: (v.maxBranches as number) || 1,
          maxStorageGB: (v.maxStorageGB as number) || 1,
          enabledModules: (v.enabledModules as string[]) || [],
          billingCycle: (v.billingCycle as 'monthly' | 'yearly') || 'monthly',
          pricePerMonth: v.pricePerMonth as number | undefined,
          currency: (v.currency as string) || 'USD',
          startDate: v.startDate as string | undefined,
          endDate: v.endDate as string | undefined,
          status: (v.status as SubscriptionPlan['status']) || 'active',
        } as SubscriptionPlan,
        usage: (v.usage as UsageStats) || null,
        billingHistory: (v.billingHistory as BillingEntry[]) || [],
      };
    },
  });
}

// ── SaaS Invoices (from platform billing) ──────────────────

interface SaaSInvoiceListResponse {
  success: boolean;
  data: {
    data: SaaSInvoiceSummary[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  };
}

interface SaaSInvoiceDetailResponse {
  success: boolean;
  data: SaaSInvoiceSummary & {
    tenantId: string;
    tenantName?: string;
    tenantSlug?: string;
    tenantContact?: {
      email?: string;
      phone?: string;
      website?: string;
      address?: string;
    };
    issuedAt?: string | null;
    items: {
      type: 'module' | 'extra_storage' | 'extra_users' | 'extra_branches' | 'custom' | 'discount';
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
      moduleSlug?: string | null;
      couponCode?: string | null;
    }[];
    subtotal: number;
    discountTotal: number;
    taxRate: number;
    taxAmount: number;
    balanceDue: number;
    amountPaid: number;
    notes: string;
  };
}

export function useSaaSInvoices() {
  return useQuery({
    queryKey: subscriptionKeys.invoices(),
    queryFn: () => apiClient.get<SaaSInvoiceListResponse>('/api/subscription/invoices?limit=50'),
    select: (res) => res.data?.data ?? [],
  });
}

export function useSaaSInvoiceDetail(id: string | null) {
  return useQuery({
    queryKey: subscriptionKeys.invoiceDetail(id ?? ''),
    queryFn: () => apiClient.get<SaaSInvoiceDetailResponse>(`/api/subscription/invoices/${id}`),
    select: (res) => res.data,
    enabled: !!id,
  });
}
