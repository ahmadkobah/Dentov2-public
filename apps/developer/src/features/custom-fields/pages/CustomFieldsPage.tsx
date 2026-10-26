/**
 * CustomFieldsPage — Dev Portal Custom Fields Management
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 1.3
 * Entity filter tabs, tenant selector, field card list, developer guide,
 * create/edit sheet, toggle/delete actions.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  PageHeader,
  StatCard,
  Badge,
  Button,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Skeleton,
  ConfirmDialog,
  toast,
} from '@dento/ui';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import {
  Plus,
  Search,
  Layers,
  Users,
  CalendarDays,
  FileText,
  Pill,
  FlaskConical,
  Receipt,
  Activity,
  ToggleLeft,
  AlertTriangle,
} from 'lucide-react';
import type { CustomField, CustomFieldEntity, CustomFieldFilters } from '@dento/shared';
import {
  useCustomFields,
  useCreateCustomField,
  useUpdateCustomField,
  useToggleCustomField,
  useDeleteCustomField,
  useReorderCustomFields,
} from '../hooks/useCustomFields.js';
import { DeveloperGuide } from '../components/DeveloperGuide.js';
import { CustomFieldCard } from '../components/CustomFieldCard.js';
import { CustomFieldForm } from '../components/CustomFieldForm.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';

/* ------------------------------------------------------------------ */
/*  Entity tabs config                                                 */
/* ------------------------------------------------------------------ */

