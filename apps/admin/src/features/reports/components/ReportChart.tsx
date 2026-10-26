/**
 * Report Chart — Universal chart renderer
 * Renders Bar, Line, Pie, or Heatmap based on report type/data shape.
 */

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useTranslation } from '../../../stores/locale.store.js';

const CHART_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
];

type ChartType = 'bar' | 'line' | 'pie' | 'heatmap' | 'auto';

interface ReportChartProps {
  data: Record<string, unknown>[] | undefined;
  chartType?: ChartType;
  height?: number;
  title?: string;
}

/** Infer chart type from report type string */
function inferChartType(data: Record<string, unknown>[]): ChartType {
  if (!data.length) return 'bar';
  const keys = Object.keys(data[0]);
  // If data has 'name'+'value' pattern, likely pie
  if (keys.includes('name') && keys.includes('value') && data.length <= 10) return 'pie';
  // If data has time-related keys, likely line
  if (keys.some((k) => /date|month|week|period|time/i.test(k))) return 'line';
  return 'bar';
}

function getAxisKeys(data: Record<string, unknown>[]) {
  if (!data.length) return { labelKey: 'label', valueKeys: ['value'] };
  const first = data[0];
  const labelKey =
    Object.keys(first).find((k) => typeof first[k] === 'string' && !/id|_id/i.test(k)) ?? 'label';
  const valueKeys = Object.keys(first).filter((k) => typeof first[k] === 'number');
  return { labelKey, valueKeys: valueKeys.length ? valueKeys : ['value'] };
}

export default function ReportChart({
  data,
  chartType = 'auto',
  height = 320,
  title,
}: ReportChartProps) {
  const { t } = useTranslation();

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-gray-700"
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">{t('reports.chart.noData')}</p>
      </div>
    );
  }

  const type = chartType === 'auto' ? inferChartType(data) : chartType;
  const { labelKey, valueKeys } = getAxisKeys(data);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      {title && (
        <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
      )}
      <ResponsiveContainer width="100%" height={height}>
        {type === 'pie' ? (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={Math.min(height / 2 - 40, 120)}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            >
              {data.map((entry, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={
                    (entry as { color?: string }).color ?? CHART_COLORS[i % CHART_COLORS.length]
                  }
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        ) : type === 'line' ? (
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey={labelKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            {valueKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            ))}
            {valueKeys.length > 1 && <Legend />}
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey={labelKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            {valueKeys.map((key, i) => (
              <Bar key={key} dataKey={key} radius={[4, 4, 0, 0]}>
                {data.map((_, j) => (
                  <Cell
                    key={`cell-${j}`}
                    fill={CHART_COLORS[(valueKeys.length > 1 ? i : j) % CHART_COLORS.length]}
                  />
                ))}
              </Bar>
            ))}
            {valueKeys.length > 1 && <Legend />}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
