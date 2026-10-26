/**
 * ClaimStatusBadge — Reusable status badge for insurance claim statuses.
 * Extracts the duplicated STATUS_COLORS/STATUS_LABELS from
 * InsuranceClaimsPage and InsuranceClaimDetailPage.
 */

import { Badge } from '@dento/ui';
import { useTranslation } from '@/stores/locale.store.js';

// ── Status maps ────────────────────────────────────────

const CLAIM_STATUS_KEYS: Record<string, string> = {
  pending: 'insurance.statusBadge.pending',
  submitted: 'insurance.statusBadge.submitted',
  under_review: 'insurance.statusBadge.underReview',
  approved: 'insurance.statusBadge.approved',
  partially_approved: 'insurance.statusBadge.partiallyApproved',
  denied: 'insurance.statusBadge.denied',
  appealed: 'insurance.statusBadge.appealed',
  paid: 'insurance.statusBadge.paid',
};

export const CLAIM_STATUS_COLORS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'outline',
  submitted: 'secondary',
  under_review: 'secondary',
  approved: 'default',
  partially_approved: 'secondary',
  denied: 'destructive',
  appealed: 'outline',
  paid: 'default',
};

export const CLAIM_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  partially_approved: 'Partially Approved',
  denied: 'Denied',
  appealed: 'Appealed',
  paid: 'Paid',
};

// ── Component ──────────────────────────────────────────

interface ClaimStatusBadgeProps {
  status: string;
  className?: string;
}

export function ClaimStatusBadge({ status, className }: ClaimStatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <Badge variant={CLAIM_STATUS_COLORS[status] ?? 'outline'} className={className}>
      {t(CLAIM_STATUS_KEYS[status] ?? 'insurance.statusBadge.pending') ||
        CLAIM_STATUS_LABELS[status] ||
        status}
    </Badge>
  );
}
