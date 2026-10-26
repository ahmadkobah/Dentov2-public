/**
 * ViewConsentFormModal — Read-only view of a signed consent form.
 * Includes print functionality via window.print().
 */

import { useRef } from 'react';
import { X, Printer, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, toast } from '@dento/ui';
import { useThemeStore } from '@/stores/theme.store.js';
import { useBrandingStore } from '@/stores/branding.store.js';
import { formatDateTime } from '@/lib/date.js';
import { useDirectUpload } from '@/features/uploads/hooks/useUpload.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { useUpdateConsentPdfUrl, type ConsentForm } from '../hooks/useConsent.js';
import { ConsentFormPDF, generateConsentPdfBlob } from './ConsentFormPDF.js';
import { printPdfBlob } from '@/lib/print.js';

interface ViewConsentFormModalProps {
  open: boolean;
  onClose: () => void;
  form: ConsentForm | null;
}

export function ViewConsentFormModal({ open, onClose, form }: ViewConsentFormModalProps) {
  const locale = useThemeStore((s) => s.locale);
  const branding = useBrandingStore();
  const lang = locale === 'ar' ? 'ar' : 'en';
  const printRef = useRef<HTMLDivElement>(null);
  const { upload, isUploading } = useDirectUpload();
  const updatePdfUrlMutation = useUpdateConsentPdfUrl();
  const { t } = useTranslation();

  if (!open || !form) return null;

  const patientName = form.patient
    ? `${form.patient.firstName.en} ${form.patient.lastName.en}`
    : form.patientId;

  const doctorName = form.doctor
    ? `Dr. ${form.doctor.firstName} ${form.doctor.lastName}`
    : form.doctorId;

  const templateName = form.template?.name?.[lang] || form.template?.name?.en || 'N/A';
  const procedureType = form.template?.procedureType || 'N/A';
  const consentText = form.template?.content?.[lang] || form.template?.content?.en || '';
  const risksText = form.template?.risks?.[lang] || form.template?.risks?.en || '';

  const signedDate = formatDateTime(form.signedAt);
  const clinicName = branding.clinicName?.en || 'Dento Clinic';
  const clinicAddress = branding.address?.main?.en || '';
  const clinicPhone = branding.phone || '';
  const logoUrl = branding.logoUrl || branding.logoDarkUrl;
  const patientPhone = form.patient?.phone || '';

  const handlePrint = async () => {
    try {
      const blob = await generateConsentPdfBlob({
        form,
        clinicName,
        clinicAddress,
        clinicPhone,
        logoUrl,
        patientName,
        doctorName,
        templateName,
        procedureType,
        signedDate,
        consentText,
        risksText,
      });
      await printPdfBlob(blob);
    } catch {
      toast.error('Failed to prepare consent PDF for printing');
    }
  };

  const normalizePhone = (phone: string): string => phone.replace(/[^\d+]/g, '');

  const handleWhatsAppSend = async () => {
    if (!patientPhone) {
      toast.error('Patient phone is missing');
      return;
    }

    try {
      const pdfBlob = await generateConsentPdfBlob({
        form,
        clinicName,
        clinicAddress,
        clinicPhone,
        logoUrl,
        patientName,
        doctorName,
        templateName,
        procedureType,
        signedDate,
        consentText,
        risksText,
      });

      const pdfFile = new File([pdfBlob], `consent-${form._id}.pdf`, {
        type: 'application/pdf',
      });

      const uploaded = await upload(pdfFile, 'document');

      await updatePdfUrlMutation.mutateAsync({
        id: form._id,
        pdfUrl: uploaded.url,
      });

      const message = encodeURIComponent(`Consent form for ${patientName}: ${uploaded.url}`);
      const phone = normalizePhone(patientPhone);
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
      toast.success('WhatsApp message prepared with consent PDF link');
    } catch {
      toast.error('Failed to prepare consent PDF for WhatsApp');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10 backdrop-blur-sm">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">{t('consent.view.title')}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleWhatsAppSend}
              disabled={isUploading || updatePdfUrlMutation.isPending}
            >
              <MessageCircle className="me-2 h-4 w-4" />
              {isUploading || updatePdfUrlMutation.isPending ? 'Preparing...' : 'Send WhatsApp'}
            </Button>
            <ConsentFormPDF
              form={form}
              clinicName={clinicName}
              clinicAddress={clinicAddress}
              clinicPhone={clinicPhone}
              logoUrl={logoUrl}
              patientName={patientName}
              doctorName={doctorName}
              templateName={templateName}
              procedureType={procedureType}
              signedDate={signedDate}
              consentText={consentText}
              risksText={risksText}
            />
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="me-2 h-4 w-4" />
              {t('consent.view.printBtn')}
            </Button>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5" ref={printRef}>
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
            <div>
              <p className="text-xs font-medium text-gray-500">{t('consent.view.patient')}</p>
              <p className="text-sm font-semibold">{patientName}</p>
              {form.patient?.patientCode && (
                <p className="text-xs text-gray-400">#{form.patient.patientCode}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">{t('consent.view.doctor')}</p>
              <p className="text-sm font-semibold">{doctorName}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">{t('consent.view.template')}</p>
              <p className="text-sm font-semibold">{templateName}</p>
              <Badge variant="outline" className="mt-1 text-xs">
                {procedureType}
              </Badge>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">{t('consent.view.signedAt')}</p>
              <p className="text-sm font-semibold">{signedDate}</p>
            </div>
          </div>

          {/* Printable content (hidden data for print extraction) */}
          <div data-print-content>
            {/* Consent Content */}
            {form.template && (
              <div className="section">
                <h3 className="section-title mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('consent.view.contentTitle')}
                </h3>
                <div className="rounded-lg border bg-gray-50 p-4 text-sm leading-relaxed whitespace-pre-wrap dark:bg-gray-800">
                  {form.template.name?.[lang] || form.template.name?.en || ''}
                </div>
              </div>
            )}

            {/* Signature */}
            <div className="signature-block mt-4">
              <h3 className="section-title mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('consent.view.signatureTitle')}
              </h3>
              {form.patientSignature ? (
                <div className="inline-block rounded-lg border bg-white p-2">
                  <img
                    src={form.patientSignature}
                    alt="Patient Signature"
                    className="h-auto max-w-75"
                  />
                </div>
              ) : (
                <Badge variant="secondary">{t('consent.view.noSignature')}</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
