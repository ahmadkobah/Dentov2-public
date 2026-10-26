import { usePatientCbctTimeline } from '@/features/cbct/hooks/useCbct.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDate } from '@/lib/date.js';
import { Badge, Card, CardContent } from '@dento/ui';
import { ScanLine } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  requested: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  reported: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function PatientCbct({ patientId }: { patientId: string }) {
  const { t } = useTranslation();
  const { data: orders = [] } = usePatientCbctTimeline(patientId);

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t('patients.cbct.empty')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Card key={order._id}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ScanLine className="h-4 w-4 text-muted-foreground" />
                {order.orderNumber}
              </div>
              <div className="text-sm text-muted-foreground">
                {order.indication}
                {order.clinicalPurpose && <span className="ms-2">— {order.clinicalPurpose}</span>}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDate(order.createdAt)}
                {order.scheduledDate && ` · Scheduled: ${formatDate(order.scheduledDate)}`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {order.priority}
              </Badge>
              <Badge className={STATUS_COLORS[order.status] ?? ''}>{order.status}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
