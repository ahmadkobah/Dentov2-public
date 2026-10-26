/**
 * Report Data Table — Generic sortable data table for report detail pages.
 * Renders columns from the first row's keys with sort & pagination.
 */

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Button } from '@dento/ui';
import { useTranslation } from '../../../stores/locale.store.js';

interface ReportDataTableProps {
  data: Record<string, unknown>[] | undefined;
  /** Optional explicit column order + labels */
  columns?: { key: string; label: string; format?: (v: unknown) => string }[];
  pageSize?: number;
  title?: string;
}

type SortDir = 'asc' | 'desc' | null;

export default function ReportDataTable({
  data,
  columns: explicitColumns,
  pageSize = 15,
  title,
}: ReportDataTableProps) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(0);

  // Derive columns from first row if not explicitly provided
  const columns = useMemo(() => {
    if (explicitColumns) return explicitColumns;
    if (!data?.length) return [];
    return Object.keys(data[0])
      .filter((k) => !/^_id$/i.test(k))
      .map((k) => ({
        key: k,
        label: k
          .replace(/([A-Z])/g, ' $1')
          .replace(/_/g, ' ')
          .replace(/^\w/, (c) => c.toUpperCase())
          .trim(),
      }));
  }, [data, explicitColumns]);

  // Sort
  const sorted = useMemo(() => {
    if (!data) return [];
    if (!sortKey || !sortDir) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [data, sortKey, sortDir]);

  // Paginate
  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
      setSortDir(null);
    }
    setPage(0);
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 p-8 dark:border-gray-700">
        <p className="text-sm text-muted-foreground">{t('reports.dataTable.noData')}</p>
      </div>
    );
  }

  const formatCell = (col: (typeof columns)[number], value: unknown) => {
    if ('format' in col && typeof col.format === 'function') return col.format(value);
    if (value == null) return '—';
    if (typeof value === 'number') {
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      {title && (
        <div className="border-b border-gray-200 px-6 py-3 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400"
                  onClick={() => toggleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === 'asc' ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {paged.map((row, i) => (
              <tr key={i} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="whitespace-nowrap px-4 py-2.5 text-gray-700 dark:text-gray-300"
                  >
                    {formatCell(col, row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('reports.dataTable.rows', { count: sorted.length })} •{' '}
            {t('reports.dataTable.page', { current: page + 1, total: totalPages })}
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              {t('reports.dataTable.previous')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('reports.dataTable.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
