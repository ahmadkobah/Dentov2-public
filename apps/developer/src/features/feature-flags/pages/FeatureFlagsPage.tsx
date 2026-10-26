/**
 * FeatureFlagsPage — Dev Portal Feature Flags Management
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 3.9
 * Flag list with status indicators (green/yellow/red), "+ Create Flag" button,
 * search/filter, pagination, create/edit sheet, toggle/delete actions.
 */

import { useState, useMemo } from 'react';
import {
  PageHeader,
  StatCard,
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Skeleton,
  ConfirmDialog,
  toast,
} from '@dento/ui';
import { Plus, Search, Flag, ToggleLeft, Percent, Globe } from 'lucide-react';
import type { FeatureFlag, CreateFeatureFlagInput, UpdateFeatureFlagInput } from '@dento/shared';
import {
  useFeatureFlags,
  useCreateFeatureFlag,
  useUpdateFeatureFlag,
  useToggleFeatureFlag,
  useDeleteFeatureFlag,
  type FeatureFlagFilters,
} from '../hooks/useFeatureFlags.js';
import { FeatureFlagCard } from '../components/FeatureFlagCard.js';
import { FeatureFlagForm } from '../components/FeatureFlagForm.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';

/* ------------------------------------------------------------------ */
/*  Filter options                                                     */
/* ------------------------------------------------------------------ */

const ENABLED_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'true', label: 'Enabled' },
  { value: 'false', label: 'Disabled' },
] as const;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function FeatureFlagsPage() {
  // Filters
  const [search, setSearch] = useState('');
  const [enabledFilter, setEnabledFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Sheet state
  const [formOpen, setFormOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Build filters
  const filters: FeatureFlagFilters = useMemo(
    () => ({
      page,
      limit: 20,
      ...(search.trim() && { search: search.trim() }),
      ...(enabledFilter !== 'all' && { enabled: enabledFilter === 'true' }),
    }),
    [page, search, enabledFilter],
  );

  // Queries
  const { data, isLoading, isError, refetch } = useFeatureFlags(filters);

  // Mutations
  const createMutation = useCreateFeatureFlag();
  const updateMutation = useUpdateFeatureFlag();
  const toggleMutation = useToggleFeatureFlag();
  const deleteMutation = useDeleteFeatureFlag();

  // Stats
  const stats = useMemo(() => {
    if (!data) return { total: 0, enabled: 0, disabled: 0, partial: 0, global: 0 };
    const items = data.items;
    return {
      total: data.meta.total,
      enabled: items.filter(
        (f) => f.enabled && (f.percentageRollout === null || f.percentageRollout === 100),
      ).length,
      disabled: items.filter((f) => !f.enabled).length,
      partial: items.filter(
        (f) => f.enabled && f.percentageRollout !== null && f.percentageRollout < 100,
      ).length,
      global: items.filter((f) => !f.tenantId).length,
    };
  }, [data]);

  // Handlers
  const handleCreate = () => {
    setEditingFlag(null);
    setFormOpen(true);
  };

  const handleEdit = (flag: FeatureFlag) => {
    setEditingFlag(flag);
    setFormOpen(true);
  };

  const handleToggle = (id: string, enabled: boolean) => {
    toggleMutation.mutate({ id, enabled });
  };

  const handleDeleteConfirm = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => setDeleteId(null),
      onError: () => toast.error('Failed to delete flag'),
    });
  };

  const handleFormSubmit = (
    formData: CreateFeatureFlagInput | (UpdateFeatureFlagInput & { id: string }),
  ) => {
    if ('id' in formData) {
      const { id, ...rest } = formData;
      updateMutation.mutate({ id, ...rest } as UpdateFeatureFlagInput & { id: string }, {
        onSuccess: () => {
          setFormOpen(false);
          setEditingFlag(null);
        },
      });
    } else {
      createMutation.mutate(formData as CreateFeatureFlagInput, {
        onSuccess: () => setFormOpen(false),
      });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feature Flags"
        description="Manage feature rollout, A/B testing, and tenant-scoped toggles"
      />

      {isError && <QueryErrorBanner onRetry={() => refetch()} />}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Flags"
          value={stats.total}
          icon={<Flag className="h-5 w-5" />}
          variant="default"
        />
        <StatCard
          title="Enabled"
          value={stats.enabled}
          icon={<ToggleLeft className="h-5 w-5" />}
          variant="default"
        />
        <StatCard
          title="Partial Rollout"
          value={stats.partial}
          icon={<Percent className="h-5 w-5" />}
          variant={stats.partial > 0 ? 'warning' : 'default'}
        />
        <StatCard
          title="Global"
          value={stats.global}
          icon={<Globe className="h-5 w-5" />}
          variant="default"
        />
      </div>

      {/* Toolbar: Search + Filter + Create */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search flags…"
            aria-label="Search feature flags"
            className="ps-9"
          />
        </div>

        <Select
          value={enabledFilter}
          onValueChange={(v) => {
            setEnabledFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENABLED_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleCreate}>
          <Plus className="me-1.5 h-4 w-4" />
          Create Flag
        </Button>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && data && data.items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center dark:border-gray-700">
          <Flag className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400">
            {search || enabledFilter !== 'all' ? 'No flags match your filters' : 'No Feature Flags'}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            {search || enabledFilter !== 'all'
              ? 'Try adjusting your search or filter.'
              : 'Create your first feature flag to start controlling feature rollout.'}
          </p>
          {!search && enabledFilter === 'all' && (
            <Button variant="outline" className="mt-4" onClick={handleCreate}>
              <Plus className="me-1.5 h-4 w-4" />
              Create First Flag
            </Button>
          )}
        </div>
      )}

      {/* Flag list */}
      {!isLoading && data && data.items.length > 0 && (
        <div className="space-y-3">
          {data.items.map((flag) => (
            <FeatureFlagCard
              key={flag._id}
              flag={flag}
              onEdit={handleEdit}
              onToggle={handleToggle}
              onDelete={(id) => setDeleteId(id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Sheet */}
      <FeatureFlagForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingFlag(null);
        }}
        editingFlag={editingFlag}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Feature Flag"
        description="This will permanently delete this feature flag. Any code referencing this flag key will fall back to default values. This action cannot be undone."
        confirmLabel="Delete Flag"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
