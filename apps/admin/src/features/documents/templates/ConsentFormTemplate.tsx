/**
 * Consent Form Document Template
 *
 * Per DENTO_V2_MASTER_PLAN.md §15 — Document Templates
 * Uses <ClinicHeader /> — no doctor in header (doctor signs at bottom)
 * Reference: CF-XXXX
 */

import { ClinicHeader } from '@dento/ui';
import type { ClinicHeaderBranding } from '@dento/ui';
import { useTranslation } from '../../../stores/locale.store.js';

export interface ConsentFormData {
  consentNumber: string;
  date: string;
  patient: {
    name: string;
    age?: number;
    fileNumber?: string;
  };
  templateName: string;
  content: string;
  risks: string[];
  doctorName: string;
  doctorSpecialty?: string;
  patientSignature?: string;
  witnessSignature?: string;
  signedAt?: string;
}

interface ConsentFormTemplateProps {
  branding: ClinicHeaderBranding;
  data: ConsentFormData;
}

export function ConsentFormTemplate({ branding, data }: ConsentFormTemplateProps) {
  const { t } = useTranslation();

  return (
    <div className="consent-form-template mx-auto max-w-[210mm] bg-white p-8 text-sm print:p-0">
      {/* Header (no doctor) */}
      <ClinicHeader branding={branding} />

      {/* Consent Meta */}
      <div className="mt-6 flex justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold">{t('documents.consentForm.title')}</h2>
          <p className="text-gray-600">{data.consentNumber}</p>
        </div>
        <div className="text-end text-gray-600">
          <p>
            {t('documents.consentForm.date')} {data.date}
          </p>
        </div>
      </div>

      {/* Patient Info */}
      <div className="mt-4 rounded bg-gray-50 p-3">
        <div className="flex gap-8">
          <div>
            <span className="font-semibold">{t('documents.consentForm.patient')} </span>
            {data.patient.name}
          </div>
          {data.patient.age && (
            <div>
              <span className="font-semibold">{t('documents.consentForm.age')} </span>
              {data.patient.age}
            </div>
          )}
          {data.patient.fileNumber && (
            <div>
              <span className="font-semibold">{t('documents.consentForm.fileNumber')} </span>
              {data.patient.fileNumber}
            </div>
          )}
        </div>
      </div>

      {/* Procedure / Template Name */}
      <div className="mt-4">
        <h3 className="text-lg font-semibold">{data.templateName}</h3>
      </div>

      {/* Consent Content */}
      <div className="mt-4 whitespace-pre-wrap leading-relaxed">{data.content}</div>

      {/* Risks */}
      {(data.risks?.length ?? 0) > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold">{t('documents.consentForm.risksTitle')}</h4>
          <ul className="mt-2 list-disc space-y-1 ps-6">
            {data.risks.map((risk, i) => (
              <li key={i}>{risk}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Consent Statement */}
      <div className="mt-6 rounded border border-gray-300 bg-gray-50 p-4">
        <p>{t('documents.consentForm.consentStatement')}</p>
      </div>

      {/* Signatures */}
      <div className="mt-12 flex justify-between">
        {/* Patient Signature */}
        <div className="w-56 text-center">
          {data.patientSignature ? (
            <img
              src={data.patientSignature}
              alt="Patient signature"
              className="mx-auto h-16 object-contain"
            />
          ) : (
            <div className="h-16 border-b border-gray-400" />
          )}
          <p className="mt-1 font-semibold">{data.patient.name}</p>
          <p className="text-gray-600">{t('documents.consentForm.patientSignature')}</p>
          {data.signedAt && <p className="text-xs text-gray-400">{data.signedAt}</p>}
        </div>

        {/* Witness Signature */}
        <div className="w-56 text-center">
          {data.witnessSignature ? (
            <img
              src={data.witnessSignature}
              alt="Witness signature"
              className="mx-auto h-16 object-contain"
            />
          ) : (
            <div className="h-16 border-b border-gray-400" />
          )}
          <p className="mt-1">{t('documents.consentForm.witness')}</p>
        </div>
      </div>

      {/* Doctor Info (bottom) */}
      <div className="mt-8 text-end text-gray-600">
        <p>
          <span className="font-semibold">{t('documents.consentForm.treatingDoctor')} </span>
          {data.doctorName}
        </p>
        {data.doctorSpecialty && <p>{data.doctorSpecialty}</p>}
      </div>
    </div>
  );
}
