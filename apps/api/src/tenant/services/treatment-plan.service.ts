import type { Connection, QueryFilter, Types } from 'mongoose';
import type { ITreatmentPlan } from '../models/treatment-plan.model.js';
import { getTreatmentPlanModel } from '../models/treatment-plan.model.js';
import { DentalChartService } from './dental-chart.service.js';
import { regexContains, patientNameOrClause } from './search.helpers.js';
import { ApiError } from '../../utils/api-response.js';
import { logger } from '../../utils/logger.js';
import { NotificationService } from '../../services/notification.service.js';
import type {
  CreateTreatmentPlanInput,
  UpdateTreatmentPlanInput,
  TreatmentPlanQuery,
  TreatmentPlanStatusUpdate,
} from '@dento/shared';

/**
 * Treatment Plan Service — Business logic for treatment plan CRUD + status flow
 *
 * Handles:
 * - CRUD for treatment plans with embedded items
 * - Status flow: draft → proposed → accepted → in_progress → completed/cancelled/expired
 * - Financial recalculation (pre-save hook handles discount math)
 * - Signing / consent
 */

// Valid status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['proposed', 'cancelled'],
  proposed: ['accepted', 'cancelled'],
  accepted: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  expired: [],
};

export class TreatmentPlanService {
  private TreatmentPlan;
  private tenantDb: Connection;
  private tenantSlug: string;

  constructor(tenantDb: Connection) {
    this.tenantDb = tenantDb;
    this.tenantSlug = tenantDb.name?.replace('tenant_', '') || '';
    this.TreatmentPlan = getTreatmentPlanModel(tenantDb);
  }

  // ── List Treatment Plans (paginated) ──────────────────────

