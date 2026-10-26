import { useConsentFormsByPatient } from '@/features/consent/hooks/useConsent.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDate } from '@/lib/date.js';
import { Badge, Card, CardContent } from '@dento/ui';
import { ShieldCheck } from 'lucide-react';

export default function PatientConsentForms({ patientId }: { patientId: string }) {
  const { t } = useTranslation();
  const { data: forms = [] } = useConsentFormsByPatient(patientId);

  if (forms.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t('patients.consentForms.empty')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {forms.map((form) => (
        <Card key={form._id}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                {t('patients.consentForms.title')}
              </div>
              <div className="text-xs text-muted-foreground">
                Signed: {formatDate(form.signedAt)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-green-700 border-green-300 dark:text-green-400 dark:border-green-700"
              >
                {t('patients.consentForms.signed')}
              </Badge>
              {form.pdfUrl && (
                <a
                  href={form.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline"
                >
                  {t('patients.consentForms.viewPdf')}
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
