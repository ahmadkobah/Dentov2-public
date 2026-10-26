/**
 * Treatment Plan Detail Page — Full plan view with items + DentalChartMini.
 * Per IMPLEMENTATION_ROADMAP Week 10 — "Treatment Plan ↔ Chart: Items verknüpft
 * mit Tooth Number, Mini-Chart in Plan-Detail".
 * Per BUILD_RULES §8.1, §15.2 — Phase 3 Week 10.
 *
 * Features:
 * - Full treatment plan detail (title, status, dates, notes)
 * - Embedded items table with tooth number, status, cost
 * - DentalChartMini highlighting teeth from plan items
 * - Status flow actions (propose → accept → complete)
 * - Financial summary (total, discount, final)
 */

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useTreatmentPlanDetail,
  useUpdateTreatmentPlanStatus,
  useRemoveTreatmentPlanItem,
  useUpdateTreatmentPlanItem,
  type TreatmentPlanItem,
} from '../hooks/useTreatmentPlans.js';
import {
  useDentalChart,
  useLatestChartSnapshot,
} from '../../dental-charts/hooks/useDentalCharts.js';
import { DentalChartMini } from '../../dental-charts/components/DentalChartMini.js';
import { useGenerateInvoiceFromPlan } from '../../invoices/hooks/useInvoices.js';
import { useActiveBranches } from '../../branches/hooks/useBranches.js';
import { useTenantCurrency, formatCurrency, useTenantTaxRate } from '@/lib/currency.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import { useBrandingStore } from '@/stores/branding.store.js';
import {
  PageHeader,
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  DataTable,
  type ColumnDef,
  ConfirmDialog,
  toast,
} from '@dento/ui';
import {
  CheckCircle,
  Send,
  Trash2,
  ArrowLeft,
  MessageCircle,
  Printer,
  PlayCircle,
  XCircle,
  FileText,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDate } from '@/lib/date.js';
import TreatmentPlanPDF, { generateTreatmentPlanPdfBlob } from '../components/TreatmentPlanPDF.js';
import { useDirectUpload } from '@/features/uploads/hooks/useUpload.js';
import { usePatientDetail } from '../../patients/hooks/usePatients.js';
import { printPdfBlob } from '@/lib/print.js';

// ── Status helpers ──────────────────────────────────────────

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  proposed: 'outline',
  accepted: 'default',
  in_progress: 'default',
  completed: 'default',
  cancelled: 'destructive',
  expired: 'secondary',
};

const ITEM_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  scheduled: 'outline',
  completed: 'default',
  cancelled: 'destructive',
};

// ── Component ───────────────────────────────────────────────

