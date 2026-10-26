import { useState } from 'react';
import { Button } from '@dento/ui';
import { formatDate } from '../../../lib/date.js';
import {
  Key,
  Plus,
  Search,
  Copy,
  RotateCcw,
  Ban,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  Shield,
  Activity,
  MoreHorizontal,
  Zap,
  TestTube,
  RefreshCw,
} from 'lucide-react';
import {
  useApiKeys,
  useApiKeyStats,
  useRotateApiKey,
  useRevokeApiKey,
} from '../hooks/useApiKeys.js';

import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';

// -- Types (from hook) --------------------------------------------------
type KeyScope = 'live' | 'test';
type KeyStatus = 'active' | 'revoked' | 'expired';
type Permission = 'read' | 'write' | 'admin';

// -- Helpers ------------------------------------------------------------

function formatNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '0';
  return n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}K`
      : n.toString();
}

const statusConfig: Record<
  KeyStatus,
  { icon: typeof CheckCircle2; color: string; bg: string; label: string }
> = {
  active: {
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
    label: 'Active',
  },
  revoked: {
    icon: Ban,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
    label: 'Revoked',
  },
  expired: {
    icon: Clock,
    color: 'text-gray-500 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
    label: 'Expired',
  },
};

const scopeConfig: Record<
  KeyScope,
  { icon: typeof Zap; color: string; bg: string; label: string }
> = {
  live: {
    icon: Zap,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    label: 'Live',
  },
  test: {
    icon: TestTube,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    label: 'Test',
  },
};

const permColors: Record<Permission, string> = {
  read: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30',
  write: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30',
  admin: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30',
};

// -- Component ----------------------------------------------------------

export default function ApiKeysPage() {
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<KeyScope | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<KeyStatus | 'all'>('all');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const filters = {
    search: search || undefined,
    scope: scopeFilter === 'all' ? undefined : scopeFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
  };

  const { data: keysData, isLoading, isError, refetch } = useApiKeys(filters);
  const { data: statsData } = useApiKeyStats();
  const rotateApiKey = useRotateApiKey();
  const revokeApiKey = useRevokeApiKey();

  const apiKeys = keysData?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">API Keys</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage platform API keys and access tokens — §31
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Refresh API keys"
            onClick={() => refetch()}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="default" className="gap-2 py-2.5">
            <Plus className="h-4 w-4" />
            Generate Key
          </Button>
        </div>
      </div>

      {isError && <QueryErrorBanner onRetry={() => refetch()} />}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Total Keys',
            value: statsData?.totalKeys ?? '—',
            icon: Key,
            color: 'text-brand-500',
          },
          {
            label: 'Active',
            value: statsData?.activeKeys ?? '—',
            icon: Shield,
            color: 'text-green-500',
          },
          {
            label: 'Total Requests',
            value: statsData?.totalRequests ?? '—',
            icon: Activity,
            color: 'text-blue-500',
          },
          {
            label: 'Avg Daily',
            value: statsData?.avgDailyRequests ?? '—',
            icon: Zap,
            color: 'text-amber-500',
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

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or key..."
            aria-label="Search API keys"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 ps-10 pe-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'live', 'test'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScopeFilter(s)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                scopeFilter === s
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              {s === 'all' ? 'All Scopes' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <span className="mx-1 text-gray-300 dark:text-gray-600">|</span>
          {(['all', 'active', 'revoked', 'expired'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              {s === 'all' ? 'All Status' : statusConfig[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
              <tr>
                <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
                <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Key</th>
                <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Scope</th>
                <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Permissions
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Rate Limit
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Requests</th>
                <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Last Used
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {apiKeys.map((key) => {
                const sc = statusConfig[key.status] ?? statusConfig.active;
                const StatusIcon = sc.icon;
                const sp = scopeConfig[key.scope] ?? scopeConfig.test;
                const ScopeIcon = sp.icon;
                return (
                  <tr key={key.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-5 py-3">
                      <span className="font-medium text-gray-900 dark:text-white">{key.name}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {revealedKey === key.id
                            ? 'dk_' + key.scope + '_a1b2c3d4e5f6'
                            : key.keyDisplay}
                        </code>
                        <button
                          onClick={() => setRevealedKey(revealedKey === key.id ? null : key.id)}
                          aria-label={revealedKey === key.id ? 'Hide API key' : 'Reveal API key'}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {revealedKey === key.id ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          aria-label="Copy API key"
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="Copy"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${sp.bg} ${sp.color}`}
                      >
                        <ScopeIcon className="h-3 w-3" />
                        {sp.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${sc.bg} ${sc.color}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        {key.permissions.map((p) => (
                          <span
                            key={p}
                            className={`rounded px-1.5 py-0.5 text-xs font-medium ${permColors[p]}`}
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                      {formatNumber(key.rateLimitMax)}/min
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                      {formatNumber(key.totalRequests)}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                      {formatDate(key.lastUsedAt)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        {key.status === 'active' && (
                          <>
                            <button
                              onClick={() => rotateApiKey.mutate(key.id)}
                              aria-label="Rotate API key"
                              className="rounded-md p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                              title="Rotate"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => revokeApiKey.mutate(key.id)}
                              aria-label="Revoke API key"
                              className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                              title="Revoke"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button
                          aria-label="More actions"
                          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                          title="More"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {apiKeys.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    No API keys found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
