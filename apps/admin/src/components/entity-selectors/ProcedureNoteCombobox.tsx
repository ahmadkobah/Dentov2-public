/**
 * ProcedureNoteCombobox — Searchable procedure note selector.
 * Optionally filter by patientId for context-aware selection.
 */

import { useMemo } from 'react';
import { SearchCombobox, type SearchComboboxOption } from '@dento/ui';
import { useProcedureNoteList } from '@/features/procedure-notes/hooks/useProcedureNotes.js';
import { formatDate } from '@/lib/date.js';

interface ProcedureNoteComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  /** When set, only shows notes belonging to this patient */
  patientId?: string;
  disabled?: boolean;
  className?: string;
}

export function ProcedureNoteCombobox({
  value,
  onValueChange,
  patientId,
  disabled,
  className,
}: ProcedureNoteComboboxProps) {
  const { data } = useProcedureNoteList({
    patientId: patientId || undefined,
    limit: 100,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const options: SearchComboboxOption[] = useMemo(() => {
    if (!data?.notes) return [];
    return data.notes.map((n) => ({
      value: n._id,
      label: n.procedureName,
      description: formatDate(n.createdAt),
    }));
  }, [data?.notes]);

  return (
    <SearchCombobox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder="Select procedure note..."
      searchPlaceholder="Search by procedure name..."
      emptyMessage={patientId ? 'No notes for this patient.' : 'No procedure notes found.'}
      disabled={disabled}
      className={className}
    />
  );
}
