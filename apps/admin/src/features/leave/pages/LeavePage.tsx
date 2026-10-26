/**
 * Leave Management Page — Tabbed view for Leave Types, Requests, Balances.
 * BUILD_RULES §8.1, §15.2 — Phase 3 Week 9.
 */

import { useState } from 'react';
import {
  useLeaveTypeList,
  useLeaveRequestList,
  useReviewLeaveRequest,
  useLeaveBalanceList,
  type LeaveType,
  type LeaveRequest,
  type LeaveBalance,
} from '../hooks/useLeave.js';
import { useThemeStore } from '@/stores/theme.store.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  DataTable,
  EmptyState,
  PageHeader,
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  type ColumnDef,
  toast,
} from '@dento/ui';
import { CalendarOff, ListTree, BarChart3 } from 'lucide-react';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDate } from '@/lib/date.js';

/* ── Status badge variant map ────────────────────────── */

const REQUEST_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> =
  {
    pending: 'secondary',
    approved: 'default',
    rejected: 'destructive',
    cancelled: 'outline',
  };

export default function LeavePage() {
  const locale = useThemeStore((s) => s.locale);
  const lang = locale === 'ar' ? 'ar' : 'en';
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState('requests');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  // ── Leave Types ───────────────────────────────────────
  const {
    data: typesData,
    isLoading: typesLoading,
    isError: typesError,
    error: typesErr,
    refetch: refetchTypes,
  } = useLeaveTypeList({});

  const typeColumns: ColumnDef<LeaveType>[] = [
    {
      id: 'name',
      header: t('leave.typeColumns.name'),
      accessorFn: (row) => row.name[lang] || row.name.en,
      sortable: true,
    },
    { id: 'code', header: t('leave.typeColumns.code'), accessorFn: (row) => row.code },
    {
      id: 'maxDaysPerYear',
      header: t('leave.typeColumns.maxDaysPerYear'),
      accessorFn: (row) => row.maxDaysPerYear,
    },
    {
      id: 'isPaid',
      header: t('leave.typeColumns.paid'),
      cell: (_v: unknown, row: LeaveType) => (
        <Badge variant={row.isPaid ? 'default' : 'outline'}>
          {row.isPaid ? t('leave.typeColumns.paid') : t('leave.typeColumns.unpaid')}
        </Badge>
      ),
    },
    {
      id: 'isApprovalRequired',
      header: t('leave.typeColumns.approval'),
      cell: (_v: unknown, row: LeaveType) =>
        row.isApprovalRequired ? (
          <Badge variant="secondary">{t('leave.typeColumns.required')}</Badge>
        ) : (
          <Badge variant="outline">{t('leave.typeColumns.auto')}</Badge>
        ),
    },
    {
      id: 'color',
      header: t('leave.typeColumns.color'),
      cell: (_v: unknown, row: LeaveType) =>
        row.color ? (
          <span
            className="inline-block h-4 w-4 rounded-full"
            style={{ backgroundColor: row.color }}
          />
        ) : (
          '—'
        ),
    },
  ];

  // ── Leave Requests ────────────────────────────────────
  const {
    data: requestsData,
    isLoading: requestsLoading,
    isError: requestsError,
    error: requestsErr,
    refetch: refetchRequests,
  } = useLeaveRequestList({ status: statusFilter });

  const reviewRequest = useReviewLeaveRequest();
  const requestColumns: ColumnDef<LeaveRequest>[] = [
    {
      id: 'dates',
      header: t('leave.requestColumns.period'),
      accessorFn: (row) =>
        row.startDate === row.endDate ? row.startDate : `${row.startDate} → ${row.endDate}`,
    },
    {
      id: 'totalDays',
      header: t('leave.requestColumns.days'),
      accessorFn: (row) => row.totalDays,
    },
    {
      id: 'reason',
      header: t('leave.requestColumns.reason'),
      accessorFn: (row) => row.reason || '—',
    },
    {
      id: 'status',
      header: t('leave.requestColumns.status'),
      cell: (_v: unknown, row: LeaveRequest) => (
        <Badge variant={REQUEST_STATUS_VARIANT[row.status] ?? 'outline'}>
          {t(`leave.filters.${row.status}`, {
            defaultValue: row.status.charAt(0).toUpperCase() + row.status.slice(1),
          })}
        </Badge>
      ),
    },
    {
      id: 'createdAt',
      header: t('leave.requestColumns.requested'),
      accessorFn: (row) => formatDate(row.createdAt),
    },
    {
      id: 'actions',
      header: '',
      cell: (_v: unknown, row: LeaveRequest) => {
        if (row.status !== 'pending') return null;
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={async () => {
                try {
                  await reviewRequest.mutateAsync({
                    id: row._id,
                    data: { status: 'approved' },
                  });
                  toast.success(t('leave.toast.approved'));
                } catch {
                  toast.error(t('leave.toast.approveFailed'));
                }
              }}
            >
              {t('leave.requestActions.approve')}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
                try {
                  await reviewRequest.mutateAsync({
                    id: row._id,
                    data: { status: 'rejected', rejectionReason: 'Rejected by admin' },
                  });
                  toast.success(t('leave.toast.rejected'));
                } catch {
                  toast.error(t('leave.toast.rejectFailed'));
                }
              }}
            >
              {t('leave.requestActions.reject')}
            </Button>
          </div>
        );
      },
    },
  ];

  // ── Leave Balances ────────────────────────────────────
  const {
    data: balances,
    isLoading: balancesLoading,
    isError: balancesError,
    error: balancesErr,
    refetch: refetchBalances,
  } = useLeaveBalanceList({});

  const balanceColumns: ColumnDef<LeaveBalance>[] = [
    { id: 'year', header: t('leave.balanceColumns.year'), accessorFn: (row) => row.year },
    {
      id: 'totalAllowance',
      header: t('leave.balanceColumns.total'),
      accessorFn: (row) => row.totalAllowance,
    },
    { id: 'usedDays', header: t('leave.balanceColumns.used'), accessorFn: (row) => row.usedDays },
    {
      id: 'remainingDays',
      header: t('leave.balanceColumns.remaining'),
      accessorFn: (row) => row.remainingDays,
    },
    {
      id: 'carriedForward',
      header: t('leave.balanceColumns.carriedForward'),
      accessorFn: (row) => row.carriedForward,
    },
  ];

  // ── Tab content renderer helper ───────────────────────
  function renderTab<T>(
    loading: boolean,
    isErr: boolean,
    err: Error | null,
    refetch: () => void,
    data: T[] | undefined,
    columns: ColumnDef<T>[],
    emptyIcon: React.ReactNode,
    emptyTitle: string,
    emptyDesc: string,
  ) {
    if (loading) return <TableSkeleton columns={columns.length} rows={6} />;
    if (isErr)
      return (
        <ErrorState title={t('leave.error.loadFailed')} message={err?.message} onRetry={refetch} />
      );
    if (!data?.length) {
      return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDesc} />;
    }
    return (
      <DataTable columns={columns} data={data} rowKey={(row) => (row as { _id: string })._id} />
    );
  }

  // ── Render ────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t('leave.page.title')} description={t('leave.page.description')} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests">
            <CalendarOff className="me-2 h-4 w-4" />
            {t('leave.tabs.leaveRequests')}
          </TabsTrigger>
          <TabsTrigger value="types">
            <ListTree className="me-2 h-4 w-4" />
            {t('leave.tabs.leaveTypes')}
          </TabsTrigger>
          <TabsTrigger value="balances">
            <BarChart3 className="me-2 h-4 w-4" />
            {t('leave.tabs.balances')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4 space-y-4">
          {/* Status filter */}
          <div className="flex items-center gap-3">
            <Select
              value={statusFilter ?? 'all'}
              onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : v)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('leave.filters.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('leave.filters.allStatuses')}</SelectItem>
                <SelectItem value="pending">{t('leave.filters.pending')}</SelectItem>
                <SelectItem value="approved">{t('leave.filters.approved')}</SelectItem>
                <SelectItem value="rejected">{t('leave.filters.rejected')}</SelectItem>
                <SelectItem value="cancelled">{t('leave.filters.cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderTab(
            requestsLoading,
            requestsError,
            requestsErr,
            refetchRequests,
            requestsData?.requests,
            requestColumns,
            <CalendarOff className="h-7 w-7" />,
            t('leave.empty.requests.title'),
            t('leave.empty.requests.description'),
          )}
        </TabsContent>

        <TabsContent value="types" className="mt-4">
          {renderTab(
            typesLoading,
            typesError,
            typesErr,
            refetchTypes,
            typesData?.types,
            typeColumns,
            <ListTree className="h-7 w-7" />,
            t('leave.empty.types.title'),
            t('leave.empty.types.description'),
          )}
        </TabsContent>

        <TabsContent value="balances" className="mt-4">
          {renderTab(
            balancesLoading,
            balancesError,
            balancesErr,
            refetchBalances,
            balances,
            balanceColumns,
            <BarChart3 className="h-7 w-7" />,
            t('leave.empty.balances.title'),
            t('leave.empty.balances.description'),
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
