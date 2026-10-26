/**
 * MaterialUsageReportPage — Date range picker, branch filter, usage table + chart.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PageHeader,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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

interface UsageRow {
  itemName: string;
  sku: string;
  totalConsumed: number;
  totalCost: number;
}

export default function MaterialUsageReportPage() {
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
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
    queryKey: ['reports', 'inventory', 'material_usage', { dateFrom, dateTo, branchId }],
    queryFn: () =>
      apiClient.get<{
        success: true;
        data: { report: { table: UsageRow[]; summary: any; chart: any[] } };
      }>('/api/reports/inventory/material_usage', {
        params: { dateFrom, dateTo, branchId } as Record<string, string>,
      }),
    select: (res) => res.data.report,
    enabled: !!(dateFrom && dateTo),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('inventory.materialUsage.page.title')}
        description={t('inventory.materialUsage.page.description')}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label>{t('inventory.materialUsage.labels.from')}</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>{t('inventory.materialUsage.labels.to')}</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>{t('inventory.materialUsage.labels.branch')}</Label>
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

      {!dateFrom || !dateTo ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('inventory.materialUsage.empty.selectRange')}
          </CardContent>
        </Card>
      ) : isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} onRetry={refetch} />
      ) : (
        <>
          {/* Chart */}
          {data?.chart && data.chart.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('inventory.materialUsage.chart.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.chart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="itemName" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="totalConsumed"
                      fill="hsl(var(--primary))"
                      name={t('inventory.materialUsage.chart.consumed')}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t('inventory.materialUsage.table.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-start text-muted-foreground">
                      <th className="py-2">{t('inventory.materialUsage.columns.item')}</th>
                      <th className="py-2">{t('inventory.materialUsage.columns.sku')}</th>
                      <th className="py-2 text-end">
                        {t('inventory.materialUsage.columns.consumed')}
                      </th>
                      <th className="py-2 text-end">{t('inventory.materialUsage.columns.cost')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.table?.map((row, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2">{row.itemName}</td>
                        <td className="py-2">{row.sku}</td>
                        <td className="py-2 text-end">{row.totalConsumed}</td>
                        <td className="py-2 text-end">{row.totalCost.toFixed(2)}</td>
                      </tr>
                    ))}
                    {(!data?.table || data.table.length === 0) && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground">
                          {t('inventory.materialUsage.empty.noData')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