export default function TreatmentPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [removeItemId, setRemoveItemId] = useState<string | null>(null);
  const currency = useTenantCurrency();
  const taxRate = useTenantTaxRate();
  const { t } = useTranslation();
  const branding = useBrandingStore();

  const { data: plan, isLoading, isError, error } = useTreatmentPlanDetail(id);
  const { data: chartData } = useDentalChart(plan?.patientId);
  const { data: latestSnapshotEntries } = useLatestChartSnapshot(plan?.patientId);
  const { data: activeBranches } = useActiveBranches();
  const { data: patientDetail } = usePatientDetail(plan?.patientId ?? '');
  const statusMutation = useUpdateTreatmentPlanStatus();
  const removeItemMutation = useRemoveTreatmentPlanItem();
  const updateItemMutation = useUpdateTreatmentPlanItem();
  const generateInvoiceMutation = useGenerateInvoiceFromPlan();
  const { upload, isUploading } = useDirectUpload();

  // Teeth referenced by plan items for highlighting
  const highlightTeeth = useMemo(() => {
    if (!plan) return [];
    return (plan.items ?? []).filter((item) => item.toothNumber).map((item) => item.toothNumber!);
  }, [plan]);

  // Prefer live chart entries; fall back to latest snapshot (live is typically
  // empty after a snapshot wipe, so the snapshot provides the real data).
  const chartEntries =
    (chartData?.entries?.length ? chartData.entries : latestSnapshotEntries) ?? [];

  // ── Status Actions ─────────────────────────────────────────

  const handleStatusChange = async (status: string) => {
    if (!id || !plan) return;
    try {
      await statusMutation.mutateAsync({ id, status });
      toast.success(t('treatmentPlans.toast.statusUpdated'));

      // Auto-generate invoice + appointments when plan is accepted
      if (status === 'accepted') {
        const branchId = activeBranches?.[0]?._id;
        if (branchId) {
          // Auto-create draft invoice
          try {
            await generateInvoiceMutation.mutateAsync({
              treatmentPlanId: id,
              branchId,
              currency,
            });
            toast.success(t('treatmentPlans.toast.draftInvoiceCreated'));
          } catch {
            toast.error(t('treatmentPlans.toast.autoInvoiceFailed'));
          }

          // Remind staff to schedule appointments manually
          toast.info(t('treatmentPlans.toast.scheduleAppointmentsReminder'));
        }
      }
    } catch {
      toast.error(t('treatmentPlans.toast.statusUpdateFailed'));
    }
  };

  const handleRemoveItem = async () => {
    if (!id || !removeItemId) return;
    try {
      await removeItemMutation.mutateAsync({ planId: id, itemId: removeItemId });
      toast.success(t('treatmentPlans.toast.itemRemoved'));
      setRemoveItemId(null);
    } catch {
      toast.error(t('treatmentPlans.toast.itemRemoveFailed'));
    }
  };

  // ── Item Status Actions ─────────────────────────────────

  const handleStartItem = async (item: TreatmentPlanItem) => {
    if (!id || !plan) return;
    // Flip the item to scheduled and open a procedure note prefilled from the item.
    try {
      await updateItemMutation.mutateAsync({
        planId: id,
        itemId: item._id,
        data: { status: 'scheduled' },
      });
    } catch {
      // Continue to the procedure note even if the optimistic update fails;
      // the backend will sync the item once the note is created.
    }
    const params = new URLSearchParams();
    params.set('patientId', plan.patientId);
    params.set('doctorId', item.assignedDoctorId || plan.doctorId);
    params.set('treatmentPlanId', id);
    params.set('treatmentPlanItemId', item._id);
    if (item.serviceId) params.set('serviceId', item.serviceId);
    if (item.toothNumber) params.set('toothNumber', item.toothNumber);
    params.set('procedureName', item.procedureName);
    params.set('plannedCost', String(item.cost ?? 0));
    navigate(`/procedure-notes/new?${params.toString()}`);
  };

  const handleCancelItem = async (itemId: string) => {
    if (!id) return;
    try {
      await updateItemMutation.mutateAsync({
        planId: id,
        itemId,
        data: { status: 'cancelled' },
      });
      toast.success(t('treatmentPlans.toast.itemCancelled'));
    } catch {
      toast.error(t('treatmentPlans.toast.itemUpdateFailed'));
    }
  };

  const handleOpenItemNote = (item: TreatmentPlanItem) => {
    if (item.procedureNoteId) {
      navigate(`/procedure-notes/${item.procedureNoteId}`);
    }
  };

  // ── Item Columns ───────────────────────────────────────────

  const itemColumns: ColumnDef<TreatmentPlanItem>[] = useMemo(
    () => [
      {
        id: 'procedureName',
        accessorKey: 'procedureName' as const,
        header: t('treatmentPlans.detail.columns.procedure'),
        cell: (value: unknown) => <span className="font-medium">{value as string}</span>,
      },
      {
        id: 'toothNumber',
        accessorKey: 'toothNumber' as const,
        header: t('treatmentPlans.detail.columns.tooth'),
        cell: (value: unknown) => (value ? `#${value}` : '\u2014'),
      },
      {
        id: 'surface',
        accessorKey: 'surface' as const,
        header: t('treatmentPlans.detail.columns.surface'),
        cell: (value: unknown) => (value as string) || '\u2014',
      },
      {
        id: 'status',
        accessorKey: 'status' as const,
        header: t('treatmentPlans.detail.columns.status'),
        cell: (value: unknown) => (
          <Badge variant={ITEM_STATUS_VARIANT[value as string] ?? 'outline'}>
            {(value as string).replace(/_/g, ' ')}
          </Badge>
        ),
      },
      {
        id: 'assignedDoctor',
        header: 'Doctor',
        cell: (_: unknown, row: TreatmentPlanItem) => {
          const id = row.assignedDoctorId || plan?.doctorId;
          if (!id) return '\u2014';
          return (
            <span
              className={row.assignedDoctorId ? 'text-foreground' : 'text-muted-foreground italic'}
              title={row.assignedDoctorId ? 'Per-item assignment' : 'Inherited from plan'}
            >
              {String(id).slice(-6)}
            </span>
          );
        },
      },
      {
        id: 'cost',
        accessorKey: 'cost' as const,
        header: t('treatmentPlans.detail.columns.cost'),
        cell: (value: unknown) => formatCurrency(value as number, currency),
      },
      {
        id: 'billing',
        header: 'Billing',
        cell: (_: unknown, row: TreatmentPlanItem) => {
          const billed = row.billedAmount ?? 0;
          const cost = row.cost ?? 0;
          if (!row.billedInvoiceId || billed <= 0) {
            return <Badge variant="outline">Pending</Badge>;
          }
          if (billed >= cost) {
            return <Badge variant="default">Billed</Badge>;
          }
          return <Badge variant="secondary">Partial</Badge>;
        },
      },
      {
        id: 'item-actions',
        header: t('treatmentPlans.detail.columns.actions'),
        cell: (_: unknown, row: TreatmentPlanItem) => {
          const planStatus = plan?.status;
          const canStart =
            row.status === 'pending' &&
            planStatus !== 'draft' &&
            planStatus !== 'cancelled' &&
            planStatus !== 'expired';
          const canCancel = row.status === 'pending' || row.status === 'scheduled';
          const hasNote = !!row.procedureNoteId;
          const canRemove = planStatus === 'draft';
          return (
            <div className="inline-flex items-center gap-1">
              {canStart && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStartItem(row)}
                  aria-label={t('treatmentPlans.detail.actions.start')}
                >
                  <PlayCircle className="me-1 h-4 w-4" />
                  {t('treatmentPlans.detail.actions.start')}
                </Button>
              )}
              {hasNote && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenItemNote(row)}
                  aria-label={t('treatmentPlans.detail.actions.openNote')}
                  title={t('treatmentPlans.detail.actions.openNote')}
                >
                  <FileText className="h-4 w-4" />
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCancelItem(row._id)}
                  aria-label={t('treatmentPlans.detail.actions.cancel')}
                  title={t('treatmentPlans.detail.actions.cancel')}
                >
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
              {canRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setRemoveItemId(row._id)}
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan?.status, plan?.patientId, plan?.doctorId, id],
  );

  // ── Loading / Error ────────────────────────────────────────

  if (isLoading) return <TableSkeleton />;
  if (isError || !plan)
    return <ErrorState message={(error as Error)?.message ?? 'Failed to load treatment plan'} />;

  const clinicName = branding.clinicName?.en || 'Dento Clinic';
  const clinicAddress = branding.address?.main?.en || '';
  const clinicPhone = branding.phone || '';

  const planPdfData = {
    planNumber: plan._id,
    planName: plan.title,
    status: plan.status,
    createdDate: plan.createdAt,
    patientName: plan.patientId,
    doctorName: plan.doctorId,
    diagnosis: plan.description,
    phases: [
      {
        phaseName: 'Treatment Plan',
        phaseNumber: 1,
        procedures: (plan.items ?? []).map((item) => ({
          _id: item._id,
          procedureName: item.procedureName,
          toothNumber: item.toothNumber,
          estimatedCost: item.cost,
          insuranceCoverage: 0,
          patientCost: item.cost,
          sequenceOrder: item.sequenceOrder,
          status: (item.status === 'scheduled' ? 'in_progress' : item.status) as
            | 'pending'
            | 'in_progress'
            | 'completed'
            | 'cancelled',
          notes: item.notes,
        })),
      },
    ],
    totalEstimatedCost: plan.totalCost,
    totalInsuranceCoverage: 0,
    totalPatientCost: plan.finalCost,
    notes: plan.notes,
    currency,
  };

  const normalizePhone = (phone: string) => phone.replace(/[^\d+]/g, '');

  const handleWhatsApp = async () => {
    const patientPhone = patientDetail?.phone;
    if (!patientPhone) {
      toast.error('Patient phone is missing');
      return;
    }
    try {
      const blob = await generateTreatmentPlanPdfBlob({
        data: planPdfData,
        clinicName,
        clinicAddress,
        clinicPhone,
      });
      const file = new File([blob], `${plan._id}.pdf`, { type: 'application/pdf' });
      const uploaded = await upload(file, 'document');
      const msg = encodeURIComponent(`Treatment Plan ${plan.title}: ${uploaded.url}`);
      window.open(`https://wa.me/${normalizePhone(patientPhone)}?text=${msg}`, '_blank');
      toast.success('WhatsApp message prepared with treatment plan PDF');
    } catch {
      toast.error('Failed to prepare treatment plan for WhatsApp');
    }
  };

  const handlePrint = async () => {
    try {
      const blob = await generateTreatmentPlanPdfBlob({
        data: planPdfData,
        clinicName,
        clinicAddress,
        clinicPhone,
      });
      await printPdfBlob(blob);
    } catch {
      toast.error('Failed to prepare treatment plan PDF for printing');
    }
  };

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={plan.title}
        description={t('treatmentPlans.detail.titlePrefix')}
        backAction={
          <Button variant="ghost" size="sm" onClick={() => navigate('/treatment-plans')}>
            <ArrowLeft className="me-2 h-4 w-4" />
            {t('treatmentPlans.detail.back')}
          </Button>
        }
      >
        <div className="flex items-center gap-2">
          <TreatmentPlanPDF
            data={planPdfData}
            clinicName={clinicName}
            clinicAddress={clinicAddress}
            clinicPhone={clinicPhone}
          />
          <Button variant="outline" size="sm" onClick={handleWhatsApp} disabled={isUploading}>
            <MessageCircle className="me-2 h-4 w-4" />
            {isUploading ? 'Preparing...' : 'WhatsApp'}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="me-2 h-4 w-4" />
            Print
          </Button>
          {plan.status === 'draft' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('proposed')}
              disabled={statusMutation.isPending}
            >
              <Send className="me-2 h-4 w-4" />
              {t('treatmentPlans.actions.propose')}
            </Button>
          )}
          {plan.status === 'proposed' && (
            <Button
              size="sm"
              onClick={() => handleStatusChange('accepted')}
              disabled={statusMutation.isPending}
            >
              <CheckCircle className="me-2 h-4 w-4" />
              {t('treatmentPlans.actions.accept')}
            </Button>
          )}
          {plan.status === 'accepted' && (
            <Button
              size="sm"
              onClick={() => handleStatusChange('in_progress')}
              disabled={statusMutation.isPending}
            >
              {t('treatmentPlans.actions.startTreatment')}
            </Button>
          )}
          {plan.status === 'in_progress' && (
            <Button
              size="sm"
              onClick={() => handleStatusChange('completed')}
              disabled={statusMutation.isPending}
            >
              <CheckCircle className="me-2 h-4 w-4" />
              {t('treatmentPlans.actions.complete')}
            </Button>
          )}
        </div>
      </PageHeader>

      {/* ── Overview Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status + Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('treatmentPlans.detail.planInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('treatmentPlans.detail.status')}</span>
              <Badge variant={STATUS_VARIANT[plan.status] ?? 'outline'}>
                {plan.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('treatmentPlans.detail.items')}</span>
              <span className="font-medium">{plan.items?.length ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('treatmentPlans.detail.created')}</span>
              <span>{formatDate(plan.createdAt)}</span>
            </div>
            {plan.validUntil && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t('treatmentPlans.detail.validUntil')}
                </span>
                <span>{formatDate(plan.validUntil)}</span>
              </div>
            )}
            {plan.signedAt && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('treatmentPlans.detail.signed')}</span>
                <span>{formatDate(plan.signedAt)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('treatmentPlans.detail.financialSummary')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('treatmentPlans.detail.totalCost')}</span>
              <span>{formatCurrency(plan.totalCost, currency)}</span>
            </div>
            {plan.discountValue > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('treatmentPlans.detail.discount')}</span>
                <span className="text-green-600 dark:text-green-400">
                  {plan.discountType === 'percentage'
                    ? `${plan.discountValue}%`
                    : formatCurrency(plan.discountValue, currency)}
                </span>
              </div>
            )}
            {taxRate > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t('treatmentPlans.detail.tax')} ({taxRate}%)
                </span>
                <span>{formatCurrency(plan.finalCost * (taxRate / 100), currency)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t pt-2">
              <span className="font-medium">{t('treatmentPlans.detail.estimatedTotal')}</span>
              <span className="font-semibold text-lg">
                {formatCurrency(plan.finalCost + plan.finalCost * (taxRate / 100), currency)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* DentalChartMini */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('treatmentPlans.detail.dentalChart')}</CardTitle>
          </CardHeader>
          <CardContent>
            {chartEntries.length > 0 ? (
              <DentalChartMini
                entries={chartEntries}
                highlightTeeth={highlightTeeth}
                className="w-full"
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('treatmentPlans.detail.noChartData')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Notes ── */}
      {(plan.description || plan.notes) && (
        <Card>
          <CardContent className="pt-4 space-y-2 text-sm">
            {plan.description && (
              <div>
                <span className="font-medium">{t('treatmentPlans.detail.description')}: </span>
                {plan.description}
              </div>
            )}
            {plan.notes && (
              <div>
                <span className="font-medium">{t('treatmentPlans.detail.notes')}: </span>
                {plan.notes}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Items Table ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {t('treatmentPlans.detail.treatmentItems')} ({plan.items?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!plan.items?.length ? (
            <p className="text-sm text-muted-foreground">{t('treatmentPlans.detail.noItems')}</p>
          ) : (
            <DataTable columns={itemColumns} data={plan.items} />
          )}
        </CardContent>
      </Card>

      {/* ── Remove Item Confirm ── */}
      <ConfirmDialog
        open={!!removeItemId}
        onOpenChange={(open) => !open && setRemoveItemId(null)}
        title={t('treatmentPlans.detail.removeItemTitle')}
        description={t('treatmentPlans.detail.removeItemDescription')}
        onConfirm={handleRemoveItem}
        variant="destructive"
      />
    </div>
  );
}
