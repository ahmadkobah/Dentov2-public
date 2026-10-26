import { useState, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  Lock,
  Key,
  Cookie,
  Filter,
} from 'lucide-react';
import { useApiSpec, parseEndpoints } from '../hooks/useApiCatalog.js';
import type { EndpointInfo } from '../hooks/useApiCatalog.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';

// -- Constants -----------------------------------------------

const METHOD_COLORS: Record<string, string> = {
  get: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  post: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  put: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  patch: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  delete: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// -- Component: Method Badge ---------------------------------

function MethodBadge({ method }: { method: string }) {
  const color = METHOD_COLORS[method.toLowerCase()] ?? 'bg-gray-100 text-gray-700';
  return (
    <span
      className={`inline-flex w-16 items-center justify-center rounded px-2 py-0.5 text-xs font-bold uppercase ${color}`}
    >
      {method}
    </span>
  );
}

// -- Component: Security Badge -------------------------------

function SecurityBadge({ scheme }: { scheme: string }) {
  const icons: Record<string, typeof Lock> = {
    bearerAuth: Lock,
    apiKeyAuth: Key,
    cookieAuth: Cookie,
  };
  const labels: Record<string, string> = {
    bearerAuth: 'JWT',
    apiKeyAuth: 'API Key',
    cookieAuth: 'Cookie',
  };
  const Icon = icons[scheme] ?? Lock;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
      <Icon className="h-3 w-3" />
      {labels[scheme] ?? scheme}
    </span>
  );
}

// -- Component: Endpoint Row ---------------------------------

