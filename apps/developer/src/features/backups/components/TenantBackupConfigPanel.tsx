import { useState, useEffect, useMemo } from 'react';
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
} from '@dento/ui';
import {
  Settings,
  Save,
  Loader2,
  Plus,
  Trash2,
  Clock,
  Database,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  useTenantBackupConfigs,
  useCreateTenantBackupConfig,
  useUpdateTenantBackupConfig,
  useDeleteTenantBackupConfig,
  type TenantBackupConfig,
  type BackupFrequency,
  type BackupGroup,
} from '../hooks/useBackups.js';

// ── Constants ───────────────────────────────────────────────

const BACKUP_GROUPS: { value: BackupGroup; label: string; description: string }[] = [
  {
    value: 'clinical',
    label: 'Clinical',
    description: 'Patients, charts, treatment plans, consent forms',
  },
  {
    value: 'appointments',
    label: 'Appointments',
    description: 'Appointments, schedules, walk-in queues',
  },
  { value: 'imaging', label: 'Imaging', description: 'X-rays, CBCT, scans' },
  {
    value: 'financial',
    label: 'Financial',
    description: 'Invoices, payments, insurance, commissions',
  },
  { value: 'inventory', label: 'Inventory', description: 'Products, stock, transfers' },
  { value: 'lab', label: 'Lab', description: 'Lab orders, dental labs' },
  { value: 'medications', label: 'Medications', description: 'Medications, prescriptions' },
  { value: 'hr', label: 'HR', description: 'Leave, attendance, doctors' },
  {
    value: 'communications',
    label: 'Communications',
    description: 'Chat, notifications, WhatsApp',
  },
  { value: 'automation', label: 'Automation', description: 'Workflows, reports, webhooks' },
  {
    value: 'settings',
    label: 'Settings',
    description: 'Clinic settings, services, roles, branches',
  },
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

// ── Tenant Config Row ───────────────────────────────────────

function TenantConfigRow({
  config,
  onUpdate,
  onDelete,
  isUpdating,
}: {
  config: TenantBackupConfig;
  onUpdate: (slug: string, data: Partial<TenantBackupConfig>) => void;
  onDelete: (slug: string) => void;
  isUpdating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [frequency, setFrequency] = useState<BackupFrequency>(config.frequency);
  const [hour, setHour] = useState(config.hour);
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(config.dayOfWeek);
  const [dayOfMonth, setDayOfMonth] = useState<number | null>(config.dayOfMonth);
  const [retentionDays, setRetentionDays] = useState(config.retentionDays);
  const [excludeGroups, setExcludeGroups] = useState<BackupGroup[]>(config.excludeGroups);
  const [autoBackupOnMigration, setAutoBackupOnMigration] = useState(config.autoBackupOnMigration);
  const [autoBackupOnDelete, setAutoBackupOnDelete] = useState(config.autoBackupOnDelete);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
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

  function handleSave() {
    onUpdate(config.tenantSlug, {
      frequency,
      hour,
      dayOfWeek: frequency === 'weekly' ? dayOfWeek : null,
      dayOfMonth: frequency === 'monthly' ? dayOfMonth : null,
      retentionDays,
      excludeGroups,
      autoBackupOnMigration,
      autoBackupOnDelete,
    });
    setDirty(false);
  }

  const scheduleLabel = useMemo(() => {
    const h = `${hour.toString().padStart(2, '0')}:00 UTC`;
    if (frequency === 'daily') return `Daily at ${h}`;
    if (frequency === 'weekly')
      return `Every ${DAY_OF_WEEK_OPTIONS.find((d) => d.value === dayOfWeek)?.label ?? 'Sunday'} at ${h}`;
    return `Monthly on day ${dayOfMonth ?? 1} at ${h}`;
  }, [frequency, hour, dayOfWeek, dayOfMonth]);

  return (
    <div className="rounded-lg border">
      {/* Header Row */}
      <div
        className="flex cursor-pointer items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Badge variant={config.backupEnabled ? 'default' : 'secondary'} className="text-xs">
            {config.backupEnabled ? 'Active' : 'Disabled'}
          </Badge>
          <span className="font-medium">{config.tenantSlug}</span>
          <span className="text-xs text-gray-500">
            <Clock className="me-1 inline h-3 w-3" />
            {scheduleLabel}
          </span>
          <span className="text-xs text-gray-500">
            <Database className="me-1 inline h-3 w-3" />
            {includedCount}/{BACKUP_GROUPS.length} groups
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={config.backupEnabled}
            onCheckedChange={(enabled) => onUpdate(config.tenantSlug, { backupEnabled: enabled })}
            onClick={(e) => e.stopPropagation()}
          />
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Config */}
      {expanded && (
        <div className="border-t p-4 space-y-4">
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

          {/* Backup Groups */}
          <div>
            <Label className="mb-2 block text-sm font-medium">Backup Groups</Label>
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
          </div>

          {/* Auto-backup Toggles */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <Shield className="h-4 w-4 text-blue-500" />
              <div>
                <Label className="text-sm font-medium">Auto-Backup on Cancellation</Label>
                <p className="text-[11px] text-gray-500">Before status → cancelled</p>
              </div>
              <Switch
                checked={autoBackupOnMigration}
                onCheckedChange={(v) => {
                  setAutoBackupOnMigration(v);
                  setDirty(true);
                }}
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <Shield className="h-4 w-4 text-red-500" />
              <div>
                <Label className="text-sm font-medium">Auto-Backup on Deletion</Label>
                <p className="text-[11px] text-gray-500">Before permanent delete</p>
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

          {/* Actions */}
          <div className="flex items-center justify-between border-t pt-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600"
              onClick={() => onDelete(config.tenantSlug)}
            >
              <Trash2 className="me-1.5 h-4 w-4" />
              Remove Config
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!dirty || isUpdating}>
              {isUpdating ? (
                <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="me-1.5 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────

export function TenantBackupConfigPanel() {
  const { data: configs, isLoading } = useTenantBackupConfigs();
  const createConfig = useCreateTenantBackupConfig();
  const updateConfig = useUpdateTenantBackupConfig();
  const deleteConfig = useDeleteTenantBackupConfig();

  const [newSlug, setNewSlug] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  async function handleCreate() {
    if (!newSlug.trim()) return;
    try {
      await createConfig.mutateAsync({ tenantSlug: newSlug.trim() });
      setNewSlug('');
      setShowAdd(false);
    } catch {
      /* error handled by hook */
    }
  }

  function handleUpdate(tenantSlug: string, data: Partial<TenantBackupConfig>) {
    updateConfig.mutate({ tenantSlug, ...data });
  }

  function handleDelete(tenantSlug: string) {
    if (
      window.confirm(
        `Remove backup configuration for "${tenantSlug}"? Existing backups will not be deleted.`,
      )
    ) {
      deleteConfig.mutate(tenantSlug);
    }
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading tenant backup configs…
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-500" />
          <h3 className="text-base font-semibold">Per-Tenant Backup Configuration</h3>
          <Badge variant="secondary" className="text-xs">
            {configs?.length ?? 0} tenants configured
          </Badge>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="me-1.5 h-4 w-4" />
          Add Tenant
        </Button>
      </div>

      {/* Add Tenant Form */}
      {showAdd && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border bg-gray-50 p-3 dark:bg-gray-800/30">
          <Input
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            placeholder="Enter tenant slug…"
            className="max-w-xs"
            autoFocus
          />
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={!newSlug.trim() || createConfig.isPending}
          >
            {createConfig.isPending ? (
              <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="me-1.5 h-4 w-4" />
            )}
            Create
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
            Cancel
          </Button>
        </div>
      )}

      {/* Tenant Config List */}
      <div className="space-y-2">
        {configs && configs.length > 0 ? (
          configs.map((config) => (
            <TenantConfigRow
              key={config._id}
              config={config}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              isUpdating={updateConfig.isPending}
            />
          ))
        ) : (
          <p className="py-8 text-center text-sm text-gray-500">
            No per-tenant backup configurations yet. Click "Add Tenant" to set one up.
          </p>
        )}
      </div>
    </Card>
  );
}
