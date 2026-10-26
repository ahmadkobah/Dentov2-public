/**
 * PatientCombobox — Searchable patient selector powered by SearchCombobox.
 * Fetches patients from API and maps to combobox options.
 */

import { useMemo } from 'react';
import { SearchCombobox, type SearchComboboxOption } from '@dento/ui';
import { usePatientList } from '@/features/patients/hooks/usePatients.js';

interface PatientComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function PatientCombobox({
  value,
  onValueChange,
  disabled,
  className,
}: PatientComboboxProps) {
  const { data } = usePatientList({
    page: 1,
    limit: 100,
    sortBy: 'firstName.en',
    sortOrder: 'asc',
  });

  const options: SearchComboboxOption[] = useMemo(() => {
    if (!data?.patients) return [];
    return data.patients.map((p) => ({
      value: p._id,
      label: `${p.firstName.en} ${p.lastName.en}`,
      description: p.patientCode,
    }));
  }, [data?.patients]);

  return (
    <SearchCombobox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder="Select patient..."
      searchPlaceholder="Search by name or code..."
      emptyMessage="No patients found."
      disabled={disabled}
      className={className}
    />
  );
}
