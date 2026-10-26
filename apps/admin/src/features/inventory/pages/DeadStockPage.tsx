/**
 * DeadStockPage — Identify items with no movement over a configurable period.
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
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useTranslation } from '../../../stores/locale.store.js';

interface DeadStockRow {
  itemName: string;
  sku: string;
  categoryName: string;
  currentQuantity: number;
  lastMovementDate: string;
  daysSinceMovement: number;
  value: number;
}

const COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6'];

export default function DeadStockPage() {
  const { t } = useTranslation();
  const [branchId, setBranchId] = useState('');
  const [daysThreshold, setDaysThreshold] = useState('90');

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
    queryKey: ['reports', 'inventory', 'dead_stock', { branchId, daysThreshold }],
    queryFn: () =>
      apiClient.get<{
        success: true;
        data: {
          report: {
            table: DeadStockRow[];
            summary: { totalDeadItems: number; totalDeadValue: number; percentOfInventory: number };
            chart: Record<string, unknown>[];
          };
        };
      }>('/api/reports/inventory/dead_stock', {
        params: { branchId, daysThreshold } as Record<string, string>,
      }),
    select: (res) => res.data.report,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('inventory.deadStock.page.title')}
        description={t('inventory.deadStock.page.description')}
      />

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label>{t('inventory.deadStock.page.branch')}</Label>
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
        <div className="space-y-1">
          <Label>{t('inventory.deadStock.filters.noMovementDays')}</Label>
          <Select value={daysThreshold} onValueChange={setDaysThreshold}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">{t('inventory.deadStock.filters.days30')}</SelectItem>
              <SelectItem value="60">{t('inventory.deadStock.filters.days60')}</SelectItem>
              <SelectItem value="90">{t('inventory.deadStock.filters.days90')}</SelectItem>
              <SelectItem value="180">{t('inventory.deadStock.filters.days180')}</SelectItem>
              <SelectItem value="365">{t('inventory.deadStock.filters.year1')}</SelectItem>
            </SelectContent>
          </Select>
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
                  {t('inventory.deadStock.summary.deadStockItems')}
                </p>
                <p className="text-2xl font-bold text-error-500">
                  {data?.summary?.totalDeadItems ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  {t('inventory.deadStock.summary.deadStockValue')}
                </p>
                <p className="text-2xl font-bold">
                  {(data?.summary?.totalDeadValue ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  {t('inventory.deadStock.summary.percentOfInventory')}
                </p>
                <p className="text-2xl font-bold">
                  {((data?.summary?.percentOfInventory ?? 0) * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Chart */}
            {data?.chart && data.chart.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('inventory.deadStock.chart.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.chart}
                        dataKey="value"
                        nameKey="categoryName"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {data.chart.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => Number(value).toFixed(2)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Table */}
            <Card>
              <CardHeader>
                <CardTitle>{t('inventory.deadStock.table.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-start text-muted-foreground">
                        <th className="py-2">{t('inventory.deadStock.columns.item')}</th>
                        <th className="py-2">{t('inventory.deadStock.columns.category')}</th>
                        <th className="py-2 text-end">{t('inventory.deadStock.columns.qty')}</th>
                        <th className="py-2 text-end">
                          {t('inventory.deadStock.columns.daysIdle')}
                        </th>
                        <th className="py-2 text-end">{t('inventory.deadStock.columns.value')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.table?.map((row, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2 font-medium">{row.itemName}</td>
                          <td className="py-2 text-muted-foreground">{row.categoryName}</td>
                          <td className="py-2 text-end">{row.currentQuantity}</td>
                          <td className="py-2 text-end text-error-500">{row.daysSinceMovement}</td>
                          <td className="py-2 text-end">{row.value.toFixed(2)}</td>
                        </tr>
                      ))}
                      {(!data?.table || data.table.length === 0) && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            {t('inventory.deadStock.empty.noData')}
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
