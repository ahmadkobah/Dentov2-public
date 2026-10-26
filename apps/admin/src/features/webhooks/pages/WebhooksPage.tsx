import { useState, useMemo } from 'react';
import { Button } from '@dento/ui';
import {
  Webhook,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Trash2,
  Send,
  Globe,
  Eye,
  ExternalLink,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  useWebhooks,
  useWebhookDeliveries,
  useDeleteWebhook,
  useTestWebhook,
  useUpdateWebhook,
} from '../hooks/useWebhooks.js';
import type { WebhookEndpoint, WebhookStatus } from '../hooks/useWebhooks.js';
import { useTranslation } from '@/stores/locale.store.js';
import { formatDateTime } from '@/lib/date.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  return formatDateTime(iso);
}

const statusConfig: Record<
  WebhookStatus,
  { icon: typeof CheckCircle2; color: string; bg: string; label: string }
> = {
  active: {
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
    label: 'Active',
  },
  disabled: {
    icon: Pause,
    color: 'text-gray-500 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
    label: 'Disabled',
  },
  failed: {
    icon: AlertTriangle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
    label: 'Failing',
  },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function WebhooksPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WebhookStatus | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filters = {
    search: search || undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
  };

  const { data, isLoading, isError, refetch } = useWebhooks(filters);
  const updateWebhook = useUpdateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const testWebhook = useTestWebhook();

  const webhooks = data?.items ?? [];

  // Client-side status filter for failed/disabled distinction
  const filtered = useMemo(() => {
    if (statusFilter === 'all') return webhooks;
    return webhooks.filter((w) => w.status === statusFilter);
  }, [webhooks, statusFilter]);

  const stats = useMemo(() => {
    const total = webhooks.length;
    const active = webhooks.filter((w) => w.status === 'active').length;
    const failing = webhooks.filter((w) => w.status === 'failed').length;
    const avgRate =
      total > 0 ? (webhooks.reduce((sum, w) => sum + w.successRate, 0) / total).toFixed(1) : '0';
    return { total, active, failing, avgRate };
  }, [webhooks]);

  /* ---- Loading / Error states ---- */

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
        <XCircle className="mx-auto h-10 w-10 text-red-400" />
        <p className="mt-2 text-red-700 dark:text-red-300">{t('webhooks.errorLoading')}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
          <RefreshCw className="me-2 h-4 w-4" /> {t('webhooks.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            {t('webhooks.page.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('webhooks.page.description')}
          </p>
        </div>
        <Button size="sm" disabled>
          <Plus className="me-2 h-4 w-4" /> {t('webhooks.page.addEndpoint')}
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label={t('webhooks.stats.totalEndpoints')} value={stats.total} icon={Globe} />
        <StatCard label={t('webhooks.stats.active')} value={stats.active} icon={CheckCircle2} />
        <StatCard label={t('webhooks.stats.failing')} value={stats.failing} icon={AlertTriangle} />
        <StatCard
          label={t('webhooks.stats.avgSuccess')}
          value={`${stats.avgRate}%`}
          icon={Webhook}
        />
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('webhooks.filters.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 ps-10 pe-4 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'disabled', 'failed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {t(`webhooks.filters.${s}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Endpoint List */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-16 text-center dark:border-gray-700 dark:bg-gray-900/50">
          <Webhook className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {search || statusFilter !== 'all'
              ? t('webhooks.empty.filtered')
              : t('webhooks.empty.default')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((wh) => (
            <WebhookCard
              key={wh._id}
              webhook={wh}
              isSelected={selectedId === wh._id}
              onSelect={() => setSelectedId(selectedId === wh._id ? null : wh._id)}
              onToggle={() =>
                updateWebhook.mutate({
                  id: wh._id,
                  status: wh.status === 'active' ? 'disabled' : 'active',
                })
              }
              onDelete={() => {
                if (window.confirm('Delete this webhook endpoint?')) {
                  deleteWebhook.mutate(wh._id);
                }
              }}
              onTest={() => testWebhook.mutate(wh._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: typeof Globe;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-900/30">
          <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-lg font-semibold text-gray-800 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function WebhookCard({
  webhook,
  isSelected,
  onSelect,
  onToggle,
  onDelete,
  onTest,
}: {
  webhook: WebhookEndpoint;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onTest: () => void;
}) {
  const cfg = statusConfig[webhook.status] || statusConfig.disabled;
  const StatusIcon = cfg.icon;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 transition hover:shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}
            >
              <StatusIcon className="h-3 w-3" />
              {cfg.label}
            </span>
            {webhook.name && (
              <span className="truncate text-sm font-medium text-gray-800 dark:text-white">
                {webhook.name}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <Globe className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{webhook.url}</span>
            <a
              href={webhook.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ms-1 flex-shrink-0 text-blue-500 hover:text-blue-600"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Events */}
          <div className="mt-2 flex flex-wrap gap-1">
            {webhook.events.slice(0, 4).map((ev) => (
              <span
                key={ev}
                className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              >
                {ev}
              </span>
            ))}
            {webhook.events.length > 4 && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                +{webhook.events.length - 4} more
              </span>
            )}
          </div>

          {/* Meta row */}
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
            <span>
              {webhook.totalDeliveries} deliver{webhook.totalDeliveries === 1 ? 'y' : 'ies'}
            </span>
            <span>Success: {webhook.successRate}%</span>
            <span>Last: {formatDate(webhook.lastDeliveryAt)}</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            onClick={onTest}
            title="Send test"
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700"
          >
            <Send className="h-4 w-4" />
          </button>
          <button
            onClick={onSelect}
            title="View deliveries"
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={onToggle}
            title={webhook.status === 'active' ? 'Disable' : 'Enable'}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-yellow-600 dark:hover:bg-gray-700"
          >
            {webhook.status === 'active' ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-700"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expandable delivery log preview */}
      {isSelected && <DeliveryPreview endpointId={webhook._id} />}
    </div>
  );
}

function DeliveryPreview({ endpointId }: { endpointId: string }) {
  const { data, isLoading } = useWebhookDeliveries(endpointId);
  const deliveries = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="mt-3 flex items-center justify-center border-t border-gray-100 pt-3 dark:border-gray-700">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <div className="mt-3 border-t border-gray-100 pt-3 text-center text-xs text-gray-400 dark:border-gray-700">
        No deliveries yet.
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-700">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-start text-gray-400 dark:text-gray-500">
            <th className="py-1 font-medium">Event</th>
            <th className="py-1 font-medium">Status</th>
            <th className="py-1 font-medium">HTTP</th>
            <th className="py-1 font-medium">Duration</th>
            <th className="py-1 font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.slice(0, 5).map((d: any) => (
            <tr key={d._id} className="border-t border-gray-50 dark:border-gray-800">
              <td className="py-1 text-gray-600 dark:text-gray-300">{d.event}</td>
              <td className="py-1">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    d.status === 'success'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}
                >
                  {d.status}
                </span>
              </td>
              <td className="py-1 text-gray-500">{d.httpStatus ?? '—'}</td>
              <td className="py-1 text-gray-500">{d.duration ? `${d.duration}ms` : '—'}</td>
              <td className="py-1 text-gray-500">{formatDate(d.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default WebhooksPage;
