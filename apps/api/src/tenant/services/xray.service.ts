import type { Connection, QueryFilter, Types } from 'mongoose';
import type { IXray } from '../models/xray.model.js';
import { getXrayModel } from '../models/xray.model.js';
import { getTreatmentPlanModel } from '../models/treatment-plan.model.js';
import { getProcedureNoteModel } from '../models/procedure-note.model.js';
import { getPatientModel } from '../models/patient.model.js';
import { regexContains, patientNameOrClause } from './search.helpers.js';
import { ApiError } from '../../utils/api-response.js';
import { AuditLogService } from './audit-log.service.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';
import { deleteFromS3 } from '../../config/s3.js';
import type { CreateXrayInput, UpdateXrayInput, XrayQuery } from '@dento/shared';

/**
 * X-Ray Service — Business logic for X-Ray CRUD + cross-linking
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 (#11), §17 (Clinical Cross-Linking)
 * Per SECURITY_AND_ENCRYPTION.md §8 (File Upload Security)
 *
 * File upload handled separately (multipart route).
 * This service manages metadata + cross-links.
 */

export class XrayService {
  private Xray;
  private tenantDb: Connection;
  private tenantSlug: string;

  constructor(tenantDb: Connection) {
    this.tenantDb = tenantDb;
    this.tenantSlug = tenantDb.name?.replace('tenant_', '') || '';
    this.Xray = getXrayModel(tenantDb);
  }

