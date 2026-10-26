/**
 * Shared types for the TenantDetail page and its tab sub-components.
 *
 * TODO: Migrate to @dento/shared once API contracts are finalized.
 */

// ── Tab System ─────────────────────────────────────────────

export type TabId =
  | 'overview'
  | 'modules'
  | 'users'
  | 'billing'
  | 'channels'
  | 'settings'
  | 'branding'
  | 'workflows'
  | 'support'
  | 'database'
  | 'languages'
  | 'backup'
  | 'storage';

export interface TabDefinition {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// ── Tenant ─────────────────────────────────────────────────

export interface TenantDetail {
  id: string;
  name: { en: string; ar?: string };
  slug: string;
  status: 'active' | 'trial' | 'suspended' | 'cancelled' | 'pending';
  plan: string;
  email: string;
  phone: string;
  country: string;
  timezone: string;
  language: string;
  supportedLanguages: string[];
  currency: string;
  createdAt: string;
  users: number;
  maxUsers: number;
  maxBranches: number;
  mrr: number;
  branding: {
    primaryColor: string;
    accentColor: string;
    logo: string | null;
    logoDark: string | null;
    favicon: string | null;
  };
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  modules: string[];
  billingDay: number;
  gracePeriodDays: number;
  redeemedCoupons: {
    couponCode: string;
    redeemedAt: string;
    discountType: 'percent' | 'fixed_amount';
    discountPercent: number;
    discountAmount: number;
    duration: 'once' | 'repeating' | 'forever';
    durationMonths: number;
    remainingMonths: number;
  }[];
  lastActivity: string;
  dbSize: string;
  storageUsed: string;
  storageTierId: string | null;
  storageTierName: string;
  storageLimitMB: number;
  storageUsedMB: number;
  sessionLimits?: {
    maxDesktop: number;
    maxMobile: number;
    maxTablet: number;
  };
  platformEnforce2FA?: boolean;
}

// ── Tenant Users ───────────────────────────────────────────

export interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'dentist' | 'assistant' | 'receptionist';
  status: 'active' | 'inactive';
  lastLogin: string;
}

// ── Modules ────────────────────────────────────────────────

export interface TenantModule {
  id: string;
  name: string;
  description: string;
  required: boolean;
  price: number;
  trialEnds?: string;
  priceOverride?: number;
}

// ── Workflows ──────────────────────────────────────────────

export interface TenantWorkflow {
  id: string;
  name: string;
  trigger: string;
  status: 'active' | 'paused' | 'error';
  lastRun: string;
  runs: number;
  errors: number;
}

// ── Support Sessions ───────────────────────────────────────

export interface SupportSession {
  id: string;
  reason: string;
  startedAt: string;
  duration: string;
  status: 'active' | 'completed';
  admin: string;
}

export interface SupportTicket {
  _id: string;
  ticketNumber: string;
  subject: string;
  category: 'bug' | 'feature' | 'billing' | 'access' | 'other';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'waiting_internal' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdBy: { userId: string; name: string; email: string; role: string };
  assignedTo: { userId: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

// ── Database ───────────────────────────────────────────────

export interface DatabaseCollection {
  name: string;
  type: string;
  documentCount: number;
  avgDocumentSize: number;
  totalSize: number;
  storageSize: number;
  indexCount: number;
}

export interface DatabaseDocument {
  _id: string;
  name: string;
  phone: string;
  createdAt: string;
}
