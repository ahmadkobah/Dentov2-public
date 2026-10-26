import type { Connection, QueryFilter, Types } from 'mongoose';
import type { ICbctOrder } from '../models/cbct-order.model.js';
import { getCbctOrderModel } from '../models/cbct-order.model.js';
import { getDoctorModel } from '../models/doctor.model.js';
import { getBranchModel } from '../models/branch.model.js';
import { getPatientModel } from '../models/patient.model.js';
import { getTreatmentPlanModel } from '../models/treatment-plan.model.js';
import { getProcedureNoteModel } from '../models/procedure-note.model.js';
import { regexContains, patientNameOrClause } from './search.helpers.js';
import { ApiError } from '../../utils/api-response.js';
import type { CreateCbctOrderInput, UpdateCbctOrderInput, CbctOrderQuery } from '@dento/shared';

/**
 * CBCT Service — Business logic for CBCT Orders CRUD
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 (#12), §17 (Clinical Cross-Linking)
 * Report is embedded (no separate cbct_reports collection).
 * Status flow: requested → scheduled → completed → reported → cancelled
 */

export class CbctService {
  private CbctOrder;
  private tenantDb: Connection;

  constructor(tenantDb: Connection) {
    this.tenantDb = tenantDb;
    this.CbctOrder = getCbctOrderModel(tenantDb);
    // Register models needed for populate
    getPatientModel(tenantDb);
    getDoctorModel(tenantDb);
    getBranchModel(tenantDb);
  }

