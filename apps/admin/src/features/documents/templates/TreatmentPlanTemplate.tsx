/**
 * Treatment Plan Document Template
 *
 * Per DENTO_V2_MASTER_PLAN.md §15 — Document Templates
 * Uses <ClinicHeader /> with doctor info
 * Reference: TP-XXXX
 */

import { ClinicHeader } from '@dento/ui';
import type { ClinicHeaderBranding, ClinicHeaderDoctor } from '@dento/ui';
import { formatCurrency } from '@/lib/currency.js';
import { useTranslation } from '../../../stores/locale.store.js';

export type TreatmentPlanItemStatus =
  | 'pending'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface TreatmentPlanItemData {
  procedure: string;
  tooth?: string;
  surface?: string;
  status: TreatmentPlanItemStatus;
  cost: number;
  discount: number;
  notes?: string;
}

export interface TreatmentPlanData {
  planNumber: string;
  date: string;
  patient: {
    name: string;
    age?: number;
    fileNumber?: string;
  };
  diagnosis?: string;
  items: TreatmentPlanItemData[];
  totalCost: number;
  totalDiscount: number;
  grandTotal: number;
  notes?: string;
}

interface TreatmentPlanTemplateProps {
  branding: ClinicHeaderBranding;
  doctor: ClinicHeaderDoctor;
  data: TreatmentPlanData;
}

export function TreatmentPlanTemplate({ branding, doctor, data }: TreatmentPlanTemplateProps) {
  const { t } = useTranslation();

  const STATUS_LABELS: Record<TreatmentPlanItemStatus, string> = {
    pending: t('documents.treatmentPlan.status.pending'),
    approved: t('documents.treatmentPlan.status.approved'),
    in_progress: t('documents.treatmentPlan.status.inProgress'),
    completed: t('documents.treatmentPlan.status.completed'),
    cancelled: t('documents.treatmentPlan.status.cancelled'),
  };
  return (
    <div className="treatment-plan-template mx-auto max-w-[210mm] bg-white p-8 text-sm print:p-0">
      {/* Header with Doctor */}
      <ClinicHeader branding={branding} doctor={doctor} showDoctor />

      {/* Plan Meta */}
      <div className="mt-6 flex justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold">{t('documents.treatmentPlan.title')}</h2>
          <p className="text-gray-600">{data.planNumber}</p>
        </div>
        <div className="text-end text-gray-600">
          <p>Date: {data.date}</p>
        </div>
      </div>

      {/* Patient Info */}
      <div className="mt-4 rounded bg-gray-50 p-3">
        <div className="flex gap-8">
          <div>
            <span className="font-semibold">{t('documents.treatmentPlan.patient')} </span>
            {data.patient.name}
          </div>
          {data.patient.age && (
            <div>
              <span className="font-semibold">{t('documents.treatmentPlan.age')} </span>
              {data.patient.age}
            </div>
          )}
          {data.patient.fileNumber && (
            <div>
              <span className="font-semibold">{t('documents.treatmentPlan.fileNumber')} </span>
              {data.patient.fileNumber}
            </div>
          )}
        </div>
      </div>

      {/* Diagnosis */}
      {data.diagnosis && (
        <div className="mt-4">
          <span className="font-semibold">{t('documents.treatmentPlan.diagnosis')} </span>
          <span>{data.diagnosis}</span>
        </div>
      )}

      {/* Treatment Items */}
      <table className="mt-6 w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-300 text-start">
            <th className="py-2">{t('documents.treatmentPlan.columns.number')}</th>
            <th className="py-2">{t('documents.treatmentPlan.columns.procedure')}</th>
            <th className="py-2 text-center">{t('documents.treatmentPlan.columns.tooth')}</th>
            <th className="py-2 text-center">{t('documents.treatmentPlan.columns.surface')}</th>
            <th className="py-2 text-center">{t('documents.treatmentPlan.columns.status')}</th>
            <th className="py-2 text-end">{t('documents.treatmentPlan.columns.cost')}</th>
            <th className="py-2 text-end">{t('documents.treatmentPlan.columns.discount')}</th>
            <th className="py-2 text-end">{t('documents.treatmentPlan.columns.net')}</th>
          </tr>
        </thead>
        <tbody>
          {(data.items ?? []).map((item, i) => (
            <tr key={i} className="border-b border-gray-200">
              <td className="py-2">{i + 1}</td>
              <td className="py-2">{item.procedure}</td>
              <td className="py-2 text-center">{item.tooth ?? '—'}</td>
              <td className="py-2 text-center">{item.surface ?? '—'}</td>
              <td className="py-2 text-center">
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    item.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : item.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-700'
                        : item.status === 'cancelled'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {STATUS_LABELS[item.status]}
                </span>
              </td>
              <td className="py-2 text-end">{formatCurrency(item.cost)}</td>
              <td className="py-2 text-end">
                {item.discount > 0 ? `-${formatCurrency(item.discount)}` : '—'}
              </td>
              <td className="py-2 text-end">{formatCurrency(item.cost - item.discount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-4 flex justify-end">
        <div className="w-64">
          <div className="flex justify-between py-1">
            <span>{t('documents.treatmentPlan.totals.totalCost')}</span>
            <span>{formatCurrency(data.totalCost)}</span>
          </div>
          {data.totalDiscount > 0 && (
            <div className="flex justify-between py-1 text-green-600">
              <span>{t('documents.treatmentPlan.totals.discount')}</span>
              <span>-{formatCurrency(data.totalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t-2 py-2 text-lg font-bold">
            <span>{t('documents.treatmentPlan.totals.grandTotal')}</span>
            <span>{formatCurrency(data.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {data.notes && (
        <div className="mt-6 rounded bg-gray-50 p-3 text-sm text-gray-600">
          <p className="font-semibold">{t('documents.treatmentPlan.notes')}</p>
          <p>{data.notes}</p>
        </div>
      )}

      {/* Signatures */}
      <div className="mt-16 flex justify-between">
        <div className="w-56 text-center">
          <div className="border-b border-gray-400 pb-1" />
          <p className="mt-1">{t('documents.treatmentPlan.patientSignature')}</p>
        </div>
        <div className="w-56 text-center">
          <div className="border-b border-gray-400 pb-1" />
          <p className="mt-1 font-semibold">{doctor.name.en}</p>
          {doctor.specialty && <p className="text-gray-600">{doctor.specialty.en}</p>}
        </div>
      </div>
    </div>
  );
}
