/**
 * ExpiryDashboard — Status cards + expiry table with dispose action.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, toast } from '@dento/ui';
import { AlertTriangle, Clock, CheckCircle, Trash2 } from 'lucide-react';
import { useDisposeStock } from '../hooks/useInventoryStock.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDate } from '@/lib/date.js';

interface ExpiryBatch {
  _id: string;
  itemId: string;
  itemName: string;
  sku: string;
  branchId: string;
  branchName: string;
  batchNumber?: string;
  expiryDate: string;
  quantity: number;
}

interface ExpiryDashboardProps {
  batches: ExpiryBatch[];
  isLoading?: boolean;
}

function daysUntilExpiry(expiryDate: string): number {
  const now = new Date();
  const exp = new Date(expiryDate);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function ExpiryDashboard({ batches, isLoading }: ExpiryDashboardProps) {
  const disposeMutation = useDisposeStock();
  const { t } = useTranslation();

  const buckets = useMemo(() => {
    const expired: ExpiryBatch[] = [];
    const within30: ExpiryBatch[] = [];
    const within60: ExpiryBatch[] = [];
    const within90: ExpiryBatch[] = [];
    const ok: ExpiryBatch[] = [];

    for (const b of batches) {
      const days = daysUntilExpiry(b.expiryDate);
      if (days <= 0) expired.push(b);
      else if (days <= 30) within30.push(b);
      else if (days <= 60) within60.push(b);
      else if (days <= 90) within90.push(b);
      else ok.push(b);
    }

    return { expired, within30, within60, within90, ok };
  }, [batches]);

  const handleDispose = (batch: ExpiryBatch) => {
    disposeMutation.mutate(
      {
        itemId: batch.itemId,
        branchId: batch.branchId,
        quantity: batch.quantity,
        reason: `Expired batch ${batch.batchNumber || ''}`.trim(),
        batchNumber: batch.batchNumber,
      },
      {
        onSuccess: () =>
          toast.success(
            t('inventory.expiryDashboard.toast.disposed', {
              quantity: batch.quantity,
              itemName: batch.itemName,
            }),
          ),
        onError: (err: any) =>
          toast.error(err?.message || t('inventory.expiryDashboard.toast.disposeFailed')),
      },
    );
  };

  const cards = [
    {
      label: t('inventory.expiryDashboard.cards.expired'),
      count: buckets.expired.length,
      icon: AlertTriangle,
      color: 'text-destructive',
    },
    {
      label: t('inventory.expiryDashboard.cards.within30'),
      count: buckets.within30.length,
      icon: Clock,
      color: 'text-orange-500 dark:text-orange-400',
    },
    {
      label: t('inventory.expiryDashboard.cards.within60'),
      count: buckets.within60.length,
      icon: Clock,
      color: 'text-yellow-500 dark:text-yellow-400',
    },
    {
      label: t('inventory.expiryDashboard.cards.within90'),
      count: buckets.within90.length,
      icon: Clock,
      color: 'text-blue-500 dark:text-blue-400',
    },
    {
      label: t('inventory.expiryDashboard.cards.ok'),
      count: buckets.ok.length,
      icon: CheckCircle,
      color: 'text-green-500 dark:text-green-400',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status cards */}
      <div
        className="grid grid-cols-2 gap-4 md:grid-cols-5"
        role="status"
        aria-label="Expiry statistics"
      >
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-3 pt-4">
              <c.icon className={`h-8 w-8 ${c.color}`} />
              <div>
                <p className="text-2xl font-bold">{c.count}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Expiry table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('inventory.expiryDashboard.table.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-start text-muted-foreground">
                  <th className="py-2">{t('inventory.expiryDashboard.columns.item')}</th>
                  <th className="py-2">{t('inventory.expiryDashboard.columns.sku')}</th>
                  <th className="py-2">{t('inventory.expiryDashboard.columns.branch')}</th>
                  <th className="py-2">{t('inventory.expiryDashboard.columns.batch')}</th>
                  <th className="py-2">{t('inventory.expiryDashboard.columns.qty')}</th>
                  <th className="py-2">{t('inventory.expiryDashboard.columns.expiry')}</th>
                  <th className="py-2">{t('inventory.expiryDashboard.columns.status')}</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {[...buckets.expired, ...buckets.within30, ...buckets.within60].map((b) => {
                  const days = daysUntilExpiry(b.expiryDate);
                  return (
                    <tr key={b._id} className="border-b">
                      <td className="py-2 font-medium">{b.itemName}</td>
                      <td className="py-2">{b.sku}</td>
                      <td className="py-2">{b.branchName}</td>
                      <td className="py-2">{b.batchNumber || '—'}</td>
                      <td className="py-2">{b.quantity}</td>
                      <td className="py-2">{formatDate(b.expiryDate)}</td>
                      <td className="py-2">
                        {days <= 0 ? (
                          <Badge variant="destructive">
                            {t('inventory.expiryDashboard.status.expired')}
                          </Badge>
                        ) : days <= 30 ? (
                          <Badge variant="warning">{days}d left</Badge>
                        ) : (
                          <Badge variant="outline">{days}d left</Badge>
                        )}
                      </td>
                      <td className="py-2">
                        {days <= 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDispose(b)}
                            disabled={disposeMutation.isPending}
                            className="gap-1 text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />{' '}
                            {t('inventory.expiryDashboard.actions.dispose')}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {buckets.expired.length + buckets.within30.length + buckets.within60.length ===
                  0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      {t('inventory.expiryDashboard.empty.noData')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
