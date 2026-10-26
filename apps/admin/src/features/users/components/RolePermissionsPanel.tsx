/**
 * RolePermissionsPanel — view/edit matrix for managing role permissions.
 * Starts in view mode; admin clicks Edit to toggle permissions, then Save.
 */

import { useState, useCallback, useEffect } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Button } from '@dento/ui';
import {
  Shield,
  Check,
  X,
  Eye,
  PenLine,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  Loader2,
  Pencil,
} from 'lucide-react';
import {
  useSingleRolePermissions,
  useUpdateRolePermissions,
  useResetRolePermissions,
  type Permission,
} from '../hooks/useRolePermissions.js';
import { useTranslation } from '@/stores/locale.store.js';

interface ModuleEntry {
  slug: string;
  label: string;
  group: string;
}

const MODULES: ModuleEntry[] = [
  // Core
  { slug: 'dashboard', label: 'Dashboard', group: 'Core' },
  { slug: 'daily-operations', label: 'Daily Operations', group: 'Core' },
  // Clinical
  { slug: 'patients', label: 'Patients', group: 'Clinical' },
  { slug: 'appointments', label: 'Appointments', group: 'Clinical' },
  { slug: 'dental-charts', label: 'Dental Charts', group: 'Clinical' },
  { slug: 'treatment-plans', label: 'Treatment Plans', group: 'Clinical' },
  { slug: 'procedure-notes', label: 'Procedure Notes', group: 'Clinical' },
  { slug: 'prescriptions', label: 'Prescriptions', group: 'Medical' },
  { slug: 'xrays', label: 'X-Rays', group: 'Medical' },
  { slug: 'cbct', label: 'CBCT', group: 'Medical' },
  { slug: 'lab-orders', label: 'Lab Orders', group: 'Medical' },
  { slug: 'consent-forms', label: 'Consent Forms', group: 'Medical' },
  // Financial
  { slug: 'invoices', label: 'Invoices', group: 'Financial' },
  { slug: 'payments', label: 'Payments', group: 'Financial' },
  { slug: 'insurance', label: 'Insurance', group: 'Financial' },
  { slug: 'installments', label: 'Installments', group: 'Financial' },
  { slug: 'commissions', label: 'Commissions', group: 'Financial' },
  // Operations
  { slug: 'inventory', label: 'Inventory', group: 'Operations' },
  { slug: 'branches', label: 'Branches', group: 'Operations' },
  { slug: 'staff', label: 'Staff / Users', group: 'Operations' },
  { slug: 'doctors', label: 'Doctors', group: 'Operations' },
  { slug: 'schedules', label: 'Schedules', group: 'Operations' },
  { slug: 'leave', label: 'Leave', group: 'Operations' },
  { slug: 'attendance', label: 'Attendance', group: 'Operations' },
  // System
  { slug: 'reports', label: 'Reports', group: 'System' },
  { slug: 'notifications', label: 'Notifications', group: 'System' },
  { slug: 'webhooks', label: 'Webhooks', group: 'System' },
  { slug: 'settings', label: 'Settings', group: 'System' },
];

type CustomizableRole =
  | 'dentist'
  | 'receptionist'
  | 'assistant'
  | 'accountant'
  | 'lab_tech'
  | 'hygienist';

const ROLES: { key: CustomizableRole; label: string }[] = [
  { key: 'dentist', label: 'Dentist' },
  { key: 'receptionist', label: 'Receptionist' },
  { key: 'assistant', label: 'Assistant' },
  { key: 'accountant', label: 'Accountant' },
  { key: 'lab_tech', label: 'Lab Tech' },
  { key: 'hygienist', label: 'Hygienist' },
];

const ALL_PERMISSIONS: Permission[] = ['read', 'create', 'update', 'delete'];

const PERM_ICONS: Record<Permission, typeof Eye> = {
  read: Eye,
  create: Plus,
  update: PenLine,
  delete: Trash2,
};

const PERM_LABELS: Record<Permission, string> = {
  read: 'Read',
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
};

