import { useParams, useNavigate } from 'react-router-dom';
import { useLabOrderDetail, useUpdateLabOrderStatus } from '../hooks/useLabOrders.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDate } from '@/lib/date.js';
import { formatCurrency } from '@/lib/currency.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  PageHeader,
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  toast,
} from '@dento/ui';
import { ArrowLeft, Send, Play, CheckCircle, Package, XCircle, RotateCcw } from 'lucide-react';
import { LabOrderPDF } from '../components/LabOrderPDF.js';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  sent: 'secondary',
  in_progress: 'default',
  ready: 'default',
  delivered: 'secondary',
  rejected: 'destructive',
  cancelled: 'destructive',
};

const NEXT_STATUS: Record<string, { status: string; label: string; icon: typeof Send }[]> = {
  draft: [
    { status: 'sent', label: 'Send to Lab', icon: Send },
    { status: 'cancelled', label: 'Cancel', icon: XCircle },
  ],
  sent: [
    { status: 'in_progress', label: 'Mark In Progress', icon: Play },
    { status: 'rejected', label: 'Reject', icon: XCircle },
  ],
  in_progress: [
    { status: 'ready', label: 'Mark Ready', icon: CheckCircle },
    { status: 'rejected', label: 'Reject', icon: XCircle },
  ],
  ready: [
    { status: 'delivered', label: 'Mark Delivered', icon: Package },
    { status: 'cancelled', label: 'Cancel', icon: XCircle },
  ],
  rejected: [{ status: 'draft', label: 'Reopen as Draft', icon: RotateCcw }],
  cancelled: [{ status: 'draft', label: 'Reopen as Draft', icon: RotateCcw }],
};

export default function LabOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: order, isLoading, isError, error, refetch } = useLabOrderDetail(id ?? '');
  const statusMutation = useUpdateLabOrderStatus();

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      await statusMutation.mutateAsync({ id, status: newStatus });
      toast.success(t('labOrders.toast.statusUpdated', { status: newStatus }));
    } catch {
      toast.error(t('labOrders.toast.statusUpdateFailed'));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="p-6">
        <ErrorState
          title={t('labOrders.error.loadFailed')}
          message={error?.message}
          onRetry={refetch}
        />
      </div>
    );
  }

  const nextStatuses = NEXT_STATUS[order.status] ?? [];

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={order.orderNumber} description={t('labOrders.detail.subtitle')}>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/lab-orders')}>
            <ArrowLeft className="me-2 h-4 w-4" />
            {t('labOrders.detail.back')}
          </Button>
          <LabOrderPDF order={order} variant="download" />
          <LabOrderPDF order={order} variant="print" />
          <LabOrderPDF order={order} variant="whatsapp" />
          {nextStatuses.map((ns) => (
            <Button
              key={ns.status}
              variant={
                ns.status === 'cancelled' || ns.status === 'rejected' ? 'destructive' : 'default'
              }
              size="sm"
              onClick={() => handleStatusChange(ns.status)}
              disabled={statusMutation.isPending}
            >
              <ns.icon className="me-2 h-4 w-4" />
              {ns.label}
            </Button>
          ))}
        </div>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Status & Dates */}
        <Card>
          <CardHeader>
            <CardTitle>{t('labOrders.detail.statusDates')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label={t('labOrders.columns.status')}>
              <Badge variant={STATUS_COLORS[order.status] ?? 'outline'} className="capitalize">
                {t(`labOrders.status.${order.status}`, { defaultValue: order.status })}
              </Badge>
            </DetailRow>
            <DetailRow label={t('labOrders.columns.ordered')}>
              {formatDate(order.orderDate)}
            </DetailRow>
            {order.expectedDeliveryDate && (
              <DetailRow label={t('labOrders.form.expectedDelivery')}>
                {formatDate(order.expectedDeliveryDate)}
              </DetailRow>
            )}
            {order.actualDeliveryDate && (
              <DetailRow label={t('labOrders.detail.actualDelivery')}>
                {formatDate(order.actualDeliveryDate)}
              </DetailRow>
            )}
            {order.tryInDate && (
              <DetailRow label={t('labOrders.detail.tryInDate')}>
                {formatDate(order.tryInDate)}
              </DetailRow>
            )}
          </CardContent>
        </Card>

        {/* Clinical Details */}
        <Card>
          <CardHeader>
            <CardTitle>{t('labOrders.detail.clinicalDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(order.toothNumbers?.length ?? 0) > 0 && (
              <DetailRow label={t('labOrders.form.toothNumbers')}>
                {order.toothNumbers.join(', ')}
              </DetailRow>
            )}
            {order.shade && <DetailRow label={t('labOrders.form.shade')}>{order.shade}</DetailRow>}
            {order.material && (
              <DetailRow label={t('labOrders.form.material')}>{order.material}</DetailRow>
            )}
            {order.description && (
              <DetailRow label={t('labOrders.form.description')}>{order.description}</DetailRow>
            )}
          </CardContent>
        </Card>

        {/* Financial */}
        <Card>
          <CardHeader>
            <CardTitle>{t('labOrders.detail.financial')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label={t('labOrders.columns.cost')}>
              {order.cost != null ? formatCurrency(order.cost) : '—'}
            </DetailRow>
            <DetailRow label={t('labOrders.detail.paymentStatus')}>
              <Badge variant={order.isPaid ? 'default' : 'outline'}>
                {order.isPaid ? t('labOrders.cell.paid') : t('labOrders.detail.unpaid')}
              </Badge>
            </DetailRow>
          </CardContent>
        </Card>

        {/* Notes & Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('labOrders.detail.notes')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.specialInstructions && (
              <DetailRow label={t('labOrders.form.specialInstructions')}>
                {order.specialInstructions}
              </DetailRow>
            )}
            {order.tryInNotes && (
              <DetailRow label={t('labOrders.detail.tryInNotes')}>{order.tryInNotes}</DetailRow>
            )}
            {order.adjustmentRequired && (
              <DetailRow label={t('labOrders.detail.adjustmentRequired')}>
                <Badge variant="destructive">{t('labOrders.detail.yes')}</Badge>
              </DetailRow>
            )}
            {order.adjustmentNotes && (
              <DetailRow label={t('labOrders.detail.adjustmentNotes')}>
                {order.adjustmentNotes}
              </DetailRow>
            )}
            {order.statusNotes && (
              <DetailRow label={t('labOrders.detail.statusNotes')}>{order.statusNotes}</DetailRow>
            )}
            {!order.specialInstructions &&
              !order.tryInNotes &&
              !order.adjustmentNotes &&
              !order.statusNotes && (
                <p className="text-sm text-muted-foreground">{t('labOrders.detail.noNotes')}</p>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-end">{children}</span>
    </div>
  );
}
