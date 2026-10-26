/**
 * Commission & Payout column definitions
 * Extracted from CommissionsPage.tsx
 */

import type { DoctorCommission, CommissionPayout } from '../hooks/useCommissions.js';
import {
  type ColumnDef,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@dento/ui';
import { MoreHorizontal, CheckCircle } from 'lucide-react';
import {
  COMMISSION_STATUS,
  PAYOUT_STATUS,
  formatCurrency,
  doctorName,
} from '../utils/commission.utils.js';
import { formatDate } from '@/lib/date.js';

// ── Commission Columns ────────────────────────────────────────────────────

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

export function getCommissionColumns(opts: {
  locale: string;
  t: TranslateFn;
  onApprove: (id: string) => void;
}): ColumnDef<DoctorCommission>[] {
  const { t } = opts;
  return [
    {
      id: 'doctor',
      accessorKey: 'doctorId',
      header: t('commissions.col.doctor'),
      cell: (_v: unknown, row: DoctorCommission) => (
        <span className="text-sm font-medium">{doctorName(row)}</span>
      ),
    },
    {
      id: 'invoice',
      accessorKey: 'invoiceId',
      header: t('commissions.col.invoice'),
      cell: (_v: unknown, row: DoctorCommission) => (
        <span className="font-mono text-sm">
          {typeof row.invoiceId === 'object' ? row.invoiceId.invoiceNumber : '—'}
        </span>
      ),
    },
    {
      id: 'rate',
      accessorKey: 'commissionRate',
      header: t('commissions.col.rate'),
      cell: (_v: unknown, row: DoctorCommission) => (
        <span className="text-sm">{row.commissionRate}%</span>
      ),
    },
    {
      id: 'invoiceAmount',
      accessorKey: 'invoiceAmount',
      header: t('commissions.col.invoiceAmt'),
      cell: (_v: unknown, row: DoctorCommission) => (
        <span className="text-sm">{formatCurrency(row.invoiceAmount)}</span>
      ),
    },
    {
      id: 'commissionAmount',
      accessorKey: 'commissionAmount',
      header: t('commissions.col.commission'),
      cell: (_v: unknown, row: DoctorCommission) => (
        <span className="text-sm font-semibold">{formatCurrency(row.commissionAmount)}</span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: t('commissions.col.status'),
      cell: (_v: unknown, row: DoctorCommission) => (
        <Badge variant={COMMISSION_STATUS[row.status] ?? 'outline'}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </Badge>
      ),
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: t('commissions.col.created'),
      cell: (_v: unknown, row: DoctorCommission) => formatDate(row.createdAt),
    },
    {
      id: 'actions',
      header: '',
      cell: (_: unknown, comm: DoctorCommission) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {comm.status === 'pending' && (
              <DropdownMenuItem onClick={() => opts.onApprove(comm._id)}>
                <CheckCircle className="me-2 h-4 w-4" />
                {t('commissions.action.approve')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}

// ── Payout Columns ────────────────────────────────────────────────────────

export function getPayoutColumns(opts: {
  locale: string;
  t: TranslateFn;
  onProcess: (id: string) => void;
}): ColumnDef<CommissionPayout>[] {
  const { t } = opts;
  return [
    {
      id: 'payoutNumber',
      accessorKey: 'payoutNumber',
      header: t('commissions.payouts.col.payoutNumber'),
      cell: (_v: unknown, row: CommissionPayout) => (
        <span className="font-mono text-sm">{row.payoutNumber}</span>
      ),
    },
    {
      id: 'doctor',
      accessorKey: 'doctorId',
      header: t('commissions.payouts.col.doctor'),
      cell: (_v: unknown, row: CommissionPayout) => (
        <span className="text-sm font-medium">{doctorName(row)}</span>
      ),
    },
    {
      id: 'totalAmount',
      accessorKey: 'totalAmount',
      header: t('commissions.payouts.col.total'),
      cell: (_v: unknown, row: CommissionPayout) => (
        <span className="text-sm font-semibold">{formatCurrency(row.totalAmount)}</span>
      ),
    },
    {
      id: 'method',
      accessorKey: 'paymentMethod',
      header: t('commissions.payouts.col.method'),
      cell: (_v: unknown, row: CommissionPayout) => (
        <span className="text-sm">{row.paymentMethod.replace('_', ' ')}</span>
      ),
    },
    {
      id: 'commissions',
      accessorKey: 'commissionIds',
      header: t('commissions.payouts.col.items'),
      cell: (_v: unknown, row: CommissionPayout) => (
        <span className="text-sm">{row.commissionIds?.length ?? 0}</span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: t('commissions.payouts.col.status'),
      cell: (_v: unknown, row: CommissionPayout) => (
        <Badge variant={PAYOUT_STATUS[row.status] ?? 'outline'}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </Badge>
      ),
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: t('commissions.payouts.col.created'),
      cell: (_v: unknown, row: CommissionPayout) => formatDate(row.createdAt),
    },
    {
      id: 'actions',
      header: '',
      cell: (_: unknown, payout: CommissionPayout) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {payout.status === 'draft' && (
              <DropdownMenuItem onClick={() => opts.onProcess(payout._id)}>
                <CheckCircle className="me-2 h-4 w-4" />
                {t('commissions.action.process')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