export default function RolePermissionsPanel() {
  const { t } = useTranslation();
  const [selectedRole, setSelectedRole] = useState<CustomizableRole>('dentist');
  const [localPerms, setLocalPerms] = useState<Record<string, Permission[]>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const { data, isLoading, error } = useSingleRolePermissions(selectedRole);
  const updateMutation = useUpdateRolePermissions();
  const resetMutation = useResetRolePermissions();

  // Sync API data → local state when role changes or data loads
  useEffect(() => {
    if (data?.effective) {
      setLocalPerms(data.effective as Record<string, Permission[]>);
      setIsDirty(false);
    }
  }, [data]);

  // Exit edit mode when switching roles
  useEffect(() => {
    setIsEditing(false);
    setIsDirty(false);
  }, [selectedRole]);

  const togglePermission = useCallback((module: string, perm: Permission) => {
    setLocalPerms((prev) => {
      const current = prev[module] ?? [];
      const next = current.includes(perm) ? current.filter((p) => p !== perm) : [...current, perm];
      return { ...prev, [module]: next };
    });
    setIsDirty(true);
  }, []);

  const handleSave = () => {
    const modules = Object.entries(localPerms).map(([module, permissions]) => ({
      module,
      permissions,
    }));
    updateMutation.mutate(
      { role: selectedRole, modules },
      {
        onSuccess: () => {
          setIsDirty(false);
          setIsEditing(false);
        },
      },
    );
  };

  const handleCancel = () => {
    // Revert to server state
    if (data?.effective) {
      setLocalPerms(data.effective as Record<string, Permission[]>);
    }
    setIsDirty(false);
    setIsEditing(false);
  };

  const handleReset = () => {
    resetMutation.mutate(selectedRole, {
      onSuccess: () => {
        setIsDirty(false);
        setIsEditing(false);
      },
    });
  };

  const groups = MODULES.reduce(
    (acc, m) => {
      (acc[m.group] ??= []).push(m);
      return acc;
    },
    {} as Record<string, ModuleEntry[]>,
  );

  const defaults = data?.defaults as Record<string, Permission[]> | undefined;
  const hasTenantContext = data?.hasTenantContext ?? false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="text-primary h-5 w-5" />
          <h3 className="text-lg font-semibold">{t('users.permissions.title')}</h3>
          {isEditing && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {t('users.permissions.editing')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedRole}
            onValueChange={(v) => setSelectedRole(v as CustomizableRole)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.key} value={r.key}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              disabled={!hasTenantContext || isLoading || !!error}
            >
              <Pencil className="me-1 h-3.5 w-3.5" />
              {t('users.permissions.edit')}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={resetMutation.isPending}
              >
                <RotateCcw className="me-1 h-3.5 w-3.5" />
                {t('users.permissions.resetToDefaults')}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                {t('users.common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="me-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="me-1 h-3.5 w-3.5" />
                )}
                {t('users.permissions.save')}
              </Button>
            </>
          )}
        </div>
      </div>

      <p className="text-muted-foreground text-sm">
        {isEditing ? t('users.permissions.editHint') : t('users.permissions.viewHint')}
      </p>

      {!isLoading && !error && data && !hasTenantContext && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
          <p className="text-sm text-blue-600 dark:text-blue-400">
            {t('users.permissions.defaultsOnly')}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <p className="text-sm text-red-600 dark:text-red-400">
            {t('users.permissions.loadFailed')}:{' '}
            {error instanceof Error ? error.message : t('users.permissions.unknownError')}
          </p>
        </div>
      ) : (
        Object.entries(groups).map(([group, modules]) => (
          <div key={group}>
            <h4 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
              {group}
            </h4>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-start font-medium">
                      {t('users.permissions.module')}
                    </th>
                    {ALL_PERMISSIONS.map((p) => {
                      const Icon = PERM_ICONS[p];
                      return (
                        <th key={p} className="px-3 py-2 text-center font-medium">
                          <div className="flex items-center justify-center gap-1">
                            <Icon className="h-3.5 w-3.5" />
                            {PERM_LABELS[p]}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {modules.map((mod, i) => {
                    const current = localPerms[mod.slug] ?? [];
                    const defaultPerms = defaults?.[mod.slug] ?? [];
                    return (
                      <tr key={mod.slug} className={i < modules.length - 1 ? 'border-b' : ''}>
                        <td className="px-4 py-2.5 font-medium">{mod.label}</td>
                        {ALL_PERMISSIONS.map((perm) => {
                          const active = current.includes(perm);
                          const isDefault = defaultPerms.includes(perm);
                          const isExtra = active && !isDefault;
                          return (
                            <td key={perm} className="px-3 py-2.5 text-center">
                              {isEditing ? (
                                /* ── Edit mode: all cells are clickable toggles ── */
                                <button
                                  type="button"
                                  onClick={() => togglePermission(mod.slug, perm)}
                                  className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
                                    active
                                      ? isExtra
                                        ? 'border-blue-300 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                        : 'border-green-300 bg-green-100 text-green-700 hover:bg-green-200 dark:border-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      : 'border-dashed border-gray-300 bg-white text-gray-400 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700'
                                  }`}
                                  title={
                                    active
                                      ? `Click to revoke ${perm}${isExtra ? ' (extra — beyond default)' : ''}`
                                      : `Click to grant ${perm}${!isDefault ? ' (extra — beyond default)' : ''}`
                                  }
                                >
                                  {active ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <span className="h-3 w-0.5" />
                                  )}
                                </button>
                              ) : (
                                /* ── View mode: static indicator ── */
                                <span
                                  className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${
                                    active
                                      ? isExtra
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-green-600 dark:text-green-400'
                                      : 'text-muted-foreground/30'
                                  }`}
                                  title={
                                    active
                                      ? isExtra
                                        ? `${perm} (custom — beyond default)`
                                        : perm
                                      : `No ${perm} permission`
                                  }
                                >
                                  {active ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <X className="h-3 w-3" />
                                  )}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
