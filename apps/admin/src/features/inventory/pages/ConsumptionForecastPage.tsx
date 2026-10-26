/**
 * ConsumptionForecastPage — Forecast future inventory consumption based on historical usage.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@dento/ui';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import { apiClient } from '@/lib/api-client.js';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useTranslation } from '../../../stores/locale.store.js';

interface ForecastRow {
  itemName: string;
  sku: string;
  currentStock: number;
  avgDailyUsage: number;
  daysUntilStockout: number;
  forecastedNeed30d: number;
}

export default function ConsumptionForecastPage() {
  const { t } = useTranslation();
  const [branchId, setBranchId] = useState('');

  const { data: branches, isError: branchesError } = useQuery({
    queryKey: ['branches', 'list'],
    queryFn: () =>
      apiClient.get<{
        success: true;
        data: { branches: Array<{ _id: string; name: { en: string } }> };
      }>('/api/branches'),
    select: (res) => res.data.branches,
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reports', 'inventory', 'consumption_forecast', { branchId }],
    queryFn: () =>
      apiClient.get<{
        success: true;
        data: {
          report: {
            table: ForecastRow[];
            summary: { totalItems: number; criticalItems: number; avgDaysToStockout: number };
            chart: Record<string, unknown>[];
          };
        };
      }>('/api/reports/inventory/consumption_forecast', {
        params: branchId ? { branchId } : {},
      }),
    select: (res) => res.data.report,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('inventory.consumptionForecast.page.title')}
        description={t('inventory.consumptionForecast.page.description')}
      />

      <div className="flex items-end gap-4">
        <div className="space-y-1">
          <Label>{t('inventory.consumptionForecast.page.branch')}</Label>
          <Select
            value={branchId || 'all'}
            onValueChange={(v) => setBranchId(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t('inventory.movements.labels.allBranches')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('inventory.list.filters.all')}</SelectItem>
              {branches?.map((b) => (
                <SelectItem key={b._id} value={b._id}>
                  {b.name.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {branchesError && (
            <p className="text-xs text-destructive">
              {t('inventory.movements.error.branchesFailed')}
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} onRetry={refetch} />
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  {t('inventory.consumptionForecast.summary.totalItems')}
                </p>
                <p className="text-2xl font-bold">{data?.summary?.totalItems ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  {t('inventory.consumptionForecast.summary.criticalItems')}
                </p>
                <p className="text-2xl font-bold text-error-500">
                  {data?.summary?.criticalItems ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  {t('inventory.consumptionForecast.summary.avgDaysToStockout')}
                </p>
                <p className="text-2xl font-bold">
                  {data?.summary?.avgDaysToStockout?.toFixed(0) ?? '—'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Chart */}
            {data?.chart && data.chart.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('inventory.consumptionForecast.chart.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.chart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="#60a5fa"
                        name={t('inventory.consumptionForecast.chart.actual')}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        stroke="#f59e0b"
                        name={t('inventory.consumptionForecast.chart.forecast')}
                        strokeDasharray="5 5"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Table */}
            <Card>
              <CardHeader>
                <CardTitle>{t('inventory.consumptionForecast.table.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-start text-muted-foreground">
                        <th className="py-2">{t('inventory.consumptionForecast.columns.item')}</th>
                        <th className="py-2 text-end">
                          {t('inventory.consumptionForecast.columns.stock')}
                        </th>
                        <th className="py-2 text-end">
                          {t('inventory.consumptionForecast.columns.dailyUse')}
                        </th>
                        <th className="py-2 text-end">
                          {t('inventory.consumptionForecast.columns.daysLeft')}
                        </th>
                        <th className="py-2 text-end">
                          {t('inventory.consumptionForecast.columns.need30d')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.table?.map((row, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2 font-medium">{row.itemName}</td>
                          <td className="py-2 text-end">{row.currentStock}</td>
                          <td className="py-2 text-end">{row.avgDailyUsage.toFixed(1)}</td>
                          <td className="py-2 text-end">
                            <span
                              className={
                                row.daysUntilStockout < 7
                                  ? 'text-error-500 font-semibold'
                                  : row.daysUntilStockout < 14
                                    ? 'text-warning-500'
                                    : ''
                              }
                            >
                              {row.daysUntilStockout}
                            </span>
                          </td>
                          <td className="py-2 text-end">{row.forecastedNeed30d}</td>
                        </tr>
                      ))}
                      {(!data?.table || data.table.length === 0) && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            {t('inventory.consumptionForecast.empty.noData')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
