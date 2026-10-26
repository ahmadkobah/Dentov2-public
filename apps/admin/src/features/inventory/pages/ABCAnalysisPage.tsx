/**
 * ABCAnalysisPage — Classify inventory items by value contribution (Pareto / 80-20 rule).
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

interface ABCRow {
  itemName: string;
  sku: string;
  categoryName: string;
  annualUsageValue: number;
  percentOfTotal: number;
  cumulativePercent: number;
  classification: 'A' | 'B' | 'C';
}

const CLASS_COLORS: Record<string, string> = {
  A: '#f87171', // red-400 — highest value
  B: '#fbbf24', // amber-400 — medium value
  C: '#60a5fa', // blue-400 — lowest value
};

const PIE_COLORS = ['#f87171', '#fbbf24', '#60a5fa'];

export default function ABCAnalysisPage() {
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
    queryKey: ['reports', 'inventory', 'abc_analysis', { branchId }],
    queryFn: () =>
      apiClient.get<{
        success: true;
        data: {
          report: {
            table: ABCRow[];
            summary: {
              classA: { count: number; valuePercent: number };
              classB: { count: number; valuePercent: number };
              classC: { count: number; valuePercent: number };
              totalItems: number;
            };
            chart: Record<string, unknown>[];
          };
        };
      }>('/api/reports/inventory/abc_analysis', {
        params: branchId ? { branchId } : {},
      }),
    select: (res) => res.data.report,
  });

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('inventory.abcAnalysis.page.title')}
        description={t('inventory.abcAnalysis.page.description')}
      />

      <div className="flex items-end gap-4">
        <div className="space-y-1">
          <Label>{t('inventory.abcAnalysis.page.branch')}</Label>
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
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  {t('inventory.abcAnalysis.summary.totalItems')}
                </p>
                <p className="text-2xl font-bold">{summary?.totalItems ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border-error-200 dark:border-error-500/30">
              <CardContent className="pt-4">
                <p className="text-sm text-error-500">
                  {t('inventory.abcAnalysis.summary.classAHighValue')}
                </p>
                <p className="text-2xl font-bold">
                  {summary?.classA?.count ?? 0}{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({((summary?.classA?.valuePercent ?? 0) * 100).toFixed(0)}%{' '}
                    {t('inventory.abcAnalysis.summary.percentValue')})
                  </span>
                </p>
              </CardContent>
            </Card>
            <Card className="border-warning-200 dark:border-warning-500/30">
              <CardContent className="pt-4">
                <p className="text-sm text-warning-500">
                  {t('inventory.abcAnalysis.summary.classBMedium')}
                </p>
                <p className="text-2xl font-bold">
                  {summary?.classB?.count ?? 0}{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({((summary?.classB?.valuePercent ?? 0) * 100).toFixed(0)}%{' '}
                    {t('inventory.abcAnalysis.summary.percentValue')})
                  </span>
                </p>
              </CardContent>
            </Card>
            <Card className="border-info-200 dark:border-info-500/30">
              <CardContent className="pt-4">
                <p className="text-sm text-info-500">
                  {t('inventory.abcAnalysis.summary.classCLow')}
                </p>
                <p className="text-2xl font-bold">
                  {summary?.classC?.count ?? 0}{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({((summary?.classC?.valuePercent ?? 0) * 100).toFixed(0)}%{' '}
                    {t('inventory.abcAnalysis.summary.percentValue')})
                  </span>
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Pie Chart */}
            {summary && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('inventory.abcAnalysis.chart.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: t('inventory.abcAnalysis.chart.classA'),
                            value: summary.classA?.valuePercent ?? 0,
                          },
                          {
                            name: t('inventory.abcAnalysis.chart.classB'),
                            value: summary.classB?.valuePercent ?? 0,
                          },
                          {
                            name: t('inventory.abcAnalysis.chart.classC'),
                            value: summary.classC?.valuePercent ?? 0,
                          },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, value }) => `${name} ${(value * 100).toFixed(0)}%`}
                      >
                        {PIE_COLORS.map((color, idx) => (
                          <Cell key={idx} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Table */}
            <Card>
              <CardHeader>
                <CardTitle>{t('inventory.abcAnalysis.table.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-start text-muted-foreground">
                        <th className="py-2">{t('inventory.abcAnalysis.columns.item')}</th>
                        <th className="py-2">{t('inventory.abcAnalysis.columns.class')}</th>
                        <th className="py-2 text-end">
                          {t('inventory.abcAnalysis.columns.annualValue')}
                        </th>
                        <th className="py-2 text-end">
                          {t('inventory.abcAnalysis.columns.percentOfTotal')}
                        </th>
                        <th className="py-2 text-end">
                          {t('inventory.abcAnalysis.columns.cumulative')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.table?.map((row, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2 font-medium">{row.itemName}</td>
                          <td className="py-2">
                            <span
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                              style={{ backgroundColor: CLASS_COLORS[row.classification] }}
                            >
                              {row.classification}
                            </span>
                          </td>
                          <td className="py-2 text-end">{row.annualUsageValue.toFixed(2)}</td>
                          <td className="py-2 text-end">
                            {(row.percentOfTotal * 100).toFixed(1)}%
                          </td>
                          <td className="py-2 text-end">
                            {(row.cumulativePercent * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                      {(!data?.table || data.table.length === 0) && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            {t('inventory.abcAnalysis.empty.noData')}
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
