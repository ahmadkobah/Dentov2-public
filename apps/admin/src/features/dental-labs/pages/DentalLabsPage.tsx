import { useState, useMemo } from 'react';
import { Button } from '@dento/ui';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Star,
  Clock,
  Edit2,
  Trash2,
  Loader2,
  XCircle,
  RefreshCw,
  CheckCircle2,
  XCircle as InactiveIcon,
} from 'lucide-react';
import { useDentalLabs, useDeleteDentalLab } from '../hooks/useDentalLabs.js';
import type { DentalLab } from '../hooks/useDentalLabs.js';
import { useTranslation } from '../../../stores/locale.store.js';
import DentalLabDialog from '../components/DentalLabDialog.js';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DentalLabsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<DentalLab | null>(null);

  const filters = {
    search: search || undefined,
    isActive: showInactive ? undefined : true,
  };

  const { data, isLoading, isError, refetch } = useDentalLabs(filters);
  const deleteLab = useDeleteDentalLab();

  const labs: DentalLab[] = useMemo(() => {
    const items = data?.items ?? [];
    if (Array.isArray(items)) return items;
    return [];
  }, [data]);

  /* ---- Loading / Error ---- */

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
        <p className="mt-2 text-red-700 dark:text-red-300">{t('dentalLabs.error.loadFailed')}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
          <RefreshCw className="me-2 h-4 w-4" /> {t('dentalLabs.error.retry')}
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
            {t('dentalLabs.page.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('dentalLabs.page.description')}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingLab(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="me-2 h-4 w-4" /> {t('dentalLabs.actions.addLab')}
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('dentalLabs.search.placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 ps-10 pe-4 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          {t('dentalLabs.search.showInactive')}
        </label>
      </div>

      {/* Lab List */}
      {labs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-16 text-center dark:border-gray-700 dark:bg-gray-900/50">
          <Building2 className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {search ? t('dentalLabs.empty.search') : t('dentalLabs.empty.noData')}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {labs.map((lab) => (
            <LabCard
              key={lab._id}
              lab={lab}
              onEdit={() => {
                setEditingLab(lab);
                setDialogOpen(true);
              }}
              onDelete={() => {
                if (
                  window.confirm(
                    t('dentalLabs.dialog.deactivateTitle').replace('{{name}}', lab.name),
                  )
                ) {
                  deleteLab.mutate(lab._id);
                }
              }}
            />
          ))}
        </div>
      )}

      <DentalLabDialog open={dialogOpen} onOpenChange={setDialogOpen} editItem={editingLab} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Lab Card                                                           */
/* ------------------------------------------------------------------ */

function LabCard({
  lab,
  onEdit,
  onDelete,
}: {
  lab: DentalLab;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 transition hover:shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
            <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-medium text-gray-800 dark:text-white">{lab.name}</h3>
            {lab.contactPerson && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{lab.contactPerson}</p>
            )}
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
            lab.isActive
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          }`}
        >
          {lab.isActive ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <InactiveIcon className="h-3 w-3" />
          )}
          {lab.isActive ? t('dentalLabs.status.active') : t('dentalLabs.status.inactive')}
        </span>
      </div>

      {/* Contact info */}
      <div className="mt-3 space-y-1">
        {lab.phone && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Phone className="h-3 w-3" />
            <span>{lab.phone}</span>
          </div>
        )}
        {lab.email && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Mail className="h-3 w-3" />
            <span>{lab.email}</span>
          </div>
        )}
        {lab.city && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <MapPin className="h-3 w-3" />
            <span>{lab.city}</span>
          </div>
        )}
      </div>

      {/* Specialties */}
      {(lab.specialties?.length ?? 0) > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {lab.specialties.map((s) => (
            <span
              key={s}
              className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Meta row */}
      <div className="mt-3 flex items-center gap-4 border-t border-gray-100 pt-3 text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500">
        {lab.rating != null && (
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 text-yellow-400" />
            {lab.rating.toFixed(1)}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {lab.defaultTurnaroundDays}d turnaround
        </span>
        <div className="ms-auto flex gap-1">
          <button
            title="Edit"
            onClick={onEdit}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            title="Deactivate"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default DentalLabsPage;
