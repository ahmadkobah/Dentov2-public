import { useState } from 'react';
import { Button } from '@dento/ui';
import { formatDate } from '../../../lib/date.js';
import {
  Webhook,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Eye,
  EyeOff,
  Trash2,
  Send,
  Globe,
  Activity,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import {
  useWebhooks,
  useWebhookDeliveries,
  useWebhookStats,
  useToggleWebhook,
  useDeleteWebhook,
  useTestWebhook,
} from '../hooks/useWebhooks.js';
import type { WebhookStatus } from '../hooks/useWebhooks.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';

// -- Helpers ------------------------------------------------------------

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
  failing: {
    icon: AlertTriangle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
    label: 'Failing',
  },
};

// -- Component ----------------------------------------------------------

export default function WebhooksPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WebhookStatus | 'all'>('all');
  const [tab, setTab] = useState<'endpoints' | 'deliveries'>('endpoints');
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());

  const filters = {
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
  };

  const { data: webhooksData, isLoading, isError, refetch } = useWebhooks(filters);
  const { data: deliveriesData } = useWebhookDeliveries(search || undefined);
  const { data: statsData } = useWebhookStats();
  const toggleWebhook = useToggleWebhook();
  const deleteWebhook = useDeleteWebhook();
  const testWebhook = useTestWebhook();

  const webhooks = webhooksData?.items ?? [];
  const deliveries = deliveriesData?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Webhooks</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage platform webhook endpoints and monitor deliveries — §33
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Refresh webhooks"
            onClick={() => refetch()}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Endpoint
          </Button>
        </div>
      </div>

      {isError && <QueryErrorBanner onRetry={() => refetch()} />}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Total Endpoints',
            value: statsData?.totalEndpoints ?? '—',
            icon: Webhook,
            color: 'text-brand-500',
          },
          {
            label: 'Active',
            value: statsData?.activeEndpoints ?? '—',
            icon: CheckCircle2,
            color: 'text-green-500',
          },
          {
            label: 'Total Deliveries',
            value: statsData?.totalDeliveries ?? '—',
            icon: Send,
            color: 'text-blue-500',
          },
          {
            label: 'Avg Success Rate',
            value: statsData?.avgSuccessRate ?? '—',
            icon: Activity,
            color: 'text-purple-500',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-6">
          {(
            [
              { key: 'endpoints', label: 'Endpoints', icon: Globe },
              { key: 'deliveries', label: 'Delivery Log', icon: Activity },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant="ghost"
              onClick={() => setTab(key)}
              className={`gap-2 border-b-2 px-1 pb-3 h-auto rounded-none hover:bg-transparent ${
                tab === key
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={
              tab === 'endpoints' ? 'Search by URL or description...' : 'Search by event name...'
            }
            aria-label="Search webhooks"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 ps-10 pe-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
        </div>
        {tab === 'endpoints' && (
          <div className="flex items-center gap-2">
            {(['all', 'active', 'disabled', 'failing'] as const).map((s) => (
              <Button
                key={s}
                variant="ghost"
                onClick={() => setStatusFilter(s)}
                className={`px-3 ${
                  statusFilter === s
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                {s === 'all' ? 'All' : statusConfig[s].label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Endpoints Tab */}
      {tab === 'endpoints' && (
        <div className="space-y-4">
          {webhooks.map((wh) => {
            const sc = statusConfig[wh.status];
            const StatusIcon = sc.icon;
            return (
              <div
                key={wh.id}
                className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${sc.bg} ${sc.color}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {sc.label}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {wh.description}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {wh.url}
                      </code>
                      <a
                        href={wh.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {wh.events.map((evt) => (
                        <span
                          key={evt}
                          className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        >
                          {evt}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-end">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Success Rate</p>
                      <p
                        className={`text-lg font-bold ${wh.successRate >= 95 ? 'text-green-600 dark:text-green-400' : wh.successRate >= 70 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}
                      >
                        {wh.successRate}%
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Deliveries</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {wh.totalDeliveries.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-auto w-auto rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                        title="Test"
                        aria-label="Test"
                        onClick={() => testWebhook.mutate(wh.id)}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-auto w-auto rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                        title="View"
                        aria-label="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {wh.status === 'active' ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-auto w-auto rounded-md p-1.5 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-900/20 dark:hover:text-yellow-400"
                          title="Disable"
                          aria-label="Disable"
                          onClick={() => toggleWebhook.mutate({ id: wh.id, status: 'disabled' })}
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-auto w-auto rounded-md p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 dark:hover:text-green-400"
                          title="Enable"
                          aria-label="Enable"
                          onClick={() => toggleWebhook.mutate({ id: wh.id, status: 'active' })}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-auto w-auto rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        title="Delete"
                        aria-label="Delete"
                        onClick={() => deleteWebhook.mutate(wh.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    Secret:{' '}
                    <code className="font-mono">
                      {revealedSecrets.has(wh.id) ? wh.secret : '••••••••••••••••'}
                    </code>
                    <button
                      type="button"
                      className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      aria-label={revealedSecrets.has(wh.id) ? 'Hide secret' : 'Reveal secret'}
                      onClick={() =>
                        setRevealedSecrets((prev) => {
                          const next = new Set(prev);
                          if (next.has(wh.id)) next.delete(wh.id);
                          else next.add(wh.id);
                          return next;
                        })
                      }
                    >
                      {revealedSecrets.has(wh.id) ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </button>
                  </span>
                  <span>Created: {formatDate(wh.createdAt)}</span>
                  <span>Last delivery: {formatDate(wh.lastDeliveryAt)}</span>
                </div>
              </div>
            );
          })}
          {webhooks.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
              <Webhook className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="mt-4 text-gray-500 dark:text-gray-400">No webhook endpoints found.</p>
            </div>
          )}
        </div>
      )}

      {/* Deliveries Tab */}
      {tab === 'deliveries' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <tr>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Event</th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Endpoint
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">HTTP</th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Duration
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Timestamp
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {deliveries.map((del) => {
                  return (
                    <tr key={del.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-5 py-3">
                        <code className="rounded bg-blue-50 px-2 py-0.5 text-xs font-mono text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                          {del.event}
                        </code>
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                        {del.webhookId}
                      </td>
                      <td className="px-5 py-3">
                        {del.success ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3" /> Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                            <XCircle className="h-3 w-3" /> Failed
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-mono font-medium ${
                            del.httpStatus >= 200 && del.httpStatus < 300
                              ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          {del.httpStatus}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                        <span className={del.duration > 3000 ? 'text-red-500' : ''}>
                          {del.duration}ms
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                        {formatDate(del.timestamp)}
                      </td>
                      <td className="px-5 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-auto w-auto rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                          title="View Payload"
                          aria-label="View Payload"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
