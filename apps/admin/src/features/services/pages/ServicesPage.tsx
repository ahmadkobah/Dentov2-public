/**
 * Services Catalog Page — per DENTO_V2_MASTER_PLAN.md §10 (#16).
 * DataTable with server-side pagination and search.
 */

import { useState, useCallback } from 'react';
import {
  useServiceList,
  useCreateService,
  useUpdateService,
  useDeleteService,
  type Service,
  type ServiceFilters,
} from '../hooks/useServices.js';
import { ServiceForm } from '../components/ServiceForm.js';
import { useThemeStore } from '@/stores/theme.store.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import { formatCurrency } from '@/lib/currency.js';
import type { CreateServiceInput } from '@dento/shared';
import {
  DataTable,
  EmptyState,
  PageHeader,
  Button,
  Input,
  Badge,
  ConfirmDialog,
  Dialog,
  DialogContent,
  toast,
  type ColumnDef,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@dento/ui';
import { ListTree, Search, MoreHorizontal, Pencil, Trash2, Clock, Plus } from 'lucide-react';
import { useTranslation } from '@/stores/locale.store.js';

export default function ServicesPage() {
  const { t } = useTranslation();
  const locale = useThemeStore((s) => s.locale);

  // ── Services State ────────────────────────────────────────

  const [serviceFilters, setServiceFilters] = useState<ServiceFilters>({
    page: 1,
    limit: 20,
    sortBy: 'sortOrder',
    sortOrder: 'asc',
  });
  const [serviceSearch, setServiceSearch] = useState('');
  const [deleteServiceTarget, setDeleteServiceTarget] = useState<Service | null>(null);
  const [showCreateService, setShowCreateService] = useState(false);
  const [editServiceTarget, setEditServiceTarget] = useState<Service | null>(null);

  const {
    data: serviceData,
    isLoading: servicesLoading,
    isError: servicesError,
    error: servicesErr,
    refetch: refetchServices,
  } = useServiceList({ ...serviceFilters, search: serviceSearch || undefined });
  const createServiceMutation = useCreateService();
  const deleteServiceMutation = useDeleteService();

  // ── Handlers ──────────────────────────────────────────────

  const handleDeleteService = useCallback(async () => {
    if (!deleteServiceTarget) return;
    try {
      await deleteServiceMutation.mutateAsync(deleteServiceTarget._id);
      toast.success(t('services.toast.deactivated'));
    } catch {
      toast.error(t('services.toast.deactivateFailed'));
    } finally {
      setDeleteServiceTarget(null);
    }
  }, [deleteServiceTarget, deleteServiceMutation, t]);

  const handleCreateService = useCallback(
    async (data: CreateServiceInput) => {
      try {
        await createServiceMutation.mutateAsync(data);
        setShowCreateService(false);
        toast.success(t('services.toast.created'));
      } catch {
        toast.error(t('services.toast.createFailed'));
      }
    },
    [createServiceMutation, t],
  );

  const localizedName = useCallback(
    (name: { en: string; ar?: string } | null | undefined) => {
      if (!name) return '—';
      return locale === 'ar' && name.ar ? name.ar : name.en;
    },
    [locale],
  );

  // ── Service Columns ───────────────────────────────────────

  const serviceColumns: ColumnDef<Service>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: t('services.col.serviceName'),
      cell: (_v: unknown, row: Service) => (
        <span className="text-sm font-medium">{localizedName(row.name)}</span>
      ),
    },
    {
      id: 'code',
      accessorKey: 'code',
      header: t('services.col.code'),
      cell: (_v: unknown, row: Service) => (
        <span className="text-sm text-muted-foreground font-mono">{row.code || '—'}</span>
      ),
    },
    {
      id: 'defaultDuration',
      accessorKey: 'defaultDuration',
      header: t('services.col.duration'),
      cell: (_v: unknown, row: Service) => (
        <span className="text-muted-foreground text-sm">
          <Clock className="me-1 inline h-3 w-3" />
          {row.defaultDuration} min
        </span>
      ),
    },
    {
      id: 'defaultPrice',
      accessorKey: 'defaultPrice',
      header: t('services.col.price'),
      cell: (_v: unknown, row: Service) => (
        <span className="text-sm">{formatCurrency(row.defaultPrice)}</span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'isActive',
      header: t('services.col.status'),
      cell: (_v: unknown, row: Service) => (
        <div className="flex items-center gap-1.5">
          <Badge variant={row.isActive ? 'default' : 'destructive'}>
            {row.isActive ? t('services.badge.active') : t('services.badge.inactive')}
          </Badge>
          {row.isDefault && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {t('services.badge.default')}
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: (_: unknown, svc: Service) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditServiceTarget(svc)}>
              <Pencil className="me-2 h-4 w-4" />
              {t('services.action.edit')}
            </DropdownMenuItem>
            {!svc.isDefault && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteServiceTarget(svc)}
                  className="text-destructive"
                >
                  <Trash2 className="me-2 h-4 w-4" />
                  {t('services.action.deactivate')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t('services.title')} description={t('services.subtitle')}>
        <Button onClick={() => setShowCreateService(true)}>
          <Plus className="me-2 h-4 w-4" />
          {t('services.newService')}
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setServiceFilters((prev) => ({ ...prev, page: 1 }));
          }}
          className="relative max-w-sm flex-1"
        >
          <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t('services.search')}
            value={serviceSearch}
            onChange={(e) => setServiceSearch(e.target.value)}
            className="ps-9"
          />
        </form>
      </div>

      {servicesLoading ? (
        <TableSkeleton columns={5} rows={10} />
      ) : servicesError ? (
        <ErrorState
          title={t('services.loadFailed')}
          message={servicesErr?.message}
          onRetry={refetchServices}
        />
      ) : !serviceData?.items.length ? (
        <EmptyState
          icon={<ListTree className="h-6 w-6" />}
          title={t('services.empty.title')}
          description={t('services.empty.description')}
          action={{ label: t('services.newService'), onClick: () => setShowCreateService(true) }}
        />
      ) : (
        <DataTable columns={serviceColumns} data={serviceData.items} />
      )}

      {/* Confirm Deactivate */}
      <ConfirmDialog
        open={!!deleteServiceTarget}
        onOpenChange={(open) => !open && setDeleteServiceTarget(null)}
        title={t('services.confirm.deactivateTitle')}
        description={`"${deleteServiceTarget ? localizedName(deleteServiceTarget.name) : ''}" ${t('services.confirm.deactivateMessage')}`}
        confirmLabel={t('services.action.deactivate')}
        variant="destructive"
        onConfirm={handleDeleteService}
      />

      {/* Create Service Dialog */}
      <Dialog open={showCreateService} onOpenChange={setShowCreateService}>
        <DialogContent className="max-w-xl">
          <ServiceForm
            onSubmit={handleCreateService}
            isPending={createServiceMutation.isPending}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      {editServiceTarget && (
        <EditServiceDialog service={editServiceTarget} onClose={() => setEditServiceTarget(null)} />
      )}
    </div>
  );
}

/* ── Edit Service sub-component (needs its own mutation hook) ── */

function EditServiceDialog({ service, onClose }: { service: Service; onClose: () => void }) {
  const { t } = useTranslation();
  const updateMutation = useUpdateService(service._id);
  const handleSubmit = async (data: CreateServiceInput) => {
    try {
      await updateMutation.mutateAsync(data);
      onClose();
      toast.success(t('services.toast.updated'));
    } catch {
      toast.error(t('services.toast.updateFailed'));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <ServiceForm
          defaultValues={{
            name: { en: service.name.en, ar: service.name.ar ?? '' },
            description: service.description
              ? { en: service.description.en, ar: service.description.ar ?? '' }
              : undefined,
            code: service.code,
            defaultPrice: service.defaultPrice,
            defaultDuration: service.defaultDuration,
          }}
          onSubmit={handleSubmit}
          isPending={updateMutation.isPending}
          mode="edit"
        />
      </DialogContent>
    </Dialog>
  );
}
