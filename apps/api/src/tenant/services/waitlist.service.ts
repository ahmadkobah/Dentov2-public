/**
 * Waitlist Service — Phase 6.2
 *
 * CRUD plus `findMatching(branchId, doctorId, dateRange)` used by the
 * appointment-cancel hook to auto-fill freed slots. Notifications are
 * fire-and-forget so they never block the main cancel flow.
 */

import type { Connection, QueryFilter } from 'mongoose';
import { Types } from 'mongoose';
import {
  getWaitlistModel,
  type IWaitlist,
  type WaitlistPriority,
  type WaitlistStatus,
} from '../models/waitlist.model.js';
import { getPatientModel } from '../models/patient.model.js';
import { ApiError } from '../../utils/api-response.js';
import { NotificationService } from '../../services/notification.service.js';
import { logger } from '../../utils/logger.js';

export interface CreateWaitlistInput {
  branchId: string;
  patientId: string;
  doctorId?: string;
  serviceId?: string;
  preferredFrom: string | Date;
  preferredTo: string | Date;
  preferredDaysOfWeek?: number[];
  preferredTimeStart?: string;
  preferredTimeEnd?: string;
  durationMinutes: number;
  reason?: string;
  notes?: string;
  priority?: WaitlistPriority;
}

export interface WaitlistQuery {
  branchId?: string;
  doctorId?: string;
  patientId?: string;
  status?: WaitlistStatus;
  priority?: WaitlistPriority;
  page?: number;
  limit?: number;
}

export interface WaitlistMatchSlot {
  date: Date;
  startTime: string;
  endTime: string;
  doctorId: string;
  branchId: string;
}

// ── Priority ordering ───────────────────────────────────────

/**
 * `priority` is a string enum, so a raw `.sort({ priority: -1 })` orders
 * alphabetically and ranks `high` last (u > n > h). Map to numeric weights
 * (urgent highest) and sort on those instead.
 */
const WAITLIST_PRIORITY_RANK: Record<string, number> = { urgent: 3, high: 2, normal: 1 };

/** Urgent → high → normal (highest first), then FIFO by createdAt. */
function compareWaitlistPriority(
  a: { priority?: unknown; createdAt?: unknown },
  b: { priority?: unknown; createdAt?: unknown },
): number {
  const rankA = WAITLIST_PRIORITY_RANK[String(a.priority)] ?? 0;
  const rankB = WAITLIST_PRIORITY_RANK[String(b.priority)] ?? 0;
  if (rankA !== rankB) return rankB - rankA;
  return new Date(a.createdAt as string).getTime() - new Date(b.createdAt as string).getTime();
}

/** Aggregation `$switch` mapping the priority enum to a numeric sort weight. */
const WAITLIST_PRIORITY_RANK_EXPR = {
  $switch: {
    branches: [
      { case: { $eq: ['$priority', 'urgent'] }, then: 3 },
      { case: { $eq: ['$priority', 'high'] }, then: 2 },
      { case: { $eq: ['$priority', 'normal'] }, then: 1 },
    ],
    default: 0,
  },
};

export class WaitlistService {
  private readonly tenantDb: Connection;
  private readonly tenantSlug: string;
  private readonly Waitlist;
  private readonly Patient;

  constructor(tenantDb: Connection) {
    this.tenantDb = tenantDb;
    this.tenantSlug = tenantDb.name?.replace('tenant_', '') || '';
    this.Waitlist = getWaitlistModel(tenantDb);
    this.Patient = getPatientModel(tenantDb);
  }

  async create(input: CreateWaitlistInput, userId: string): Promise<IWaitlist> {
    const from = new Date(input.preferredFrom);
    const to = new Date(input.preferredTo);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw ApiError.badRequest('Invalid preferredFrom/preferredTo');
    }
    if (to < from) {
      throw ApiError.badRequest('preferredTo must be on or after preferredFrom');
    }
    const patient = await this.Patient.findById(input.patientId).select('_id').lean();
    if (!patient) throw ApiError.notFound('Patient');

