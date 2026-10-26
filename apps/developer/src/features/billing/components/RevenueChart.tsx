import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@dento/ui';
import { formatCurrency, formatCurrencyCompact } from '../../../lib/currency.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RevenueChartProps {
  timeline: { month: string; revenue: number }[];
}

/* ------------------------------------------------------------------ */
/*  Formatter                                                          */
/* ------------------------------------------------------------------ */

function formatMonth(month: string): string {
  // month format: "2025-01" → "Jan"
  const [year, m] = month.split('-');
  const date = new Date(Number(year), Number(m) - 1);
  return date.toLocaleString('en-US', { month: 'short' });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RevenueChart({ timeline }: RevenueChartProps) {
  const data = useMemo(
    () =>
      timeline.map((item) => ({
        month: formatMonth(item.month),
        revenue: item.revenue,
      })),
    [timeline],
  );

  if (!data.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-sm text-gray-500">
          No revenue data available yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Timeline</CardTitle>
        <CardDescription>Monthly revenue over the past 12 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              className="fill-gray-500 dark:fill-gray-400"
            />
            <YAxis
              tickFormatter={(value: number) => formatCurrencyCompact(value)}
              tick={{ fontSize: 12 }}
              className="fill-gray-500 dark:fill-gray-400"
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '13px',
              }}
            />
            <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
