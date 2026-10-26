/**
 * Lab Order Service — CRUD + Status Flow + Lab Tracking
 *
 * Per V2_DATABASE.md §5.12 — lab_orders collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#13) — Lab Orders
 *
 * Status flow: draft → sent → in_progress → ready → delivered | rejected | cancelled
 */

import type { Connection, QueryFilter } from 'mongoose';
import type { ILabOrder } from '../models/lab-order.model.js';
import { getLabOrderModel } from '../models/lab-order.model.js';
import { getLabOrderTypeModel } from '../models/lab-order-type.model.js';
import { getDentalLabModel } from '../models/dental-lab.model.js';
import { regexContains, patientNameOrClause } from './search.helpers.js';
import { ApiError } from '../../utils/api-response.js';
import { NotificationService } from '../../services/notification.service.js';
import { logger } from '../../utils/logger.js';
import type {
  CreateLabOrderInput,
  UpdateLabOrderInput,
  LabOrderStatusUpdate,
  LabOrderQuery,
} from '@dento/shared';

// Valid status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['in_progress', 'rejected', 'cancelled'],
  in_progress: ['ready', 'rejected', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  rejected: ['draft'],
  cancelled: ['draft'],
};

export class LabOrderService {
  private LabOrder;
  private LabOrderType;
  private DentalLab;
  private tenantDb: Connection;
  private tenantSlug: string;

  constructor(tenantDb: Connection) {
    this.tenantDb = tenantDb;
    this.tenantSlug = tenantDb.name?.replace('tenant_', '') || '';
    this.LabOrder = getLabOrderModel(tenantDb);
    this.LabOrderType = getLabOrderTypeModel(tenantDb);
    this.DentalLab = getDentalLabModel(tenantDb);
  }

  async list(query: LabOrderQuery) {
    const {
      page,
      limit,
      search,
      status,
      patientId,
      doctorId,
      dentalLabId,
      branchId,
      fromDate,
      toDate,
      sortBy,
      sortOrder,
    } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<ILabOrder> = {};
    if (status) filter.status = status;
    if (patientId) filter.patientId = patientId;
    if (doctorId) filter.doctorId = doctorId;
    if (dentalLabId) filter.dentalLabId = dentalLabId;
    if (branchId) filter.branchId = branchId;
    if (fromDate || toDate) {
      filter.orderDate = {};
      if (fromDate) filter.orderDate.$gte = fromDate;
      if (toDate) filter.orderDate.$lte = toDate;
    }
    if (search) {
      filter.$or = [
        { orderNumber: regexContains(search) },
        { description: regexContains(search) },
        { shade: regexContains(search) },
        ...(await patientNameOrClause(this.tenantDb, search)),
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [labOrders, total] = await Promise.all([
      this.LabOrder.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.LabOrder.countDocuments(filter),
    ]);

    return {
      labOrders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const labOrder = await this.LabOrder.findById(id).lean();
    if (!labOrder) throw ApiError.notFound('Lab Order');
    return labOrder;
  }

  async create(data: CreateLabOrderInput, createdBy: string) {
    // Validate dental lab exists
    const lab = await this.DentalLab.findById(data.dentalLabId).lean();
    if (!lab) throw ApiError.notFound('Dental Lab');
    if (!lab.isActive) throw ApiError.badRequest('Dental Lab is not active');

    // Validate lab order type exists
    const orderType = await this.LabOrderType.findById(data.labOrderTypeId).lean();
    if (!orderType) throw ApiError.notFound('Lab Order Type');

    // Auto-calculate expected delivery date if not provided
    let expectedDeliveryDate = data.expectedDeliveryDate;
    if (!expectedDeliveryDate) {
      const turnaroundDays = orderType.defaultTurnaroundDays || lab.defaultTurnaroundDays || 7;
      const date = new Date(data.orderDate || Date.now());
      date.setDate(date.getDate() + turnaroundDays);
      expectedDeliveryDate = date;
    }

    const labOrder = await this.LabOrder.create({
      ...data,
      expectedDeliveryDate,
      status: 'draft',
      createdBy,
    });

    return labOrder.toJSON();
  }

  async update(id: string, data: UpdateLabOrderInput) {
    const existing = await this.LabOrder.findById(id);
    if (!existing) throw ApiError.notFound('Lab Order');

    // Only allow updates on draft/sent orders for most fields
    if (!['draft', 'sent'].includes(existing.status)) {
      const allowedOnInProgress = [
        'tryInDate',
        'tryInNotes',
        'adjustmentRequired',
        'adjustmentNotes',
        'cost',
        'isPaid',
        'attachments',
      ];
      const keys = Object.keys(data);
      const disallowed = keys.filter((k) => !allowedOnInProgress.includes(k));
      if (disallowed.length > 0) {
        throw ApiError.badRequest(
          `Cannot update fields [${disallowed.join(', ')}] when status is ${existing.status}`,
        );
      }
    }

    const labOrder = await this.LabOrder.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    ).lean();
    if (!labOrder) throw ApiError.notFound('Lab Order');
    return labOrder;
  }

  async updateStatus(id: string, update: LabOrderStatusUpdate) {
    const labOrder = await this.LabOrder.findById(id);
    if (!labOrder) throw ApiError.notFound('Lab Order');

    const allowed = STATUS_TRANSITIONS[labOrder.status] || [];
    if (!allowed.includes(update.status)) {
      throw ApiError.badRequest(
        `Cannot transition from "${labOrder.status}" to "${update.status}". Allowed: [${allowed.join(', ')}]`,
      );
    }

    labOrder.status = update.status;
    if (update.status === 'delivered') {
      labOrder.actualDeliveryDate = update.actualDeliveryDate || new Date();
    }
    await labOrder.save();

    // Phase 2.7 — Notify patient when prosthesis is ready for try-in/pickup
    if (update.status === 'ready') {
      try {
        const notif = new NotificationService(this.tenantDb, this.tenantSlug);
        notif
          .send({
            templateKey: 'lab_order.ready',
            tenantId: this.tenantSlug,
            recipients: [{ patientId: labOrder.patientId.toString() }],
            variables: {
              orderNumber: labOrder.orderNumber,
              description: labOrder.description ?? '',
            },
            relatedEntity: { type: 'patient' as const, id: labOrder.patientId.toString() },
          })
          .catch((err) => logger.warn({ err }, 'lab_order.ready notification failed'));
      } catch (err) {
        logger.warn({ err }, 'lab_order.ready notification setup failed');
      }
    }

    return labOrder.toJSON();
  }

  async getStats(branchId?: string) {
    const match: QueryFilter<ILabOrder> = {};
    if (branchId) match.branchId = branchId;

    const stats = await this.LabOrder.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalCost: { $sum: '$cost' },
        },
      },
    ]);

    const overdue = await this.LabOrder.countDocuments({
      ...match,
      status: { $in: ['sent', 'in_progress'] },
      expectedDeliveryDate: { $lt: new Date() },
    });

    return { statusBreakdown: stats, overdue };
  }
}
