import { useState, useMemo } from 'react';
import {
  PageHeader,
  StatCard,
  DataTable,
  Badge,
  Button,
  Input,
  type ColumnDef,
  type SortDirection,
} from '@dento/ui';
import { Globe, CheckCircle, AlertTriangle, Clock, Plus, Search } from 'lucide-react';
import { useDomains, type Domain, type DomainFilters } from '../hooks/useDomains.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';
import { AddDomainDialog } from '../components/AddDomainDialog.js';
import { DomainDetailSheet } from '../components/DomainDetailSheet.js';

const sslBadgeVariant: Record<string, 'default' | 'destructive' | 'warning' | 'secondary'> = {
  active: 'default',
  pending: 'warning',
  expired: 'destructive',
  error: 'destructive',
};

const SSL_STATUSES = ['pending', 'active', 'expired', 'error'] as const;

export default function DomainsPage() {
  const [search, setSearch] = useState('');
  const [sslFilter, setSslFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);

  const filters: DomainFilters = useMemo(
    () => ({
      ...(search && { tenantSlug: search }),
      ...(sslFilter && { sslStatus: sslFilter }),
      page,
      limit: 15,
    }),
    [search, sslFilter, page],
  );

  const { data, isLoading, isError, refetch } = useDomains(filters);

  // Compute stats from current page (approximation — full stats would need a dedicated endpoint)
  const items = data?.items ?? [];
  const total = data?.meta?.total ?? 0;
  const activeCount = items.filter((d) => d.isActive && d.sslStatus === 'active').length;
  const pendingCount = items.filter((d) => d.sslStatus === 'pending').length;
  const errorCount = items.filter(
    (d) => d.sslStatus === 'error' || d.sslStatus === 'expired',
  ).length;

  const handleSort = (column: string, direction: SortDirection) => {
    setSortBy(column);
    setSortDir(direction);
  };

  const columns: ColumnDef<Domain>[] = [
    {
      id: 'customDomain',
      header: 'Domain',
      sortable: true,
      cell: (_val, row) => (
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{row.customDomain}</span>
        </div>
      ),
    },
    {
      id: 'tenantSlug',
      header: 'Tenant',
      accessorKey: 'tenantSlug',
      sortable: true,
    },
    {
      id: 'dnsVerified',
      header: 'DNS',
      cell: (_val, row) =>
        row.dnsVerified ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        ),
    },
    {
      id: 'sslStatus',
      header: 'SSL',
      cell: (_val, row) => (
        <Badge
          variant={sslBadgeVariant[row.sslStatus] ?? 'secondary'}
          className="capitalize text-xs"
        >
          {row.sslStatus}
        </Badge>
      ),
    },
    {
      id: 'isActive',
      header: 'Status',
      cell: (_val, row) => (
        <Badge variant={row.isActive ? 'default' : 'secondary'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'createdAt',
      header: 'Created',
      sortable: true,
      cell: (_val, row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.createdAt).toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Custom Domains" description="Manage custom domains for tenant portals">
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          <Plus className="me-1.5 h-4 w-4" />
          Add Domain
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Domains"
          value={total}
          icon={<Globe className="h-5 w-5" />}
          variant="default"
        />
        <StatCard
          title="Active"
          value={activeCount}
          icon={<CheckCircle className="h-5 w-5" />}
          variant="success"
        />
        <StatCard
          title="Pending"
          value={pendingCount}
          icon={<Clock className="h-5 w-5" />}
          variant="warning"
        />
        <StatCard
          title="Errors"
          value={errorCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant="error"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Filter by tenant slug…"
            aria-label="Filter domains by tenant"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="ps-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500">SSL:</span>
          {SSL_STATUSES.map((status) => (
            <Button
              key={status}
              variant={sslFilter === status ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs capitalize"
              onClick={() => {
                setSslFilter(sslFilter === status ? '' : status);
                setPage(1);
              }}
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {isError && <QueryErrorBanner onRetry={() => refetch()} />}

      {/* Table */}
      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        pageSize={15}
        currentPage={page}
        totalItems={total}
        onPageChange={setPage}
        sortColumn={sortBy}
        sortDirection={sortDir}
        onSort={handleSort}
        rowKey={(row) => row._id}
        onRowClick={setSelectedDomain}
        emptyMessage="No domains configured yet."
      />

      {/* Add Domain Dialog */}
      <AddDomainDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

      {/* Domain Detail Sheet */}
      <DomainDetailSheet
        domain={selectedDomain}
        open={!!selectedDomain}
        onOpenChange={(open) => !open && setSelectedDomain(null)}
      />
    </div>
  );
}
