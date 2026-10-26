/**
 * Subscription Page — per DENTO_V2_MASTER_PLAN §28
 *
 * Module-only pricing. Free tier: 10 users, 1 branch, 1GB storage.
 * Shows: Plan overview, usage meters, enabled modules, billing history.
 */

import {
  useSubscriptionPlan,
  useSaaSInvoices,
  useSaaSInvoiceDetail,
} from '../hooks/useSubscription.js';
import { CouponRedemptionCard } from '../components/CouponRedemptionCard.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  PageHeader,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Separator,
  SaaSInvoiceDownloadButton,
  buildSaaSInvoicePdfLabels,
  type SaaSInvoiceForPdf,
} from '@dento/ui';
import {
  CreditCard,
  Users,
  Building2,
  HardDrive,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { CORE_MODULES } from '@dento/shared';
import { useTranslation } from '@/stores/locale.store.js';
import { useBrandingStore } from '@/stores/branding.store.js';
import { formatDate } from '@/lib/date.js';
import { useState } from 'react';

const TIER_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-800',
  basic: 'bg-blue-100 text-blue-800',
  professional: 'bg-purple-100 text-purple-800',
  enterprise: 'bg-amber-100 text-amber-800',
};

const STATUS_CONFIG: Record<
  string,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }
> = {
  active: { variant: 'default', icon: CheckCircle2 },
  trial: { variant: 'outline', icon: Clock },
  past_due: { variant: 'destructive', icon: XCircle },
  canceled: { variant: 'destructive', icon: XCircle },
};

const ALL_MODULES = [
  'patients',
  'appointments',
  'dental_charts',
  'treatment_plans',
  'procedure_notes',
  'prescriptions',
  'xrays',
  'cbct',
  'lab_orders',
  'invoices',
  'payments',
  'inventory',
  'insurance',
  'installments',
  'commissions',
  'schedules',
  'leave',
  'attendance',
  'consent',
  'reports',
  'branches',
  'services_catalog',
  'doctors',
  'notifications',
  'users',
  'settings',
  'webhooks',
  'audit_logs',
];

