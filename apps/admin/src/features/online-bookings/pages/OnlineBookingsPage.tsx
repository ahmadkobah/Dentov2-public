/**
 * Online Bookings Management Page — per IMPLEMENTATION_ROADMAP Week 9
 *
 * Lists online booking requests from patients. Admin can confirm,
 * confirm with changes (reschedule/reassign doctor), or reject.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  useBookingList,
  useProcessBooking,
  type BookingAppointment,
  type BookingFilters,
} from '../hooks/useBookings.js';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
  Textarea,
  toast,
  type ColumnDef,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@dento/ui';
import {
  MoreHorizontal,
  Check,
  X,
  CalendarClock,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  TableIcon,
  Calendar,
} from 'lucide-react';
import { SlotCalendarView } from '../components/SlotCalendarView.js';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Status Badge ────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  booked: { label: 'Pending', variant: 'default' },
  confirmed: { label: 'Confirmed', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  completed: { label: 'Completed', variant: 'outline' },
  no_show: { label: 'No Show', variant: 'destructive' },
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const cfg = STATUS_CONFIG[status] ?? { label: status, variant: 'outline' as const };
  const labelKey =
    status === 'booked' ? 'onlineBookings.status.pending' : `onlineBookings.status.${status}`;
  return <Badge variant={cfg.variant}>{t(labelKey, { defaultValue: cfg.label })}</Badge>;
}

// ── Helper ──────────────────────────────────────────────────

function getPatientName(booking: BookingAppointment): string {
  if (booking.patient) {
    return `${booking.patient.firstName?.en ?? ''} ${booking.patient.lastName?.en ?? ''}`.trim();
  }
  if (booking.onlineBookingData) {
    return `${booking.onlineBookingData.firstName ?? ''} ${booking.onlineBookingData.lastName ?? ''}`.trim();
  }
  return 'Unknown';
}

function getPatientContact(booking: BookingAppointment): { phone?: string; email?: string } {
  return {
    phone: booking.patient?.phone ?? booking.onlineBookingData?.phone,
    email: booking.onlineBookingData?.email,
  };
}

// ── Page Component ──────────────────────────────────────────

type ViewMode = 'table' | 'calendar';

export default function OnlineBookingsPage() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filters, setFilters] = useState<BookingFilters>({ page: 1, limit: 20 });
  const [rejectDialog, setRejectDialog] = useState<BookingAppointment | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<BookingAppointment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data, isLoading, isError, refetch } = useBookingList(filters);
  const processBooking = useProcessBooking();

  // ── Handlers ──────────────────────────────────────────────

  const handleConfirm = useCallback(
    async (booking: BookingAppointment) => {
      try {
        await processBooking.mutateAsync({
          id: booking._id,
          data: { action: 'confirm' },
        });
        toast.success(t('onlineBookings.toast.confirmed'));
        setConfirmDialog(null);
      } catch {
        toast.error(t('onlineBookings.toast.confirmFailed'));
      }
    },
    [processBooking, t],
  );

  const handleReject = useCallback(async () => {
    if (!rejectDialog) return;
    try {
      await processBooking.mutateAsync({
        id: rejectDialog._id,
        data: {
          action: 'reject',
          rejectionReason: rejectionReason || undefined,
        },
      });
      toast.success(t('onlineBookings.toast.rejected'));
      setRejectDialog(null);
      setRejectionReason('');
    } catch {
      toast.error(t('onlineBookings.toast.rejectFailed'));
    }
  }, [rejectDialog, rejectionReason, processBooking, t]);

  const setFilter = useCallback((key: keyof BookingFilters, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  // ── Columns ───────────────────────────────────────────────

  const columns = useMemo<ColumnDef<BookingAppointment>[]>(
    () => [
      {
        id: 'patient',
        accessorKey: 'patient',
        header: t('onlineBookings.col.patient'),
        cell: (_v: unknown, row: BookingAppointment) => {
          const name = getPatientName(row);
          const contact = getPatientContact(row);
          return (
            <div>
              <div className="font-medium">{name}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {contact.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {contact.phone}
                  </span>
                )}
                {contact.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {contact.email}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: 'date',
        accessorKey: 'date',
        header: t('onlineBookings.col.dateTime'),
        cell: (_v: unknown, row: BookingAppointment) => (
          <div>
            <div className="font-medium">{row.date}</div>
            <div className="text-xs text-muted-foreground">
              {row.startTime} – {row.endTime}
            </div>
          </div>
        ),
      },
      {
        id: 'doctor',
        accessorKey: 'doctor',
        header: t('onlineBookings.col.doctor'),
        cell: (_v: unknown, row: BookingAppointment) => {
          const doc = row.doctor;
          if (!doc) {
            return <span className="text-muted-foreground">{t('onlineBookings.notAssigned')}</span>;
          }
          return (
            <div>
              <div className="font-medium">
                Dr. {doc.firstName} {doc.lastName}
              </div>
              {doc.specialization && (
                <div className="text-xs text-muted-foreground">{doc.specialization}</div>
              )}
            </div>
          );
        },
      },
      {
        id: 'branch',
        accessorKey: 'branch',
        header: t('onlineBookings.col.branch'),
        cell: (_v: unknown, row: BookingAppointment) => {
          const branch = row.branch;
          return branch?.name?.en ?? '—';
        },
      },
      {
        id: 'reason',
        accessorKey: 'reason',
        header: t('onlineBookings.col.reason'),
        cell: (_v: unknown, row: BookingAppointment) => (
          <span className="text-sm text-muted-foreground">{row.reason || '—'}</span>
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: t('onlineBookings.col.status'),
        cell: (_v: unknown, row: BookingAppointment) => <StatusBadge status={row.status} />,
      },
      {
        id: 'language',
        header: t('onlineBookings.col.lang'),
        cell: (_v: unknown, row: BookingAppointment) => {
          const lang = row.onlineBookingData?.preferredLanguage ?? 'en';
          return (
            <Badge variant="outline" className="text-xs">
              {lang.toUpperCase()}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: (_v: unknown, booking: BookingAppointment) => {
          const isPending = booking.status === 'booked';
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={t('onlineBookings.action.ariaLabel')}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isPending && (
                  <>
                    <DropdownMenuItem onClick={() => setConfirmDialog(booking)}>
                      <Check className="h-4 w-4 me-2" />
                      {t('onlineBookings.action.confirm')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setRejectDialog(booking)}
                      className="text-destructive"
                    >
                      <X className="h-4 w-4 me-2" />
                      {t('onlineBookings.action.reject')}
                    </DropdownMenuItem>
                  </>
                )}
                {!isPending && (
                  <DropdownMenuItem disabled>
                    {t('onlineBookings.action.already', { status: booking.status })}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [t],
  );

  // ── Render ────────────────────────────────────────────────

  if (isLoading) return <TableSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const bookings = data?.bookings ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title={t('onlineBookings.title')} description={t('onlineBookings.subtitle')} />
        <div className="flex items-center rounded-lg border p-1">
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="gap-1.5"
          >
            <TableIcon className="h-4 w-4" />
            {t('onlineBookings.view.table')}
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('calendar')}
            className="gap-1.5"
          >
            <Calendar className="h-4 w-4" />
            {t('onlineBookings.view.slots')}
          </Button>
        </div>
      </div>

      {viewMode === 'calendar' && <SlotCalendarView />}

      {/* Filters — table mode only */}
      {viewMode === 'table' && (
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={filters.status ?? 'all'}
            onValueChange={(v) => setFilter('status', v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t('onlineBookings.filter.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('onlineBookings.filter.allStatuses')}</SelectItem>
              <SelectItem value="pending">{t('onlineBookings.filter.pending')}</SelectItem>
              <SelectItem value="confirmed">{t('onlineBookings.filter.confirmed')}</SelectItem>
              <SelectItem value="rejected">{t('onlineBookings.filter.rejected')}</SelectItem>
              <SelectItem value="cancelled">{t('onlineBookings.filter.cancelled')}</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            placeholder={t('onlineBookings.filter.fromDate')}
            className="w-[160px]"
            value={filters.dateFrom ?? ''}
            onChange={(e) => setFilter('dateFrom', e.target.value || undefined)}
          />
          <Input
            type="date"
            placeholder={t('onlineBookings.filter.toDate')}
            className="w-[160px]"
            value={filters.dateTo ?? ''}
            onChange={(e) => setFilter('dateTo', e.target.value || undefined)}
          />
        </div>
      )}

      {/* Table */}
      {viewMode === 'table' &&
        (bookings.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="h-12 w-12" />}
            title={t('onlineBookings.empty.title')}
            description={t('onlineBookings.empty.description')}
          />
        ) : (
          <>
            <DataTable columns={columns} data={bookings} />

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t('onlineBookings.pagination.page', {
                    current: meta.page,
                    total: meta.totalPages,
                    count: meta.total,
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={meta.page <= 1}
                    onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ))}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmDialog}
        onOpenChange={(o) => !o && setConfirmDialog(null)}
        title={t('onlineBookings.dialog.confirmTitle')}
        description={
          confirmDialog
            ? t('onlineBookings.dialog.confirmDescription', {
                patient: getPatientName(confirmDialog),
                date: confirmDialog.date,
                time: confirmDialog.startTime,
              })
            : ''
        }
        confirmLabel={t('onlineBookings.action.confirm')}
        onConfirm={() => {
          if (confirmDialog) handleConfirm(confirmDialog);
        }}
      />

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(o) => !o && setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('onlineBookings.dialog.rejectTitle')}</DialogTitle>
          </DialogHeader>
          {rejectDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('onlineBookings.dialog.rejectDescription', {
                  patient: getPatientName(rejectDialog),
                  date: rejectDialog.date,
                  time: rejectDialog.startTime,
                })}
              </p>
              <div className="space-y-2">
                <Label>{t('onlineBookings.dialog.rejectionReason')}</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={t('onlineBookings.dialog.rejectionPlaceholder')}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>
              {t('common.actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processBooking.isPending}
            >
              {t('onlineBookings.action.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
