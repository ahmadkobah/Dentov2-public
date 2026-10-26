/**
 * InvoiceStatusBadge — Reusable status badge for invoice statuses.
 * Extracts the duplicated STATUS_COLORS/STATUS_LABELS pattern from
 * InvoiceListPage and InvoiceDetailPage into a single source of truth.
 */

import { Badge } from '@dento/ui';
import { useTranslation } from '@/stores/locale.store.js';

// ── Status maps ────────────────────────────────────────

export const INVOICE_STATUS_COLORS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'outline',
  issued: 'default',
  installment: 'secondary',
  paid: 'secondary',
  partially_paid: 'secondary',
  overdue: 'destructive',
  cancelled: 'destructive',
  refunded: 'outline',
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  issued: 'Issued',
  installment: 'Installment',
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

// ── Component ──────────────────────────────────────────

interface InvoiceStatusBadgeProps {
  status: string;
  /** Use short labels ("Partial" vs "Partially Paid") in compact views like tables */
  compact?: boolean;
  className?: string;
}

const STATUS_KEY_MAP: Record<string, string> = {
  draft: 'draft',
  issued: 'issued',
  installment: 'installment',
  paid: 'paid',
  partially_paid: 'partiallyPaid',
  overdue: 'overdue',
  cancelled: 'cancelled',
  refunded: 'refunded',
};

export function InvoiceStatusBadge({
  status,
  compact = false,
  className,
}: InvoiceStatusBadgeProps) {
  const { t } = useTranslation();
  const statusKey = STATUS_KEY_MAP[status] ?? status;
  const label =
    compact && status === 'partially_paid'
      ? t('invoices.statusBadge.partial')
      : t(`invoices.statusBadge.${statusKey}`);

  return (
    <Badge variant={INVOICE_STATUS_COLORS[status] ?? 'outline'} className={className}>
      {label}
    </Badge>
  );
}
