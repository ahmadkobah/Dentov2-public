import { useState, useMemo, lazy, Suspense } from 'react';
import {
  Search,
  Package,
  Activity,
  TrendingUp,
  Filter,
  RefreshCw,
  ChevronDown,
  Star,
  Circle,
  Zap,
  Crown,
  Plus,
  Edit2,
  Upload,
  ArrowRight,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import { Button, ConfirmDialog } from '@dento/ui';
import { useModules, useModuleStats, useDeleteModule } from '../hooks/useModules.js';
import type { ModuleItem } from '../hooks/useModules.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';

const CreateModuleDialog = lazy(() =>
  import('../components/CreateModuleDialog.js').then((m) => ({ default: m.CreateModuleDialog })),
);
const EditModuleSheet = lazy(() =>
  import('../components/EditModuleSheet.js').then((m) => ({ default: m.EditModuleSheet })),
);
const PushVersionDialog = lazy(() =>
  import('../components/PushVersionDialog.js').then((m) => ({ default: m.PushVersionDialog })),
);
const ChangeStatusDialog = lazy(() =>
  import('../components/ChangeStatusDialog.js').then((m) => ({ default: m.ChangeStatusDialog })),
);

// -- Constants -----------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  development: {
    label: 'Dev',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    dot: 'bg-gray-400',
  },
  beta: {
    label: 'Beta',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    dot: 'bg-amber-400',
  },
  active: {
    label: 'Stable',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    dot: 'bg-emerald-400',
  },
  deprecated: {
    label: 'Deprecated',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
    dot: 'bg-orange-400',
  },
  retired: {
    label: 'Retired',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    dot: 'bg-red-400',
  },
};

const TYPE_LABELS: Record<string, { label: string; icon: typeof Crown }> = {
  core: { label: 'Core Modules', icon: Crown },
  paid: { label: 'Paid Modules', icon: Star },
};

// -- Component: Module Card ----------------------------------

function ModuleCard({
  mod,
  onEdit,
  onPushVersion,
  onChangeStatus,
  onDelete,
}: {
  mod: ModuleItem;
  onEdit: (mod: ModuleItem) => void;
  onPushVersion: (mod: ModuleItem) => void;
  onChangeStatus: (mod: ModuleItem) => void;
  onDelete: (mod: ModuleItem) => void;
}) {
  const statusCfg = STATUS_CONFIG[mod.status] || STATUS_CONFIG.development;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-lg dark:bg-indigo-900/40">
            <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{mod.name.en}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{mod.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {mod.type === 'core' && (
            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">
              Core
            </span>
          )}
          {/* Actions menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div
                className="absolute end-0 z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button
                  onClick={() => {
                    onEdit(mod);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-start text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => {
                    onPushVersion(mod);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-start text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <Upload className="h-3.5 w-3.5" /> Push Version
                </button>
                <button
                  onClick={() => {
                    onChangeStatus(mod);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-start text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <ArrowRight className="h-3.5 w-3.5" /> Change Status
                </button>
                <button
                  onClick={() => {
                    onDelete(mod);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-start text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {mod.description?.en && (
        <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
          {mod.description.en}
        </p>
      )}

      {/* Metrics Row — version + tenants (no price) */}
      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <span className="font-mono">v{mod.version}</span>
        <span>·</span>
        <span>{mod.tenantCount} tenants</span>
      </div>

      {/* Status Badge */}
      <div className="mt-auto flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.color}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
          {statusCfg.label}
        </span>
        {!mod.isActive && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-400">
            Inactive
          </span>
        )}
      </div>
    </div>
  );
}

// -- Component: Stat Card ------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: typeof Package;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

// -- Component: Module Group ---------------------------------

interface ModuleGroupProps {
  type: string;
  modules: ModuleItem[];
  onEdit: (mod: ModuleItem) => void;
  onPushVersion: (mod: ModuleItem) => void;
  onChangeStatus: (mod: ModuleItem) => void;
  onDelete: (mod: ModuleItem) => void;
}

