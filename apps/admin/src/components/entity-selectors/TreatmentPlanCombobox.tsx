/**
 * TreatmentPlanCombobox — Searchable treatment plan selector.
 * Optionally filter by patientId for context-aware selection.
 */

import { useMemo } from 'react';
import { SearchCombobox, type SearchComboboxOption } from '@dento/ui';
import { useTreatmentPlanList } from '@/features/treatment-plans/hooks/useTreatmentPlans.js';

interface TreatmentPlanComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  /** When set, only shows plans belonging to this patient */
  patientId?: string;
  disabled?: boolean;
  className?: string;
}

export function TreatmentPlanCombobox({
  value,
  onValueChange,
  patientId,
  disabled,
  className,
}: TreatmentPlanComboboxProps) {
  const { data } = useTreatmentPlanList({
    patientId: patientId || undefined,
    limit: 100,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const options: SearchComboboxOption[] = useMemo(() => {
    if (!data?.plans) return [];
    return data.plans.map((p) => ({
      value: p._id,
      label: p.title,
      description: `${p.status} — $${p.finalCost.toFixed(2)}`,
    }));
  }, [data?.plans]);

  return (
    <SearchCombobox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder="Select treatment plan..."
      searchPlaceholder="Search by title..."
      emptyMessage={patientId ? 'No plans for this patient.' : 'No treatment plans found.'}
      disabled={disabled}
      className={className}
    />
  );
}
