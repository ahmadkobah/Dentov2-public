'use client';

import * as React from 'react';
import { cn } from '../utils/cn';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../primitives/Table';
import { Button } from '../primitives/Button';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────

type SortDirection = 'asc' | 'desc' | null;

interface ColumnDef<T> {
  id: string;
  header: string;
  accessorFn?: (row: T) => React.ReactNode;
  accessorKey?: keyof T;
  cell?: (value: unknown, row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  pageSize?: number;
  currentPage?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  sortColumn?: string;
  sortDirection?: SortDirection;
  onSort?: (column: string, direction: SortDirection) => void;
  emptyMessage?: string;
  className?: string;
  isLoading?: boolean;
  rowKey?: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
}

// ── Component ──────────────────────────────────────────────────────────

function DataTable<T>({
  columns,
  data,
  pageSize = 10,
  currentPage = 1,
  totalItems,
  onPageChange,
  sortColumn,
  sortDirection,
  onSort,
  emptyMessage = 'No data found.',
  className,
  isLoading,
  rowKey,
  onRowClick,
}: DataTableProps<T>) {
  const total = totalItems ?? data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  function getCellValue(row: T, col: ColumnDef<T>): React.ReactNode {
    const raw = col.accessorFn
      ? col.accessorFn(row)
      : col.accessorKey
        ? row[col.accessorKey]
        : null;
    return col.cell ? col.cell(raw, row) : (raw as React.ReactNode);
  }

  function handleSort(col: ColumnDef<T>) {
    if (!col.sortable || !onSort) return;
    let next: SortDirection = 'asc';
    if (sortColumn === col.id) {
      if (sortDirection === 'asc') next = 'desc';
      else if (sortDirection === 'desc') next = null;
    }
    onSort(col.id, next);
  }

  function SortIcon({ col }: { col: ColumnDef<T> }) {
    if (!col.sortable) return null;
    if (sortColumn !== col.id)
      return <ArrowUpDown className="ms-1 inline h-3.5 w-3.5 opacity-40" />;
    if (sortDirection === 'asc') return <ArrowUp className="ms-1 inline h-3.5 w-3.5" />;
    if (sortDirection === 'desc') return <ArrowDown className="ms-1 inline h-3.5 w-3.5" />;
    return <ArrowUpDown className="ms-1 inline h-3.5 w-3.5 opacity-40" />;
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.id}
                  className={cn(col.sortable && 'cursor-pointer select-none', col.className)}
                  onClick={() => handleSort(col)}
                >
                  {col.header}
                  <SortIcon col={col} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Loading…
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, i) => (
                <TableRow
                  key={rowKey ? rowKey(row, i) : i}
                  className={cn(onRowClick && 'cursor-pointer hover:bg-muted/50')}
                  onClick={(e) => {
                    // Don't trigger row click for interactive element clicks (buttons, links, menuitems)
                    const target = e.target as HTMLElement;
                    if (target.closest('button, a, [role="menuitem"]')) return;
                    onRowClick?.(row);
                  }}
                >
                  {columns.map((col) => (
                    <TableCell key={col.id} className={col.className}>
                      {getCellValue(row, col)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Showing {startItem}–{endItem} of {total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={currentPage <= 1}
              aria-label="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage >= totalPages}
              aria-label="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export { DataTable, type DataTableProps, type ColumnDef, type SortDirection };
