import { useAppointmentList } from '@/features/appointments/hooks/useAppointments.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDate } from '@/lib/date.js';
import { Badge, Card, CardContent } from '@dento/ui';
import { Calendar, Clock } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  completed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'no-show': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'checked-in': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
};

export default function PatientAppointments({ patientId }: { patientId: string }) {
  const { t } = useTranslation();
  const { data } = useAppointmentList({
    patientId,
    page: 1,
    limit: 50,
    sortBy: 'date',
    sortOrder: 'desc',
  });
  const appointments = data?.appointments ?? [];

  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t('patients.appointments.empty')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((apt) => (
        <Card key={apt._id}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {formatDate(apt.date)}
                <Clock className="ms-2 h-4 w-4 text-muted-foreground" />
                {apt.startTime} – {apt.endTime}
              </div>
              <div className="text-sm text-muted-foreground">
                Dr. {apt.doctor?.firstName ?? ''} {apt.doctor?.lastName ?? ''}
                {apt.reason && <span className="ms-2">— {apt.reason}</span>}
              </div>
            </div>
            <Badge className={STATUS_COLORS[apt.status] ?? ''}>{apt.status}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
