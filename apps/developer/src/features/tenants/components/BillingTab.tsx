import { Shield, CreditCard, Loader2, Tag, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { Button, Input, Label, Badge } from '@dento/ui';
import type { TenantDetail } from '../types/tenant-detail.types.js';
import { useTenantInvoices, useUpdateTenant } from '../hooks/useTenants.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';

interface Invoice {
  _id: string;
  invoiceId?: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

const statusStyles: Record<string, string> = {
  completed: 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400',
  pending: 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400',
  failed: 'bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400',
  refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  expired: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

export function BillingTab({ tenant, tenantId }: { tenant: TenantDetail; tenantId: string }) {
  const { data: invoiceRes, isLoading, isError, refetch } = useTenantInvoices(tenantId);
  const invoices = ((invoiceRes as Record<string, unknown>)?.data as Invoice[]) ?? [];
  const updateTenant = useUpdateTenant(tenantId);

  const [billingDay, setBillingDay] = useState(tenant.billingDay);
  const [gracePeriodDays, setGracePeriodDays] = useState(tenant.gracePeriodDays);
  const [billingDirty, setBillingDirty] = useState(false);

  function handleBillingDayChange(v: number) {
    setBillingDay(Math.max(1, Math.min(28, v)));
    setBillingDirty(true);
  }
  function handleGracePeriodChange(v: number) {
    setGracePeriodDays(Math.max(0, Math.min(30, v)));
    setBillingDirty(true);
  }
  function saveBillingConfig() {
    updateTenant.mutate(
      { billingDay, gracePeriodDays },
      {
        onSuccess: () => setBillingDirty(false),
      },
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Current Subscription
          </h3>
          <div className="flex items-center justify-between rounded-xl bg-brand-50 p-4 dark:bg-brand-500/10">
            <div>
              <div className="font-semibold text-brand-700 dark:text-brand-400">
                {tenant.plan} Plan
              </div>
              <div className="text-sm text-brand-600 dark:text-brand-300">
                ${tenant.mrr}/month · Billed monthly
              </div>
            </div>
            <Button variant="default">Upgrade</Button>
          </div>

          <div className="mt-6 space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white">Plan Features</h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-success-500" />
                Up to {tenant.maxUsers} team members
              </li>
              <li className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-success-500" />
                {tenant.modules.length} active modules
              </li>
              <li className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-success-500" />
                {tenant.storageUsed} storage
              </li>
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Subscription Info
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Status</span>
              <span className="font-medium capitalize text-gray-900 dark:text-white">
                {tenant.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Plan</span>
              <span className="font-medium text-gray-900 dark:text-white">{tenant.plan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">MRR</span>
              <span className="font-medium text-gray-900 dark:text-white">${tenant.mrr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Created</span>
              <span className="font-medium text-gray-900 dark:text-white">{tenant.createdAt}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Config + Redeemed Coupons */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Settings2 className="h-5 w-5" />
            Billing Config
          </h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Billing Day (1-28)</Label>
              <Input
                type="number"
                min={1}
                max={28}
                value={billingDay}
                onChange={(e) => handleBillingDayChange(Number(e.target.value))}
              />
              <p className="text-xs text-gray-500">Day of month invoices are auto-generated</p>
            </div>
            <div className="space-y-1.5">
              <Label>Grace Period (days)</Label>
              <Input
                type="number"
                min={0}
                max={30}
                value={gracePeriodDays}
                onChange={(e) => handleGracePeriodChange(Number(e.target.value))}
              />
              <p className="text-xs text-gray-500">Days after due date before overdue escalation</p>
            </div>
            {billingDirty && (
              <Button onClick={saveBillingConfig} disabled={updateTenant.isPending} size="sm">
                {updateTenant.isPending ? 'Saving…' : 'Save Billing Config'}
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Tag className="h-5 w-5" />
            Redeemed Coupons
          </h3>
          {tenant.redeemedCoupons.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No coupons redeemed yet.</p>
          ) : (
            <div className="space-y-2">
              {tenant.redeemedCoupons.map((r) => (
                <div
                  key={r.couponCode}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <div>
                    <span className="font-mono text-sm font-medium">{r.couponCode}</span>
                    <span className="ms-2 text-xs text-gray-500">
                      {r.duration === 'once'
                        ? 'One-time'
                        : r.duration === 'forever'
                          ? 'Forever'
                          : `${r.remainingMonths}/${r.durationMonths}mo`}
                    </span>
                  </div>
                  <Badge variant="secondary">
                    {r.discountType === 'fixed_amount'
                      ? `${r.discountAmount} off`
                      : `${r.discountPercent}% off`}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Billing History
        </h3>
        {isError && <QueryErrorBanner onRetry={() => refetch()} />}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            <CreditCard className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="mt-2">No invoices yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="pb-3 text-start text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Invoice
                </th>
                <th className="pb-3 text-start text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Date
                </th>
                <th className="pb-3 text-start text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Amount
                </th>
                <th className="pb-3 text-start text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {invoices.map((inv) => (
                <tr key={inv._id}>
                  <td className="py-3 font-medium text-gray-900 dark:text-white">
                    {inv.invoiceId ?? inv._id.slice(0, 8)}
                  </td>
                  <td className="py-3 text-gray-600 dark:text-gray-400">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-gray-900 dark:text-white">${inv.amount}</td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[inv.status] ?? statusStyles.pending}`}
                    >
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
