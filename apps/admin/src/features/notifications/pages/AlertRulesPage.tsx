/**
 * Alert Rules Management Page
 *
 * Per ADMIN_PORTAL_SCREENS.md §20 — Alert Rules CRUD interface
 *
 * Features:
 * - Search + filter by trigger type
 * - Rule cards with status toggle, edit/delete
 * - Loading / error / empty states
 */

import { useState, useMemo } from 'react';
import { Button } from '@dento/ui';
import {
  Plus,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Clock,
  Activity,
  Zap,
  Bell,
  Calendar,
  FileText,
} from 'lucide-react';
import {
  useAlertRules,
  useDeleteAlertRule,
  useUpdateAlertRule,
  type AlertRule,
} from '../hooks/useAlertRules.js';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Helpers ────────────────────────────────────────────────────────────

function t(value: string | { en: string; ar?: string }): string {
  return typeof value === 'string' ? value : value.en;
}

const triggerTypeConfig: Record<string, { label: string; color: string; icon: typeof Zap }> = {
  low_stock: {
    label: 'Low Stock',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    icon: AlertTriangle,
  },
  appointment_no_show: {
    label: 'No Show',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: Calendar,
  },
  payment_overdue: {
    label: 'Payment Overdue',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    icon: Clock,
  },
  recall_due: {
    label: 'Recall Due',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: Bell,
  },
  queue_threshold: {
    label: 'Queue Threshold',
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    icon: Activity,
  },
  system_alert: {
    label: 'System Alert',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    icon: Zap,
  },
  clinical_alert: {
    label: 'Clinical Alert',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: FileText,
  },
};

function getTriggerConfig(type: string) {
  return (
    triggerTypeConfig[type] ?? {
      label: type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      icon: Zap,
    }
  );
}

// ── Page Component ─────────────────────────────────────────────────────

export function AlertRulesPage() {
  const { t: translate } = useTranslation();
  const { data: rules, isLoading, isError, error } = useAlertRules();
  const deleteMutation = useDeleteAlertRule();
  const updateMutation = useUpdateAlertRule();

  const [search, setSearch] = useState('');
  const [triggerFilter, setTriggerFilter] = useState<string>('all');

  // Collect unique trigger types from data
  const triggerTypes = useMemo(() => {
    if (!rules) return [] as string[];
    const set = new Set<string>();
    for (const r of rules) if (r.triggerType) set.add(r.triggerType);
    return Array.from(set).sort();
  }, [rules]);

  // Filtered rules
  const filtered = useMemo(() => {
    if (!rules) return [];
    return rules.filter((r) => {
      const name = t(r.name).toLowerCase();
      const matchesSearch = !search || name.includes(search.toLowerCase());
      const matchesTrigger = triggerFilter === 'all' || r.triggerType === triggerFilter;
      return matchesSearch && matchesTrigger;
    });
  }, [rules, search, triggerFilter]);

  const handleToggle = (rule: AlertRule) => {
    updateMutation.mutate({ id: rule._id, data: { isActive: !rule.isActive } });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  // ── Loading ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-destructive">
        <AlertCircle className="h-10 w-10" />
        <p className="text-sm">
          {(error as Error)?.message ?? translate('notifications.alertRules.error.loadFailed')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {translate('notifications.alertRules.page.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {translate('notifications.alertRules.page.description')}
          </p>
        </div>
        <Button
          variant="default"
          size="sm"
          aria-label={translate('notifications.alertRules.actions.createAlertRule')}
        >
          <Plus className="me-2 h-4 w-4" />
          {translate('notifications.alertRules.actions.newRule')}
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={translate('notifications.alertRules.search.placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background ps-9 pe-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
          <button
            type="button"
            onClick={() => setTriggerFilter('all')}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
              triggerFilter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {translate('notifications.alertRules.triggerTypes.all')}
          </button>
          {triggerTypes.map((type) => {
            return (
              <button
                key={type}
                type="button"
                onClick={() => setTriggerFilter(type)}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
                  triggerFilter === type
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {translate(
                  type === 'low_stock'
                    ? 'notifications.alertRules.triggerTypes.lowStock'
                    : type === 'appointment_no_show'
                      ? 'notifications.alertRules.triggerTypes.noShow'
                      : type === 'payment_overdue'
                        ? 'notifications.alertRules.triggerTypes.paymentOverdue'
                        : type === 'recall_due'
                          ? 'notifications.alertRules.triggerTypes.recallDue'
                          : type === 'queue_threshold'
                            ? 'notifications.alertRules.triggerTypes.queueThreshold'
                            : type === 'clinical_alert'
                              ? 'notifications.alertRules.triggerTypes.clinicalAlert'
                              : 'notifications.alertRules.triggerTypes.systemAlert',
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
          <AlertTriangle className="h-10 w-10" />
          <p className="text-sm">
            {search || triggerFilter !== 'all'
              ? translate('notifications.alertRules.empty.noMatch')
              : translate('notifications.alertRules.empty.noRules')}
          </p>
        </div>
      )}

      {/* Rule Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((rule) => {
          const cfg = getTriggerConfig(rule.triggerType);
          const TriggerIcon = cfg.icon;

          return (
            <div
              key={rule._id}
              className={`group relative flex flex-col gap-3 rounded-lg border p-4 transition hover:shadow-md ${
                rule.isActive
                  ? 'border-border bg-card'
                  : 'border-dashed border-muted bg-muted/30 opacity-70'
              }`}
            >
              {/* Top row: trigger badge + toggle */}
              <div className="flex items-start justify-between">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}
                >
                  <TriggerIcon className="h-3 w-3" />
                  {cfg.label}
                </span>

                <button
                  type="button"
                  onClick={() => handleToggle(rule)}
                  className="text-muted-foreground transition hover:text-foreground"
                  aria-label={
                    rule.isActive
                      ? translate('notifications.alertRules.actions.deactivateRule')
                      : translate('notifications.alertRules.actions.activateRule')
                  }
                >
                  {rule.isActive ? (
                    <ToggleRight className="h-5 w-5 text-primary" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Name */}
              <h3 className="text-sm font-semibold text-foreground leading-tight">
                {t(rule.name)}
              </h3>

              {/* Description / condition summary */}
              {rule.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{rule.description}</p>
              )}
              {rule.condition && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{rule.condition.metric}</span>{' '}
                  {rule.condition.operator} {rule.condition.threshold}
                  {rule.condition.timeWindowDays
                    ? ` ${translate('notifications.alertRules.stats.dWindow', {
                        days: rule.condition.timeWindowDays,
                      })}`
                    : ''}
                </p>
              )}

              {/* Stats row */}
              <div className="mt-auto flex items-center gap-3 border-t pt-3 text-xs text-muted-foreground">
                {rule.cooldownMinutes != null && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {translate('notifications.alertRules.stats.cooldown', {
                      minutes: rule.cooldownMinutes,
                    })}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {translate('notifications.alertRules.stats.triggers', {
                    count: rule.triggerCount ?? 0,
                  })}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 border-t pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 flex-1 text-xs"
                  aria-label={translate('notifications.alertRules.actions.editRule')}
                >
                  <Pencil className="me-1 h-3 w-3" />
                  {translate('notifications.alertRules.actions.edit')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 flex-1 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  aria-label={translate('notifications.alertRules.actions.deleteRule')}
                  onClick={() => handleDelete(rule._id)}
                >
                  <Trash2 className="me-1 h-3 w-3" />
                  {translate('notifications.alertRules.actions.delete')}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AlertRulesPage;
