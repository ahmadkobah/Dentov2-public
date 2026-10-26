import {
  usePrescriptionList,
  type Prescription,
  type PrescriptionItem,
} from '@/features/prescriptions/hooks/usePrescriptions.js';
import { Badge, Card, CardContent, DataTable, type ColumnDef } from '@dento/ui';
import { FileText } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDate } from '@/lib/date.js';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  active: 'default',
  dispensed: 'secondary',
  cancelled: 'destructive',
};

export default function PatientPrescriptions({ patientId }: { patientId: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = usePrescriptionList({ patientId, limit: 50 });
  const items = data?.items ?? [];

  const columns: ColumnDef<Prescription>[] = useMemo(
    () => [
      {
        id: 'prescriptionNumber',
        accessorKey: 'prescriptionNumber',
        header: t('patients.prescriptions.col.rxNumber'),
        cell: (_v: unknown, row: Prescription) => (
          <span className="font-mono text-sm">{row.prescriptionNumber}</span>
        ),
      },
      {
        id: 'items',
        accessorKey: 'items',
        header: t('patients.prescriptions.col.medications'),
        cell: (_v: unknown, row: Prescription) => (
          <div className="text-sm">
            <span className="font-medium">{row.items?.length ?? 0} medication(s)</span>
            {(row.items?.length ?? 0) > 0 && (
              <div className="text-muted-foreground max-w-[250px] truncate">
                {row.items.map((i: PrescriptionItem) => i.medicationName).join(', ')}
              </div>
            )}
          </div>
        ),
      },
      {
        id: 'diagnosis',
        accessorKey: 'diagnosis',
        header: t('patients.prescriptions.col.diagnosis'),
        cell: (_v: unknown, row: Prescription) => (
          <span className="text-muted-foreground text-sm">{row.diagnosis || '—'}</span>
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: t('patients.prescriptions.col.status'),
        cell: (_v: unknown, row: Prescription) => (
          <Badge variant={STATUS_COLORS[row.status] ?? 'outline'} className="capitalize">
            {row.status}
          </Badge>
        ),
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: t('patients.prescriptions.col.date'),
        cell: (_v: unknown, row: Prescription) => formatDate(row.createdAt),
      },
    ],
    [],
  );

  if (!isLoading && items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
          {t('patients.prescriptions.empty')}
        </CardContent>
      </Card>
    );
  }

  return <DataTable columns={columns} data={items} isLoading={isLoading} />;
}
