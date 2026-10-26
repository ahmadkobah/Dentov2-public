/**
 * Referral Service — Phase 9.3
 *
 * CRUD + state-machine helpers for outgoing referrals.
 */

import type { Connection, QueryFilter } from 'mongoose';
import { Types } from 'mongoose';
import {
  getReferralModel,
  type IReferral,
  type ReferralStatus,
  type ReferralUrgency,
} from '../models/referral.model.js';
import { getPatientModel } from '../models/patient.model.js';
import { ApiError } from '../../utils/api-response.js';
import { logger } from '../../utils/logger.js';

export interface CreateReferralInput {
  patientId: string;
  branchId: string;
  referringDoctorId: string;
  appointmentId?: string;
  treatmentPlanId?: string;
  specialty: string;
  specialistName?: string;
  specialistClinic?: string;
  specialistPhone?: string;
  specialistEmail?: string;
  reason: string;
  clinicalNotes?: string;
  attachmentUrls?: string[];
  urgency?: ReferralUrgency;
  followUpAt?: string | Date;
}

export interface UpdateReferralInput {
  specialty?: string;
  specialistName?: string;
  specialistClinic?: string;
  specialistPhone?: string;
  specialistEmail?: string;
  reason?: string;
  clinicalNotes?: string;
  attachmentUrls?: string[];
  urgency?: ReferralUrgency;
  followUpAt?: string | Date | null;
  outcomeNotes?: string;
}

export interface ReferralQuery {
  patientId?: string;
  branchId?: string;
  referringDoctorId?: string;
  status?: ReferralStatus;
  urgency?: ReferralUrgency;
  specialty?: string;
  page?: number;
  limit?: number;
}

const VALID_TRANSITIONS: Record<ReferralStatus, ReferralStatus[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['acknowledged', 'completed', 'cancelled'],
  acknowledged: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export class ReferralService {
  private readonly Referral;
  private readonly Patient;

  constructor(tenantDb: Connection) {
    this.Referral = getReferralModel(tenantDb);
    this.Patient = getPatientModel(tenantDb);
  }

  async create(input: CreateReferralInput, userId: string): Promise<IReferral> {
    const patient = await this.Patient.findById(input.patientId).select('_id').lean();
    if (!patient) throw ApiError.notFound('Patient');

    const created = await this.Referral.create({
      patientId: new Types.ObjectId(input.patientId),
      branchId: new Types.ObjectId(input.branchId),
      referringDoctorId: new Types.ObjectId(input.referringDoctorId),
      appointmentId: input.appointmentId ? new Types.ObjectId(input.appointmentId) : undefined,
      treatmentPlanId: input.treatmentPlanId
        ? new Types.ObjectId(input.treatmentPlanId)
        : undefined,
      specialty: input.specialty,
      specialistName: input.specialistName,
      specialistClinic: input.specialistClinic,
      specialistPhone: input.specialistPhone,
      specialistEmail: input.specialistEmail,
      reason: input.reason,
      clinicalNotes: input.clinicalNotes,
      attachmentUrls: input.attachmentUrls ?? [],
      urgency: input.urgency ?? 'routine',
      followUpAt: input.followUpAt ? new Date(input.followUpAt) : undefined,
      createdBy: new Types.ObjectId(userId),
    });
    return created;
  }

  async list(query: ReferralQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 25));
    const filter: QueryFilter<IReferral> = {};
    if (query.patientId) filter.patientId = new Types.ObjectId(query.patientId);
    if (query.branchId) filter.branchId = new Types.ObjectId(query.branchId);
    if (query.referringDoctorId)
      filter.referringDoctorId = new Types.ObjectId(query.referringDoctorId);
    if (query.status) filter.status = query.status;
    if (query.urgency) filter.urgency = query.urgency;
    if (query.specialty) filter.specialty = query.specialty;

    const [items, total] = await Promise.all([
      this.Referral.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.Referral.countDocuments(filter),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string): Promise<IReferral> {
    const referral = await this.Referral.findById(id);
    if (!referral) throw ApiError.notFound('Referral');
    return referral;
  }

  async update(id: string, input: UpdateReferralInput, userId: string): Promise<IReferral> {
    const referral = await this.getById(id);
    if (referral.status === 'completed' || referral.status === 'cancelled') {
      throw ApiError.badRequest(`Cannot edit referral in status "${referral.status}"`);
    }

    Object.assign(referral, {
      ...input,
      followUpAt:
        input.followUpAt === null
          ? null
          : input.followUpAt
            ? new Date(input.followUpAt)
            : referral.followUpAt,
      updatedBy: new Types.ObjectId(userId),
    });
    await referral.save();
    return referral;
  }

  async transition(
    id: string,
    next: ReferralStatus,
    userId: string,
    extra?: { cancelReason?: string; outcomeNotes?: string },
  ): Promise<IReferral> {
    const referral = await this.getById(id);
    const allowed = VALID_TRANSITIONS[referral.status] || [];
    if (!allowed.includes(next)) {
      throw ApiError.badRequest(
        `Cannot transition referral from "${referral.status}" to "${next}"`,
      );
    }

    referral.status = next;
    referral.updatedBy = new Types.ObjectId(userId);
    const now = new Date();
    if (next === 'sent') referral.sentAt = now;
    if (next === 'acknowledged') referral.acknowledgedAt = now;
    if (next === 'completed') {
      referral.completedAt = now;
      if (extra?.outcomeNotes) referral.outcomeNotes = extra.outcomeNotes;
    }
    if (next === 'cancelled') {
      referral.cancelledAt = now;
      if (extra?.cancelReason) referral.cancelReason = extra.cancelReason;
    }
    await referral.save();

    logger.info({ referralId: id, status: next, userId }, 'Referral status transition');
    return referral;
  }

  async remove(id: string, userId: string): Promise<{ deleted: boolean }> {
    const referral = await this.getById(id);
    if (referral.status !== 'draft') {
      throw ApiError.badRequest('Only draft referrals can be deleted');
    }
    await this.Referral.deleteOne({ _id: referral._id });
    logger.info({ referralId: id, userId }, 'Referral deleted (draft)');
    return { deleted: true };
  }
}
