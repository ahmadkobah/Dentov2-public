import type { Connection, QueryFilter } from 'mongoose';
import type { IPrescription } from '../models/prescription.model.js';
import { getPrescriptionModel } from '../models/prescription.model.js';
import { getPatientModel } from '../models/patient.model.js';
import { getMedicationModel } from '../models/medication.model.js';
import { regexContains, patientNameOrClause } from './search.helpers.js';
import { ApiError } from '../../utils/api-response.js';
import { AuditLogService } from './audit-log.service.js';
import { logger } from '../../utils/logger.js';
import { NotificationService } from '../../services/notification.service.js';
import type {
  CreatePrescriptionInput,
  UpdatePrescriptionInput,
  PrescriptionQuery,
} from '@dento/shared';

/**
 * Prescription Service — Business logic for prescriptions CRUD
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 (Module #10 Prescriptions)
 * Items are embedded (medications prescribed). Print-ready.
 * Status flow: draft → active → dispensed → cancelled
 */

export class PrescriptionService {
  private Prescription;
  private tenantDb: Connection;
  private tenantSlug: string;

  constructor(tenantDb: Connection) {
    this.tenantDb = tenantDb;
    this.tenantSlug = tenantDb.name?.replace('tenant_', '') || '';
    this.Prescription = getPrescriptionModel(tenantDb);
    // Register Patient model so populate('patientId') works
    getPatientModel(tenantDb);
  }

