/**
 * LowStockAlertPage — Dedicated report for all items below reorder level.
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from '../../../stores/locale.store.js';

interface LowStockRow {
  itemName: string;
  sku: string;
  categoryName: string;
  currentQuantity: number;
  reorderLevel: number;
  deficit: number;
  estimatedCost: number;
}

export default function LowStockAlertPage() {
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
    queryKey: ['reports', 'inventory', 'low_stock', { branchId }],
    queryFn: () =>
      apiClient.get<{
        success: true;
        data: {
          report: {
            table: LowStockRow[];
            summary: {
              totalLowStockItems: number;
              totalDeficit: number;
              estimatedReorderCost: number;
            };
            chart: Record<string, unknown>[];
          };
        };
      }>('/api/reports/inventory/low_stock', {
        params: branchId ? { branchId } : {},
      }),
    select: (res) => res.data.report,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('inventory.lowStockAlert.page.title')}
        description={t('inventory.lowStockAlert.page.description')}
      />

      <div className="flex items-end gap-4">
        <div className="space-y-1">
          <Label>{t('inventory.lowStockAlert.page.branch')}</Label>
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
                  {t('inventory.lowStockAlert.summary.lowStockItems')}
                </p>
                <p className="text-2xl font-bold text-warning-500">
                  {data?.summary?.totalLowStockItems ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  {t('inventory.lowStockAlert.summary.totalDeficit')}
                </p>
                <p className="text-2xl font-bold">{data?.summary?.totalDeficit ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  {t('inventory.lowStockAlert.summary.estReorderCost')}
                </p>
                <p className="text-2xl font-bold">
                  {(data?.summary?.estimatedReorderCost ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Chart */}
            {data?.chart && data.chart.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('inventory.lowStockAlert.chart.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.chart.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="itemName" />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="currentQuantity"
                        fill="#60a5fa"
                        name={t('inventory.lowStockAlert.chart.currentStock')}
                      />
                      <Bar
                        dataKey="reorderLevel"
                        fill="#f87171"
                        name={t('inventory.lowStockAlert.chart.reorderLevel')}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Table */}
            <Card>
              <CardHeader>
                <CardTitle>{t('inventory.lowStockAlert.table.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-start text-muted-foreground">
                        <th className="py-2">{t('inventory.lowStockAlert.columns.item')}</th>
                        <th className="py-2">{t('inventory.lowStockAlert.columns.category')}</th>
                        <th className="py-2 text-end">
                          {t('inventory.lowStockAlert.columns.current')}
                        </th>
                        <th className="py-2 text-end">
                          {t('inventory.lowStockAlert.columns.reorder')}
                        </th>
                        <th className="py-2 text-end">
                          {t('inventory.lowStockAlert.columns.deficit')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.table?.map((row, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2 font-medium">{row.itemName}</td>
                          <td className="py-2 text-muted-foreground">{row.categoryName}</td>
                          <td className="py-2 text-end text-error-500 font-semibold">
                            {row.currentQuantity}
                          </td>
                          <td className="py-2 text-end">{row.reorderLevel}</td>
                          <td className="py-2 text-end text-warning-500">{row.deficit}</td>
                        </tr>
                      ))}
                      {(!data?.table || data.table.length === 0) && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            {t('inventory.lowStockAlert.empty.noData')}
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
