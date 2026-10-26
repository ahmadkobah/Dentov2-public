/**
 * CommissionDetailPage — View details of a single commission record.
 * Per DENTO_V2_MASTER_PLAN.md §12 (Doctor Commissions).
 */

import { useParams, useNavigate } from 'react-router-dom';
import {
  useCommissionDetail,
  useApproveCommission,
  type DoctorCommission,
} from '../hooks/useCommissions.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  PageHeader,
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  toast,
} from '@dento/ui';
import { ArrowLeft, Check } from 'lucide-react';
import { formatDate } from '@/lib/date.js';
import { formatCurrency } from '@/lib/currency.js';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Status helpers ─────────────────────────────────────

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  approved: 'default',
  paid: 'secondary',
  cancelled: 'destructive',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

function doctorName(c: DoctorCommission): string {
  if (typeof c.doctorId === 'object' && c.doctorId) {
    return `${c.doctorId.firstName?.en ?? ''} ${c.doctorId.lastName?.en ?? ''}`.trim();
  }
  return String(c.doctorId);
}

function invoiceNumber(c: DoctorCommission): string {
  if (typeof c.invoiceId === 'object' && c.invoiceId) {
    return c.invoiceId.invoiceNumber;
  }
  return String(c.invoiceId);
}

// ── Component ──────────────────────────────────────────

export default function CommissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Fetch single commission by ID
  const { data: commission, isLoading, isError, error, refetch } = useCommissionDetail(id!);
  const approveMutation = useApproveCommission();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="bg-muted h-8 w-48 rounded" />
          <div className="bg-muted h-64 rounded" />
        </div>
      </div>
    );
  }

  if (isError || !commission) {
    return (
      <div className="p-6">
        <ErrorState
          title="Failed to load commission"
          message={error?.message ?? 'Commission not found'}
          onRetry={refetch}
        />
      </div>
    );
  }

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(commission._id);
      toast.success(t('commissions.toast.approved'));
    } catch {
      toast.error(t('commissions.toast.approveFailed'));
    }
  };

  const fmtDate = (d?: string) => (d ? formatDate(d) : '—');

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t('commissions.detail.title')}
        description={`Doctor: ${doctorName(commission)}`}
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/commissions')}>
            <ArrowLeft className="me-2 h-4 w-4" /> {t('commissions.detail.backBtn')}
          </Button>
          {commission.status === 'pending' && (
            <Button size="sm" onClick={handleApprove}>
              <Check className="me-2 h-4 w-4" /> {t('commissions.detail.approveBtn')}
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t('commissions.detail.cardTitle')}</CardTitle>
            <Badge variant={STATUS_COLORS[commission.status] ?? 'outline'}>
              {STATUS_LABELS[commission.status] ?? commission.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
              <div>
                <p className="text-muted-foreground">{t('commissions.detail.invoiceAmount')}</p>
                <p className="font-medium">{formatCurrency(commission.invoiceAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('commissions.detail.commissionRate')}</p>
                <p className="font-medium">{(commission.commissionRate * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('commissions.detail.commissionAmount')}</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(commission.commissionAmount)}
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
              <div>
                <p className="text-muted-foreground">{t('commissions.detail.invoice')}</p>
                <p className="font-medium">{invoiceNumber(commission)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('commissions.detail.created')}</p>
                <p className="font-medium">{fmtDate(commission.createdAt)}</p>
              </div>
              {commission.approvedAt && (
                <div>
                  <p className="text-muted-foreground">{t('commissions.detail.approved')}</p>
                  <p className="font-medium">{fmtDate(commission.approvedAt)}</p>
                </div>
              )}
              {commission.paidAt && (
                <div>
                  <p className="text-muted-foreground">{t('commissions.detail.paid')}</p>
                  <p className="font-medium">{fmtDate(commission.paidAt)}</p>
                </div>
              )}
              {commission.payoutId && (
                <div>
                  <p className="text-muted-foreground">{t('commissions.detail.payoutId')}</p>
                  <p className="font-medium font-mono text-xs">{commission.payoutId}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {commission.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('commissions.detail.notes')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                {commission.notes}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