  async list(query: TreatmentPlanQuery) {
    const { page, limit, patientId, doctorId, status, search, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<ITreatmentPlan> = {};
    if (patientId) filter.patientId = patientId;
    if (doctorId) filter.doctorId = doctorId;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { title: regexContains(search) },
        { description: regexContains(search) },
        { notes: regexContains(search) },
        ...(await patientNameOrClause(this.tenantDb, search)),
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [plans, total] = await Promise.all([
      this.TreatmentPlan.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.TreatmentPlan.countDocuments(filter),
    ]);

    return {
      plans,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Get by ID ─────────────────────────────────────────────

  async getById(id: string) {
    const plan = await this.TreatmentPlan.findById(id).lean();
    if (!plan) {
      throw ApiError.notFound('TreatmentPlan');
    }
    return plan;
  }

  // ── Create ────────────────────────────────────────────────

  async create(data: CreateTreatmentPlanInput) {
    const plan = await this.TreatmentPlan.create(data);
    return plan.toObject();
  }

  // ── Update ────────────────────────────────────────────────

  async update(id: string, data: UpdateTreatmentPlanInput) {
    // Use save() to trigger pre-save financial recalculation
    const plan = await this.TreatmentPlan.findById(id);
    if (!plan) {
      throw ApiError.notFound('TreatmentPlan');
    }

    Object.assign(plan, data);
    await plan.save();

    return plan.toObject();
  }

  // ── Update Status (with transition validation) ────────────

  async updateStatus(id: string, data: TreatmentPlanStatusUpdate) {
    const plan = await this.TreatmentPlan.findById(id);
    if (!plan) {
      throw ApiError.notFound('TreatmentPlan');
    }

    const allowed = STATUS_TRANSITIONS[plan.status] || [];
    if (!allowed.includes(data.status)) {
      throw ApiError.badRequest(
        `Cannot transition from '${plan.status}' to '${data.status}'. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    const previousStatus = plan.status;
    plan.status = data.status;

    // Handle signing
    if (data.patientSignature) {
      plan.patientSignature = data.patientSignature;
      plan.signedAt = new Date();
    }

    await plan.save();

    // Auto-snapshot: capture dental chart state on status transitions
    if (['in_progress', 'completed'].includes(data.status)) {
      // Extract tooth numbers from plan items
      const planTeeth = ((plan.items ?? []) as unknown as Record<string, unknown>[])
        .filter((item: Record<string, unknown>) => item.toothNumber)
        .map((item: Record<string, unknown>) => ({
          toothNumber: parseInt(String(item.toothNumber), 10),
          procedureName: ((item as Record<string, unknown>).procedureName as string) ?? 'treatment',
        }))
        .filter(
          (t: { toothNumber: number }) =>
            !isNaN(t.toothNumber) && t.toothNumber >= 1 && t.toothNumber <= 85,
        );

      this.autoSnapshot(
        plan.patientId.toString(),
        `treatment_plan_${data.status}`,
        planTeeth,
      ).catch((err) =>
        logger.warn({ err }, 'Auto-snapshot failed after treatment plan status change'),
      );
    }

    // Phase 2.6 — Notify patient when plan transitions to 'proposed' (or 'accepted')
    if (previousStatus !== data.status && ['proposed', 'accepted'].includes(data.status)) {
      try {
        const notif = new NotificationService(this.tenantDb, this.tenantSlug);
        notif
          .send({
            templateKey: `treatment_plan.${data.status}`,
            tenantId: this.tenantSlug,
            recipients: [{ patientId: plan.patientId.toString() }],
            variables: {
              planId: plan._id.toString(),
              status: data.status,
              totalCost: String(plan.totalCost ?? 0),
            },
            relatedEntity: { type: 'treatment_plan' as const, id: plan._id.toString() },
          })
          .catch((err) => logger.warn({ err }, 'treatment_plan notification failed'));
      } catch (err) {
        logger.warn({ err }, 'treatment_plan notification setup failed');
      }
    }

    return plan.toObject();
  }

  // ── Delete ────────────────────────────────────────────────

  async delete(id: string) {
    const plan = await this.TreatmentPlan.findById(id);
    if (!plan) {
      throw ApiError.notFound('TreatmentPlan');
    }

    // Only allow deleting draft plans
    if (plan.status !== 'draft') {
      throw ApiError.badRequest('Only draft treatment plans can be deleted');
    }

    await this.TreatmentPlan.deleteOne({ _id: id });
    return { message: 'Treatment plan deleted' };
  }

  // ── Add Item to Plan ──────────────────────────────────────

  async addItem(planId: string, item: Record<string, unknown>) {
    const plan = await this.TreatmentPlan.findById(planId);
    if (!plan) {
      throw ApiError.notFound('TreatmentPlan');
    }

    plan.items.push(item as unknown as ITreatmentPlan['items'][0]);
    await plan.save(); // Triggers financial recalculation

    return plan.toObject();
  }

  // ── Update Item in Plan ───────────────────────────────────

  async updateItem(planId: string, itemId: string, itemData: Record<string, unknown>) {
    const plan = await this.TreatmentPlan.findById(planId);
    if (!plan) {
      throw ApiError.notFound('TreatmentPlan');
    }

    const item = (plan.items as unknown as Types.DocumentArray<ITreatmentPlan['items'][0]>).id(
      itemId,
    );
    if (!item) {
      throw ApiError.notFound('TreatmentPlan item');
    }

    Object.assign(item, itemData);
    await plan.save();

    return plan.toObject();
  }

  // ── Auto-Snapshot Helper ─────────────────────────────────

  private async autoSnapshot(
    patientId: string,
    trigger: string,
    planTeeth?: { toothNumber: number; procedureName: string }[],
  ) {
    const chartService = new DentalChartService(this.tenantDb);
    await chartService.createSnapshot(
      patientId,
      'system',
      `Auto-snapshot: ${trigger}`,
      planTeeth,
      'treatment_plan',
    );
  }

  // ── Remove Item from Plan ─────────────────────────────────

  async removeItem(planId: string, itemId: string) {
    const plan = await this.TreatmentPlan.findByIdAndUpdate(
      planId,
      { $pull: { items: { _id: itemId } } },
      { new: true },
    );

    if (!plan) {
      throw ApiError.notFound('TreatmentPlan');
    }

    // Recalculate financials after item removal
    await plan.save();
    return plan.toObject();
  }
}
