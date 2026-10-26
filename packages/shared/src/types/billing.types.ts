/**
 * Billing Types — Phase 6 (SaaS Revenue)
 *
 * Per MASTER_PLAN §7 — Platform billing and invoicing
 * Used by: BillingPage, useBilling, billing.route.ts
 */

import type { InvoiceStatus } from '../schemas/invoice.schema.js';

export type { InvoiceStatus };

// ── SaaS Invoice (proper invoice model) ─────────────────────

export type SaaSInvoiceStatus =
  | 'draft'
  | 'issued'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  | 'cancelled'
  | 'refunded';

export type SaaSInvoiceItemType =
  | 'module'
  | 'extra_storage'
  | 'extra_users'
  | 'extra_branches'
  | 'custom'
  | 'discount';

export interface SaaSInvoiceItem {
  type: SaaSInvoiceItemType;
  description: string;
  moduleSlug?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  couponCode?: string | null;
}

export interface SaaSInvoice {
  _id: string;
  invoiceNumber: string;
  tenantId: string;
  tenantName?: string;
  tenantSlug?: string;
  tenantContact?: {
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
  };

  periodStart: string;
  periodEnd: string;

  items: SaaSInvoiceItem[];

  subtotal: number;
  discountTotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;

  currency: string;
  status: SaaSInvoiceStatus;

  issuedAt?: string | null;
  dueDate?: string | null;
  paidAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;

  source: 'manual' | 'auto';
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

// ── Legacy compat: DunningEntry (used by existing UI) ───────

export interface DunningEntry {
  attempt: number;
  sentAt: string;
  channel: 'email' | 'sms';
  status: 'sent' | 'failed';
}

// ── Billing Stats ───────────────────────────────────────────

export interface BillingStats {
  mrr: number;
  arr: number;
  totalRevenue: number;
  outstandingAmount: number;
  overdueInvoices: number;
  activeSubscriptions: number;
  churnRate: number;
  revenueByPlan: { plan: string; revenue: number; count: number }[];
  revenueTimeline: { month: string; revenue: number }[];
  paymentMethodBreakdown: { method: string; count: number; total: number }[];
}

// ── Filters ─────────────────────────────────────────────────

export interface BillingFilters {
  tenantId?: string;
  status?: SaaSInvoiceStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}
