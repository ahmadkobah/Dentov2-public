/**
 * Insurance Companies Page — per DENTO_V2_MASTER_PLAN.md §13 (Module #13 Insurance Management).
 * CRUD list of insurance companies with coverage %, status toggle, search.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useInsuranceCompanyList,
  useDeactivateInsuranceCompany,
  type InsuranceCompany,
  type InsuranceCompanyFilters,
} from '../hooks/useInsurance.js';
import { formatDate } from '@/lib/date.js';
import { useTranslation } from '@/stores/locale.store.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { formatCurrency } from '@/lib/currency.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  DataTable,
  EmptyState,
  PageHeader,
  Button,
  Input,
  Badge,
  ConfirmDialog,
  toast,
  type ColumnDef,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@dento/ui';
import { ShieldCheck, Search, MoreHorizontal, Plus, Pencil, Trash2, Download } from 'lucide-react';

// ── Helpers ────────────────────────────────────────────

// ── Component ──────────────────────────────────────────

export default function InsuranceCompaniesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<InsuranceCompanyFilters>({
    page: 1,
    limit: 20,
    sortBy: 'name.en',
    sortOrder: 'asc',
  });
  const [search, setSearch] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState<InsuranceCompany | null>(null);

  const { data, isLoading, isError, error, refetch } = useInsuranceCompanyList({
    ...filters,
    search: search || undefined,
  });

  const deactivateMutation = useDeactivateInsuranceCompany();

  const items = data?.items ?? [];

  // ── Export ──────────────────────────────────────────

  const handleExport = useCallback(() => {
    const header = [
      'Name (EN)',
      'Name (AR)',
      'Code',
      'Coverage %',
      'Max Coverage',
      'Status',
      'Created',
    ];
    const rows = items.map((c) => [
      c.name.en,
      c.name.ar,
      c.code,
      c.coveragePercentage.toFixed(0),
      c.maxCoverage ? c.maxCoverage.toFixed(2) : '',
      c.isActive ? 'Active' : 'Inactive',
      formatDate(c.createdAt),
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `insurance-companies-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [items]);

  // ── Handlers ────────────────────────────────────────

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleDeactivate = useCallback(async () => {
    if (!deactivateTarget) return;
    try {
      await deactivateMutation.mutateAsync(deactivateTarget._id);
      toast.success(t('insurance.companies.toast.deactivated'));
    } catch {
      toast.error(t('insurance.companies.toast.deactivateFailed'));
    } finally {
      setDeactivateTarget(null);
    }
  }, [deactivateTarget, deactivateMutation]);

  // ── Columns ─────────────────────────────────────────

  const columns: ColumnDef<InsuranceCompany>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: t('insurance.companies.columns.companyName'),
      cell: (_v: unknown, row: InsuranceCompany) => (
        <div>
          <span className="text-sm font-medium">{row.name.en}</span>
          {row.name.ar && (
            <span className="text-muted-foreground ms-2 text-xs" dir="rtl">
              {row.name.ar}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'code',
      accessorKey: 'code',
      header: t('insurance.companies.columns.code'),
      cell: (_v: unknown, row: InsuranceCompany) => (
        <span className="font-mono text-sm">{row.code}</span>
      ),
    },
    {
      id: 'coveragePercentage',
      accessorKey: 'coveragePercentage',
      header: t('insurance.companies.columns.coveragePercent'),
      cell: (_v: unknown, row: InsuranceCompany) => (
        <span className="text-sm">{row.coveragePercentage}%</span>
      ),
    },
    {
      id: 'maxCoverage',
      accessorKey: 'maxCoverage',
      header: t('insurance.companies.columns.maxCoverage'),
      cell: (_v: unknown, row: InsuranceCompany) => (
        <span className="text-sm">{row.maxCoverage ? formatCurrency(row.maxCoverage) : '—'}</span>
      ),
    },
    {
      id: 'contact',
      accessorKey: 'contactPerson',
      header: t('insurance.companies.columns.contact'),
      cell: (_v: unknown, row: InsuranceCompany) => (
        <div className="text-sm">
          <div>{row.contactPerson || '—'}</div>
          {row.email && <div className="text-muted-foreground text-xs">{row.email}</div>}
        </div>
      ),
    },
    {
      id: 'status',
      accessorKey: 'isActive',
      header: t('insurance.companies.columns.status'),
      cell: (_v: unknown, row: InsuranceCompany) => (
        <Badge variant={row.isActive ? 'default' : 'outline'}>
          {row.isActive
            ? t('insurance.companies.status.active')
            : t('insurance.companies.status.inactive')}
        </Badge>
      ),
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: t('insurance.companies.columns.created'),
      cell: (_v: unknown, row: InsuranceCompany) => formatDate(row.createdAt),
    },
    {
      id: 'actions',
      header: '',
      cell: (_: unknown, company: InsuranceCompany) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/insurance-companies/${company._id}/edit`)}>
              <Pencil className="me-2 h-4 w-4" />
              {t('insurance.companies.actions.edit')}
            </DropdownMenuItem>
            {company.isActive && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeactivateTarget(company)}
                  className="text-destructive"
                >
                  <Trash2 className="me-2 h-4 w-4" />
                  {t('insurance.companies.actions.deactivate')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // ── Render ──────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t('insurance.companies.page.title')}
        description={t('insurance.companies.page.description')}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={!items.length}>
            <Download className="me-2 h-4 w-4" />
            {t('insurance.companies.actions.exportCsv')}
          </Button>
          <Button onClick={() => navigate('/insurance-companies/new')}>
            <Plus className="me-2 h-4 w-4" />
            {t('insurance.companies.actions.addCompany')}
          </Button>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        <form onSubmit={handleSearch} className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t('insurance.companies.search.placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </form>
      </div>

      {/* Data */}
      {isLoading ? (
        <TableSkeleton columns={8} rows={10} />
      ) : isError ? (
        <ErrorState
          title={t('insurance.companies.error.loadFailed')}
          message={error?.message}
          onRetry={refetch}
        />
      ) : !items.length ? (
        <EmptyState
          icon={<ShieldCheck className="h-6 w-6" />}
          title={t('insurance.companies.empty.title')}
          description={t('insurance.companies.empty.description')}
          action={{ label: 'Add Company', onClick: () => navigate('/insurance-companies/new') }}
        />
      ) : (
        <DataTable columns={columns} data={items} />
      )}

      {/* Deactivate Confirmation */}
      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title={t('insurance.companies.dialog.deactivateTitle')}
        description={`"${deactivateTarget?.name.en}" will be deactivated. Existing claims will not be affected.`}
        confirmLabel="Deactivate"
        variant="destructive"
        onConfirm={handleDeactivate}
      />
    </div>
  );
}
