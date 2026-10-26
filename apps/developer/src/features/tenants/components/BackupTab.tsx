import { useState, useEffect, useMemo } from 'react';
import { formatDate } from '../../../lib/date.js';
import {
  Card,
  Button,
  Input,
  Label,
  Badge,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DataTable,
  type ColumnDef,
  ConfirmDialog,
} from '@dento/ui';
import {
  HardDrive,
  Save,
  Loader2,
  Plus,
  Clock,
  Database,
  Shield,
  Download,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  Server,
} from 'lucide-react';
import type { TenantDetail } from '../types/tenant-detail.types.js';
import {
  useTenantBackupConfig,
  useCreateTenantBackupConfig,
  useUpdateTenantBackupConfig,
  useBackups,
  useBackupStats,
  useTriggerBackup,
  useRestoreBackup,
  useDeleteBackup,
  type BackupFrequency,
  type BackupGroup,
  type Backup,
  type BackupStatus,
} from '../../backups/hooks/useBackups.js';

// ── Constants ───────────────────────────────────────────────

const BACKUP_GROUPS: { value: BackupGroup; label: string; description: string }[] = [
  { value: 'clinical', label: 'Clinical', description: 'Patients, charts, treatment plans' },
  { value: 'appointments', label: 'Appointments', description: 'Appointments, schedules' },
  { value: 'imaging', label: 'Imaging', description: 'X-rays, CBCT, scans' },
  { value: 'financial', label: 'Financial', description: 'Invoices, payments, insurance' },
  { value: 'inventory', label: 'Inventory', description: 'Products, stock' },
  { value: 'lab', label: 'Lab', description: 'Lab orders, dental labs' },
  { value: 'medications', label: 'Medications', description: 'Medications, prescriptions' },
  { value: 'hr', label: 'HR', description: 'Leave, attendance' },
  { value: 'communications', label: 'Communications', description: 'Chat, notifications' },
  { value: 'automation', label: 'Automation', description: 'Workflows, reports, webhooks' },
  { value: 'settings', label: 'Settings', description: 'Clinic settings, roles, branches' },
];

