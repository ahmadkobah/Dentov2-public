/**
 * Commission Summary Cards
 * Extracted from CommissionsPage.tsx
 */

import { Card, CardContent, CardHeader, CardTitle } from '@dento/ui';
import { Clock, TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrency } from '../utils/commission.utils.js';
import { useTranslation } from '../../../stores/locale.store.js';

interface CommissionSummaryCardsProps {
  summary:
    | {
        totalPending: number;
        totalApproved: number;
        totalPaid: number;
      }
    | undefined;
}

export function CommissionSummaryCards({ summary }: CommissionSummaryCardsProps) {
  const { t } = useTranslation();
  if (!summary) return null;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{t('commissions.summary.pending')}</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalPending)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{t('commissions.summary.approved')}</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(summary.totalApproved)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{t('commissions.summary.paidOut')}</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalPaid)}</div>
        </CardContent>
      </Card>
    </div>
  );
}
