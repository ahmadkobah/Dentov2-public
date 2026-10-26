/**
 * BranchCombobox — Searchable branch selector powered by SearchCombobox.
 * Fetches branches from API and maps to combobox options.
 */

import { useMemo } from 'react';
import { SearchCombobox, type SearchComboboxOption } from '@dento/ui';
import { useBranchList } from '@/features/branches/hooks/useBranches.js';

interface BranchComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function BranchCombobox({ value, onValueChange, disabled, className }: BranchComboboxProps) {
  const { data } = useBranchList({
    page: 1,
    limit: 50,
    isActive: true,
    sortBy: 'name.en',
    sortOrder: 'asc',
  });

  const options: SearchComboboxOption[] = useMemo(() => {
    if (!data?.items) return [];
    return data.items.map((b) => ({
      value: b._id,
      label: b.name.en,
      description: b.code,
    }));
  }, [data?.items]);

  return (
    <SearchCombobox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder="Select branch..."
      searchPlaceholder="Search by name or code..."
      emptyMessage="No branches found."
      disabled={disabled}
      className={className}
    />
  );
}
