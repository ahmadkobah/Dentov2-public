/**
 * Patient table column definitions — per BUILD_RULES §9.3.
 * Columns defined separately from table component.
 */

import type { PatientListItem } from '../hooks/usePatients.js';
import { Badge } from '@dento/ui';
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Button,
} from '@dento/ui';

// ── Display helpers ─────────────────────────────────────────

import { formatDate } from '@/lib/date.js';

function displayName(name: { en: string; ar?: string }, lang: 'en' | 'ar' = 'en'): string {
  return lang === 'ar' ? name.ar || name.en : name.en;
}

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const genderColors: Record<string, string> = {
  male: 'bg-primary/10 text-primary',
  female: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  other: 'bg-muted text-muted-foreground',
};

// ── Column Definitions (for @dento/ui DataTable) ────────────

export interface PatientColumnActions {
  onView: (patient: PatientListItem) => void;
  onEdit: (patient: PatientListItem) => void;
  onDelete: (patient: PatientListItem) => void;
}

export function getPatientColumns(
  actions: PatientColumnActions,
  lang: 'en' | 'ar' = 'en',
  t: (key: string) => string,
) {
  return [
    {
      id: 'patientCode',
      header: t('patients.col.code'),
      accessorKey: 'patientCode' as const,
      sortable: true,
      className: 'w-[100px]',
    },
    {
      id: 'firstName.en',
      header: t('patients.col.name'),
      sortable: true,
      accessorFn: (row: PatientListItem) =>
        `${displayName(row.firstName, lang)} ${displayName(row.lastName, lang)}`,
    },
    {
      id: 'gender',
      header: t('patients.col.gender'),
      accessorKey: 'gender' as const,
      cell: (value: unknown) => {
        const g = value as string;
        return (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${genderColors[g] || ''}`}
          >
            {t(`patients.filter.${g}`)}
          </span>
        );
      },
    },
    {
      id: 'age',
      header: t('patients.col.age'),
      accessorFn: (row: PatientListItem) => calculateAge(row.dateOfBirth),
      cell: (value: unknown) => `${value}`,
    },
    {
      id: 'phone',
      header: t('patients.col.phone'),
      accessorKey: 'phone' as const,
    },
    {
      id: 'source',
      header: t('patients.col.source'),
      accessorKey: 'source' as const,
      cell: (value: unknown) => {
        const s = ((value as string) ?? '').replace('_', ' ');
        return (
          <Badge variant="outline" className="capitalize">
            {s}
          </Badge>
        );
      },
    },
    {
      id: 'createdAt',
      header: t('patients.col.registered'),
      accessorKey: 'createdAt' as const,
      sortable: true,
      cell: (value: unknown) => formatDate(value as string),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-[50px]',
      cell: (_: unknown, row: PatientListItem) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t('patients.actionsMenu')}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => actions.onView(row)}>
              <Eye className="me-2 h-4 w-4" />
              {t('patients.action.view')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => actions.onEdit(row)}>
              <Edit className="me-2 h-4 w-4" />
              {t('patients.action.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => actions.onDelete(row)} className="text-destructive">
              <Trash2 className="me-2 h-4 w-4" />
              {t('patients.action.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
