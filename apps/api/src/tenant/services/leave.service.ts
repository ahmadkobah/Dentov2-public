import type { Connection, QueryFilter } from 'mongoose';
import { getLeaveRequestModel, type ILeaveRequest } from '../models/leave-request.model.js';
import { getLeaveTypeModel } from '../models/leave-type.model.js';
import { getLeaveBalanceModel } from '../models/leave-balance.model.js';
import {
  getScheduleExceptionModel,
  type ExceptionType,
} from '../models/schedule-exception.model.js';
import { ApiError } from '../../utils/api-response.js';
import type {
  CreateLeaveRequestInput,
  UpdateLeaveRequestInput,
  ReviewLeaveRequestInput,
  LeaveRequestQuery,
  CreateLeaveTypeInput,
  UpdateLeaveTypeInput,
  LeaveTypeQuery,
  LeaveBalanceQuery,
  UpdateLeaveBalanceInput,
} from '@dento/shared';

/**
 * Leave Service — Leave requests, types, balances + schedule sync
 *
 * Per IMPLEMENTATION_ROADMAP.md §Phase 3, Week 9:
 * - Leave Request CRUD + review (approve/reject)
 * - Approved Leave → Auto schedule_exception creation
 * - Leave balance tracking (yearly per user per type)
 *
 * Per BUILD_RULES §5.2 — Service layer (constructor receives Connection)
 */

export class LeaveService {
  private LeaveRequest;
  private LeaveType;
  private LeaveBalance;
  private ScheduleException;

  constructor(tenantDb: Connection) {
    this.LeaveRequest = getLeaveRequestModel(tenantDb);
    this.LeaveType = getLeaveTypeModel(tenantDb);
    this.LeaveBalance = getLeaveBalanceModel(tenantDb);
    this.ScheduleException = getScheduleExceptionModel(tenantDb);
  }

  // ── Leave Types ───────────────────────────────────────────

