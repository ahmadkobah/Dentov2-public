/**
 * Walk-in Queue Service — Daily Operations Queue Management
 *
 * Per DENTO_V2_MASTER_PLAN.md §18 — Walk-in Queue & Daily Ops
 * Per V2_DATABASE.md §6.4 — walk_in_queue collection
 *
 * Features:
 * - Register walk-in patients (registered or unregistered)
 * - Day-based queue numbering (auto-resets daily)
 * - Status transitions: waiting → called → in_progress → completed
 * - Priority queue (normal/urgent/emergency)
 * - Socket.io real-time updates
 * - Auto no-show after configurable timeout
 */

import mongoose, { type Connection, type QueryFilter } from 'mongoose';
import type { IWalkInQueue } from '../models/walk-in-queue.model.js';
import { getWalkInQueueModel } from '../models/walk-in-queue.model.js';
import { getBranchModel } from '../models/branch.model.js';
import { ApiError } from '../../utils/api-response.js';
import { socketEmitter } from '../../plugins/socket.plugin.js';
import { logger } from '../../utils/logger.js';
import { NotificationService } from '../../services/notification.service.js';

// ── Priority ordering ───────────────────────────────────────

/**
 * The `priority` field is a string enum, so a raw `.sort({ priority: -1 })`
 * orders alphabetically and ranks `emergency` LAST — a clinical-safety bug.
 * Map to numeric weights (emergency highest) and sort on those instead.
 */
const WALK_IN_PRIORITY_RANK: Record<string, number> = {
  emergency: 3,
  urgent: 2,
  normal: 1,
};

/** Emergency → urgent → normal (highest first), then FIFO by queueNumber. */
function compareWalkInPriority(
  a: { priority?: unknown; queueNumber?: unknown },
  b: { priority?: unknown; queueNumber?: unknown },
): number {
  const rankA = WALK_IN_PRIORITY_RANK[String(a.priority)] ?? 0;
  const rankB = WALK_IN_PRIORITY_RANK[String(b.priority)] ?? 0;
  if (rankA !== rankB) return rankB - rankA; // higher priority first
  return (Number(a.queueNumber) || 0) - (Number(b.queueNumber) || 0); // FIFO
}

/**
 * Aggregation `$match` does not auto-cast string ids to ObjectId (unlike
 * `find`), so branch filters silently match nothing. Cast when valid.
 */
function toMatchId(id: string): mongoose.Types.ObjectId | string {
  return mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id;
}

// ── Types ───────────────────────────────────────────────────

interface RegisterWalkInInput {
  branchId: string;
  patientId?: string;
  patientName: string;
  phone?: string;
  reason?: string;
  priority?: 'normal' | 'urgent' | 'emergency';
}

interface WalkInQueueQuery {
  branchId: string;
  status?: IWalkInQueue['status'];
  date?: string; // ISO date string
  page?: number;
  limit?: number;
}

export class WalkInQueueService {
  private WalkInQueue;
  private tenantDb: Connection;
  private tenantSlug: string;

  constructor(tenantDb: Connection) {
    this.tenantDb = tenantDb;
    this.tenantSlug = tenantDb.name?.replace('tenant_', '') || '';
    this.WalkInQueue = getWalkInQueueModel(tenantDb);
  }

  /**
   * Register a walk-in patient into the queue
   */
  async register(input: RegisterWalkInInput, userId: string) {
    const entry = await this.WalkInQueue.create({
      branchId: input.branchId,
      patientId: input.patientId || undefined,
      patientName: input.patientName,
      phone: input.phone,
      reason: input.reason,
      priority: input.priority || 'normal',
      status: 'waiting',
      checkedInAt: new Date(),
      createdBy: userId,
    });

    const result = entry.toObject();

    // Emit real-time update
    try {
      socketEmitter.queueUpdate(input.branchId, {
        type: 'walk_in_registered',
        data: {
          id: result._id.toString(),
          branchId: input.branchId,
          timestamp: new Date().toISOString(),
          queueNumber: result.queueNumber,
          patientName: result.patientName,
          priority: result.priority,
          status: result.status,
        },
      });
    } catch {
      // Socket errors should not break queue operations
    }

    logger.info(
      { branchId: input.branchId, queueNumber: result.queueNumber },
      'Walk-in registered',
    );

    // Notify staff about new walk-in (fire-and-forget)
    this.sendNotification('queue.walk_in_registered', {
      recipients: [{ userId }],
      variables: {
        patientName: input.patientName,
        queueNumber: String(result.queueNumber),
        priority: input.priority || 'normal',
      },
      relatedEntity: { type: 'walk_in' as const, id: result._id.toString() },
    });

    return result;
  }

