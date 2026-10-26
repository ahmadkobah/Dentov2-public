/**
 * Prescription Document Template
 *
 * Per DENTO_V2_MASTER_PLAN.md §15 — Document Templates
 * Uses <ClinicHeader /> with doctor info + license
 * Reference: RX-XXXX
 */

import { ClinicHeader } from '@dento/ui';
import type { ClinicHeaderBranding, ClinicHeaderDoctor } from '@dento/ui';
import { useTranslation } from '../../../stores/locale.store.js';

export interface PrescriptionItem {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface PrescriptionData {
  prescriptionNumber: string;
  date: string;
  patient: {
    name: string;
    age?: number;
    gender?: string;
    fileNumber?: string;
  };
  diagnosis?: string;
  items: PrescriptionItem[];
  notes?: string;
}

interface PrescriptionTemplateProps {
  branding: ClinicHeaderBranding;
  doctor: ClinicHeaderDoctor;
  data: PrescriptionData;
}

export function PrescriptionTemplate({ branding, doctor, data }: PrescriptionTemplateProps) {
  const { t } = useTranslation();

  return (
    <div className="prescription-template mx-auto max-w-[210mm] bg-white p-8 text-sm print:p-0">
      {/* Header with Doctor */}
      <ClinicHeader branding={branding} doctor={doctor} showDoctor />

      {/* Rx Meta */}
      <div className="mt-6 flex justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold">{t('documents.prescription.title')}</h2>
          <p className="text-gray-600">{data.prescriptionNumber}</p>
        </div>
        <div className="text-end text-gray-600">
          <p>
            {t('documents.prescription.date')} {data.date}
          </p>
        </div>
      </div>

      {/* Patient Info */}
      <div className="mt-4 rounded bg-gray-50 p-3">
        <div className="flex gap-8">
          <div>
            <span className="font-semibold">{t('documents.prescription.patient')} </span>
            {data.patient.name}
          </div>
          {data.patient.age && (
            <div>
              <span className="font-semibold">{t('documents.prescription.age')} </span>
              {data.patient.age}
            </div>
          )}
          {data.patient.gender && (
            <div>
              <span className="font-semibold">{t('documents.prescription.gender')} </span>
              {data.patient.gender}
            </div>
          )}
          {data.patient.fileNumber && (
            <div>
              <span className="font-semibold">{t('documents.prescription.fileNumber')} </span>
              {data.patient.fileNumber}
            </div>
          )}
        </div>
      </div>

      {/* Diagnosis */}
      {data.diagnosis && (
        <div className="mt-4">
          <span className="font-semibold">{t('documents.prescription.diagnosis')} </span>
          <span>{data.diagnosis}</span>
        </div>
      )}

      {/* Medications */}
      <div className="mt-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300 text-start">
              <th className="py-2">{t('documents.prescription.columns.number')}</th>
              <th className="py-2">{t('documents.prescription.columns.medication')}</th>
              <th className="py-2">{t('documents.prescription.columns.dosage')}</th>
              <th className="py-2">{t('documents.prescription.columns.frequency')}</th>
              <th className="py-2">{t('documents.prescription.columns.duration')}</th>
              <th className="py-2">{t('documents.prescription.columns.instructions')}</th>
            </tr>
          </thead>
          <tbody>
            {(data.items ?? []).map((item, i) => (
              <tr key={i} className="border-b border-gray-200">
                <td className="py-2">{i + 1}</td>
                <td className="py-2 font-medium">{item.medication}</td>
                <td className="py-2">{item.dosage}</td>
                <td className="py-2">{item.frequency}</td>
                <td className="py-2">{item.duration}</td>
                <td className="py-2 text-gray-600">{item.instructions ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {data.notes && (
        <div className="mt-6 rounded bg-yellow-50 p-3 text-sm">
          <p className="font-semibold">{t('documents.prescription.notes')}</p>
          <p>{data.notes}</p>
        </div>
      )}

      {/* Doctor Signature */}
      <div className="mt-16 flex justify-end">
        <div className="w-64 text-center">
          <div className="border-b border-gray-400 pb-1" />
          <p className="mt-1 font-semibold">{doctor.name.en}</p>
          {doctor.specialty && <p className="text-gray-600">{doctor.specialty.en}</p>}
          {doctor.licenseNumber && (
            <p className="text-gray-600">
              {t('documents.prescription.license')} {doctor.licenseNumber}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