  async list(query: PrescriptionQuery) {
    const { page, limit, search, patientId, doctorId, status, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IPrescription> = {};

    if (patientId) filter.patientId = patientId;
    if (doctorId) filter.doctorId = doctorId;
    if (status) filter.status = status;

    if (search) {
      // patientId is a referenced ObjectId, so a regex over prescription fields can
      // never match a patient's name — pre-resolve matching patient IDs and OR them in.
      filter.$or = [
        { prescriptionNumber: regexContains(search) },
        { diagnosis: regexContains(search) },
        { 'items.medicationName': regexContains(search) },
        ...(await patientNameOrClause(this.tenantDb, search)),
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [prescriptions, total] = await Promise.all([
      this.Prescription.find(filter)
        .populate('patientId', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.Prescription.countDocuments(filter),
    ]);

    return {
      prescriptions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const prescription = await this.Prescription.findById(id)
      .populate('patientId', 'firstName lastName')
      .lean();
    if (!prescription) throw ApiError.notFound('Prescription');
    return prescription;
  }

  async create(data: CreatePrescriptionInput, actor?: { userId: string; ipAddress?: string }) {
    // Phase 1.1 — Allergy / contraindication safety check
    const warnings = await this.runSafetyChecks(data);

    if (warnings.length > 0 && !data.safetyOverride?.acknowledged) {
      throw new ApiError(
        409,
        'CLINICAL_SAFETY_WARNING',
        'Prescription has clinical-safety warnings; resubmit with safetyOverride to confirm.',
        { warnings },
      );
    }

    // Strip override metadata before persisting (kept in audit log instead)
    const { safetyOverride, ...persistable } = data;
    const prescription = await this.Prescription.create(persistable);

    // Phase 1.6 — Audit override (controlled-substance / clinical-safety traceability)
    if (warnings.length > 0 && safetyOverride && actor) {
      try {
        const audit = new AuditLogService(this.tenantDb);
        await audit.create({
          actorId: actor.userId,
          actorRole: 'doctor',
          tenantSlug: this.tenantSlug,
          resourceType: 'prescription',
          resourceId: prescription._id.toString(),
          action: 'create',
          description: `Prescription created with clinical-safety override: ${safetyOverride.reason}`,
          newValues: { warnings, override: safetyOverride },
          ipAddress: actor.ipAddress ?? '0.0.0.0',
          sensitivityLevel: 'critical',
          status: 'success',
        });
      } catch (err) {
        logger.warn({ err }, 'Failed to write prescription override audit');
      }
    }

    // Phase 2.5 — Notify patient that prescription is ready
    this.sendNotification('prescription.created', {
      recipients: [{ patientId: data.patientId }],
      variables: {
        prescriptionNumber: prescription.prescriptionNumber,
        diagnosis: data.diagnosis ?? '',
        itemsCount: String(data.items.length),
      },
      relatedEntity: { type: 'patient' as const, id: data.patientId },
    });

    return prescription.toObject();
  }

  /**
   * Phase 1.1 — Run clinical-safety checks on a prescription before persisting.
   *
   * Returns a list of human-readable warnings (empty when safe).
   * Currently checks:
   *   - patient.allergies vs medication name / generic name
   *   - patient.medicalHistory.isAllergicToPenicillin / Anesthesia / Latex
   *   - medication.contraindications matched against medical history flags
   */
  async runSafetyChecks(data: CreatePrescriptionInput): Promise<string[]> {
    const warnings: string[] = [];

    const Patient = getPatientModel(this.tenantDb);
    const Medication = getMedicationModel(this.tenantDb);

    const patient = await Patient.findById(data.patientId)
      .select('firstName allergies medicalHistory')
      .lean();
    if (!patient) return warnings; // Patient missing → let downstream validators handle it

    const allergens = (patient.allergies ?? [])
      .map((a) => a.allergen.toLowerCase())
      .filter(Boolean);
    const mh = patient.medicalHistory ?? null;

    // Pre-load any catalog medications referenced in the items
    const medicationIds = data.items.map((i) => i.medicationId).filter(Boolean) as string[];
    const catalog = medicationIds.length
      ? await Medication.find({ _id: { $in: medicationIds } })
          .select('nameEn genericName contraindications')
          .lean()
      : [];
    const catalogById = new Map(catalog.map((m) => [String(m._id), m]));

    for (const item of data.items) {
      const name = (item.medicationName || '').toLowerCase();
      const generic = (item.medicationId && catalogById.get(item.medicationId)?.genericName) || '';
      const genericLc = generic.toLowerCase();

      // 1. Direct allergen match
      for (const allergen of allergens) {
        if (
          allergen.length > 2 &&
          (name.includes(allergen) || (genericLc && genericLc.includes(allergen)))
        ) {
          warnings.push(
            `Patient is allergic to "${allergen}" — flagged on item "${item.medicationName}".`,
          );
        }
      }

      // 2. Common medical-history flags
      if (
        mh?.isAllergicToPenicillin &&
        /penicillin|amoxicillin|ampicillin/i.test(item.medicationName + ' ' + generic)
      ) {
        warnings.push(`Patient is allergic to penicillin — flagged on "${item.medicationName}".`);
      }
      if (mh?.isAllergicToLatex && /latex/i.test(item.medicationName + ' ' + generic)) {
        warnings.push(`Patient is allergic to latex — flagged on "${item.medicationName}".`);
      }

      // 3. Catalog contraindications vs medical history
      if (item.medicationId) {
        const med = catalogById.get(item.medicationId);
        const contras = (med?.contraindications ?? []).map((c) => c.toLowerCase());
        const flagged: string[] = [];
        if (mh?.isPregnant && contras.some((c) => /pregnan/i.test(c))) flagged.push('pregnancy');
        if (mh?.isHeartDisease && contras.some((c) => /heart|cardiac/i.test(c)))
          flagged.push('heart disease');
        if (mh?.isHypertension && contras.some((c) => /hypertension|blood pressure/i.test(c)))
          flagged.push('hypertension');
        if (mh?.isBleedingDisorder && contras.some((c) => /bleed|anticoagul/i.test(c)))
          flagged.push('bleeding disorder');
        if (mh?.isAsthma && contras.some((c) => /asthma|nsaid/i.test(c))) flagged.push('asthma');
        if (mh?.isTakingBloodThinners && contras.some((c) => /nsaid|aspirin|anticoagul/i.test(c)))
          flagged.push('blood thinners');
        for (const f of flagged) {
          warnings.push(`Contraindication: "${item.medicationName}" should not be used with ${f}.`);
        }
      }
    }

    return warnings;
  }

  /** Fire-and-forget notification via NotificationService */
  private sendNotification(
    templateKey: string,
    opts: {
      recipients: { userId?: string; patientId?: string; email?: string; phone?: string }[];
      variables: Record<string, string>;
      relatedEntity?: {
        type: 'appointment' | 'patient' | 'invoice' | 'walk_in' | 'treatment_plan' | 'stock_item';
        id: string;
      };
    },
  ): void {
    const svc = new NotificationService(this.tenantDb, this.tenantSlug);
    svc
      .send({
        templateKey,
        tenantId: this.tenantSlug,
        recipients: opts.recipients,
        variables: opts.variables,
        relatedEntity: opts.relatedEntity,
      })
      .catch((err) => {
        logger.warn(
          { templateKey, error: err instanceof Error ? err.message : 'unknown' },
          'Notification dispatch failed (non-fatal)',
        );
      });
  }

  async update(id: string, data: UpdatePrescriptionInput) {
    const prescription = await this.Prescription.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    ).lean();
    if (!prescription) throw ApiError.notFound('Prescription');
    return prescription;
  }

  async updateStatus(id: string, status: string) {
    const prescription = await this.Prescription.findById(id);
    if (!prescription) throw ApiError.notFound('Prescription');

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      draft: ['active', 'cancelled'],
      active: ['dispensed', 'cancelled'],
      dispensed: [],
      cancelled: [],
    };

    const currentStatus = prescription.status;
    if (!validTransitions[currentStatus]?.includes(status)) {
      throw ApiError.badRequest(`Cannot transition from '${currentStatus}' to '${status}'`);
    }

    prescription.status = status as IPrescription['status'];
    await prescription.save();
    return prescription.toObject();
  }

  async delete(id: string) {
    const prescription = await this.Prescription.findById(id);
    if (!prescription) throw ApiError.notFound('Prescription');

    if (prescription.status !== 'draft') {
      throw ApiError.badRequest('Only draft prescriptions can be deleted');
    }

    await this.Prescription.findByIdAndDelete(id);
    return { message: 'Prescription deleted' };
  }
}
