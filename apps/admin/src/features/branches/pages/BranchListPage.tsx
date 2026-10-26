/**
 * Branch List Page — per DENTO_V2_MASTER_PLAN §13, V2_DATABASE §11.4
 *
 * Multi-branch management with chairs, working hours, slot config.
 * DataTable with search, active filter, create dialog.
 */

import { useState, useCallback } from 'react';
import {
  useBranchList,
  useCreateBranch,
  useToggleBranchActive,
  useToggleRamadanMode,
  type Branch,
  type BranchFilters,
} from '../hooks/useBranches.js';
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
  toast,
  type ColumnDef,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
  PhoneInput,
} from '@dento/ui';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Search,
  MoreHorizontal,
  Plus,
  ToggleLeft,
  ToggleRight,
  Moon,
  Armchair,
  Clock,
  MapPin,
  Phone,
  Pencil,
} from 'lucide-react';
import { useTenantCountry } from '@/hooks/useTenantCountry.js';
import { useSupportedLanguages } from '@/hooks/useSupportedLanguages.js';
import { useTranslation } from '@/stores/locale.store.js';

export default function BranchListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tenantCountry = useTenantCountry();
  const { isMultiLang } = useSupportedLanguages();
  const [filters, setFilters] = useState<BranchFilters>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'asc',
  });
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    nameEn: '',
    nameAr: '',
    code: '',
    addressEn: '',
    city: '',
    phone: '',
    email: '',
  });
  const [toggleTarget, setToggleTarget] = useState<Branch | null>(null);

  const { data, isLoading, isError, error, refetch } = useBranchList({
    ...filters,
    search: search || undefined,
  });

  const createMutation = useCreateBranch();
  const toggleMutation = useToggleBranchActive();
  const ramadanMutation = useToggleRamadanMode();

  const items = data?.items ?? [];

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleCreate = useCallback(async () => {
    try {
      await createMutation.mutateAsync({
        name: { en: createForm.nameEn, ar: createForm.nameAr || undefined },
        code: createForm.code,
        address: { en: createForm.addressEn },
        city: createForm.city || undefined,
        phone: createForm.phone || undefined,
        email: createForm.email || undefined,
      });
      toast.success(t('branches.toast.created'));
      setCreateOpen(false);
      setCreateForm({
        nameEn: '',
        nameAr: '',
        code: '',
        addressEn: '',
        city: '',
        phone: '',
        email: '',
      });
    } catch {
      toast.error(t('branches.toast.createFailed'));
    }
  }, [createForm, createMutation, t]);

  const handleToggle = useCallback(async () => {
    if (!toggleTarget) return;
    try {
      await toggleMutation.mutateAsync(toggleTarget._id);
      toast.success(
        toggleTarget.isActive ? t('branches.toast.deactivated') : t('branches.toast.activated'),
      );
    } catch {
      toast.error(t('branches.toast.updateFailed'));
    } finally {
      setToggleTarget(null);
    }
  }, [toggleTarget, toggleMutation, t]);

  const handleRamadan = useCallback(
    async (id: string) => {
      try {
        await ramadanMutation.mutateAsync(id);
        toast.success(t('branches.toast.ramadanEnabled'));
      } catch {
        toast.error(t('branches.toast.updateFailed'));
      }
    },
    [ramadanMutation, t],
  );

  const columns: ColumnDef<Branch>[] = [
    {
      id: 'branch',
      accessorKey: 'name',
      header: t('branches.col.branch'),
      cell: (_v: unknown, row: Branch) => (
        <div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">{row.name.en}</div>
            {row.isPrimary && (
              <Badge variant="default" className="text-[10px]">
                {t('branches.badge.primary')}
              </Badge>
            )}
          </div>
          <div className="text-muted-foreground text-xs">{row.code}</div>
        </div>
      ),
    },
    {
      id: 'location',
      accessorKey: 'address',
      header: t('branches.col.location'),
      cell: (_v: unknown, row: Branch) => (
        <div className="text-sm">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-blue-500" />
            {row.address.en}
          </div>
          {row.phone && (
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <Phone className="h-3 w-3" />
              {row.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'chairs',
      accessorKey: 'chairs',
      header: t('branches.col.chairs'),
      cell: (_v: unknown, row: Branch) => {
        const active = (row.chairs ?? []).filter((c) => c.isActive).length;
        return (
          <div className="flex items-center gap-1 text-sm">
            <Armchair className="h-3.5 w-3.5 text-blue-500" />
            {active}/{row.chairs?.length ?? 0}
          </div>
        );
      },
    },
    {
      id: 'hours',
      accessorKey: 'workingHours',
      header: t('branches.col.hours'),
      cell: (_v: unknown, row: Branch) => {
        const openDays = (row.workingHours ?? []).filter((h) => !h.isClosed).length;
        return (
          <div className="flex items-center gap-1 text-sm">
            <Clock className="h-3.5 w-3.5 text-green-500" />
            {openDays}/7 days
            {row.isRamadanMode && (
              <Badge variant="outline" className="ms-1 text-[10px]">
                <Moon className="me-1 h-3 w-3" />
                {t('branches.badge.ramadan')}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: 'status',
      accessorKey: 'isActive',
      header: t('branches.col.status'),
      cell: (_v: unknown, row: Branch) => (
        <Badge variant={row.isActive ? 'default' : 'destructive'}>
          {row.isActive ? t('branches.badge.active') : t('branches.badge.inactive')}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: (_: unknown, branch: Branch) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/branches/${branch._id}`)}>
              <Pencil className="me-2 h-4 w-4" />
              {t('branches.action.edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setToggleTarget(branch)}>
              {branch.isActive ? (
                <>
                  <ToggleLeft className="me-2 h-4 w-4" />
                  {t('branches.action.deactivate')}
                </>
              ) : (
                <>
                  <ToggleRight className="me-2 h-4 w-4" />
                  {t('branches.action.activate')}
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleRamadan(branch._id)}>
              <Moon className="me-2 h-4 w-4" />
              {branch.isRamadanMode
                ? t('branches.action.disableRamadan')
                : t('branches.action.enableRamadan')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t('branches.title')} description={t('branches.subtitle')}>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="me-2 h-4 w-4" />
          {t('branches.addBranch')}
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <form onSubmit={handleSearch} className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t('branches.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </form>

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
            <SelectValue placeholder={t('branches.col.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('branches.filter.all')}</SelectItem>
            <SelectItem value="true">{t('branches.filter.active')}</SelectItem>
            <SelectItem value="false">{t('branches.filter.inactive')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      {isLoading ? (
        <TableSkeleton columns={6} rows={5} />
      ) : isError ? (
        <ErrorState title={t('branches.error.load')} message={error?.message} onRetry={refetch} />
      ) : !items.length ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title={t('branches.empty.title')}
          description={t('branches.empty.desc')}
        />
      ) : (
        <DataTable columns={columns} data={items} />
      )}

      {/* Create Branch Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('branches.create.title')}</DialogTitle>
            <DialogDescription>{t('branches.create.desc')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('branches.create.nameEn')}</Label>
                <Input
                  value={createForm.nameEn}
                  onChange={(e) => setCreateForm((p) => ({ ...p, nameEn: e.target.value }))}
                  placeholder={t('branches.create.nameEnPlaceholder')}
                />
              </div>
              {isMultiLang && (
                <div className="space-y-2">
                  <Label>{t('branches.create.nameAr')}</Label>
                  <Input
                    value={createForm.nameAr}
                    onChange={(e) => setCreateForm((p) => ({ ...p, nameAr: e.target.value }))}
                    placeholder={t('branches.create.nameArPlaceholder')}
                    dir="rtl"
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('branches.create.code')}</Label>
                <Input
                  value={createForm.code}
                  onChange={(e) => setCreateForm((p) => ({ ...p, code: e.target.value }))}
                  placeholder={t('branches.create.codePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('branches.create.city')}</Label>
                <Input
                  value={createForm.city}
                  onChange={(e) => setCreateForm((p) => ({ ...p, city: e.target.value }))}
                  placeholder={t('branches.create.cityPlaceholder')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('branches.create.address')}</Label>
              <Input
                value={createForm.addressEn}
                onChange={(e) => setCreateForm((p) => ({ ...p, addressEn: e.target.value }))}
                placeholder={t('branches.create.addressPlaceholder')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('branches.create.phone')}</Label>
                <PhoneInput
                  value={createForm.phone}
                  onChange={(v) => setCreateForm((p) => ({ ...p, phone: v }))}
                  defaultCountry={tenantCountry}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('branches.create.email')}</Label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder={t('branches.create.emailPlaceholder')}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t('branches.create.cancelBtn')}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!createForm.nameEn || !createForm.code || !createForm.addressEn}
            >
              <Plus className="me-2 h-4 w-4" />
              {t('branches.create.submitBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Confirmation */}
      <ConfirmDialog
        open={!!toggleTarget}
        onOpenChange={(open) => !open && setToggleTarget(null)}
        title={t('branches.confirm.title')}
        description={`${toggleTarget?.name.en ?? ''} ${toggleTarget?.isActive ? t('branches.action.deactivate') : t('branches.action.activate')}`}
        confirmLabel={
          toggleTarget?.isActive ? t('branches.action.deactivate') : t('branches.action.activate')
        }
        variant={toggleTarget?.isActive ? 'destructive' : 'default'}
        onConfirm={handleToggle}
      />
    </div>
  );
}
