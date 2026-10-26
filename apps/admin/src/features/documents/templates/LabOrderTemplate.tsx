/**
 * Lab Order Document Template
 *
 * Per DENTO_V2_MASTER_PLAN.md §15 — Document Templates
 * Uses <ClinicHeader /> with doctor info (no specialty/license)
 * Reference: LO-XXXX
 */

import { ClinicHeader } from '@dento/ui';
import type { ClinicHeaderBranding, ClinicHeaderDoctor } from '@dento/ui';
import { formatCurrency } from '@/lib/currency.js';
import { useTranslation } from '../../../stores/locale.store.js';

export type LabOrderStatus =
  | 'draft'
  | 'sent'
  | 'in_progress'
  | 'ready'
  | 'delivered'
  | 'rejected'
  | 'cancelled';

export interface LabOrderData {
  orderNumber: string;
  date: string;
  expectedDeliveryDate?: string;
  patient: {
    name: string;
    fileNumber?: string;
  };
  lab: {
    name: string;
    contactPerson?: string;
    phone?: string;
  };
  orderType: string;
  toothNumbers: number[];
  shade?: string;
  material?: string;
  description?: string;
  specialInstructions?: string;
  status: LabOrderStatus;
  cost?: number;
}

interface LabOrderTemplateProps {
  branding: ClinicHeaderBranding;
  doctor: ClinicHeaderDoctor;
  data: LabOrderData;
}

const STATUS_COLORS: Record<LabOrderStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  ready: 'bg-green-100 text-green-700',
  delivered: 'bg-green-200 text-green-800',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-200 text-red-800',
};

export function LabOrderTemplate({ branding, doctor, data }: LabOrderTemplateProps) {
  const { t } = useTranslation();

  return (
    <div className="lab-order-template mx-auto max-w-[210mm] bg-white p-8 text-sm print:p-0">
      {/* Header with Doctor (no specialty/license per spec) */}
      <ClinicHeader branding={branding} doctor={doctor} showDoctor />

      {/* Order Meta */}
      <div className="mt-6 flex justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold">{t('documents.labOrder.title')}</h2>
          <p className="text-gray-600">{data.orderNumber}</p>
          <span
            className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[data.status]}`}
          >
            {data.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        <div className="text-end text-gray-600">
          <p>
            {t('documents.labOrder.orderDate')} {data.date}
          </p>
          {data.expectedDeliveryDate && (
            <p>
              {t('documents.labOrder.expected')} {data.expectedDeliveryDate}
            </p>
          )}
        </div>
      </div>

      {/* Two-column: Patient + Lab */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded bg-gray-50 p-3">
          <p className="font-semibold">{t('documents.labOrder.patient')}</p>
          <p>{data.patient.name}</p>
          {data.patient.fileNumber && (
            <p className="text-gray-600">
              {t('documents.labOrder.fileNumber')} {data.patient.fileNumber}
            </p>
          )}
        </div>
        <div className="rounded bg-gray-50 p-3">
          <p className="font-semibold">{t('documents.labOrder.dentalLab')}</p>
          <p>{data.lab.name}</p>
          {data.lab.contactPerson && <p className="text-gray-600">{data.lab.contactPerson}</p>}
          {data.lab.phone && <p className="text-gray-600">{data.lab.phone}</p>}
        </div>
      </div>

      {/* Order Details */}
      <div className="mt-6 space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-semibold">{t('documents.labOrder.orderType')} </span>
            <span>{data.orderType}</span>
          </div>
          <div>
            <span className="font-semibold">{t('documents.labOrder.toothTeeth')} </span>
            <span>{data.toothNumbers.length > 0 ? data.toothNumbers.join(', ') : '—'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {data.shade && (
            <div>
              <span className="font-semibold">{t('documents.labOrder.shade')} </span>
              <span>{data.shade}</span>
            </div>
          )}
          {data.material && (
            <div>
              <span className="font-semibold">{t('documents.labOrder.material')} </span>
              <span>{data.material}</span>
            </div>
          )}
        </div>

        {data.description && (
          <div>
            <span className="font-semibold">{t('documents.labOrder.description')} </span>
            <span>{data.description}</span>
          </div>
        )}

        {data.specialInstructions && (
          <div className="rounded border border-yellow-300 bg-yellow-50 p-3">
            <p className="font-semibold">{t('documents.labOrder.specialInstructions')}</p>
            <p>{data.specialInstructions}</p>
          </div>
        )}

        {data.cost !== undefined && (
          <div className="text-end text-lg font-bold">
            {t('documents.labOrder.cost')} {formatCurrency(data.cost)}
          </div>
        )}
      </div>

      {/* Doctor Signature */}
      <div className="mt-16 flex justify-end">
        <div className="w-64 text-center">
          <div className="border-b border-gray-400 pb-1" />
          <p className="mt-1 font-semibold">{doctor.name.en}</p>
        </div>
      </div>
    </div>
  );
}
