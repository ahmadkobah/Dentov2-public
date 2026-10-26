/**
 * Commissions Page — per DENTO_V2_MASTER_PLAN.md §12 (doctor commission sub-section).
 * Two-tab layout: Commissions list + Payouts list, with summary cards up top.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  useCommissionList,
  useCommissionSummary,
  useApproveCommission,
  useBulkApproveCommissions,
  usePayoutList,
  useProcessPayout,
  useCreatePayout,
  type DoctorCommission,
  type CommissionFilters,
  type PayoutFilters,
} from '../hooks/useCommissions.js';
import { useThemeStore } from '@/stores/theme.store.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  DataTable,
  EmptyState,
  PageHeader,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  toast,
} from '@dento/ui';
import { Wallet, Download, CheckCheck } from 'lucide-react';
import { CommissionApprovalForm } from '../components/CommissionApprovalForm.js';
import { getCommissionColumns, getPayoutColumns } from '../components/commission-columns.js';
import { CreatePayoutDialog } from '../components/CreatePayoutDialog.js';
import { CommissionSummaryCards } from '../components/CommissionSummaryCards.js';
import { doctorName } from '../utils/commission.utils.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDate } from '@/lib/date.js';

// ── Component ──────────────────────────────────────────

export default function CommissionsPage() {
  const { t } = useTranslation();
  const locale = useThemeStore((s) => s.locale);
  const [activeTab, setActiveTab] = useState<'commissions' | 'payouts'>('commissions');
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    commissions: DoctorCommission[];
  }>({ open: false, commissions: [] });

  // Commission state
  const [commFilters, setCommFilters] = useState<CommissionFilters>({ page: 1, limit: 20 });
  const commQuery = useCommissionList(commFilters);
  const summaryQuery = useCommissionSummary();
  const approveMutation = useApproveCommission();
  const bulkApproveMutation = useBulkApproveCommissions();
  const createPayoutMutation = useCreatePayout();

  // Payout state
  const [payoutFilters, setPayoutFilters] = useState<PayoutFilters>({ page: 1, limit: 20 });
  const payoutQuery = usePayoutList(payoutFilters);
  const processMutation = useProcessPayout();

  const commItems = commQuery.data?.items ?? [];
  const payoutItems = payoutQuery.data?.items ?? [];
  const summary = summaryQuery.data;

  // Pending commissions for bulk approval
  const pendingCommissions = useMemo(
    () => commItems.filter((c) => c.status === 'pending'),
    [commItems],
  );

  // Approved commissions grouped by doctor for payout creation
  const approvedByDoctor = useMemo(() => {
    const map = new Map<string, { name: string; ids: string[] }>();
    commItems
      .filter((c) => c.status === 'approved')
      .forEach((c) => {
        const dId = typeof c.doctorId === 'object' ? c.doctorId._id : c.doctorId;
        const existing = map.get(dId);
        if (existing) {
          existing.ids.push(c._id);
        } else {
          map.set(dId, { name: doctorName(c), ids: [c._id] });
        }
      });
    return map;
  }, [commItems]);

  // ── Handlers ────────────────────────────────────────

  // Open dialog for single commission approval
  const handleApprove = useCallback(
    (id: string) => {
      const comm = commItems.find((c) => c._id === id);
      if (comm) setApprovalDialog({ open: true, commissions: [comm] });
    },
    [commItems],
  );

  // Open dialog for bulk approval of all pending commissions
  const handleBulkApprove = useCallback(() => {
    if (!pendingCommissions.length) return;
    setApprovalDialog({ open: true, commissions: pendingCommissions });
  }, [pendingCommissions]);

  // Submit approval (single or bulk) after dialog confirmation
  const handleApprovalConfirm = useCallback(
    async (data: { ids: string[]; notes?: string }) => {
      try {
        if (data.ids.length === 1) {
          await approveMutation.mutateAsync(data.ids[0]!);
          toast.success(t('commissions.toast.approved'));
        } else {
          await bulkApproveMutation.mutateAsync(data.ids);
          toast.success(t('commissions.toast.bulkApproved'));
        }
        setApprovalDialog({ open: false, commissions: [] });
      } catch {
        toast.error(t('commissions.toast.approveFailed'));
      }
    },
    [approveMutation, bulkApproveMutation],
  );

  const handleProcess = useCallback(
    async (id: string) => {
      try {
        await processMutation.mutateAsync(id);
        toast.success(t('commissions.toast.processed'));
      } catch {
        toast.error(t('commissions.toast.processFailed'));
      }
    },
    [processMutation],
  );

  const handleCreatePayout = useCallback(
    async (data: {
      doctorId: string;
      paymentMethod: string;
      reference?: string;
      notes?: string;
    }) => {
      const entry = approvedByDoctor.get(data.doctorId);
      if (!entry) return;
      try {
        await createPayoutMutation.mutateAsync({
          doctorId: data.doctorId,
          commissionIds: entry.ids,
          paymentMethod: data.paymentMethod,
          reference: data.reference || undefined,
          notes: data.notes || undefined,
        });
        toast.success(t('commissions.toast.payoutCreated'));
        setPayoutModalOpen(false);
      } catch {
        toast.error(t('commissions.toast.payoutFailed'));
      }
    },
    [approvedByDoctor, createPayoutMutation],
  );

  // ── Export ──────────────────────────────────────────

  const handleExportCommissions = useCallback(() => {
    const header = ['Doctor', 'Invoice', 'Rate', 'Invoice Amt', 'Commission', 'Status', 'Created'];
    const rows = commItems.map((c) => [
      doctorName(c),
      typeof c.invoiceId === 'object' ? c.invoiceId.invoiceNumber : c.invoiceId,
      `${c.commissionRate}%`,
      c.invoiceAmount.toFixed(2),
      c.commissionAmount.toFixed(2),
      c.status,
      formatDate(c.createdAt),
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [commItems]);

  // ── Commission Columns ──────────────────────────────

  const commColumns = useMemo(
    () => getCommissionColumns({ locale, t, onApprove: handleApprove }),
    [locale, t, handleApprove],
  );

  // ── Payout Columns ──────────────────────────────────

  const payoutColumns = useMemo(
    () => getPayoutColumns({ locale, t, onProcess: handleProcess }),
    [locale, t, handleProcess],
  );
  // ── Render ──────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t('commissions.title')} description={t('commissions.subtitle')}>
        <div className="flex gap-2">
          {pendingCommissions.length > 0 && (
            <Button
              variant="outline"
              onClick={handleBulkApprove}
              disabled={bulkApproveMutation.isPending}
            >
              <CheckCheck className="me-2 h-4 w-4" />
              {t('commissions.approveAllBtn', { count: pendingCommissions.length })}
            </Button>
          )}
          <Button variant="outline" onClick={handleExportCommissions} disabled={!commItems.length}>
            <Download className="me-2 h-4 w-4" />
            {t('commissions.exportCsv')}
          </Button>
          <CreatePayoutDialog
            open={payoutModalOpen}
            onOpenChange={setPayoutModalOpen}
            approvedByDoctor={approvedByDoctor}
            onSubmit={handleCreatePayout}
            isPending={createPayoutMutation.isPending}
          />
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <CommissionSummaryCards summary={summary} />

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted p-1">
        <button
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'commissions'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('commissions')}
        >
          {t('commissions.tab.commissions')}
        </button>
        <button
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'payouts'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('payouts')}
        >
          {t('commissions.tab.payouts')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        <Select
          value={
            activeTab === 'commissions'
              ? commFilters.status || 'all'
              : payoutFilters.status || 'all'
          }
          onValueChange={(v) => {
            if (activeTab === 'commissions') {
              setCommFilters((prev) => ({ ...prev, status: v === 'all' ? undefined : v, page: 1 }));
            } else {
              setPayoutFilters((prev) => ({
                ...prev,
                status: v === 'all' ? undefined : v,
                page: 1,
              }));
            }
          }}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('commissions.filter.allStatuses')}</SelectItem>
            {activeTab === 'commissions' ? (
              <>
                <SelectItem value="pending">{t('commissions.filter.pending')}</SelectItem>
                <SelectItem value="approved">{t('commissions.filter.approved')}</SelectItem>
                <SelectItem value="paid">{t('commissions.filter.paid')}</SelectItem>
                <SelectItem value="cancelled">{t('commissions.filter.cancelled')}</SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="draft">{t('commissions.payouts.filter.draft')}</SelectItem>
                <SelectItem value="processed">
                  {t('commissions.payouts.filter.processed')}
                </SelectItem>
                <SelectItem value="cancelled">
                  {t('commissions.payouts.filter.cancelled')}
                </SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Data */}
      {activeTab === 'commissions' ? (
        commQuery.isLoading ? (
          <TableSkeleton columns={8} rows={10} />
        ) : commQuery.isError ? (
          <ErrorState
            title={t('commissions.error.load')}
            message={commQuery.error?.message}
            onRetry={commQuery.refetch}
          />
        ) : !commItems.length ? (
          <EmptyState
            icon={<Wallet className="h-6 w-6" />}
            title={t('commissions.empty.title')}
            description={t('commissions.empty.desc')}
          />
        ) : (
          <DataTable columns={commColumns} data={commItems} />
        )
      ) : payoutQuery.isLoading ? (
        <TableSkeleton columns={8} rows={10} />
      ) : payoutQuery.isError ? (
        <ErrorState
          title={t('commissions.payouts.error.load')}
          message={payoutQuery.error?.message}
          onRetry={payoutQuery.refetch}
        />
      ) : !payoutItems.length ? (
        <EmptyState
          icon={<Wallet className="h-6 w-6" />}
          title={t('commissions.payouts.empty.title')}
          description={t('commissions.payouts.empty.desc')}
        />
      ) : (
        <DataTable columns={payoutColumns} data={payoutItems} />
      )}

      {/* Commission Approval Dialog */}
      <CommissionApprovalForm
        open={approvalDialog.open}
        onOpenChange={(open) => setApprovalDialog((p) => ({ ...p, open }))}
        commissions={approvalDialog.commissions.map((c) => ({
          _id: c._id,
          doctorName: doctorName(c),
          invoiceNumber:
            typeof c.invoiceId === 'object' ? c.invoiceId.invoiceNumber : String(c.invoiceId),
          commissionAmount: c.commissionAmount,
          commissionRate: c.commissionRate,
        }))}
        isPending={approveMutation.isPending || bulkApproveMutation.isPending}
        onConfirm={handleApprovalConfirm}
      />
    </div>
  );
}
