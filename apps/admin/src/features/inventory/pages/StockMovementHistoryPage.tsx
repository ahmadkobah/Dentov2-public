/**
 * StockMovementHistoryPage — Track all stock movements (receipts, transfers, adjustments, disposals).
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PageHeader,
  Input,
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
import { formatDate } from '@/lib/date.js';

interface MovementRow {
  date: string;
  itemName: string;
  type: string;
  quantity: number;
  reference: string;
  performedBy: string;
}

export default function StockMovementHistoryPage() {
  const { t } = useTranslation();
  const [branchId, setBranchId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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
    queryKey: ['reports', 'inventory', 'stock_movement_history', { branchId, dateFrom, dateTo }],
    queryFn: () =>
      apiClient.get<{
        success: true;
        data: {
          report: {
            table: MovementRow[];
            summary: { totalMovements: number; netChange: number };
            chart: Record<string, unknown>[];
          };
        };
      }>('/api/reports/inventory/stock_movement_history', {
        params: { branchId, dateFrom, dateTo } as Record<string, string>,
      }),
    select: (res) => res.data.report,
    enabled: !!(dateFrom && dateTo),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('inventory.movements.page.title')}
        description={t('inventory.movements.page.description')}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label>{t('inventory.movements.labels.from')}</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>{t('inventory.movements.labels.to')}</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>{t('inventory.movements.labels.branch')}</Label>
          <Select
            value={branchId || 'all'}
            onValueChange={(v) => setBranchId(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t('inventory.movements.labels.allBranches')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('inventory.movements.labels.all')}</SelectItem>
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
            {t('inventory.movements.empty.selectRange')}
          </CardContent>
        </Card>
      ) : isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} onRetry={refetch} />
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  {t('inventory.movements.summary.totalMovements')}
                </p>
                <p className="text-2xl font-bold">{data?.summary?.totalMovements ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  {t('inventory.movements.summary.netChange')}
                </p>
                <p className="text-2xl font-bold">{data?.summary?.netChange ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Chart */}
            {data?.chart && data.chart.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('inventory.movements.chart.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.chart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="inbound"
                        fill="#34d399"
                        name={t('inventory.movements.chart.inbound')}
                      />
                      <Bar
                        dataKey="outbound"
                        fill="#f87171"
                        name={t('inventory.movements.chart.outbound')}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Table */}
            <Card>
              <CardHeader>
                <CardTitle>{t('inventory.movements.table.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-start text-muted-foreground">
                        <th className="py-2">{t('inventory.movements.columns.date')}</th>
                        <th className="py-2">{t('inventory.movements.columns.item')}</th>
                        <th className="py-2">{t('inventory.movements.columns.type')}</th>
                        <th className="py-2 text-end">{t('inventory.movements.columns.qty')}</th>
                        <th className="py-2">{t('inventory.movements.columns.reference')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.table?.map((row, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2">{formatDate(row.date)}</td>
                          <td className="py-2 font-medium">{row.itemName}</td>
                          <td className="py-2">
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
                              {row.type}
                            </span>
                          </td>
                          <td className="py-2 text-end">
                            <span
                              className={row.quantity >= 0 ? 'text-success-500' : 'text-error-500'}
                            >
                              {row.quantity >= 0 ? '+' : ''}
                              {row.quantity}
                            </span>
                          </td>
                          <td className="py-2 text-xs text-muted-foreground">{row.reference}</td>
                        </tr>
                      ))}
                      {(!data?.table || data.table.length === 0) && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            {t('inventory.movements.empty.noData')}
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