function EndpointRow({ ep }: { ep: EndpointInfo }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(ep.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group border-b border-gray-100 last:border-b-0 dark:border-gray-700/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-start transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
        )}
        <MethodBadge method={ep.method} />
        <code className="flex-1 truncate text-sm text-gray-800 dark:text-gray-200">{ep.path}</code>
        <span className="hidden truncate text-xs text-gray-400 group-hover:inline lg:inline">
          {ep.summary}
        </span>
        <div className="flex items-center gap-1">
          {ep.security.map((s) => (
            <SecurityBadge key={s} scheme={s} />
          ))}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-12 py-3 dark:border-gray-700/50 dark:bg-gray-800/30">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-500">Summary:</span>
              <span className="text-gray-800 dark:text-gray-200">{ep.summary}</span>
            </div>
            {ep.description && (
              <div>
                <span className="font-medium text-gray-500">Description:</span>{' '}
                <span className="text-gray-600 dark:text-gray-400">{ep.description}</span>
              </div>
            )}
            {ep.parameters && ep.parameters.length > 0 && (
              <div>
                <span className="font-medium text-gray-500">Parameters:</span>
                <div className="mt-1 space-y-1">
                  {ep.parameters.map((p) => (
                    <div key={p.name} className="ms-2 flex items-center gap-2 text-xs">
                      <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">{p.name}</code>
                      <span className="text-gray-400">({p.in})</span>
                      {p.required && (
                        <span className="rounded bg-red-100 px-1 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                          required
                        </span>
                      )}
                      {p.schema?.type && <span className="text-gray-400">{p.schema.type}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {ep.hasRequestBody && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-500">Request Body:</span>
                <span className="rounded bg-blue-100 px-1.5 text-xs text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  JSON
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-500">Responses:</span>
              {ep.responses.map((code) => (
                <span
                  key={code}
                  className={`rounded px-1.5 text-xs font-medium ${
                    code.startsWith('2')
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : code.startsWith('4')
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {code}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy Path'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -- Component: Tag Group ------------------------------------

function TagGroup({
  tag,
  description,
  endpoints,
}: {
  tag: string;
  description?: string;
  endpoints: EndpointInfo[];
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
      >
        {collapsed ? (
          <ChevronRight className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{tag}</h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}
        </span>
        {description && (
          <span className="hidden truncate text-xs text-gray-400 lg:inline">{description}</span>
        )}
      </button>
      {!collapsed && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {endpoints.map((ep) => (
            <EndpointRow key={`${ep.method}-${ep.path}`} ep={ep} />
          ))}
        </div>
      )}
    </div>
  );
}

// -- Main Page -----------------------------------------------

export default function ApiCatalogPage() {
  const { data: spec, isLoading, isError, refetch } = useApiSpec();
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string | null>(null);

  // Parse & filter endpoints
  const allEndpoints = useMemo(() => (spec ? parseEndpoints(spec) : []), [spec]);

  const filteredEndpoints = useMemo(() => {
    let eps = allEndpoints;
    if (search) {
      const q = search.toLowerCase();
      eps = eps.filter(
        (ep) =>
          ep.path.toLowerCase().includes(q) ||
          ep.summary.toLowerCase().includes(q) ||
          ep.tag.toLowerCase().includes(q),
      );
    }
    if (methodFilter) {
      eps = eps.filter((ep) => ep.method === methodFilter);
    }
    return eps;
  }, [allEndpoints, search, methodFilter]);

  // Group by tag
  const groupedByTag = useMemo(() => {
    const groups = new Map<string, EndpointInfo[]>();
    for (const ep of filteredEndpoints) {
      const list = groups.get(ep.tag) ?? [];
      list.push(ep);
      groups.set(ep.tag, list);
    }
    return groups;
  }, [filteredEndpoints]);

  // Tag descriptions from spec
  const tagDescriptions = useMemo(() => {
    const map = new Map<string, string>();
    if (spec?.tags) {
      for (const t of spec.tags) {
        if (t.description) map.set(t.name, t.description);
      }
    }
    return map;
  }, [spec]);

  // Methods present
  const methods = useMemo(() => {
    const set = new Set(allEndpoints.map((ep) => ep.method));
    return ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].filter((m) => set.has(m));
  }, [allEndpoints]);

  // -- Render ----------------------------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <span className="ms-3 text-gray-500">Loading OpenAPI specification…</span>
      </div>
    );
  }

  if (isError) {
    return <QueryErrorBanner onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Catalog</h1>
          <p className="mt-1 text-sm text-gray-500">
            {spec?.info.title} v{spec?.info.version} · {allEndpoints.length} endpoints
            auto-generated via OpenAPI 3.1
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`${API_BASE_URL}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Swagger UI
          </a>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary/90"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{allEndpoints.length}</p>
          <p className="text-xs text-gray-500">Total Endpoints</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {spec?.tags?.length ?? 0}
          </p>
          <p className="text-xs text-gray-500">API Groups</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {spec?.servers?.length ?? 0}
          </p>
          <p className="text-xs text-gray-500">Servers</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-2xl font-bold text-emerald-600">v{spec?.info.version}</p>
          <p className="text-xs text-gray-500">API Version</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search endpoints by path, summary, or tag…"
            aria-label="Search API endpoints"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 ps-10 pe-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <button
            onClick={() => setMethodFilter(null)}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
              !methodFilter
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            All
          </button>
          {methods.map((m) => (
            <button
              key={m}
              onClick={() => setMethodFilter(methodFilter === m ? null : m)}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                methodFilter === m
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filteredEndpoints.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">No endpoints match your search.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(groupedByTag.entries()).map(([tag, endpoints]) => (
            <TagGroup
              key={tag}
              tag={tag}
              description={tagDescriptions.get(tag)}
              endpoints={endpoints}
            />
          ))}
        </div>
      )}

      {/* Footer Info */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400">
          Auto-Generated from Code
        </h4>
        <p className="mt-1 text-xs text-blue-600 dark:text-blue-300">
          This catalog is generated automatically from route definitions using{' '}
          <code className="rounded bg-blue-100 px-1 dark:bg-blue-800">@fastify/swagger</code> +
          OpenAPI 3.1. No manual maintenance required — add a route and it appears here instantly.
        </p>
      </div>
    </div>
  );
}