function UsageMeter({
  label,
  current,
  max,
  icon: Icon,
}: {
  label: string;
  current: number;
  max: number;
  icon: typeof Users;
}) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span>{label}</span>
        </div>
        <span className="font-medium">
          {current} / {max}
        </span>
      </div>
      <div className="bg-muted h-2 rounded-full">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error, refetch } = useSubscriptionPlan();
  const { data: saasInvoices, isLoading: invoicesLoading } = useSaaSInvoices();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  if (isLoading) return <TableSkeleton columns={3} rows={4} />;
  if (isError) {
    return (
      <ErrorState
        title={t('subscription.errorLoading')}
        message={error?.message}
        onRetry={refetch}
      />
    );
  }

  const plan = data?.plan;
  const usage = data?.usage;
  const statusCfg = STATUS_CONFIG[plan?.status ?? 'active'] ?? STATUS_CONFIG.active;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t('subscription.page.title')}
        description={t('subscription.page.description')}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5" />
              {t('subscription.currentPlan')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span
                className={`rounded-lg px-3 py-1 text-sm font-semibold capitalize ${TIER_COLORS[plan?.tier ?? 'free']}`}
              >
                {plan?.name ?? 'Free'}
              </span>
              <Badge variant={statusCfg.variant} className="capitalize">
                <statusCfg.icon className="me-1 h-3 w-3" />
                {plan?.status ?? 'active'}
              </Badge>
            </div>

            {plan?.pricePerMonth !== undefined && (
              <div className="text-2xl font-bold">
                {plan.currency ?? 'USD'} {plan.pricePerMonth}
                <span className="text-muted-foreground text-sm font-normal">
                  /{plan.billingCycle === 'yearly' ? 'year' : 'month'}
                </span>
              </div>
            )}

            {plan?.startDate && (
              <div className="text-muted-foreground text-sm">
                Started: {formatDate(plan.startDate)}
                {plan.endDate && <> · Renews: {formatDate(plan.endDate)}</>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('subscription.usage')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <UsageMeter
              label={t('subscription.meters.users')}
              current={usage?.users.current ?? 0}
              max={plan?.maxUsers ?? 10}
              icon={Users}
            />
            <UsageMeter
              label={t('subscription.meters.branches')}
              current={usage?.branches.current ?? 0}
              max={plan?.maxBranches ?? 1}
              icon={Building2}
            />
            <UsageMeter
              label={`${t('subscription.meters.storage')}${usage?.storage.tierName ? ` (${usage.storage.tierName})` : ''}`}
              current={Math.round((usage?.storage.currentMB ?? 0) / 1024)}
              max={plan?.maxStorageGB ?? 100}
              icon={HardDrive}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('subscription.modules')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {ALL_MODULES.map((mod) => {
              const enabled =
                CORE_MODULES.has(mod) ||
                !plan?.enabledModules.length ||
                plan.enabledModules.includes(mod);
              return (
                <div
                  key={mod}
                  className={`flex items-center gap-2 rounded-lg border p-2 text-sm ${enabled ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950' : 'border-muted bg-muted/30 text-muted-foreground'}`}
                >
                  {enabled ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="capitalize">{mod.replace(/_/g, ' ')}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Coupon Redemption */}
      <CouponRedemptionCard />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" />
            {t('subscription.billingHistory')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : !saasInvoices || saasInvoices.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('subscription.noBillingHistory')}</p>
          ) : (
            <div className="space-y-2">
              {saasInvoices.map((inv) => (
                <div
                  key={inv._id}
                  className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedInvoiceId(inv._id)}
                >
                  <div>
                    <div className="text-sm font-medium font-mono">{inv.invoiceNumber}</div>
                    <div className="text-muted-foreground text-xs">
                      {formatDate(inv.periodStart)} — {formatDate(inv.periodEnd)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {inv.currency}{' '}
                      {inv.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <Badge
                      variant={
                        inv.status === 'paid'
                          ? 'default'
                          : inv.status === 'overdue'
                            ? 'destructive'
                            : inv.status === 'draft'
                              ? 'secondary'
                              : 'outline'
                      }
                      className="text-xs capitalize"
                    >
                      {inv.status.replace('_', ' ')}
                    </Badge>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SaaSInvoiceDetailDialog
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Invoice Detail Dialog                                              */
/* ------------------------------------------------------------------ */

const INVOICE_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> =
  {
    draft: 'secondary',
    issued: 'default',
    paid: 'default',
    partially_paid: 'outline',
    overdue: 'destructive',
    cancelled: 'secondary',
    refunded: 'destructive',
  };

function SaaSInvoiceDetailDialog({
  invoiceId,
  onClose,
}: {
  invoiceId: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data: invoice, isLoading, isError } = useSaaSInvoiceDetail(invoiceId);
  const branding = useBrandingStore();

  return (
    <Dialog open={!!invoiceId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice Detail</DialogTitle>
          <DialogDescription>{invoice ? invoice.invoiceNumber : 'Loading…'}</DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-gray-500">Failed to load invoice details.</p>
          </div>
        )}

        {invoice && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge
                variant={INVOICE_STATUS_VARIANT[invoice.status] ?? 'outline'}
                className="text-sm capitalize"
              >
                {invoice.status.replace('_', ' ')}
              </Badge>
              <SaaSInvoiceDownloadButton
                invoice={invoice as unknown as SaaSInvoiceForPdf}
                tenant={{
                  name: branding.clinicName?.en || invoice.tenantName || 'Tenant',
                  email: branding.email || invoice.tenantContact?.email,
                  phone: branding.phone || invoice.tenantContact?.phone,
                  address: branding.address?.main?.en || invoice.tenantContact?.address,
                }}
                platform={{
                  name: 'Dento Platform',
                  email: 'billing@dento.app',
                  website: 'https://dento.app',
                  payUrl: `https://app.dento.app/billing/${invoice.invoiceNumber}`,
                }}
                labels={buildSaaSInvoicePdfLabels(t)}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-medium text-gray-500">Invoice #</p>
                <p className="font-mono">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Total</p>
                <p className="font-semibold">
                  {invoice.currency}{' '}
                  {invoice.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Period</p>
                <p>
                  {formatDate(invoice.periodStart)} — {formatDate(invoice.periodEnd)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Due Date</p>
                <p>{invoice.dueDate ? formatDate(invoice.dueDate) : '—'}</p>
              </div>
              {invoice.paidAt && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Paid At</p>
                  <p>{formatDate(invoice.paidAt)}</p>
                </div>
              )}
              {invoice.balanceDue > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Balance Due</p>
                  <p className="font-semibold text-destructive">
                    {invoice.currency}{' '}
                    {invoice.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>

            {invoice.items?.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase text-gray-500">Line Items</p>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50 dark:bg-gray-800">
                          <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">
                            Description
                          </th>
                          <th className="px-3 py-2 text-end text-xs font-medium text-gray-500">
                            Qty
                          </th>
                          <th className="px-3 py-2 text-end text-xs font-medium text-gray-500">
                            Unit Price
                          </th>
                          <th className="px-3 py-2 text-end text-xs font-medium text-gray-500">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.items.map((item, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="px-3 py-2">{item.description}</td>
                            <td className="px-3 py-2 text-end">{item.quantity}</td>
                            <td className="px-3 py-2 text-end font-mono">
                              {invoice.currency}{' '}
                              {item.unitPrice.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-3 py-2 text-end font-mono font-medium">
                              {invoice.currency}{' '}
                              {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <Separator />

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span>
                      {invoice.currency}{' '}
                      {invoice.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {invoice.discountTotal > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>
                        -{invoice.currency}{' '}
                        {invoice.discountTotal.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                  {invoice.taxRate > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tax ({invoice.taxRate}%)</span>
                      <span>
                        {invoice.currency}{' '}
                        {invoice.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>Total</span>
                    <span>
                      {invoice.currency}{' '}
                      {invoice.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </>
            )}

            {invoice.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase text-gray-500">Notes</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{invoice.notes}</p>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