  async listTypes(query: LeaveTypeQuery) {
    const { page, limit, isActive } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<unknown> = {};
    if (isActive !== undefined) filter.isActive = isActive;
    else filter.isActive = true;

    const [types, total] = await Promise.all([
      this.LeaveType.find(filter).skip(skip).limit(limit).sort({ code: 1 }).lean(),
      this.LeaveType.countDocuments(filter),
    ]);

    return { types, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createType(data: CreateLeaveTypeInput, userId: string) {
    const existing = await this.LeaveType.findOne({ code: data.code }).lean();
    if (existing) throw ApiError.badRequest(`Leave type with code "${data.code}" already exists`);

    return this.LeaveType.create({ ...data, createdBy: userId, updatedBy: userId });
  }

  async updateType(id: string, data: UpdateLeaveTypeInput, userId: string) {
    const type = await this.LeaveType.findByIdAndUpdate(
      id,
      { ...data, updatedBy: userId },
      { new: true },
    ).lean();
    if (!type) throw ApiError.notFound('LeaveType');
    return type;
  }

  async deleteType(id: string, userId: string) {
    const type = await this.LeaveType.findByIdAndUpdate(
      id,
      { isActive: false, updatedBy: userId },
      { new: true },
    ).lean();
    if (!type) throw ApiError.notFound('LeaveType');
    return type;
  }

  // ── Leave Requests ────────────────────────────────────────

  async listRequests(query: LeaveRequestQuery) {
    const { page, limit, userId, leaveTypeId, status, dateFrom, dateTo, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<ILeaveRequest> = {};
    if (userId) filter.userId = userId;
    if (leaveTypeId) filter.leaveTypeId = leaveTypeId;
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.startDate = {};
      if (dateFrom) filter.startDate.$gte = dateFrom;
      if (dateTo) filter.startDate.$lte = dateTo;
    }

    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [requests, total] = await Promise.all([
      this.LeaveRequest.find(filter).skip(skip).limit(limit).sort(sort).lean(),
      this.LeaveRequest.countDocuments(filter),
    ]);

    return { requests, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getRequestById(id: string) {
    const request = await this.LeaveRequest.findById(id).lean();
    if (!request) throw ApiError.notFound('LeaveRequest');
    return request;
  }

  async createRequest(data: CreateLeaveRequestInput, userId: string) {
    // Validate leave type exists and is active
    const leaveType = await this.LeaveType.findById(data.leaveTypeId).lean();
    if (!leaveType || !leaveType.isActive) {
      throw ApiError.badRequest('Leave type not found or inactive');
    }

    // Calculate total days (simple date diff)
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end < start) throw ApiError.badRequest('endDate must be after startDate');
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Check max days per request
    if (leaveType.maxDaysPerRequest && totalDays > leaveType.maxDaysPerRequest) {
      throw ApiError.badRequest(
        `Maximum ${leaveType.maxDaysPerRequest} days per request for ${leaveType.name.en}`,
      );
    }

    // Check leave balance
    const year = start.getFullYear();
    const balance = await this.LeaveBalance.findOne({
      userId,
      leaveTypeId: data.leaveTypeId,
      year,
    }).lean();

    if (balance && balance.remainingDays < totalDays) {
      throw ApiError.badRequest(
        `Insufficient leave balance. Available: ${balance.remainingDays} days, Requested: ${totalDays} days`,
      );
    }

    // Auto-approve if type doesn't require approval
    const status = leaveType.isApprovalRequired ? 'pending' : 'approved';
    const approvedBy = leaveType.isApprovalRequired ? undefined : userId;
    const approvedAt = leaveType.isApprovalRequired ? undefined : new Date();

    const request = await this.LeaveRequest.create({
      ...data,
      userId,
      totalDays,
      status,
      approvedBy,
      approvedAt,
      createdBy: userId,
      updatedBy: userId,
    });

    // If auto-approved, sync with schedule
    if (status === 'approved') {
      await this.syncLeaveToSchedule(request.toObject(), userId);
      await this.deductLeaveBalance(userId, data.leaveTypeId, year, totalDays, userId);
    }

    return request;
  }

  async updateRequest(id: string, data: UpdateLeaveRequestInput, userId: string) {
    const request = await this.LeaveRequest.findById(id);
    if (!request) throw ApiError.notFound('LeaveRequest');
    if (request.status !== 'pending') {
      throw ApiError.badRequest('Only pending leave requests can be updated');
    }

    if (data.startDate || data.endDate) {
      const start = new Date(data.startDate ?? request.startDate);
      const end = new Date(data.endDate ?? request.endDate);
      if (end < start) throw ApiError.badRequest('endDate must be after startDate');
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      (data as Record<string, unknown>).totalDays = totalDays;
    }

    const updated = await this.LeaveRequest.findByIdAndUpdate(
      id,
      { ...data, updatedBy: userId },
      { new: true },
    ).lean();

    return updated;
  }

  async cancelRequest(id: string, userId: string) {
    const request = await this.LeaveRequest.findById(id);
    if (!request) throw ApiError.notFound('LeaveRequest');
    if (request.status === 'cancelled') {
      throw ApiError.badRequest('Leave request is already cancelled');
    }

    // If it was approved, restore balance
    if (request.status === 'approved') {
      const year = new Date(request.startDate).getFullYear();
      await this.restoreLeaveBalance(
        request.userId.toString(),
        request.leaveTypeId.toString(),
        year,
        request.totalDays,
        userId,
      );
    }

    request.status = 'cancelled';
    request.updatedBy = userId as unknown as typeof request.updatedBy;
    await request.save();

    return request.toObject();
  }

  async reviewRequest(id: string, data: ReviewLeaveRequestInput, reviewerId: string) {
    const request = await this.LeaveRequest.findById(id);
    if (!request) throw ApiError.notFound('LeaveRequest');
    if (request.status !== 'pending') {
      throw ApiError.badRequest('Only pending leave requests can be reviewed');
    }

    request.status = data.status;
    request.updatedBy = reviewerId as unknown as typeof request.updatedBy;

    if (data.status === 'approved') {
      request.approvedBy = reviewerId as unknown as typeof request.approvedBy;
      request.approvedAt = new Date();
      await request.save();

      // Leave → Schedule sync: create schedule exception
      await this.syncLeaveToSchedule(request.toObject(), reviewerId);

      // Deduct from balance
      const year = new Date(request.startDate).getFullYear();
      await this.deductLeaveBalance(
        request.userId.toString(),
        request.leaveTypeId.toString(),
        year,
        request.totalDays,
        reviewerId,
      );
    } else {
      request.rejectionReason = data.rejectionReason ?? '';
      await request.save();
    }

    return request.toObject();
  }

  // ── Leave Balances ────────────────────────────────────────

  async listBalances(query: LeaveBalanceQuery) {
    const filter: QueryFilter<unknown> = {};
    if (query.userId) filter.userId = query.userId;
    if (query.year) filter.year = query.year;
    else filter.year = new Date().getFullYear();

    return this.LeaveBalance.find(filter).lean();
  }

  async getOrCreateBalance(
    userId: string,
    leaveTypeId: string,
    year: number,
    actingUserId?: string,
  ) {
    let balance = await this.LeaveBalance.findOne({ userId, leaveTypeId, year }).lean();

    if (!balance) {
      const leaveType = await this.LeaveType.findById(leaveTypeId).lean();
      if (!leaveType) throw ApiError.notFound('LeaveType');

      balance = (await this.LeaveBalance.create({
        userId,
        leaveTypeId,
        year,
        totalAllowance: leaveType.maxDaysPerYear,
        usedDays: 0,
        remainingDays: leaveType.maxDaysPerYear,
        carriedForward: 0,
        createdBy: actingUserId ?? userId,
        updatedBy: actingUserId ?? userId,
      })) as any;
    }

    return balance;
  }

  async updateBalance(id: string, data: UpdateLeaveBalanceInput, userId: string) {
    const balance = await this.LeaveBalance.findById(id);
    if (!balance) throw ApiError.notFound('LeaveBalance');

    if (data.totalAllowance !== undefined) {
      balance.totalAllowance = data.totalAllowance;
      balance.remainingDays = data.totalAllowance + balance.carriedForward - balance.usedDays;
    }
    if (data.carriedForward !== undefined) {
      balance.carriedForward = data.carriedForward;
      balance.remainingDays = balance.totalAllowance + data.carriedForward - balance.usedDays;
    }

    balance.updatedBy = userId as unknown as typeof balance.updatedBy;
    await balance.save();

    return balance.toObject();
  }

  // ── Leave ↔ Schedule Sync ─────────────────────────────────

  /**
   * When a leave request is approved, create schedule_exception entries.
   * This blocks the doctor/staff from being assigned shifts.
   */
  private async syncLeaveToSchedule(request: ILeaveRequest, approvedBy: string) {
    const leaveType = await this.LeaveType.findById(request.leaveTypeId).lean();
    if (!leaveType) return;

    // Map leave type to exception type
    const typeMap: Record<string, ExceptionType> = {
      annual: 'vacation',
      sick: 'sick_leave',
      emergency: 'day_off',
      personal: 'day_off',
      unpaid: 'day_off',
    };

    const exceptionType: ExceptionType = typeMap[leaveType.code] ?? 'day_off';

    // Use the document constructor + save() rather than Model.create(): mongoose 9 tightened
    // create()'s argument typing (rejecting string ObjectId ids and the extra `notes` property,
    // which the schema has always silently dropped). The constructor preserves the prior runtime
    // behaviour exactly.
    const exception = new this.ScheduleException({
      doctorId: request.userId, // Works for both doctors and staff
      branchId: null, // All branches
      exceptionType,
      startDate: request.startDate,
      endDate: request.endDate,
      isFullDay: true,
      status: 'approved',
      approvedBy,
      reason: `Auto-created from leave request: ${leaveType.name.en}`,
      notes: request.reason || '',
      isActive: true,
      createdBy: approvedBy,
      updatedBy: approvedBy,
    });
    await exception.save();
  }

  private async deductLeaveBalance(
    userId: string,
    leaveTypeId: string,
    year: number,
    days: number,
    actingUserId: string,
  ) {
    await this.getOrCreateBalance(userId, leaveTypeId, year, actingUserId);
    await this.LeaveBalance.findOneAndUpdate(
      { userId, leaveTypeId, year },
      {
        $inc: { usedDays: days, remainingDays: -days },
        $set: { updatedBy: actingUserId },
      },
    );
  }

  private async restoreLeaveBalance(
    userId: string,
    leaveTypeId: string,
    year: number,
    days: number,
    actingUserId: string,
  ) {
    await this.LeaveBalance.findOneAndUpdate(
      { userId, leaveTypeId, year },
      {
        $inc: { usedDays: -days, remainingDays: days },
        $set: { updatedBy: actingUserId },
      },
    );
  }
}