  async list(query: CbctOrderQuery) {
    const {
      page,
      limit,
      search,
      patientId,
      requestingDoctorId,
      branchId,
      status,
      priority,
      clinicalPurpose,
      treatmentPlanId,
      scheduledDateFrom,
      scheduledDateTo,
      sortBy,
      sortOrder,
    } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<ICbctOrder> = {};

    if (patientId) filter.patientId = patientId;
    if (requestingDoctorId) filter.requestingDoctorId = requestingDoctorId;
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (clinicalPurpose) filter.clinicalPurpose = clinicalPurpose;
    if (treatmentPlanId) filter.treatmentPlanId = treatmentPlanId;

    if (scheduledDateFrom || scheduledDateTo) {
      filter.scheduledDate = {};
      if (scheduledDateFrom) filter.scheduledDate.$gte = new Date(scheduledDateFrom);
      if (scheduledDateTo) filter.scheduledDate.$lte = new Date(scheduledDateTo);
    }

    if (search) {
      filter.$or = [
        { orderNumber: regexContains(search) },
        { indication: regexContains(search) },
        { clinicalNotes: regexContains(search) },
        ...(await patientNameOrClause(this.tenantDb, search)),
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [orders, total] = await Promise.all([
      this.CbctOrder.find(filter)
        .populate('patientId', 'firstName lastName phone')
        .populate('requestingDoctorId', 'firstName lastName')
        .populate('branchId', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.CbctOrder.countDocuments(filter),
    ]);

    return {
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const order = await this.CbctOrder.findById(id).lean();
    if (!order) throw ApiError.notFound('CBCT Order');
    return order;
  }

  async create(data: CreateCbctOrderInput) {
    const order = await this.CbctOrder.create(data);
    return order.toObject();
  }

  async update(id: string, data: UpdateCbctOrderInput) {
    const order = await this.CbctOrder.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    ).lean();
    if (!order) throw ApiError.notFound('CBCT Order');
    return order;
  }

  async updateStatus(id: string, status: string) {
    const order = await this.CbctOrder.findById(id);
    if (!order) throw ApiError.notFound('CBCT Order');

    const validTransitions: Record<string, string[]> = {
      requested: ['scheduled', 'cancelled'],
      scheduled: ['completed', 'cancelled'],
      completed: ['reported'],
      reported: [],
      cancelled: [],
    };

    const currentStatus = order.status;
    if (!validTransitions[currentStatus]?.includes(status)) {
      throw ApiError.badRequest(`Cannot transition from '${currentStatus}' to '${status}'`);
    }

    order.status = status as ICbctOrder['status'];
    if (status === 'completed') {
      order.completedAt = new Date();
    }
    await order.save();
    return order.toObject();
  }

  async updateScan(id: string, scanData: Record<string, unknown>) {
    const order = await this.CbctOrder.findByIdAndUpdate(
      id,
      { $set: { scan: scanData } },
      { new: true, runValidators: true },
    ).lean();
    if (!order) throw ApiError.notFound('CBCT Order');
    return order;
  }

  async updateReport(id: string, reportData: Record<string, unknown>) {
    const order = await this.CbctOrder.findByIdAndUpdate(
      id,
      { $set: { report: reportData } },
      { new: true, runValidators: true },
    ).lean();
    if (!order) throw ApiError.notFound('CBCT Order');
    return order;
  }

  async delete(id: string) {
    const order = await this.CbctOrder.findById(id);
    if (!order) throw ApiError.notFound('CBCT Order');

    if (order.status !== 'requested') {
      throw ApiError.badRequest('Only orders in "requested" status can be deleted');
    }

    await this.CbctOrder.findByIdAndDelete(id);
    return { message: 'CBCT Order deleted' };
  }

  /** Get all CBCT orders for a patient — for Imaging Timeline */
  async getPatientTimeline(patientId: string) {
    return this.CbctOrder.find({ patientId }).sort({ createdAt: -1 }).lean();
  }

  /** Get unlinked CBCT orders for a patient — for ImagingLinker */
  async getUnlinked(patientId: string) {
    return this.CbctOrder.find({
      patientId,
      treatmentPlanId: { $exists: false },
      procedureNoteId: { $exists: false },
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  // ── Cross-Linking Methods (§17) ─────────────────────────

  /**
   * Link a CBCT order to a treatment plan or procedure note.
   * Updates both the forward FK on the CBCT order AND the reverse array on the target.
   */
  async linkToTarget(
    cbctId: string,
    targetType: 'treatmentPlan' | 'procedureNote',
    targetId: string,
    options?: { treatmentPlanItemId?: string },
  ) {
    const order = await this.CbctOrder.findById(cbctId);
    if (!order) throw ApiError.notFound('CBCT Order');

    if (targetType === 'treatmentPlan') {
      order.treatmentPlanId = targetId as unknown as Types.ObjectId;
      if (options?.treatmentPlanItemId) {
        order.treatmentPlanItemId = options.treatmentPlanItemId as unknown as Types.ObjectId;
      }
      await order.save();

      // Update reverse array on treatment plan
      const TreatmentPlan = getTreatmentPlanModel(this.tenantDb);
      await TreatmentPlan.findByIdAndUpdate(targetId, {
        $addToSet: { linkedCbcts: cbctId },
      });

      if (options?.treatmentPlanItemId) {
        await TreatmentPlan.updateOne(
          { _id: targetId, 'items._id': options.treatmentPlanItemId },
          { $addToSet: { 'items.$.linkedCbcts': cbctId } },
        );
      }
    } else if (targetType === 'procedureNote') {
      order.procedureNoteId = targetId as unknown as Types.ObjectId;
      await order.save();

      const ProcedureNote = getProcedureNoteModel(this.tenantDb);
      await ProcedureNote.findByIdAndUpdate(targetId, {
        $addToSet: { linkedCbcts: cbctId },
      });
    }

    return this.CbctOrder.findById(cbctId).lean();
  }

  /**
   * Unlink a CBCT order from a treatment plan or procedure note.
   */
  async unlinkFromTarget(
    cbctId: string,
    targetType: 'treatmentPlan' | 'procedureNote',
    targetId: string,
  ) {
    const order = await this.CbctOrder.findById(cbctId);
    if (!order) throw ApiError.notFound('CBCT Order');

    if (targetType === 'treatmentPlan') {
      const itemId = order.treatmentPlanItemId;
      order.treatmentPlanId = undefined;
      order.treatmentPlanItemId = undefined;
      await order.save();

      const TreatmentPlan = getTreatmentPlanModel(this.tenantDb);
      await TreatmentPlan.findByIdAndUpdate(targetId, {
        $pull: { linkedCbcts: cbctId },
      });

      if (itemId) {
        await TreatmentPlan.updateOne(
          { _id: targetId, 'items._id': itemId },
          { $pull: { 'items.$.linkedCbcts': cbctId } },
        );
      }
    } else if (targetType === 'procedureNote') {
      order.procedureNoteId = undefined;
      await order.save();

      const ProcedureNote = getProcedureNoteModel(this.tenantDb);
      await ProcedureNote.findByIdAndUpdate(targetId, {
        $pull: { linkedCbcts: cbctId },
      });
    }

    return this.CbctOrder.findById(cbctId).lean();
  }
}
