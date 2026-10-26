/**
 * StockValuationReportPage — Branch picker, valuation method, category breakdown.
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

interface ValuationRow {
  categoryName: string;
  itemCount: number;
  totalQuantity: number;
  totalValue: number;
}

const COLORS = [
  '#60a5fa', // blue-400 (dark-friendly)
  '#34d399', // emerald-400
  '#fbbf24', // amber-400
  '#f87171', // red-400
  '#a78bfa', // violet-400
  '#f472b6', // pink-400
  '#22d3ee', // cyan-400
  '#a3e635', // lime-400
];

export default function StockValuationReportPage() {
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
    queryKey: ['reports', 'inventory', 'stock_valuation', { branchId }],
    queryFn: () =>
      apiClient.get<{
        success: true;
        data: {
          report: {
            table: ValuationRow[];
            summary: { grandTotal: number; totalItems: number };
            chart: any[];
          };
        };
      }>('/api/reports/inventory/stock_valuation', {
        params: branchId ? { branchId } : {},
      }),
    select: (res) => res.data.report,
  });

  const grandTotal = data?.summary?.grandTotal ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('inventory.valuation.page.title')}
        description={t('inventory.valuation.page.description')}
      />

      <div className="flex items-end gap-4">
        <div className="space-y-1">
          <Label>{t('inventory.valuation.labels.branch')}</Label>
          <Select
            value={branchId || 'all'}
            onValueChange={(v) => setBranchId(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t('inventory.movements.labels.allBranches')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('inventory.valuation.labels.all')}</SelectItem>
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
                  {t('inventory.valuation.summary.totalValue')}
                </p>
                <p className="text-2xl font-bold">
                  {grandTotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  {t('inventory.valuation.summary.totalItems')}
                </p>
                <p className="text-2xl font-bold">{data?.summary?.totalItems ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  {t('inventory.valuation.summary.categories')}
                </p>
                <p className="text-2xl font-bold">{data?.table?.length ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Pie Chart */}
            {data?.table && data.table.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('inventory.valuation.chart.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.table}
                        dataKey="totalValue"
                        nameKey="categoryName"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {data.table.map((_, idx) => (
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
                <CardTitle>{t('inventory.valuation.table.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-start text-muted-foreground">
                        <th className="py-2">{t('inventory.valuation.columns.category')}</th>
                        <th className="py-2 text-end">{t('inventory.valuation.columns.items')}</th>
                        <th className="py-2 text-end">{t('inventory.valuation.columns.qty')}</th>
                        <th className="py-2 text-end">{t('inventory.valuation.columns.value')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.table?.map((row, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2 font-medium">{row.categoryName}</td>
                          <td className="py-2 text-end">{row.itemCount}</td>
                          <td className="py-2 text-end">{row.totalQuantity}</td>
                          <td className="py-2 text-end">{row.totalValue.toFixed(2)}</td>
                        </tr>
                      ))}
                      {(!data?.table || data.table.length === 0) && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-muted-foreground">
                            {t('inventory.valuation.empty.noData')}
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
