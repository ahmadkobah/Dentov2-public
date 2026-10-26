/**
 * Commission utility constants and helpers
 * Extracted from CommissionsPage.tsx
 */

import { formatCurrency as formatCurrencyCentralized } from '@/lib/currency.js';
import type { DoctorCommission, CommissionPayout } from '../hooks/useCommissions.js';

// ── Status badge maps ──────────────────────────────────────────────────────

export const COMMISSION_STATUS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'outline',
  approved: 'secondary',
  paid: 'default',
  cancelled: 'destructive',
};

export const PAYOUT_STATUS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  processed: 'default',
  cancelled: 'destructive',
};

// ── Helpers ────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return formatCurrencyCentralized(amount);
}

export function doctorName(item: DoctorCommission | CommissionPayout): string {
  if (typeof item.doctorId === 'object' && item.doctorId) {
    const d = item.doctorId;
    return `${d.firstName?.en ?? ''} ${d.lastName?.en ?? ''}`.trim();
  }
  return String(item.doctorId);
}
