/**
 * Patient Merge Service — Phase 4.3
 *
 * Re-points all owned records from `duplicateId` → `keepId`, then soft-deletes
 * the duplicate. Writes a CRITICAL audit log entry capturing the move so the
 * merge is fully traceable per HIPAA / GDPR.
 *
 * NOTE: this is intentionally a one-shot, irreversible operation. The
 * duplicate patient is marked `isActive: false` and tagged with
 * `mergedIntoId` so historical references remain intact.
 */

import type { Connection } from 'mongoose';
import { Types } from 'mongoose';
import { getPatientModel } from '../models/patient.model.js';
import { getAppointmentModel } from '../models/appointment.model.js';
import { getInvoiceModel } from '../models/invoice.model.js';
import { getTenantPaymentModel } from '../models/payment.model.js';
import { getPrescriptionModel } from '../models/prescription.model.js';
import { getXrayModel } from '../models/xray.model.js';
import { getLabOrderModel } from '../models/lab-order.model.js';
import { getTreatmentPlanModel } from '../models/treatment-plan.model.js';
import { getProcedureNoteModel } from '../models/procedure-note.model.js';
import { getDentalChartModel } from '../models/dental-chart.model.js';
import { getConsentFormModel } from '../models/consent-form.model.js';
import { getScanModel } from '../models/scan.model.js';
import { getCbctOrderModel } from '../models/cbct-order.model.js';
import { ApiError } from '../../utils/api-response.js';
import { AuditLogService } from './audit-log.service.js';
import { logger } from '../../utils/logger.js';

export interface MergeResult {
  keepId: string;
  duplicateId: string;
  moved: Record<string, number>;
}

export class PatientMergeService {
  private readonly tenantDb: Connection;
  private readonly tenantSlug: string;

  constructor(tenantDb: Connection) {
    this.tenantDb = tenantDb;
    this.tenantSlug = tenantDb.name?.replace('tenant_', '') || '';
  }

  async merge(keepId: string, duplicateId: string, actorId: string): Promise<MergeResult> {
    if (keepId === duplicateId) {
      throw ApiError.badRequest('keepId and duplicateId must differ');
    }

    const Patient = getPatientModel(this.tenantDb);

    const [keep, duplicate] = await Promise.all([
      Patient.findById(keepId).lean(),
      Patient.findById(duplicateId).lean(),
    ]);

    if (!keep) throw ApiError.notFound('Patient (keep)');
    if (!duplicate) throw ApiError.notFound('Patient (duplicate)');
    if ((duplicate as { mergedIntoId?: Types.ObjectId }).mergedIntoId) {
      throw new ApiError(409, 'ALREADY_MERGED', 'Duplicate patient has already been merged');
    }

    const oid = new Types.ObjectId(keepId);
    const dupOid = new Types.ObjectId(duplicateId);
    const filter = { patientId: dupOid };
    const update = { $set: { patientId: oid } };

    // Re-point every collection that references patientId. Each entry maps to
    // the model factory so we can iterate uniformly.
    const collections: Array<{ name: string; model: ReturnType<typeof getAppointmentModel> }> = [
      { name: 'appointments', model: getAppointmentModel(this.tenantDb) as never },
      { name: 'invoices', model: getInvoiceModel(this.tenantDb) as never },
      { name: 'payments', model: getTenantPaymentModel(this.tenantDb) as never },
      { name: 'prescriptions', model: getPrescriptionModel(this.tenantDb) as never },
      { name: 'xrays', model: getXrayModel(this.tenantDb) as never },
      { name: 'labOrders', model: getLabOrderModel(this.tenantDb) as never },
      { name: 'treatmentPlans', model: getTreatmentPlanModel(this.tenantDb) as never },
      { name: 'procedureNotes', model: getProcedureNoteModel(this.tenantDb) as never },
      { name: 'dentalCharts', model: getDentalChartModel(this.tenantDb) as never },
      { name: 'consentForms', model: getConsentFormModel(this.tenantDb) as never },
      { name: 'scans', model: getScanModel(this.tenantDb) as never },
      { name: 'cbctOrders', model: getCbctOrderModel(this.tenantDb) as never },
    ];

    const moved: Record<string, number> = {};
    for (const { name, model } of collections) {
      try {
        const res = await (
          model as { updateMany: (f: unknown, u: unknown) => Promise<{ modifiedCount?: number }> }
        ).updateMany(filter, update);
        moved[name] = res.modifiedCount ?? 0;
      } catch (err) {
        logger.warn({ err, collection: name }, 'Patient merge: failed to re-point collection');
        moved[name] = -1;
      }
    }

    // Soft-delete the duplicate and tag the merge target.
    await Patient.findByIdAndUpdate(duplicateId, {
      $set: {
        isActive: false,
        mergedIntoId: oid,
        mergedAt: new Date(),
        mergedBy: new Types.ObjectId(actorId),
        updatedBy: new Types.ObjectId(actorId),
      },
    });

    // Critical audit
    try {
      const audit = new AuditLogService(this.tenantDb);
      await audit.create({
        actorId,
        actorRole: 'staff',
        tenantSlug: this.tenantSlug,
        resourceType: 'patient',
        resourceId: duplicateId,
        action: 'update',
        description: `Patient merged: duplicate ${duplicateId} into ${keepId}`,
        oldValues: { patientId: duplicateId },
        newValues: { mergedIntoId: keepId, moved },
        ipAddress: '0.0.0.0',
        sensitivityLevel: 'critical',
        status: 'success',
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to write patient-merge audit');
    }

    return { keepId, duplicateId, moved };
  }
}