function ModuleGroup({
  type,
  modules,
  onEdit,
  onPushVersion,
  onChangeStatus,
  onDelete,
}: ModuleGroupProps) {
  const config = TYPE_LABELS[type] || { label: type, icon: Package };
  const Icon = config.icon;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {config.label}
        </h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          {modules.length}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {modules.map((mod) => (
          <ModuleCard
            key={mod._id}
            mod={mod}
            onEdit={onEdit}
            onPushVersion={onPushVersion}
            onChangeStatus={onChangeStatus}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}

// -- Main Page -----------------------------------------------

export default function ModulesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ModuleItem | null>(null);
  const [versionTarget, setVersionTarget] = useState<ModuleItem | null>(null);
  const [statusTarget, setStatusTarget] = useState<ModuleItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ModuleItem | null>(null);

  const filters = {
    search: search || undefined,
    status: statusFilter || undefined,
    type: typeFilter || undefined,
  };

  const { data, isLoading: loading, isError, refetch } = useModules(filters);
  const { data: stats } = useModuleStats();
  const deleteModule = useDeleteModule();

  const modules = useMemo(() => data?.items ?? [], [data?.items]);

  // -- Grouped Modules ---------------------------------------
  const grouped = useMemo(() => {
    const groups: Record<string, ModuleItem[]> = {};
    for (const mod of modules) {
      const key = mod.type;
      if (!groups[key]) groups[key] = [];
      groups[key].push(mod);
    }
    // Sort: core first, then paid
    const sortOrder = ['core', 'paid'];
    return sortOrder.filter((k) => groups[k]?.length).map((k) => ({ type: k, modules: groups[k] }));
  }, [modules]);

  // -- Render ------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Modules</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage platform modules, versioning, and lifecycle. Prices are managed on the Pricing
            page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Module
          </Button>
        </div>
      </div>

      {isError && <QueryErrorBanner onRetry={() => refetch()} />}

      {/* Stats Row */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Modules"
            value={stats.totalModules}
            icon={Package}
            color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
          />
          <StatCard
            label="Active / Stable"
            value={stats.activeModules}
            icon={Circle}
            color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
          />
          <StatCard
            label="In Beta"
            value={stats.betaModules}
            icon={Zap}
            color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
          />
          <StatCard
            label="Total Installations"
            value={stats.totalInstallations}
            icon={TrendingUp}
            color="bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400"
          />
        </div>
      )}

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search modules..."
            aria-label="Search modules"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 ps-10 pe-4 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <button
            onClick={() => {
              setShowStatusDropdown(!showStatusDropdown);
              setShowTypeDropdown(false);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <Filter className="h-4 w-4" />
            {statusFilter ? STATUS_CONFIG[statusFilter]?.label || statusFilter : 'Status'}
            <ChevronDown className="h-3 w-3" />
          </button>
          {showStatusDropdown && (
            <div className="absolute end-0 z-10 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
              <button
                onClick={() => {
                  setStatusFilter('');
                  setShowStatusDropdown(false);
                }}
                className="w-full px-3 py-1.5 text-start text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                All Statuses
              </button>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => {
                    setStatusFilter(key);
                    setShowStatusDropdown(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-start text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Type Filter */}
        <div className="relative">
          <button
            onClick={() => {
              setShowTypeDropdown(!showTypeDropdown);
              setShowStatusDropdown(false);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <Activity className="h-4 w-4" />
            {typeFilter ? TYPE_LABELS[typeFilter]?.label || typeFilter : 'Category'}
            <ChevronDown className="h-3 w-3" />
          </button>
          {showTypeDropdown && (
            <div className="absolute end-0 z-10 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
              <button
                onClick={() => {
                  setTypeFilter('');
                  setShowTypeDropdown(false);
                }}
                className="w-full px-3 py-1.5 text-start text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                All Categories
              </button>
              {Object.entries(TYPE_LABELS).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => {
                    setTypeFilter(key);
                    setShowTypeDropdown(false);
                  }}
                  className="w-full px-3 py-1.5 text-start text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modules Grid (grouped by type) */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ms-2 text-gray-500 dark:text-gray-400">Loading modules...</span>
        </div>
      ) : modules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            No modules found
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {search || statusFilter || typeFilter
              ? 'Try adjusting your filters'
              : 'Click "Create Module" to get started'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ type, modules: groupModules }) => (
            <ModuleGroup
              key={type}
              type={type}
              modules={groupModules}
              onEdit={setEditTarget}
              onPushVersion={setVersionTarget}
              onChangeStatus={setStatusTarget}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Top Modules (from stats) */}
      {stats && stats.topModules.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <TrendingUp className="h-5 w-5 text-indigo-500" />
            Top Modules by Installations
          </h2>
          <div className="space-y-3">
            {stats.topModules.map((mod, idx) => (
              <div
                key={mod.slug}
                className="flex items-center gap-4 rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-700/50"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{mod.name.en}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{mod.slug}</p>
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {mod.count} tenants
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Dialogs ─────────────────────────────────────── */}
      <Suspense fallback={null}>
        <CreateModuleDialog open={createOpen} onOpenChange={setCreateOpen} />

        <EditModuleSheet module={editTarget} onClose={() => setEditTarget(null)} />

        {versionTarget && (
          <PushVersionDialog
            open={!!versionTarget}
            onOpenChange={(open) => !open && setVersionTarget(null)}
            moduleSlug={versionTarget.slug}
            currentVersion={versionTarget.version}
          />
        )}

        {statusTarget && (
          <ChangeStatusDialog
            open={!!statusTarget}
            onOpenChange={(open) => !open && setStatusTarget(null)}
            moduleSlug={statusTarget.slug}
            currentStatus={statusTarget.status}
          />
        )}
      </Suspense>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name.en ?? ''}"?`}
        description={`This will permanently remove the module "${deleteTarget?.slug ?? ''}". This action cannot be undone and will fail if any tenants have this module installed.`}
        variant="destructive"
        confirmLabel="Delete Module"
        onConfirm={() => {
          if (deleteTarget) {
            deleteModule.mutate(deleteTarget.slug, {
              onSuccess: () => setDeleteTarget(null),
            });
          }
        }}
      />
    </div>
  );
}
