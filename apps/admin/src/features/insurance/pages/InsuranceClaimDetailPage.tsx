/**
 * Insurance Claim Detail Page — per DENTO_V2_MASTER_PLAN.md §13.
 * Shows full claim info, status flow actions, documents, linked invoice.
 */

import { useParams, useNavigate } from 'react-router-dom';
import {
  useInsuranceClaimDetail,
  useUpdateClaimStatus,
  type InsuranceClaim,
} from '../hooks/useInsurance.js';
import { formatDate } from '@/lib/date.js';
import { useTranslation } from '@/stores/locale.store.js';
import { ErrorState } from '@/components/ErrorState.js';
import { formatCurrency } from '@/lib/currency.js';
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
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Send,
  AlertTriangle,
  FileText,
  User,
  Receipt,
} from 'lucide-react';
import { ClaimStatusBadge, CLAIM_STATUS_LABELS } from '../components/ClaimStatusBadge.js';
import { ClaimTimeline } from '../components/ClaimTimeline.js';

// ── Status config (badge & timeline imported from shared components) ──

// Status flow: which transitions are valid from each status
const STATUS_TRANSITIONS: Record<
  string,
  { label: string; status: string; icon: React.ComponentType<{ className?: string }> }[]
> = {
  pending: [{ label: 'Submit', status: 'submitted', icon: Send }],
  submitted: [{ label: 'Start Review', status: 'under_review', icon: FileText }],
  under_review: [
    { label: 'Approve', status: 'approved', icon: CheckCircle },
    { label: 'Deny', status: 'denied', icon: XCircle },
  ],
  denied: [{ label: 'Appeal', status: 'appealed', icon: AlertTriangle }],
  appealed: [
    { label: 'Approve', status: 'approved', icon: CheckCircle },
    { label: 'Deny', status: 'denied', icon: XCircle },
  ],
};

function patientName(claim: InsuranceClaim): string {
  if (typeof claim.patientId === 'object' && claim.patientId) {
    const p = claim.patientId;
    return `${p.firstName?.en ?? ''} ${p.lastName?.en ?? ''}`.trim() || p.patientCode;
  }
  return String(claim.patientId);
}

// ── Component ──────────────────────────────────────────

export default function InsuranceClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: claim, isLoading, isError, error, refetch } = useInsuranceClaimDetail(id!);
  const statusMutation = useUpdateClaimStatus();

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      await statusMutation.mutateAsync({ id, status: newStatus });
      toast.success(
        t('insurance.claimDetail.toast.statusUpdated').replace(
          '{{status}}',
          CLAIM_STATUS_LABELS[newStatus] ?? newStatus,
        ),
      );
    } catch {
      toast.error(t('insurance.claimDetail.toast.statusUpdateFailed'));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !claim) {
    return (
      <div className="p-6">
        <ErrorState
          title={t('insurance.claimDetail.error.loadFailed')}
          message={error?.message ?? 'Claim not found'}
          onRetry={refetch}
        />
      </div>
    );
  }

  const transitions = STATUS_TRANSITIONS[claim.status] ?? [];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={`Claim ${claim.claimNumber}`}
        description={`Filed on ${formatDate(claim.claimDate)}`}
      >
        <div className="flex items-center gap-3">
          <ClaimStatusBadge status={claim.status} />
          {transitions.map((t) => (
            <Button
              key={t.status}
              size="sm"
              variant={t.status === 'denied' ? 'destructive' : 'default'}
              onClick={() => handleStatusChange(t.status)}
              disabled={statusMutation.isPending}
            >
              <t.icon className="me-2 h-4 w-4" />
              {t.label}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={() => navigate('/insurance-claims')}>
            <ArrowLeft className="me-2 h-4 w-4" />
            {t('insurance.claimDetail.actions.back')}
          </Button>
        </div>
      </PageHeader>

      {/* Claim Lifecycle Timeline */}
      <ClaimTimeline currentStatus={claim.status} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Patient Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              {t('insurance.claimDetail.sections.patientInformation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">
                {t('insurance.claimDetail.labels.patient')}
              </span>
              <span className="text-sm font-medium">{patientName(claim)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">
                {t('insurance.claimDetail.labels.serviceDate')}
              </span>
              <span className="text-sm">{formatDate(claim.serviceDate)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Financial Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4" />
              {t('insurance.claimDetail.sections.financialDetails')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">
                {t('insurance.claimDetail.labels.totalAmount')}
              </span>
              <span className="text-sm font-medium">{formatCurrency(claim.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">
                {t('insurance.claimDetail.labels.claimedAmount')}
              </span>
              <span className="text-sm font-medium">{formatCurrency(claim.claimedAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">
                {t('insurance.claimDetail.labels.approvedAmount')}
              </span>
              <span className="text-sm font-semibold text-green-600">
                {formatCurrency(claim.approvedAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">
                {t('insurance.claimDetail.labels.patientResponsibility')}
              </span>
              <span className="text-destructive text-sm font-semibold">
                {formatCurrency(claim.patientResponsibility)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              {t('insurance.claimDetail.sections.documents')} ({claim.documents?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {claim.documents && claim.documents.length > 0 ? (
              <ul className="space-y-2">
                {claim.documents.map((doc) => (
                  <li
                    key={doc._id}
                    className="flex items-center justify-between rounded-md border p-2"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{doc.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {doc.type}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        {t('insurance.claimDetail.documents.view')}
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                {t('insurance.claimDetail.documents.noDocuments')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Denial Info (if denied) */}
        {claim.status === 'denied' && claim.denialReason && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-destructive">
                <XCircle className="h-4 w-4" />
                {t('insurance.claimDetail.labels.denialReason')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{claim.denialReason}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