  async list(query: XrayQuery) {
    const {
      page,
      limit,
      search,
      patientId,
      doctorId,
      xrayType,
      clinicalPurpose,
      toothNumber,
      treatmentPlanId,
      procedureNoteId,
      sortBy,
      sortOrder,
    } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IXray> = {};

    if (patientId) filter.patientId = patientId;
    if (doctorId) filter.doctorId = doctorId;
    if (xrayType) filter.xrayType = xrayType;
    if (clinicalPurpose) filter.clinicalPurpose = clinicalPurpose;
    if (toothNumber) filter.toothNumbers = toothNumber; // Multi-key index match
    if (treatmentPlanId) filter.treatmentPlanId = treatmentPlanId;
    if (procedureNoteId) filter.procedureNoteId = procedureNoteId;

    if (search) {
      filter.$or = [
        { title: regexContains(search) },
        { notes: regexContains(search) },
        { findings: regexContains(search) },
        ...(await patientNameOrClause(this.tenantDb, search)),
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [xrays, total] = await Promise.all([
      this.Xray.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.Xray.countDocuments(filter),
    ]);

    return {
      xrays,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const xray = await this.Xray.findById(id).lean();
    if (!xray) throw ApiError.notFound('X-Ray');
    return xray;
  }

  async create(
    data: CreateXrayInput & {
      imageUrl: string;
      thumbnailUrl?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
    },
    actor?: { userId: string; ipAddress?: string },
  ) {
    // Phase 1.3 — Pregnancy gate
    const warnings = await this.runSafetyChecks(data);
    if (warnings.length > 0 && !data.safetyOverride?.acknowledged) {
      throw new ApiError(
        409,
        'CLINICAL_SAFETY_WARNING',
        'X-Ray order has clinical-safety warnings; resubmit with safetyOverride to confirm.',
        { warnings },
      );
    }

    const { safetyOverride, ...persistable } = data;
    const xray = await this.Xray.create(persistable);

    // Phase 1.6 — Audit override
    if (warnings.length > 0 && safetyOverride && actor) {
      try {
        const audit = new AuditLogService(this.tenantDb);
        await audit.create({
          actorId: actor.userId,
          actorRole: 'doctor',
          tenantSlug: this.tenantSlug,
          resourceType: 'xray',
          resourceId: xray._id.toString(),
          action: 'create',
          description: `X-Ray ordered with clinical-safety override: ${safetyOverride.reason}`,
          newValues: { warnings, override: safetyOverride },
          ipAddress: actor.ipAddress ?? '0.0.0.0',
          sensitivityLevel: 'critical',
          status: 'success',
        });
      } catch (err) {
        logger.warn({ err }, 'Failed to write xray override audit');
      }
    }

    return xray.toObject();
  }

  /**
   * Phase 1.3 — Run pre-imaging safety checks (radiation exposure).
   * Returns warnings array (empty when safe). Currently checks pregnancy.
   */
  async runSafetyChecks(data: { patientId: string }): Promise<string[]> {
    const warnings: string[] = [];
    const Patient = getPatientModel(this.tenantDb);
    const patient = await Patient.findById(data.patientId).select('medicalHistory').lean();
    if (patient?.medicalHistory?.isPregnant) {
      warnings.push(
        'Patient is marked as PREGNANT. Radiographic imaging is contraindicated unless clinically essential and shielded.',
      );
    }
    return warnings;
  }

  async update(id: string, data: UpdateXrayInput) {
    const xray = await this.Xray.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    ).lean();
    if (!xray) throw ApiError.notFound('X-Ray');
    return xray;
  }

  async delete(id: string) {
    const xray = await this.Xray.findById(id);
    if (!xray) throw ApiError.notFound('X-Ray');

    // Best-effort delete of the underlying object(s) from R2/S3 before removing
    // the metadata record. Failures here must NOT block the DB deletion — the
    // record is the source of truth and orphaned objects can be swept later.
    // GDPR/HIPAA: ensures the image is purged on patient-data deletion.
    if (env.S3_ENDPOINT) {
      const urls = [xray.imageUrl, xray.thumbnailUrl].filter(
        (u): u is string => typeof u === 'string' && u.length > 0,
      );
      for (const url of urls) {
        const key = this.keyFromUrl(url);
        if (!key) continue;
        try {
          await deleteFromS3(key);
        } catch (err) {
          logger.error(
            { err, xrayId: id, key, tenant: this.tenantSlug },
            'Failed to delete x-ray object from storage; continuing with DB deletion',
          );
        }
      }
    }

    await this.Xray.findByIdAndDelete(id);
    return { message: 'X-Ray deleted' };
  }

  /**
   * Derive the object storage key from a stored image URL.
   * Handles both public-CDN URLs (`${R2_PUBLIC_URL}/${key}`) and path-style
   * S3 endpoints (`${S3_ENDPOINT}/${bucket}/${key}`). Returns null when the
   * key cannot be confidently derived.
   */
  private keyFromUrl(url: string): string | null {
    let path: string;
    try {
      path = new URL(url).pathname.replace(/^\/+/, '');
    } catch {
      return null;
    }
    if (!path) return null;

    // Path-style endpoints include the bucket as the first path segment.
    const bucket = env.S3_BUCKET;
    if (bucket && path.startsWith(`${bucket}/`)) {
      path = path.slice(bucket.length + 1);
    }
    return path || null;
  }

  /** Get all X-Rays for a specific patient — for Imaging Timeline */
  async getPatientTimeline(patientId: string) {
    return this.Xray.find({ patientId }).sort({ capturedAt: -1, createdAt: -1 }).lean();
  }

  /** Get X-Rays by tooth number — for Dental Chart integration */
  async getByToothNumber(patientId: string, toothNumber: string) {
    return this.Xray.find({ patientId, toothNumbers: toothNumber }).sort({ createdAt: -1 }).lean();
  }

  /** Get unlinked X-Rays for a patient — for ImagingLinker */
  async getUnlinked(patientId: string) {
    return this.Xray.find({
      patientId,
      treatmentPlanId: { $exists: false },
      procedureNoteId: { $exists: false },
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  // ── Cross-Linking Methods (§17) ─────────────────────────

  /**
   * Link an X-Ray to a treatment plan or procedure note.
   * Updates both the forward FK on the xray AND the reverse array on the target.
   */
  async linkToTarget(
    xrayId: string,
    targetType: 'treatmentPlan' | 'procedureNote',
    targetId: string,
    options?: { treatmentPlanItemId?: string; purpose?: 'preOp' | 'postOp' | 'linked' },
  ) {
    const xray = await this.Xray.findById(xrayId);
    if (!xray) throw ApiError.notFound('X-Ray');

    if (targetType === 'treatmentPlan') {
      xray.treatmentPlanId = targetId as unknown as Types.ObjectId;
      if (options?.treatmentPlanItemId) {
        xray.treatmentPlanItemId = options.treatmentPlanItemId as unknown as Types.ObjectId;
      }
      await xray.save();

      // Update reverse array on treatment plan
      const TreatmentPlan = getTreatmentPlanModel(this.tenantDb);
      await TreatmentPlan.findByIdAndUpdate(targetId, {
        $addToSet: { linkedXrays: xrayId },
      });

      // If linking to a specific item, update item-level linkedXrays too
      if (options?.treatmentPlanItemId) {
        await TreatmentPlan.updateOne(
          { _id: targetId, 'items._id': options.treatmentPlanItemId },
          { $addToSet: { 'items.$.linkedXrays': xrayId } },
        );
      }
    } else if (targetType === 'procedureNote') {
      xray.procedureNoteId = targetId as unknown as Types.ObjectId;
      await xray.save();

      // Update reverse array on procedure note
      const ProcedureNote = getProcedureNoteModel(this.tenantDb);
      const purpose = options?.purpose || 'linked';
      const field =
        purpose === 'preOp' ? 'preOpXrays' : purpose === 'postOp' ? 'postOpXrays' : 'linkedXrays';
      await ProcedureNote.findByIdAndUpdate(targetId, {
        $addToSet: { [field]: xrayId },
      });
    }

    return this.Xray.findById(xrayId).lean();
  }

  /**
   * Unlink an X-Ray from a treatment plan or procedure note.
   * Removes both the forward FK and the reverse array entry.
   */
  async unlinkFromTarget(
    xrayId: string,
    targetType: 'treatmentPlan' | 'procedureNote',
    targetId: string,
  ) {
    const xray = await this.Xray.findById(xrayId);
    if (!xray) throw ApiError.notFound('X-Ray');

    if (targetType === 'treatmentPlan') {
      const itemId = xray.treatmentPlanItemId;
      xray.treatmentPlanId = undefined;
      xray.treatmentPlanItemId = undefined;
      await xray.save();

      const TreatmentPlan = getTreatmentPlanModel(this.tenantDb);
      await TreatmentPlan.findByIdAndUpdate(targetId, {
        $pull: { linkedXrays: xrayId },
      });

      if (itemId) {
        await TreatmentPlan.updateOne(
          { _id: targetId, 'items._id': itemId },
          { $pull: { 'items.$.linkedXrays': xrayId } },
        );
      }
    } else if (targetType === 'procedureNote') {
      xray.procedureNoteId = undefined;
      await xray.save();

      const ProcedureNote = getProcedureNoteModel(this.tenantDb);
      await ProcedureNote.findByIdAndUpdate(targetId, {
        $pull: {
          linkedXrays: xrayId,
          preOpXrays: xrayId,
          postOpXrays: xrayId,
        },
      });
    }

    return this.Xray.findById(xrayId).lean();
  }
}
