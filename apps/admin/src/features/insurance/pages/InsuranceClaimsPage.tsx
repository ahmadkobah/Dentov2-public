/**
 * Insurance Claims Page — per DENTO_V2_MASTER_PLAN.md §13 (Module #13 Insurance Management).
 * DataTable with 6-status lifecycle, date-range + status filters.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useInsuranceClaimList,
  type InsuranceClaim,
  type InsuranceClaimFilters,
} from '../hooks/useInsurance.js';
import { formatDate } from '@/lib/date.js';
import { useTranslation } from '@/stores/locale.store.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import { formatCurrency } from '@/lib/currency.js';
import {
  DataTable,
  EmptyState,
  PageHeader,
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  type ColumnDef,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@dento/ui';
import { FileText, MoreHorizontal, Plus, Eye, Download, Calendar, Search } from 'lucide-react';
import { ClaimStatusBadge } from '../components/ClaimStatusBadge.js';

// ── Status badge from shared component ─────────────────

// ── Helpers ────────────────────────────────────────────

function patientName(claim: InsuranceClaim): string {
  if (typeof claim.patientId === 'object' && claim.patientId) {
    const p = claim.patientId;
    return `${p.firstName?.en ?? ''} ${p.lastName?.en ?? ''}`.trim() || p.patientCode;
  }
  return String(claim.patientId);
}

// ── Component ──────────────────────────────────────────

export default function InsuranceClaimsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [filters, setFilters] = useState<InsuranceClaimFilters>({
    page: 1,
    limit: 20,
  });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error, refetch } = useInsuranceClaimList({
    ...filters,
    search: search || undefined,
    startDate: dateFrom || undefined,
    endDate: dateTo || undefined,
  });

  const items = data?.items ?? [];

  // ── Summary ─────────────────────────────────────────

  const summary = items.reduce(
    (acc, c) => ({
      totalClaimed: acc.totalClaimed + c.claimedAmount,
      totalApproved: acc.totalApproved + c.approvedAmount,
      patientResp: acc.patientResp + c.patientResponsibility,
    }),
    { totalClaimed: 0, totalApproved: 0, patientResp: 0 },
  );

  // ── Export ──────────────────────────────────────────

  const handleExport = useCallback(() => {
    const header = [
      'Claim #',
      'Patient',
      'Claimed',
      'Approved',
      'Patient Resp.',
      'Status',
      'Claim Date',
    ];
    const rows = items.map((c) => [
      c.claimNumber,
      patientName(c),
      c.claimedAmount.toFixed(2),
      c.approvedAmount.toFixed(2),
      c.patientResponsibility.toFixed(2),
      c.status,
      formatDate(c.claimDate),
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `insurance-claims-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [items]);

  // ── Columns ─────────────────────────────────────────

  const columns: ColumnDef<InsuranceClaim>[] = [
    {
      id: 'claimNumber',
      accessorKey: 'claimNumber',
      header: t('insurance.claims.columns.claimNumber'),
      cell: (_v: unknown, row: InsuranceClaim) => (
        <span className="font-mono text-sm">{row.claimNumber}</span>
      ),
    },
    {
      id: 'patient',
      accessorKey: 'patientId',
      header: t('insurance.claims.columns.patient'),
      cell: (_v: unknown, row: InsuranceClaim) => (
        <span className="text-sm">{patientName(row)}</span>
      ),
    },
    {
      id: 'claimedAmount',
      accessorKey: 'claimedAmount',
      header: t('insurance.claims.columns.claimed'),
      cell: (_v: unknown, row: InsuranceClaim) => (
        <span className="text-sm font-medium">{formatCurrency(row.claimedAmount)}</span>
      ),
    },
    {
      id: 'approvedAmount',
      accessorKey: 'approvedAmount',
      header: t('insurance.claims.columns.approved'),
      cell: (_v: unknown, row: InsuranceClaim) => (
        <span className="text-sm">{formatCurrency(row.approvedAmount)}</span>
      ),
    },
    {
      id: 'patientResponsibility',
      accessorKey: 'patientResponsibility',
      header: t('insurance.claims.columns.patientResponsibility'),
      cell: (_v: unknown, row: InsuranceClaim) => (
        <span
          className={`text-sm ${row.patientResponsibility > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
        >
          {formatCurrency(row.patientResponsibility)}
        </span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: t('insurance.claims.columns.status'),
      cell: (_v: unknown, row: InsuranceClaim) => <ClaimStatusBadge status={row.status} />,
    },
    {
      id: 'claimDate',
      accessorKey: 'claimDate',
      header: t('insurance.claims.columns.claimDate'),
      cell: (_v: unknown, row: InsuranceClaim) => formatDate(row.claimDate),
    },
    {
      id: 'actions',
      header: '',
      cell: (_: unknown, claim: InsuranceClaim) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/insurance-claims/${claim._id}`)}>
              <Eye className="me-2 h-4 w-4" />
              {t('insurance.claims.actions.viewDetails')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // ── Render ──────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t('insurance.claims.page.title')}
        description={t('insurance.claims.page.description')}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={!items.length}>
            <Download className="me-2 h-4 w-4" />
            {t('insurance.claims.actions.exportCsv')}
          </Button>
          <Button onClick={() => navigate('/insurance-claims/new')}>
            <Plus className="me-2 h-4 w-4" />
            {t('insurance.claims.actions.newClaim')}
          </Button>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        <div className="relative w-full md:w-65">
          <Search className="text-muted-foreground absolute inset-s-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t('insurance.claims.filters.searchPlaceholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setFilters((prev) => ({ ...prev, page: 1 }));
            }}
            className="ps-9"
          />
        </div>
        <Select
          value={filters.status || 'all'}
          onValueChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              status: v === 'all' ? undefined : v,
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('insurance.claims.filters.allStatuses')}</SelectItem>
            <SelectItem value="pending">{t('insurance.claims.filters.pending')}</SelectItem>
            <SelectItem value="submitted">{t('insurance.claims.filters.submitted')}</SelectItem>
            <SelectItem value="under_review">
              {t('insurance.claims.filters.underReview')}
            </SelectItem>
            <SelectItem value="approved">{t('insurance.claims.filters.approved')}</SelectItem>
            <SelectItem value="denied">{t('insurance.claims.filters.denied')}</SelectItem>
            <SelectItem value="appealed">{t('insurance.claims.filters.appealed')}</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Calendar className="text-muted-foreground h-4 w-4" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setFilters((prev) => ({ ...prev, page: 1 }));
            }}
            className="w-[150px]"
          />
          <span className="text-muted-foreground text-sm">{t('insurance.claims.filters.to')}</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setFilters((prev) => ({ ...prev, page: 1 }));
            }}
            className="w-[150px]"
          />
        </div>
      </div>

      {/* Summary Row */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-4 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {t('insurance.claims.summary.totalClaimed')}
            </span>
            <span className="text-sm font-semibold">{formatCurrency(summary.totalClaimed)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {t('insurance.claims.summary.approved')}
            </span>
            <span className="text-sm font-semibold text-green-600">
              {formatCurrency(summary.totalApproved)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {t('insurance.claims.summary.patientResponsibility')}
            </span>
            <span className="text-destructive text-sm font-semibold">
              {formatCurrency(summary.patientResp)}
            </span>
          </div>
        </div>
      )}

      {/* Data */}
      {isLoading ? (
        <TableSkeleton columns={8} rows={10} />
      ) : isError ? (
        <ErrorState
          title={t('insurance.claims.error.loadFailed')}
          message={error?.message}
          onRetry={refetch}
        />
      ) : !items.length ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title={t('insurance.claims.empty.title')}
          description={t('insurance.claims.empty.description')}
          action={{ label: 'New Claim', onClick: () => navigate('/insurance-claims/new') }}
        />
      ) : (
        <DataTable columns={columns} data={items} />
      )}
    </div>
  );
}
