/**
 * ViewPrescriptionModal — Clean read-only view of a prescription with print.
 */

import { useState } from 'react';
import { X, Printer, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, toast } from '@dento/ui';
import { formatDate } from '@/lib/date.js';
import { useBrandingStore } from '@/stores/branding.store.js';
import type { Prescription } from '../hooks/usePrescriptions.js';
import { useTranslation } from '../../../stores/locale.store.js';
import PrescriptionPDF, { generatePrescriptionPdfBlob } from './PrescriptionPDF.js';
import { useDirectUpload } from '@/features/uploads/hooks/useUpload.js';
import { printPdfBlob } from '@/lib/print.js';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  active: 'default',
  dispensed: 'secondary',
  cancelled: 'destructive',
};

interface ViewPrescriptionModalProps {
  open: boolean;
  onClose: () => void;
  prescription: Prescription | null;
}

export function ViewPrescriptionModal({ open, onClose, prescription }: ViewPrescriptionModalProps) {
  const { t } = useTranslation();
  const branding = useBrandingStore();
  const { upload, isUploading } = useDirectUpload();
  const [isSendingWA, setIsSendingWA] = useState(false);

  if (!open || !prescription) return null;

  const rx = prescription;
  const createdDate = formatDate(rx.createdAt);
  const clinicName = branding.clinicName?.en || 'Dento Clinic';
  const clinicAddress = branding.address?.main?.en || '';
  const clinicPhone = branding.phone || '';

  const pdfData = {
    prescriptionNumber: rx.prescriptionNumber,
    issueDate: rx.createdAt,
    patientName:
      typeof rx.patientId === 'object'
        ? `${rx.patientId.firstName.en} ${rx.patientId.lastName.en}`
        : String(rx.patientId),
    doctorName: String(rx.doctorId),
    diagnosis: rx.diagnosis,
    notes: rx.notes,
    medications: rx.items.map((item) => ({
      _id: item._id,
      medicationName: item.medicationName,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
      quantity: item.quantity,
    })),
  };

  const handlePrint = async () => {
    try {
      const blob = await generatePrescriptionPdfBlob({
        data: pdfData,
        clinicName,
        clinicAddress,
        clinicPhone,
      });
      await printPdfBlob(blob);
    } catch {
      toast.error('Failed to prepare prescription PDF for printing');
    }
  };

  const normalizePhone = (phone: string) => phone.replace(/[^\d+]/g, '');

  const handleWhatsApp = async () => {
    const patient = typeof rx.patientId === 'object' ? rx.patientId : null;
    const patientPhone = patient?.phone;

    if (!patientPhone) {
      toast.error('Patient phone is missing');
      return;
    }

    setIsSendingWA(true);
    try {
      const blob = await generatePrescriptionPdfBlob({
        data: pdfData,
        clinicName,
        clinicAddress,
        clinicPhone,
      });
      const file = new File([blob], `${rx.prescriptionNumber}.pdf`, {
        type: 'application/pdf',
      });
      const uploaded = await upload(file, 'document');
      const msg = encodeURIComponent(`Prescription ${rx.prescriptionNumber}: ${uploaded.url}`);
      window.open(`https://wa.me/${normalizePhone(patientPhone)}?text=${msg}`, '_blank');
      toast.success('WhatsApp message prepared with prescription PDF');
    } catch {
      toast.error('Failed to prepare prescription for WhatsApp');
    } finally {
      setIsSendingWA(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8 backdrop-blur-sm">
      <Card className="w-full max-w-2xl">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
          <div>
            <CardTitle className="text-lg font-semibold">
              {t('prescriptions.view.rxNumber', { number: rx.prescriptionNumber })}
            </CardTitle>
            <p className="text-muted-foreground mt-0.5 text-sm">{createdDate}</p>
          </div>
          <div className="flex items-center gap-2">
            <PrescriptionPDF
              data={pdfData}
              clinicName={clinicName}
              clinicAddress={clinicAddress}
              clinicPhone={clinicPhone}
            />
            <Button variant="outline" size="sm" onClick={handlePrint} data-print-rx>
              <Printer className="me-1.5 h-4 w-4" />
              {t('prescriptions.view.print')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleWhatsApp}
              disabled={isUploading || isSendingWA}
            >
              <MessageCircle className="me-1.5 h-4 w-4" />
              {isUploading || isSendingWA ? 'Preparing...' : 'WhatsApp'}
            </Button>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-5">
          {/* Status & Diagnosis row */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm font-medium">
                {t('prescriptions.view.status')}
              </span>
              <Badge variant={STATUS_COLORS[rx.status] ?? 'outline'} className="capitalize">
                {rx.status}
              </Badge>
            </div>
            {rx.diagnosis && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm font-medium">
                  {t('prescriptions.view.diagnosis')}
                </span>
                <span className="text-sm font-medium">{rx.diagnosis}</span>
              </div>
            )}
          </div>

          {/* Medications table */}
          <div>
            <h4 className="mb-3 text-sm font-semibold">
              {t('prescriptions.view.medications')}
              <span className="text-muted-foreground ms-1 font-normal">({rx.items.length})</span>
            </h4>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground border-b text-start text-xs font-medium">
                    <th className="px-3 py-2.5">{t('prescriptions.view.col.index')}</th>
                    <th className="px-3 py-2.5">{t('prescriptions.view.col.medication')}</th>
                    <th className="px-3 py-2.5">{t('prescriptions.view.col.dosage')}</th>
                    <th className="px-3 py-2.5">{t('prescriptions.view.col.frequency')}</th>
                    <th className="px-3 py-2.5">{t('prescriptions.view.col.duration')}</th>
                    <th className="px-3 py-2.5">{t('prescriptions.view.col.qty')}</th>
                    <th className="px-3 py-2.5">{t('prescriptions.view.col.instructions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rx.items.map((item, i) => (
                    <tr key={item._id || i} className="hover:bg-muted/30 transition-colors">
                      <td className="text-muted-foreground px-3 py-2.5">{i + 1}</td>
                      <td className="px-3 py-2.5 font-medium">{item.medicationName}</td>
                      <td className="px-3 py-2.5">{item.dosage || '—'}</td>
                      <td className="px-3 py-2.5">{item.frequency || '—'}</td>
                      <td className="px-3 py-2.5">{item.duration || '—'}</td>
                      <td className="px-3 py-2.5">{item.quantity || 1}</td>
                      <td className="text-muted-foreground px-3 py-2.5 text-xs">
                        {item.instructions || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {rx.notes && (
            <div>
              <h4 className="mb-1.5 text-sm font-semibold">{t('prescriptions.view.notes')}</h4>
              <p className="bg-muted/30 text-muted-foreground rounded-md border p-3 text-sm">
                {rx.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
