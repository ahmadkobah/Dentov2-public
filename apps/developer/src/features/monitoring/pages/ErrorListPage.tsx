import { useState, useMemo } from 'react';
import { Input, Button, Badge } from '@dento/ui';
import { Search, X } from 'lucide-react';
import { RecentErrorsTable } from '../components/RecentErrorsTable.js';
import type { ErrorLog, ErrorLogFilters } from '../hooks/useErrorLogs.js';
import type { ErrorLogLevel, ErrorLogSource } from '@dento/shared';

interface ErrorListPageProps {
  onSelectError: (error: ErrorLog) => void;
}

const LEVELS = ['error', 'fatal', 'warn'] as const;
const SOURCES = ['api', 'admin', 'developer', 'worker'] as const;
const STATUSES = [
  { label: 'Open', value: 'false' },
  { label: 'Resolved', value: 'true' },
] as const;

export default function ErrorListPage({ onSelectError }: ErrorListPageProps) {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [resolvedFilter, setResolvedFilter] = useState('');

  const filters: ErrorLogFilters = useMemo(
    () => ({
      ...(search && { search }),
      ...(levelFilter && { level: levelFilter as ErrorLogLevel }),
      ...(sourceFilter && { source: sourceFilter as ErrorLogSource }),
      ...(resolvedFilter && { resolved: resolvedFilter }),
    }),
    [search, levelFilter, sourceFilter, resolvedFilter],
  );

  const hasFilters = !!(search || levelFilter || sourceFilter || resolvedFilter);

  const clearFilters = () => {
    setSearch('');
    setLevelFilter('');
    setSourceFilter('');
    setResolvedFilter('');
  };

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search errors…"
            aria-label="Search errors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>

        {/* Level filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500">Level:</span>
          {LEVELS.map((lvl) => (
            <Button
              key={lvl}
              variant={levelFilter === lvl ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs capitalize"
              onClick={() => setLevelFilter(levelFilter === lvl ? '' : lvl)}
            >
              {lvl}
            </Button>
          ))}
        </div>

        {/* Source filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500">Source:</span>
          {SOURCES.map((src) => (
            <Button
              key={src}
              variant={sourceFilter === src ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs capitalize"
              onClick={() => setSourceFilter(sourceFilter === src ? '' : src)}
            >
              {src}
            </Button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500">Status:</span>
          {STATUSES.map((st) => (
            <Button
              key={st.value}
              variant={resolvedFilter === st.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setResolvedFilter(resolvedFilter === st.value ? '' : st.value)}
            >
              {st.label}
            </Button>
          ))}
        </div>

        {/* Clear all */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={clearFilters}
            aria-label="Clear all filters"
          >
            <X className="me-1 h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Active filters */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {search && (
            <Badge variant="secondary" className="text-xs">
              Search: {search}
            </Badge>
          )}
          {levelFilter && (
            <Badge variant="secondary" className="text-xs capitalize">
              Level: {levelFilter}
            </Badge>
          )}
          {sourceFilter && (
            <Badge variant="secondary" className="text-xs capitalize">
              Source: {sourceFilter}
            </Badge>
          )}
          {resolvedFilter && (
            <Badge variant="secondary" className="text-xs">
              Status: {resolvedFilter === 'true' ? 'Resolved' : 'Open'}
            </Badge>
          )}
        </div>
      )}

      {/* Table */}
      <RecentErrorsTable filters={filters} onSelectError={onSelectError} />
    </div>
  );
}