const FREQUENCY_OPTIONS: { value: BackupFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const DAY_OF_WEEK_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

const statusVariant: Record<BackupStatus, 'default' | 'secondary' | 'destructive' | 'warning'> = {
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

// ── Main Component ──────────────────────────────────────────

export function BackupTab({ tenant }: { tenant: TenantDetail; tenantId: string }) {
  const tenantSlug = tenant.slug;

  // Config
  const { data: config, isLoading: configLoading } = useTenantBackupConfig(tenantSlug);
  const createConfig = useCreateTenantBackupConfig();
  const updateConfig = useUpdateTenantBackupConfig();

  // Backup history
  const [page, setPage] = useState(1);
  const { data: backupsData, isLoading: backupsLoading } = useBackups({
    tenantSlug,
    page,
    limit: 10,
  });
  const { data: stats } = useBackupStats(tenantSlug);

  // Actions
  const triggerBackup = useTriggerBackup();
  const restoreBackup = useRestoreBackup();
  const deleteBackup = useDeleteBackup();
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Backup | null>(null);

  // Config form state
  const [backupEnabled, setBackupEnabled] = useState(true);
  const [frequency, setFrequency] = useState<BackupFrequency>('daily');
  const [hour, setHour] = useState(3);
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(null);
  const [dayOfMonth, setDayOfMonth] = useState<number | null>(null);
  const [retentionDays, setRetentionDays] = useState(30);
  const [excludeGroups, setExcludeGroups] = useState<BackupGroup[]>([]);
  const [autoBackupOnMigration, setAutoBackupOnMigration] = useState(true);
  const [autoBackupOnDelete, setAutoBackupOnDelete] = useState(true);
  const [dirty, setDirty] = useState(false);

  const hasConfig = !!config;

  // Populate from server
  useEffect(() => {
    if (!config) return;
    setBackupEnabled(config.backupEnabled);
    setFrequency(config.frequency);
    setHour(config.hour);
    setDayOfWeek(config.dayOfWeek);
    setDayOfMonth(config.dayOfMonth);
    setRetentionDays(config.retentionDays);
    setExcludeGroups(config.excludeGroups);
    setAutoBackupOnMigration(config.autoBackupOnMigration);
    setAutoBackupOnDelete(config.autoBackupOnDelete);
    setDirty(false);
  }, [config]);

  const includedCount = BACKUP_GROUPS.length - excludeGroups.length;

  function toggleGroup(group: BackupGroup) {
    setExcludeGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group],
    );
    setDirty(true);
  }

  async function handleSave() {
    const data = {
      backupEnabled,
      frequency,
      hour,
      dayOfWeek: frequency === 'weekly' ? dayOfWeek : null,
      dayOfMonth: frequency === 'monthly' ? dayOfMonth : null,
      retentionDays,
      excludeGroups,
      autoBackupOnMigration,
      autoBackupOnDelete,
    };

    try {
      if (hasConfig) {
        await updateConfig.mutateAsync({ tenantSlug, ...data });
      } else {
        await createConfig.mutateAsync({ tenantSlug, ...data });
      }
      setDirty(false);
    } catch {
      /* handled by hook */
    }
  }

  async function handleTrigger() {
    try {
      await triggerBackup.mutateAsync({ tenantSlug, type: 'manual' });
    } catch {
      /* handled by hook */
    }
  }

  async function handleRestore() {
    if (!restoreTarget) return;
    try {
      await restoreBackup.mutateAsync(restoreTarget._id);
      setRestoreTarget(null);
    } catch {
      /* handled by hook */
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteBackup.mutateAsync(deleteTarget._id);
      setDeleteTarget(null);
    } catch {
      /* handled by hook */
    }
  }

  const scheduleLabel = useMemo(() => {
    const h = `${hour.toString().padStart(2, '0')}:00 UTC`;
    if (frequency === 'daily') return `Daily at ${h}`;
    if (frequency === 'weekly')
      return `Every ${DAY_OF_WEEK_OPTIONS.find((d) => d.value === dayOfWeek)?.label ?? 'Sunday'} at ${h}`;
    return `Monthly on day ${dayOfMonth ?? 1} at ${h}`;
  }, [frequency, hour, dayOfWeek, dayOfMonth]);

  const items = backupsData?.items ?? [];
  const total = backupsData?.meta?.total ?? 0;
  const overview = stats?.overview;

  const columns: ColumnDef<Backup>[] = [
    {
      id: 'status',
      header: 'Status',
      cell: (_val, row) => (
        <Badge variant={statusVariant[row.status]} className="gap-1 text-xs capitalize">
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
      cell: (_val, row) => (
        <span className="text-sm text-gray-500">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
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

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Config Card */}
      <Card className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-gray-500" />
            <h3 className="text-base font-semibold">Backup Configuration</h3>
            {hasConfig ? (
              <Badge variant={backupEnabled ? 'default' : 'secondary'} className="text-xs">
                {backupEnabled ? 'Active' : 'Disabled'}
              </Badge>
            ) : (
              <Badge variant="warning" className="text-xs">
                Not Configured
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasConfig && (
              <Switch
                checked={backupEnabled}
                onCheckedChange={(v) => {
                  setBackupEnabled(v);
                  setDirty(true);
                }}
              />
            )}
            <Button size="sm" onClick={handleSave} disabled={!dirty && hasConfig}>
              {updateConfig.isPending || createConfig.isPending ? (
                <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="me-1.5 h-4 w-4" />
              )}
              {hasConfig ? 'Save Changes' : 'Enable Backups'}
            </Button>
          </div>
        </div>

        {/* Schedule Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Frequency</Label>
            <Select
              value={frequency}
              onValueChange={(v) => {
                setFrequency(v as BackupFrequency);
                setDirty(true);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Hour (UTC)</Label>
            <Select
              value={String(hour)}
              onValueChange={(v) => {
                setHour(Number(v));
                setDirty(true);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {i.toString().padStart(2, '0')}:00
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {frequency === 'weekly' && (
            <div className="space-y-1.5">
              <Label className="text-sm">Day of Week</Label>
              <Select
                value={String(dayOfWeek ?? 0)}
                onValueChange={(v) => {
                  setDayOfWeek(Number(v));
                  setDirty(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_OF_WEEK_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {frequency === 'monthly' && (
            <div className="space-y-1.5">
              <Label className="text-sm">Day of Month</Label>
              <Select
                value={String(dayOfMonth ?? 1)}
                onValueChange={(v) => {
                  setDayOfMonth(Number(v));
                  setDirty(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm">Retention (days)</Label>
            <Input
              type="number"
              min={1}
              max={365}
              value={retentionDays}
              onChange={(e) => {
                setRetentionDays(Number(e.target.value));
                setDirty(true);
              }}
            />
          </div>
        </div>

        {/* Summary Badge */}
        {hasConfig && (
          <div className="mt-3">
            <Badge variant="secondary" className="text-xs">
              <Clock className="me-1 h-3 w-3" />
              {scheduleLabel}
            </Badge>
          </div>
        )}
      </Card>

      {/* Backup Groups Card */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Database className="h-5 w-5 text-gray-500" />
          <h3 className="text-base font-semibold">Data Groups</h3>
          <Badge variant="secondary" className="text-xs">
            {includedCount}/{BACKUP_GROUPS.length} included
          </Badge>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {BACKUP_GROUPS.map((group) => {
            const excluded = excludeGroups.includes(group.value);
            return (
              <div
                key={group.value}
                className={`flex items-center justify-between rounded-md border p-2.5 ${
                  excluded
                    ? 'border-gray-200 bg-gray-50 opacity-60 dark:border-gray-700 dark:bg-gray-800/30'
                    : ''
                }`}
              >
                <div>
                  <span className="text-sm font-medium">{group.label}</span>
                  <p className="text-[11px] text-gray-500">{group.description}</p>
                </div>
                <Switch checked={!excluded} onCheckedChange={() => toggleGroup(group.value)} />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Safety Toggles */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-gray-500" />
          <h3 className="text-base font-semibold">Safety Backups</h3>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Auto-Backup on Cancellation</Label>
              <p className="text-[11px] text-gray-500">
                Creates backup before tenant status → cancelled
              </p>
            </div>
            <Switch
              checked={autoBackupOnMigration}
              onCheckedChange={(v) => {
                setAutoBackupOnMigration(v);
                setDirty(true);
              }}
            />
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Auto-Backup on Deletion</Label>
              <p className="text-[11px] text-gray-500">
                Creates backup before permanent tenant deletion
              </p>
            </div>
            <Switch
              checked={autoBackupOnDelete}
              onCheckedChange={(v) => {
                setAutoBackupOnDelete(v);
                setDirty(true);
              }}
            />
          </div>
        </div>
      </Card>

      {/* Backup History */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-gray-500" />
            <h3 className="text-base font-semibold">Backup History</h3>
            <Badge variant="secondary" className="text-xs">
              {overview?.completedBackups ?? 0} completed
            </Badge>
            {(overview?.failedBackups ?? 0) > 0 && (
              <Badge variant="destructive" className="text-xs">
                {overview?.failedBackups} failed
              </Badge>
            )}
          </div>
          <Button size="sm" onClick={handleTrigger} disabled={triggerBackup.isPending}>
            {triggerBackup.isPending ? (
              <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="me-1.5 h-4 w-4" />
            )}
            Trigger Backup
          </Button>
        </div>

        {/* Stats Mini Row */}
        {overview && (
          <div className="mb-4 flex flex-wrap gap-4">
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Database className="h-4 w-4" />
              {overview.totalBackups} total
            </div>
            <div className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              {overview.completedBackups} completed
            </div>
            {overview.failedBackups > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-red-500">
                <XCircle className="h-4 w-4" />
                {overview.failedBackups} failed
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <HardDrive className="h-4 w-4" />
              {(overview.totalStorageBytes / 1024 ** 2).toFixed(1)} MB
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          data={items}
          isLoading={backupsLoading}
          pageSize={10}
          currentPage={page}
          totalItems={total}
          onPageChange={setPage}
          rowKey={(row) => row._id}
          emptyMessage="No backups yet for this tenant."
        />
      </Card>

      {/* Restore Confirmation */}
      <ConfirmDialog
        open={!!restoreTarget}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        title="Restore Backup"
        description={`This will restore the backup to "${tenantSlug}" production database. A safety backup will be created first. This is a destructive operation.`}
        confirmLabel={restoreBackup.isPending ? 'Restoring…' : 'Restore'}
        onConfirm={handleRestore}
        variant="destructive"
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Backup"
        description={`Delete this ${deleteTarget?.type} backup? The S3/R2 file will also be removed. This cannot be undone.`}
        confirmLabel={deleteBackup.isPending ? 'Deleting…' : 'Delete'}
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