    const created = await this.Waitlist.create({
      branchId: new Types.ObjectId(input.branchId),
      patientId: new Types.ObjectId(input.patientId),
      doctorId: input.doctorId ? new Types.ObjectId(input.doctorId) : undefined,
      serviceId: input.serviceId ? new Types.ObjectId(input.serviceId) : undefined,
      preferredFrom: from,
      preferredTo: to,
      preferredDaysOfWeek: input.preferredDaysOfWeek ?? [],
      preferredTimeStart: input.preferredTimeStart,
      preferredTimeEnd: input.preferredTimeEnd,
      durationMinutes: input.durationMinutes,
      reason: input.reason,
      notes: input.notes,
      priority: input.priority ?? 'normal',
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });
    return created;
  }

  async list(query: WaitlistQuery) {
    const filter: QueryFilter<IWaitlist> = { isActive: true };
    if (query.branchId) filter.branchId = new Types.ObjectId(query.branchId);
    if (query.doctorId) filter.doctorId = new Types.ObjectId(query.doctorId);
    if (query.patientId) filter.patientId = new Types.ObjectId(query.patientId);
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    // `priority` is a string enum, so a DB `.sort({ priority: -1 })` orders
    // alphabetically (ranking `high` last). Use an aggregation with a numeric
    // priority weight to compute the correctly-ordered page of ids, then
    // hydrate via find().populate() so encrypted patient fields (phone) are
    // decrypted by the model getters — an aggregation $lookup returns ciphertext.
    const [ordered, total] = await Promise.all([
      this.Waitlist.aggregate([
        { $match: filter },
        { $addFields: { _priorityRank: WAITLIST_PRIORITY_RANK_EXPR } },
        { $sort: { _priorityRank: -1, createdAt: 1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: { _id: 1 } },
      ]),
      this.Waitlist.countDocuments(filter),
    ]);

    const orderedIds = ordered.map((d: { _id: Types.ObjectId }) => d._id);
    const docs = await this.Waitlist.find({ _id: { $in: orderedIds } })
      .populate('patientId', 'firstName lastName patientCode phone')
      .populate('doctorId', 'firstName lastName specialty')
      .lean();

    // find() does not preserve the `$in` order — restore the ranked order.
    const rankIndex = new Map(orderedIds.map((id, i) => [String(id), i]));
    docs.sort((a, b) => (rankIndex.get(String(a._id)) ?? 0) - (rankIndex.get(String(b._id)) ?? 0));

    return {
      items: docs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const entry = await this.Waitlist.findById(id)
      .populate('patientId', 'firstName lastName patientCode phone email')
      .populate('doctorId', 'firstName lastName specialty')
      .lean();
    if (!entry) throw ApiError.notFound('Waitlist entry');
    return entry;
  }

  async update(id: string, input: Partial<CreateWaitlistInput>, userId: string) {
    const update: Record<string, unknown> = { updatedBy: new Types.ObjectId(userId) };
    const allowed: (keyof CreateWaitlistInput)[] = [
      'preferredDaysOfWeek',
      'preferredTimeStart',
      'preferredTimeEnd',
      'durationMinutes',
      'reason',
      'notes',
      'priority',
    ];
    for (const k of allowed) {
      if (input[k] !== undefined) update[k] = input[k];
    }
    if (input.preferredFrom) update.preferredFrom = new Date(input.preferredFrom);
    if (input.preferredTo) update.preferredTo = new Date(input.preferredTo);
    if (input.doctorId) update.doctorId = new Types.ObjectId(input.doctorId);

    const entry = await this.Waitlist.findByIdAndUpdate(id, update, { new: true });
    if (!entry) throw ApiError.notFound('Waitlist entry');
    return entry;
  }

  async cancel(id: string, userId: string) {
    const entry = await this.Waitlist.findByIdAndUpdate(
      id,
      {
        status: 'cancelled',
        isActive: false,
        updatedBy: new Types.ObjectId(userId),
      },
      { new: true },
    );
    if (!entry) throw ApiError.notFound('Waitlist entry');
    return entry;
  }

  /**
   * Find the next active waitlist entry that matches a freed slot. Highest
   * priority first; within the same priority, oldest createdAt wins (FIFO).
   * `doctorId` may be omitted from waitlist entries (any-doctor preference).
   */
  async findMatching(slot: WaitlistMatchSlot, limit = 5): Promise<IWaitlist[]> {
    const slotDate = new Date(slot.date);
    const dow = slotDate.getDay();

    const filter: QueryFilter<IWaitlist> = {
      branchId: new Types.ObjectId(slot.branchId),
      status: 'active',
      isActive: true,
      preferredFrom: { $lte: slotDate },
      preferredTo: { $gte: slotDate },
      $and: [
        {
          $or: [
            { doctorId: { $exists: false } },
            { doctorId: null },
            { doctorId: new Types.ObjectId(slot.doctorId) },
          ],
        },
        {
          $or: [{ preferredDaysOfWeek: { $size: 0 } }, { preferredDaysOfWeek: dow }],
        },
      ],
    };

    // `priority` is a string enum; a DB `.sort({ priority: -1 })` orders
    // alphabetically and would NOT surface the highest-priority patient first.
    // Fetch the (highly selective) candidate set FIFO, then sort by numeric
    // priority weight (urgent highest) in memory so the top match is truly the
    // highest-priority patient. Cap the fetch defensively.
    const candidates = await this.Waitlist.find(filter)
      .sort({ createdAt: 1 })
      .limit(Math.max(limit * 10, 50))
      .populate('patientId', 'firstName lastName patientCode phone email')
      .lean();
    candidates.sort(compareWaitlistPriority);

    // In-memory time-of-day filter (cheap and rare)
    const matches = candidates.filter((entry) => {
      if (!entry.preferredTimeStart && !entry.preferredTimeEnd) return true;
      const start = entry.preferredTimeStart ?? '00:00';
      const end = entry.preferredTimeEnd ?? '23:59';
      return slot.startTime >= start && slot.startTime < end;
    });

    return matches.slice(0, limit) as unknown as IWaitlist[];
  }

  /**
   * Auto-fill hook: notify the top match for a freed slot. Called from the
   * appointment cancel flow. Returns the entry that was notified, if any.
   * Never throws — failures are logged.
   */
  async notifyTopMatchForSlot(slot: WaitlistMatchSlot): Promise<IWaitlist | null> {
    try {
      const matches = await this.findMatching(slot, 1);
      const top = matches[0];
      if (!top) return null;

      await this.Waitlist.findByIdAndUpdate(top._id, {
        status: 'notified',
        notifiedAt: new Date(),
        $inc: { notificationCount: 1 },
        lastNotifiedSlot: {
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
      });

      const patientId = (top.patientId as unknown as { _id?: Types.ObjectId })._id?.toString();
      if (patientId) {
        const svc = new NotificationService(this.tenantDb, this.tenantSlug);
        svc
          .send({
            templateKey: 'waitlist.matched',
            tenantId: this.tenantSlug,
            recipients: [{ patientId }],
            variables: {
              date: new Date(slot.date).toISOString().slice(0, 10),
              startTime: slot.startTime,
              endTime: slot.endTime,
            },
            relatedEntity: { type: 'appointment', id: top._id.toString() },
          })
          .catch((err) => {
            logger.warn(
              { err: err instanceof Error ? err.message : 'unknown' },
              'waitlist.matched notification failed',
            );
          });
      }

      return top;
    } catch (err) {
      logger.warn(
        { err: err instanceof Error ? err.message : 'unknown' },
        'Waitlist auto-fill failed (non-fatal)',
      );
      return null;
    }
  }

  /**
   * Mark an entry as booked once the patient (or admin) accepts the offered
   * slot and an appointment is created. Idempotent.
   */
  async markBooked(id: string, appointmentId: string, userId: string) {
    const entry = await this.Waitlist.findByIdAndUpdate(
      id,
      {
        status: 'booked',
        bookedAppointmentId: new Types.ObjectId(appointmentId),
        bookedAt: new Date(),
        isActive: false,
        updatedBy: new Types.ObjectId(userId),
      },
      { new: true },
    );
    if (!entry) throw ApiError.notFound('Waitlist entry');
    return entry;
  }
}