  /**
   * List queue entries for a branch (today or specific date)
   */
  async list(query: WalkInQueueQuery) {
    const { branchId, status, date, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const filter: QueryFilter<IWalkInQueue> = {
      branchId,
      createdAt: { $gte: targetDate, $lt: nextDay },
    };
    if (status) filter.status = status;

    // The `priority` enum is a string, so a DB-level `.sort({ priority: -1 })`
    // orders alphabetically and ranks `emergency` LAST. The queue is scoped to
    // one branch + one day (a small set), so fetch it, sort by numeric priority
    // weight (emergency first, then FIFO), and paginate in memory.
    const allDocs = await this.WalkInQueue.find(filter)
      .populate('assignedDoctorId', 'firstName lastName')
      .lean<Record<string, unknown>[]>();
    allDocs.sort(compareWalkInPriority);
    const total = allDocs.length;
    const rawEntries = allDocs.slice(skip, skip + limit);

    // Flatten populated doctor info for frontend + Phase 5.5 estimated wait
    const Branch = getBranchModel(this.tenantDb);
    const branch = await Branch.findById(branchId).select('avgConsultationTime').lean();
    const avgMin = Math.max(5, branch?.avgConsultationTime ?? 30);

    // Compute position-in-queue for waiting entries (FIFO within priority)
    // The query is already sorted (priority desc, queueNumber asc) within the
    // returned page, but to be deterministic across pages, recompute against
    // the full waiting set for the day.
    const waitingDocs = await this.WalkInQueue.find({
      branchId,
      createdAt: filter.createdAt,
      status: 'waiting',
    })
      .select('_id priority queueNumber')
      .lean();
    waitingDocs.sort(compareWalkInPriority);
    const positionMap = new Map<string, number>();
    waitingDocs.forEach((d, idx) => positionMap.set(String(d._id), idx + 1));

    const entries = rawEntries.map((e: Record<string, unknown>) => {
      const doc = e.assignedDoctorId as Record<string, unknown> | null;
      const hasPopulated = doc && typeof doc === 'object' && 'firstName' in doc;
      const firstName = hasPopulated ? String(doc.firstName ?? '') : '';
      const lastName = hasPopulated ? String(doc.lastName ?? '') : '';
      const id = String(e._id);
      const position = e.status === 'waiting' ? positionMap.get(id) : undefined;
      return {
        ...e,
        doctorId: hasPopulated
          ? String((doc as Record<string, unknown>)._id)
          : doc
            ? String(doc)
            : null,
        doctorName: hasPopulated ? `${firstName} ${lastName}`.trim() || null : null,
        assignedDoctorId: hasPopulated
          ? String((doc as Record<string, unknown>)._id)
          : doc
            ? String(doc)
            : null,
        position: position ?? null,
        estimatedWaitMinutes: position ? position * avgMin : 0,
      };
    });

    return {
      entries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get a specific queue entry
   */
  async getById(id: string) {
    const entry = await this.WalkInQueue.findById(id).lean();
    if (!entry) throw ApiError.notFound('Queue entry');
    return entry;
  }

  /**
   * Call next patient — transition: waiting → called
   */
  async callPatient(id: string, doctorId: string, userId: string) {
    const entry = await this.WalkInQueue.findById(id);
    if (!entry) throw ApiError.notFound('Queue entry');
    if (entry.status !== 'waiting') {
      throw ApiError.badRequest(`Cannot call patient with status '${entry.status}'`);
    }

    entry.status = 'called';
    entry.assignedDoctorId = doctorId as any;
    entry.calledAt = new Date();
    entry.updatedBy = userId as any;
    await entry.save();

    const result = entry.toObject();

    try {
      socketEmitter.queueUpdate(entry.branchId.toString(), {
        type: 'patient_called',
        data: {
          id: result._id.toString(),
          branchId: entry.branchId.toString(),
          timestamp: new Date().toISOString(),
          queueNumber: result.queueNumber,
          patientName: result.patientName,
          status: 'called',
        },
      });
    } catch {
      /* socket errors non-fatal */
    }

    // Notify assigned doctor
    this.sendNotification('queue.patient_called', {
      recipients: [{ userId: doctorId }],
      variables: {
        patientName: result.patientName,
        queueNumber: String(result.queueNumber),
      },
      relatedEntity: { type: 'walk_in' as const, id: result._id.toString() },
    });

    return result;
  }

  /**
   * Start treatment — transition: called → in_progress
   */
  async startTreatment(id: string, userId: string, chairId?: string, doctorId?: string) {
    const entry = await this.WalkInQueue.findById(id);
    if (!entry) throw ApiError.notFound('Queue entry');
    if (entry.status !== 'called') {
      throw ApiError.badRequest(`Cannot start treatment with status '${entry.status}'`);
    }

    entry.status = 'in_progress';
    entry.startedAt = new Date();
    if (chairId) entry.chairId = chairId;
    if (doctorId) entry.assignedDoctorId = doctorId as any;
    entry.updatedBy = userId as any;
    await entry.save();

    const result = entry.toObject();

    try {
      socketEmitter.queueUpdate(entry.branchId.toString(), {
        type: 'treatment_started',
        data: {
          id: result._id.toString(),
          branchId: entry.branchId.toString(),
          timestamp: new Date().toISOString(),
          queueNumber: result.queueNumber,
          patientName: result.patientName,
          status: 'in_progress',
        },
      });
    } catch {
      /* socket errors non-fatal */
    }

    return result;
  }

  /**
   * Complete treatment — transition: in_progress → completed
   */
  async completeTreatment(id: string, userId: string) {
    const entry = await this.WalkInQueue.findById(id);
    if (!entry) throw ApiError.notFound('Queue entry');
    if (entry.status !== 'in_progress') {
      throw ApiError.badRequest(`Cannot complete with status '${entry.status}'`);
    }

    entry.status = 'completed';
    entry.completedAt = new Date();
    entry.updatedBy = userId as any;
    await entry.save();

    const result = entry.toObject();

    try {
      socketEmitter.queueUpdate(entry.branchId.toString(), {
        type: 'treatment_completed',
        data: {
          id: result._id.toString(),
          branchId: entry.branchId.toString(),
          timestamp: new Date().toISOString(),
          queueNumber: result.queueNumber,
          patientName: result.patientName,
          status: 'completed',
        },
      });
    } catch {
      /* socket errors non-fatal */
    }

    return result;
  }

  /**
   * Mark as no-show
   */
  async markNoShow(id: string, userId: string) {
    const entry = await this.WalkInQueue.findById(id);
    if (!entry) throw ApiError.notFound('Queue entry');
    if (!['waiting', 'called'].includes(entry.status)) {
      throw ApiError.badRequest(`Cannot mark no-show with status '${entry.status}'`);
    }

    entry.status = 'no_show';
    entry.updatedBy = userId as any;
    await entry.save();

    const result = entry.toObject();

    try {
      socketEmitter.queueUpdate(entry.branchId.toString(), {
        type: 'patient_no_show',
        data: {
          id: result._id.toString(),
          branchId: entry.branchId.toString(),
          timestamp: new Date().toISOString(),
          queueNumber: result.queueNumber,
          patientName: result.patientName,
          status: 'no_show',
        },
      });
    } catch {
      /* socket errors non-fatal */
    }

    return result;
  }

  /**
   * Cancel queue entry
   */
  async cancel(id: string, userId: string) {
    const entry = await this.WalkInQueue.findById(id);
    if (!entry) throw ApiError.notFound('Queue entry');
    if (['completed', 'no_show', 'cancelled'].includes(entry.status)) {
      throw ApiError.badRequest(`Cannot cancel entry with status '${entry.status}'`);
    }

    entry.status = 'cancelled';
    entry.updatedBy = userId as any;
    await entry.save();

    return entry.toObject();
  }

  /**
   * Phase 5.6 — Skip a waiting patient (move to back of today's waiting queue).
   * Status stays 'waiting'; queueNumber is reassigned to max(today.waiting)+1.
   */
  async skip(id: string, userId: string) {
    const entry = await this.WalkInQueue.findById(id);
    if (!entry) throw ApiError.notFound('Queue entry');
    if (entry.status !== 'waiting') {
      throw ApiError.badRequest(`Cannot skip entry with status '${entry.status}'`);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const last = await this.WalkInQueue.findOne({
      branchId: entry.branchId,
      createdAt: { $gte: today, $lt: tomorrow },
    })
      .sort({ queueNumber: -1 })
      .select('queueNumber')
      .lean();

    entry.queueNumber = (last?.queueNumber ?? entry.queueNumber) + 1;
    entry.updatedBy = userId as any;
    await entry.save();

    try {
      socketEmitter.queueUpdate(entry.branchId.toString(), {
        type: 'queue_reordered',
        data: {
          id: entry._id.toString(),
          branchId: entry.branchId.toString(),
          timestamp: new Date().toISOString(),
          queueNumber: entry.queueNumber,
          patientName: entry.patientName,
          status: entry.status,
        },
      });
    } catch {
      /* socket errors non-fatal */
    }

    return entry.toObject();
  }

  /**
   * Phase 5.6 — Manually reorder a waiting entry to a target queueNumber by
   * swapping with whoever currently holds it. Both must be `waiting`.
   */
  async reorder(id: string, targetQueueNumber: number, userId: string) {
    const entry = await this.WalkInQueue.findById(id);
    if (!entry) throw ApiError.notFound('Queue entry');
    if (entry.status !== 'waiting') {
      throw ApiError.badRequest(`Cannot reorder entry with status '${entry.status}'`);
    }
    if (!Number.isInteger(targetQueueNumber) || targetQueueNumber < 1) {
      throw ApiError.badRequest('targetQueueNumber must be a positive integer');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const swap = await this.WalkInQueue.findOne({
      branchId: entry.branchId,
      createdAt: { $gte: today, $lt: tomorrow },
      queueNumber: targetQueueNumber,
      status: 'waiting',
      _id: { $ne: entry._id },
    });

    const oldNumber = entry.queueNumber;
    entry.queueNumber = targetQueueNumber;
    entry.updatedBy = userId as any;
    await entry.save();

    if (swap) {
      swap.queueNumber = oldNumber;
      swap.updatedBy = userId as any;
      await swap.save();
    }

    try {
      socketEmitter.queueUpdate(entry.branchId.toString(), {
        type: 'queue_reordered',
        data: {
          id: entry._id.toString(),
          branchId: entry.branchId.toString(),
          timestamp: new Date().toISOString(),
          queueNumber: entry.queueNumber,
          patientName: entry.patientName,
          status: entry.status,
        },
      });
    } catch {
      /* socket errors non-fatal */
    }

    return entry.toObject();
  }

  /**
   * Phase 5.7 — Convert a walk-in to a scheduled appointment.
   * Marks the walk-in as 'completed' and creates an Appointment via the
   * AppointmentService (dynamic import to avoid circular dependency).
   */
  async convertToAppointment(
    id: string,
    slot: {
      doctorId: string;
      date: string; // YYYY-MM-DD
      startTime: string; // HH:mm
      endTime: string; // HH:mm
      appointmentTypeId?: string;
    },
    userId: string,
  ) {
    const entry = await this.WalkInQueue.findById(id);
    if (!entry) throw ApiError.notFound('Queue entry');
    if (!entry.patientId) {
      throw ApiError.badRequest('Walk-in has no linked patient. Register the patient first.');
    }
    if (['completed', 'no_show', 'cancelled'].includes(entry.status)) {
      throw ApiError.badRequest(`Cannot convert entry with status '${entry.status}'`);
    }

    const { AppointmentService } = await import('./appointment.service.js');
    const apptService = new AppointmentService(this.tenantDb);
    const appointment = await apptService.createAppointment(
      {
        patientId: entry.patientId.toString(),
        doctorId: slot.doctorId,
        branchId: entry.branchId.toString(),
        appointmentTypeId: slot.appointmentTypeId,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        notes: entry.reason,
        source: 'walk_in',
      } as any,
      userId,
    );

    entry.status = 'completed';
    entry.completedAt = new Date();
    entry.updatedBy = userId as any;
    await entry.save();

    try {
      socketEmitter.queueUpdate(entry.branchId.toString(), {
        type: 'walk_in_converted',
        data: {
          id: entry._id.toString(),
          branchId: entry.branchId.toString(),
          timestamp: new Date().toISOString(),
          queueNumber: entry.queueNumber,
          patientName: entry.patientName,
          status: 'completed',
        },
      });
    } catch {
      /* socket errors non-fatal */
    }

    return { walkIn: entry.toObject(), appointment };
  }

  /**
   * Get queue stats for a branch (today)
   */
  async getStats(branchId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pipeline = await this.WalkInQueue.aggregate([
      {
        $match: {
          branchId: toMatchId(branchId),
          createdAt: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const stats: Record<string, number> = {
      waiting: 0,
      called: 0,
      in_progress: 0,
      completed: 0,
      no_show: 0,
      cancelled: 0,
    };

    for (const item of pipeline) {
      stats[item._id as string] = item.count;
    }

    return {
      ...stats,
      total: Object.values(stats).reduce((a, b) => a + b, 0),
    };
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
}