const ENTITY_TABS: Array<{
  value: CustomFieldEntity;
  label: string;
  icon: typeof Users;
}> = [
  { value: 'patient', label: 'Patient', icon: Users },
  { value: 'appointment', label: 'Appointment', icon: CalendarDays },
  { value: 'invoice', label: 'Invoice', icon: Receipt },
  { value: 'treatment_plan', label: 'Treatment Plan', icon: FileText },
  { value: 'prescription', label: 'Prescription', icon: Pill },
  { value: 'lab_order', label: 'Lab Order', icon: FlaskConical },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CustomFieldsPage() {
  // Tenant selection (platform admin picks tenant)
  const [tenantSlug, setTenantSlug] = useState('');
  const [tenantInput, setTenantInput] = useState('');

  // Entity filter tab
  const [selectedEntity, setSelectedEntity] = useState<CustomFieldEntity>('patient');

  // Search
  const [search, setSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);

  // Sheet state
  const [formOpen, setFormOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filters
  const filters: CustomFieldFilters = useMemo(
    () => ({
      entity: selectedEntity,
      page,
      limit: 50,
    }),
    [selectedEntity, page],
  );

  // Queries
  const { data, isLoading, isError, refetch } = useCustomFields(tenantSlug, filters);

  // Mutations
  const createMutation = useCreateCustomField(tenantSlug);
  const updateMutation = useUpdateCustomField(tenantSlug);
  const toggleMutation = useToggleCustomField(tenantSlug);
  const deleteMutation = useDeleteCustomField(tenantSlug);
  const reorderMutation = useReorderCustomFields(tenantSlug);

  // Filtered items by search
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    if (!search.trim()) return data.items;
    const q = search.toLowerCase();
    return data.items.filter(
      (f) =>
        f.label.en.toLowerCase().includes(q) ||
        f.fieldKey.toLowerCase().includes(q) ||
        (f.label.ar && f.label.ar.includes(search)) ||
        f.type.includes(q),
    );
  }, [data?.items, search]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // DnD handler
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !filteredItems.length) return;

      const oldIndex = filteredItems.findIndex((f) => f._id === active.id);
      const newIndex = filteredItems.findIndex((f) => f._id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(filteredItems, oldIndex, newIndex);
      const updates = reordered.map((field, i) => ({ id: field._id, sortOrder: i }));
      reorderMutation.mutate(updates, {
        onSuccess: () => toast.success('Fields reordered'),
        onError: () => toast.error('Failed to reorder fields'),
      });
    },
    [filteredItems, reorderMutation],
  );

  // Stats
  const stats = useMemo(() => {
    const items = data?.items ?? [];
    return {
      total: items.length,
      active: items.filter((f) => f.isActive).length,
      required: items.filter((f) => f.isRequired).length,
      inactive: items.filter((f) => !f.isActive).length,
    };
  }, [data?.items]);

  // Handlers
  const handleTenantSelect = () => {
    if (tenantInput.trim()) {
      setTenantSlug(tenantInput.trim());
      setPage(1);
    }
  };

  const handleEntityChange = (entity: string) => {
    setSelectedEntity(entity as CustomFieldEntity);
    setPage(1);
    setSearch('');
  };

  const handleCreate = () => {
    setEditingField(null);
    setFormOpen(true);
  };

  const handleEdit = (field: CustomField) => {
    setEditingField(field);
    setFormOpen(true);
  };

  const handleToggle = (id: string, isActive: boolean) => {
    toggleMutation.mutate(
      { id, isActive },
      {
        onSuccess: () => toast.success(`Field ${isActive ? 'activated' : 'deactivated'}`),
        onError: () => toast.error('Failed to toggle field'),
      },
    );
  };

  const handleDeleteConfirm = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success('Custom field deleted');
        setDeleteId(null);
      },
      onError: () => toast.error('Failed to delete field'),
    });
  };

  const handleFormSubmit = (
    data: Parameters<typeof createMutation.mutate>[0] | (Record<string, unknown> & { id: string }),
  ) => {
    if ('id' in data) {
      const { id, ...rest } = data;
      updateMutation.mutate({ id, ...rest } as Parameters<typeof updateMutation.mutate>[0], {
        onSuccess: () => {
          toast.success('Custom field updated');
          setFormOpen(false);
          setEditingField(null);
        },
        onError: () => toast.error('Failed to update field'),
      });
    } else {
      createMutation.mutate(data as Parameters<typeof createMutation.mutate>[0], {
        onSuccess: () => {
          toast.success('Custom field created');
          setFormOpen(false);
        },
        onError: () => toast.error('Failed to create field'),
      });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Custom Fields"
        description="Manage dynamic field definitions for tenant entities"
      />

      {/* Developer Guide */}
      <DeveloperGuide />

      {/* Tenant Selector */}
      <div className="flex items-end gap-3 rounded-lg border bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex-1 space-y-1">
          <label
            htmlFor="cf-tenant-slug"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Tenant Slug
          </label>
          <Input
            id="cf-tenant-slug"
            value={tenantInput}
            onChange={(e) => setTenantInput(e.target.value)}
            placeholder="e.g. clinic-cairo"
            onKeyDown={(e) => e.key === 'Enter' && handleTenantSelect()}
          />
        </div>
        <Button onClick={handleTenantSelect} disabled={!tenantInput.trim()}>
          Load Fields
        </Button>
        {tenantSlug && (
          <Badge variant="secondary" className="mb-2">
            Active: {tenantSlug}
          </Badge>
        )}
      </div>

      {/* No tenant selected state */}
      {!tenantSlug && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center dark:border-gray-700">
          <Layers className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400">
            Select a Tenant
          </h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Enter a tenant slug above to view and manage their custom field definitions.
          </p>
        </div>
      )}

      {/* Main content — only shown when tenant selected */}
      {tenantSlug && (
        <>
          {isError && <QueryErrorBanner onRetry={() => refetch()} />}

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Fields"
              value={stats.total}
              icon={<Layers className="h-5 w-5" />}
              variant="default"
            />
            <StatCard
              title="Active"
              value={stats.active}
              icon={<Activity className="h-5 w-5" />}
              variant="default"
            />
            <StatCard
              title="Required"
              value={stats.required}
              icon={<AlertTriangle className="h-5 w-5" />}
              variant={stats.required > 0 ? 'warning' : 'default'}
            />
            <StatCard
              title="Inactive"
              value={stats.inactive}
              icon={<ToggleLeft className="h-5 w-5" />}
              variant={stats.inactive > 0 ? 'error' : 'default'}
            />
          </div>

          {/* Entity Tabs */}
          <Tabs value={selectedEntity} onValueChange={handleEntityChange} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList>
                {ENTITY_TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex items-center gap-1.5"
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search fields…"
                    aria-label="Search custom fields"
                    className="w-56 ps-9"
                  />
                </div>
                <Button onClick={handleCreate}>
                  <Plus className="me-1.5 h-4 w-4" />
                  Add Field
                </Button>
              </div>
            </div>

            {/* Tab content — same list for each entity (filtered by query) */}
            {ENTITY_TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                {/* Loading skeleton */}
                {isLoading && (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-lg" />
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {!isLoading && filteredItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center dark:border-gray-700">
                    <tab.icon className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
                    <h4 className="text-base font-medium text-gray-600 dark:text-gray-400">
                      {search
                        ? `No fields matching "${search}"`
                        : `No custom fields for ${tab.label}`}
                    </h4>
                    <p className="mt-1 text-sm text-gray-500">
                      {search
                        ? 'Try a different search term.'
                        : 'Click "+ Add Field" to create one.'}
                    </p>
                    {!search && (
                      <Button variant="outline" className="mt-4" onClick={handleCreate}>
                        <Plus className="me-1.5 h-4 w-4" />
                        Create First Field
                      </Button>
                    )}
                  </div>
                )}

                {/* Field list */}
                {!isLoading && filteredItems.length > 0 && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={filteredItems.map((f) => f._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {filteredItems.map((field) => (
                          <CustomFieldCard
                            key={field._id}
                            field={field}
                            onEdit={handleEdit}
                            onToggle={handleToggle}
                            onDelete={(id) => setDeleteId(id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}

                {/* Pagination info */}
                {data?.pagination && data.pagination.totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <span>
                      Page {data.pagination.page} of {data.pagination.totalPages} (
                      {data.pagination.total} total)
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
                        disabled={page >= data.pagination.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}

      {/* Create/Edit Sheet */}
      <CustomFieldForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingField(null);
        }}
        editingField={editingField}
        selectedEntity={selectedEntity}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Custom Field"
        description="This will permanently delete this field and ALL data stored in it across all records. This action cannot be undone."
        confirmLabel="Delete Field"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
