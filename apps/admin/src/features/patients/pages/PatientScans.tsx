import { usePatientScans } from '@/features/scans/hooks/useScan.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDate } from '@/lib/date.js';
import { Badge, Card, CardContent } from '@dento/ui';
import { Box } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  uploaded: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ready: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const SCAN_TYPE_LABELS: Record<string, string> = {
  full_arch: 'Full Arch',
  upper_arch: 'Upper Arch',
  lower_arch: 'Lower Arch',
  bite_registration: 'Bite Registration',
  single_tooth: 'Single Tooth',
  other: 'Other',
};

export default function PatientScans({ patientId }: { patientId: string }) {
  const { t } = useTranslation();
  const { data: scans = [] } = usePatientScans(patientId);

  if (scans.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t('scans.empty.title')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {scans.map((scan) => (
        <Card key={scan._id}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Box className="h-4 w-4 text-muted-foreground" />
                {scan.scanNumber}
              </div>
              <div className="text-sm text-muted-foreground">
                {SCAN_TYPE_LABELS[scan.scanType] ?? scan.scanType}
                {scan.scannerModel && <span className="ms-2">— {scan.scannerModel}</span>}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDate(scan.createdAt)}
                {scan.formats.length > 0 && ` · ${scan.formats.join(', ')}`}
              </div>
            </div>
            <Badge className={STATUS_COLORS[scan.status] ?? ''}>{scan.status}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
