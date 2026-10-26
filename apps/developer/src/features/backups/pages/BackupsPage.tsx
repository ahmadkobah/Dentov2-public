import { useState, useMemo } from 'react';
import { formatDate } from '../../../lib/date.js';
import {
  PageHeader,
  StatCard,
  DataTable,
  Badge,
  Button,
  Input,
  ConfirmDialog,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  type ColumnDef,
  type SortDirection,
} from '@dento/ui';
import {
  Database,
  Download,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  HardDrive,
  RefreshCw,
  Trash2,
  Server,
} from 'lucide-react';
import { toast } from '@dento/ui';
import {
  useBackups,
  useBackupStats,
  useTriggerBackup,
  useRestoreBackup,
  useDeleteBackup,
  type Backup,
  type BackupFilters,
  type BackupStatus,
} from '../hooks/useBackups.js';
import { BackupConfigPanel } from '../components/BackupConfigPanel.js';
import { TenantBackupConfigPanel } from '../components/TenantBackupConfigPanel.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';

// -- Helpers ------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return '—';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

const statusBadgeVariant: Record<
  BackupStatus,
  'default' | 'secondary' | 'destructive' | 'warning'
> = {
  completed: 'default',
  running: 'secondary',
  pending: 'warning',
  failed: 'destructive',
};

const typeLabels: Record<string, string> = {
  scheduled: 'Scheduled',
  manual: 'Manual',
  'pre-migration': 'Pre-Migration',
  'pre-delete': 'Pre-Delete',
};

const STATUSES: BackupStatus[] = ['completed', 'running', 'pending', 'failed'];

// -- Component ----------------------------------------------------------

export default function BackupsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BackupStatus | ''>('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Dialogs / confirmations
  const [triggerSlug, setTriggerSlug] = useState('');
  const [showTrigger, setShowTrigger] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Backup | null>(null);

  const filters: BackupFilters = useMemo(
    () => ({
      ...(search && { tenantSlug: search }),
      ...(statusFilter && { status: statusFilter }),
      page,
      limit: 15,
    }),
    [search, statusFilter, page],
  );

  const { data, isLoading, isError, refetch } = useBackups(filters);
  const { data: stats } = useBackupStats();
  const triggerBackup = useTriggerBackup();
  const restoreBackup = useRestoreBackup();
  const deleteBackup = useDeleteBackup();

  const items = data?.items ?? [];
  const total = data?.meta?.total ?? 0;
  const overview = stats?.overview;

  const handleSort = (column: string, direction: SortDirection) => {
    setSortBy(column);
    setSortDir(direction);
  };

  async function handleTrigger() {
    if (!triggerSlug.trim()) return;
    try {
      await triggerBackup.mutateAsync({ tenantSlug: triggerSlug.trim(), type: 'manual' });
      toast.success(`Backup queued for ${triggerSlug}`);
      setShowTrigger(false);
      setTriggerSlug('');
    } catch {
      toast.error('Failed to trigger backup');
    }
  }

  async function handleRestore() {
    if (!restoreTarget) return;
    try {
      await restoreBackup.mutateAsync(restoreTarget._id);
      toast.success('Restore job queued');
      setRestoreTarget(null);
    } catch {
      toast.error('Failed to queue restore');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteBackup.mutateAsync(deleteTarget._id);
      toast.success('Backup deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete backup');
    }
  }

  const columns: ColumnDef<Backup>[] = [
    {
      id: 'tenantSlug',
      header: 'Tenant',
      sortable: true,
      cell: (_val, row) => (
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{row.tenantSlug}</span>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (_val, row) => (
        <Badge variant={statusBadgeVariant[row.status]} className="gap-1 text-xs capitalize">
          {row.status === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
          {row.status}
        </Badge>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      cell: (_val, row) => (
        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          {typeLabels[row.type] ?? row.type}
        </span>
      ),
    },
    {
      id: 'fileSize',
      header: 'Size',
      cell: (_val, row) => (
        <span className="text-sm text-gray-500">{formatBytes(row.fileSize)}</span>
      ),
    },
    {
      id: 'retentionDays',
      header: 'Retention',
      cell: (_val, row) => <span className="text-sm text-gray-500">{row.retentionDays}d</span>,
    },
    {
      id: 'createdAt',
      header: 'Created',
      sortable: true,
      cell: (_val, row) => (
        <span className="text-sm text-gray-500">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (_val, row) => (
        <div className="flex items-center gap-1">
          {row.status === 'completed' && row.filePath && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              title="Download"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`/api/backups/${row._id}/download`, '_blank');
              }}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
          {row.status === 'completed' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              title="Restore"
              onClick={(e) => {
                e.stopPropagation();
                setRestoreTarget(row);
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Backups" description="Manage tenant database backups — §34">
        <Button size="sm" onClick={() => setShowTrigger(true)}>
          <Plus className="me-1.5 h-4 w-4" />
          Trigger Backup
        </Button>
      </PageHeader>

      {/* Backup Configuration Panel */}
      <BackupConfigPanel />

      {/* Per-Tenant Backup Configuration */}
      <TenantBackupConfigPanel />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Backups"
          value={overview?.totalBackups ?? 0}
          icon={<Database className="h-5 w-5" />}
          variant="default"
        />
        <StatCard
          title="Completed"
          value={overview?.completedBackups ?? 0}
          icon={<CheckCircle2 className="h-5 w-5" />}
          variant="success"
        />
        <StatCard
          title="Failed"
          value={overview?.failedBackups ?? 0}
          icon={<XCircle className="h-5 w-5" />}
          variant="error"
        />
        <StatCard
          title="Total Storage"
          value={overview ? `${(overview.totalStorageBytes / 1024 ** 3).toFixed(1)} GB` : '—'}
          icon={<HardDrive className="h-5 w-5" />}
          variant="info"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Filter by tenant slug…"
            aria-label="Filter backups by tenant"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="ps-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500">Status:</span>
          {STATUSES.map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs capitalize"
              onClick={() => {
                setStatusFilter(statusFilter === s ? '' : s);
                setPage(1);
              }}
            >
              {s}
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
        emptyMessage="No backups found."
      />

      {/* Trigger Backup Dialog */}
      <AlertDialog open={showTrigger} onOpenChange={setShowTrigger}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trigger Manual Backup</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the tenant slug to create a new backup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              value={triggerSlug}
              onChange={(e) => setTriggerSlug(e.target.value)}
              placeholder="e.g. cairo-dental"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTrigger}
              disabled={!triggerSlug.trim() || triggerBackup.isPending}
            >
              {triggerBackup.isPending ? 'Queuing…' : 'Trigger Backup'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation */}
      <ConfirmDialog
        open={!!restoreTarget}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        title="Restore Backup"
        description={`Are you sure you want to restore the backup for "${restoreTarget?.tenantSlug}"? This will overwrite the current database for that tenant.`}
        confirmLabel={restoreBackup.isPending ? 'Restoring…' : 'Restore'}
        onConfirm={handleRestore}
        variant="destructive"
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Backup"
        description={`Delete the ${deleteTarget?.type} backup for "${deleteTarget?.tenantSlug}"? This cannot be undone.`}
        confirmLabel={deleteBackup.isPending ? 'Deleting…' : 'Delete'}
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
