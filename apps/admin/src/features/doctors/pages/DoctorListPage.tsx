/**
 * Doctor List Page — per DENTO_V2_MASTER_PLAN.md §13.
 * DataTable with search, specialization filter, active/inactive toggle.
 * Doctors are synced from platform User (role=dentist).
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useDoctorList,
  useSpecializations,
  useToggleDoctorActive,
  useDeleteDoctor,
  useSyncDoctors,
  type Doctor,
  type DoctorFilters,
} from '../hooks/useDoctors.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  DataTable,
  EmptyState,
  PageHeader,
  Button,
  Input,
  Badge,
  ConfirmDialog,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Avatar,
  AvatarImage,
  AvatarFallback,
  toast,
  type ColumnDef,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@dento/ui';
import {
  UserCog,
  Search,
  MoreHorizontal,
  ToggleLeft,
  ToggleRight,
  Calendar,
  MapPin,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useTranslation } from '@/stores/locale.store.js';

export default function DoctorListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [filters, setFilters] = useState<DoctorFilters>({
    page: 1,
    limit: 20,
    sortBy: 'displayOrder',
    sortOrder: 'asc',
  });
  const [search, setSearch] = useState('');
  const [toggleTarget, setToggleTarget] = useState<Doctor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Doctor | null>(null);

  const { data, isLoading, isError, error, refetch } = useDoctorList({
    ...filters,
    search: search || undefined,
  });

  const { data: specializations } = useSpecializations();
  const toggleMutation = useToggleDoctorActive();
  const deleteMutation = useDeleteDoctor();
  const syncMutation = useSyncDoctors();

  const items = data?.items ?? [];

  const handleSync = useCallback(async () => {
    try {
      const res = await syncMutation.mutateAsync();
      const synced = res.data?.synced ?? 0;
      if (synced > 0) {
        toast.success(t('doctors.toast.synced').replace('{{count}}', String(synced)));
      } else {
        toast.info(t('doctors.toast.alreadySynced'));
      }
    } catch {
      toast.error(t('doctors.toast.syncFailed'));
    }
  }, [syncMutation]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleToggle = useCallback(async () => {
    if (!toggleTarget) return;
    try {
      await toggleMutation.mutateAsync(toggleTarget._id);
      toast.success(
        toggleTarget.isActive ? t('doctors.toast.deactivated') : t('doctors.toast.activated'),
      );
    } catch {
      toast.error(t('doctors.toast.toggleFailed'));
    } finally {
      setToggleTarget(null);
    }
  }, [toggleTarget, toggleMutation]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget._id);
      toast.success(t('doctors.toast.removed'));
    } catch {
      toast.error(t('doctors.toast.removeFailed'));
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteMutation]);

  const str = (v: unknown): string =>
    typeof v === 'object' && v !== null && 'en' in v ? (v as { en: string }).en : String(v ?? '');

  const columns: ColumnDef<Doctor>[] = [
    {
      id: 'doctor',
      accessorKey: 'firstName',
      header: t('doctors.columns.doctor'),
      cell: (_v: unknown, row: Doctor) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            {row.avatarUrl && <AvatarImage src={row.avatarUrl} alt={str(row.firstName)} />}
            <AvatarFallback
              className="text-xs font-medium"
              style={row.color ? { backgroundColor: row.color, color: '#fff' } : {}}
            >
              {str(row.firstName)[0]}
              {str(row.lastName)[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-medium">
              {row.title && `${row.title} `}
              {str(row.firstName)} {str(row.lastName)}
            </div>
            <div className="text-muted-foreground text-xs">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'specialization',
      accessorKey: 'specialization',
      header: t('doctors.columns.specialization'),
      cell: (_v: unknown, row: Doctor) => (
        <Badge variant="outline" className="text-xs">
          {row.specialization}
        </Badge>
      ),
    },
    {
      id: 'schedule',
      accessorKey: 'defaultSlotDuration',
      header: t('doctors.columns.scheduling'),
      cell: (_v: unknown, row: Doctor) => (
        <div className="text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-blue-500" />
            {t('doctors.cell.slotDuration').replace(
              '{{duration}}',
              String(row.defaultSlotDuration),
            )}
          </div>
          {row.maxDailyPatients && (
            <div className="text-muted-foreground text-xs">
              {t('doctors.cell.maxPerDay').replace('{{count}}', String(row.maxDailyPatients))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'availability',
      accessorKey: 'isAcceptingNewPatients',
      header: t('doctors.columns.availability'),
      cell: (_v: unknown, row: Doctor) => (
        <div className="flex flex-col gap-1">
          <Badge variant={row.isAcceptingNewPatients ? 'default' : 'secondary'} className="text-xs">
            {row.isAcceptingNewPatients
              ? t('doctors.cell.accepting')
              : t('doctors.cell.notAccepting')}
          </Badge>
          {row.isOnlineBookingEnabled && (
            <Badge variant="outline" className="text-xs">
              <MapPin className="me-1 h-3 w-3" />
              {t('doctors.cell.onlineBooking')}
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      accessorKey: 'isActive',
      header: t('doctors.columns.status'),
      cell: (_v: unknown, row: Doctor) => (
        <Badge variant={row.isActive ? 'default' : 'destructive'}>
          {row.isActive ? t('doctors.status.active') : t('doctors.status.inactive')}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: (_: unknown, doc: Doctor) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/doctors/${doc._id}`)}>
              <Pencil className="me-2 h-4 w-4" />
              {t('doctors.actions.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setToggleTarget(doc)}>
              {doc.isActive ? (
                <>
                  <ToggleLeft className="me-2 h-4 w-4" />
                  {t('doctors.actions.deactivate')}
                </>
              ) : (
                <>
                  <ToggleRight className="me-2 h-4 w-4" />
                  {t('doctors.actions.activate')}
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteTarget(doc)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="me-2 h-4 w-4" />
              {t('doctors.actions.remove')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t('doctors.page.title')} description={t('doctors.page.description')} />

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <form onSubmit={handleSearch} className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t('doctors.filters.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </form>

        {specializations && specializations.length > 0 && (
          <Select
            value={filters.specialization || 'all'}
            onValueChange={(v) =>
              setFilters((prev) => ({
                ...prev,
                specialization: v === 'all' ? undefined : v,
                page: 1,
              }))
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Specialization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('doctors.filters.allSpecializations')}</SelectItem>
              {specializations.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={filters.isActive === undefined ? 'all' : String(filters.isActive)}
          onValueChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              isActive: v === 'all' ? undefined : v === 'true',
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('doctors.filters.all')}</SelectItem>
            <SelectItem value="true">{t('doctors.status.active')}</SelectItem>
            <SelectItem value="false">{t('doctors.status.inactive')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data */}
      {isLoading ? (
        <TableSkeleton columns={6} rows={8} />
      ) : isError ? (
        <ErrorState
          title={t('doctors.error.loadFailed')}
          message={error?.message}
          onRetry={refetch}
        />
      ) : !items.length ? (
        <EmptyState
          icon={<UserCog className="h-6 w-6" />}
          title={t('doctors.empty.title')}
          description={t('doctors.empty.description')}
          action={{
            label: t('doctors.empty.syncAction'),
            onClick: handleSync,
          }}
        />
      ) : (
        <DataTable columns={columns} data={items} />
      )}

      {/* Toggle Confirmation */}
      <ConfirmDialog
        open={!!toggleTarget}
        onOpenChange={(open) => !open && setToggleTarget(null)}
        title={`${toggleTarget?.isActive ? t('doctors.actions.deactivate') : t('doctors.actions.activate')} ${t('doctors.confirmations.doctor')}?`}
        description={`${toggleTarget?.title ?? ''} ${toggleTarget?.firstName ?? ''} ${toggleTarget?.lastName ?? ''} ${toggleTarget?.isActive ? t('doctors.confirmations.deactivateDescription') : t('doctors.confirmations.activateDescription')}`}
        confirmLabel={
          toggleTarget?.isActive ? t('doctors.actions.deactivate') : t('doctors.actions.activate')
        }
        variant={toggleTarget?.isActive ? 'destructive' : 'default'}
        onConfirm={handleToggle}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('doctors.confirmations.removeTitle')}
        description={`${t('doctors.confirmations.removeDescription')} ${deleteTarget?.title ?? ''} ${deleteTarget?.firstName ?? ''} ${deleteTarget?.lastName ?? ''}.`}
        confirmLabel={t('doctors.actions.remove')}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
