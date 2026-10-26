/**
 * DoctorCombobox — Searchable doctor selector powered by SearchCombobox.
 * Fetches active doctors from API and maps to combobox options.
 */

import { useMemo } from 'react';
import { SearchCombobox, type SearchComboboxOption } from '@dento/ui';
import { useDoctorList } from '@/features/doctors/hooks/useDoctors.js';

interface DoctorComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function DoctorCombobox({ value, onValueChange, disabled, className }: DoctorComboboxProps) {
  const { data } = useDoctorList({
    isActive: true,
    limit: 100,
    sortBy: 'firstName',
    sortOrder: 'asc',
  });

  const options: SearchComboboxOption[] = useMemo(() => {
    if (!data?.items) return [];
    return data.items.map((d) => ({
      value: d._id,
      label: `Dr. ${d.firstName} ${d.lastName}`,
      description: d.specialization,
    }));
  }, [data?.items]);

  return (
    <SearchCombobox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder="Select doctor..."
      searchPlaceholder="Search by name..."
      emptyMessage="No doctors found."
      disabled={disabled}
      className={className}
    />
  );
}
