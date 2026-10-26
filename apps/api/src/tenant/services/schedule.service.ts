import type { Connection, QueryFilter } from 'mongoose';
import { getDoctorScheduleModel } from '../models/doctor-schedule.model.js';
import { getScheduleExceptionModel } from '../models/schedule-exception.model.js';
import { getShiftTemplateModel } from '../models/shift-template.model.js';
import { getStaffScheduleModel } from '../models/staff-schedule.model.js';
import { getBranchModel } from '../models/branch.model.js';
import { ApiError } from '../../utils/api-response.js';
import type {
  CreateDoctorScheduleInput,
  UpdateDoctorScheduleInput,
  DoctorScheduleQuery,
  CreateScheduleExceptionInput,
  UpdateScheduleExceptionInput,
  ReviewScheduleExceptionInput,
  ScheduleExceptionQuery,
  CreateShiftTemplateInput,
  UpdateShiftTemplateInput,
  ShiftTemplateQuery,
  CreateStaffScheduleInput,
  UpdateStaffScheduleInput,
  StaffScheduleQuery,
  PublishStaffScheduleInput,
  UpdateBranchHolidaysInput,
  UpdateSlotConfigInput,
  UpdateOnlineBookingConfigInput,
} from '@dento/shared';

/**
 * Schedule Service — Doctor Schedules, Exceptions, Shift Templates, Staff Schedules, Branch Config
 *
 * Per BUILD_RULES §5.2 — Service layer (constructor receives Connection)
 */
export class ScheduleService {
  private DoctorSchedule;
  private ScheduleException;
  private ShiftTemplate;
  private StaffSchedule;
  private Branch;

  constructor(tenantDb: Connection) {
    this.DoctorSchedule = getDoctorScheduleModel(tenantDb);
    this.ScheduleException = getScheduleExceptionModel(tenantDb);
    this.ShiftTemplate = getShiftTemplateModel(tenantDb);
    this.StaffSchedule = getStaffScheduleModel(tenantDb);
    this.Branch = getBranchModel(tenantDb);
  }

  // ── Doctor Schedules ──────────────────────────────────────

  async listDoctorSchedules(query: DoctorScheduleQuery) {
    const { page, limit, ...filters } = query;
    const skip = (page - 1) * limit;
    const filter: QueryFilter<unknown> = {};

    if (filters.doctorId) filter.doctorId = filters.doctorId;
    if (filters.branchId) filter.branchId = filters.branchId;
    if (filters.scheduleType) filter.scheduleType = filters.scheduleType;
    if (filters.dayOfWeek !== undefined) filter.dayOfWeek = filters.dayOfWeek;
    if (filters.isActive !== undefined) filter.isActive = filters.isActive;
    else filter.isActive = true;
    if (filters.isRamadanSchedule !== undefined)
      filter.isRamadanSchedule = filters.isRamadanSchedule;

    const [schedules, total] = await Promise.all([
      this.DoctorSchedule.find(filter).skip(skip).limit(limit).sort({ dayOfWeek: 1 }).lean(),
      this.DoctorSchedule.countDocuments(filter),
    ]);

    return { schedules, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createDoctorSchedule(data: CreateDoctorScheduleInput, userId: string) {
    return this.DoctorSchedule.create({ ...data, createdBy: userId, updatedBy: userId });
  }

  async updateDoctorSchedule(id: string, data: UpdateDoctorScheduleInput, userId: string) {
    const schedule = await this.DoctorSchedule.findByIdAndUpdate(
      id,
      { ...data, updatedBy: userId },
      { new: true },
    ).lean();
    if (!schedule) throw ApiError.notFound('DoctorSchedule');
    return schedule;
  }

  async deleteDoctorSchedule(id: string, userId: string) {
    const schedule = await this.DoctorSchedule.findByIdAndUpdate(
      id,
      { isActive: false, updatedBy: userId },
      { new: true },
    ).lean();
    if (!schedule) throw ApiError.notFound('DoctorSchedule');
    return schedule;
  }

  // ── Schedule Exceptions ───────────────────────────────────

  async listExceptions(query: ScheduleExceptionQuery) {
    const { page, limit, ...filters } = query;
    const skip = (page - 1) * limit;
    const filter: QueryFilter<unknown> = { isActive: true };

    if (filters.doctorId) filter.doctorId = filters.doctorId;
    if (filters.branchId) filter.branchId = filters.branchId;
    if (filters.exceptionType) filter.exceptionType = filters.exceptionType;
    if (filters.status) filter.status = filters.status;
    if (filters.dateFrom || filters.dateTo) {
      filter.startDate = {} as Record<string, string>;
      if (filters.dateFrom) (filter.startDate as Record<string, string>).$gte = filters.dateFrom;
      if (filters.dateTo) (filter.startDate as Record<string, string>).$lte = filters.dateTo;
    }

    const [exceptions, total] = await Promise.all([
      this.ScheduleException.find(filter).skip(skip).limit(limit).sort({ startDate: -1 }).lean(),
      this.ScheduleException.countDocuments(filter),
    ]);

    return { exceptions, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createException(data: CreateScheduleExceptionInput, userId: string) {
    return this.ScheduleException.create({
      ...data,
      status: 'pending',
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async updateException(id: string, data: UpdateScheduleExceptionInput, userId: string) {
    const exception = await this.ScheduleException.findByIdAndUpdate(
      id,
      { ...data, updatedBy: userId },
      { new: true },
    ).lean();
    if (!exception) throw ApiError.notFound('ScheduleException');
    return exception;
  }

  async reviewException(id: string, data: ReviewScheduleExceptionInput, userId: string) {
    const exception = await this.ScheduleException.findById(id);
    if (!exception) throw ApiError.notFound('ScheduleException');
    if (exception.status !== 'pending') {
      throw ApiError.badRequest('Only pending exceptions can be reviewed');
    }

    exception.status = data.status as typeof exception.status;
    exception.updatedBy = userId as unknown as typeof exception.updatedBy;

    if (data.status === 'approved') {
      exception.approvedBy = userId as unknown as typeof exception.approvedBy;

      // Auto-deactivate overlapping doctor schedules for the exception period
      if (exception.isFullDay && exception.doctorId) {
        await this.DoctorSchedule.updateMany(
          {
            doctorId: exception.doctorId,
            isActive: true,
            scheduleType: 'override',
            specificDate: { $gte: exception.startDate, $lte: exception.endDate },
          },
          { isActive: false, updatedBy: userId },
        );
      }
    } else {
      exception.rejectionReason = data.rejectionReason ?? '';
    }

    await exception.save();
    return exception.toObject();
  }

  async deleteException(id: string, userId: string) {
    const exception = await this.ScheduleException.findByIdAndUpdate(
      id,
      { isActive: false, updatedBy: userId },
      { new: true },
    ).lean();
    if (!exception) throw ApiError.notFound('ScheduleException');
    return exception;
  }

  // ── Shift Templates ───────────────────────────────────────

  async listShiftTemplates(query: ShiftTemplateQuery) {
    const { page, limit, ...filters } = query;
    const skip = (page - 1) * limit;
    const filter: QueryFilter<unknown> = {};

    if (filters.branchId) filter.branchId = filters.branchId;
    if (filters.shiftType) filter.shiftType = filters.shiftType;
    if (filters.isActive !== undefined) filter.isActive = filters.isActive;
    else filter.isActive = true;

    const [shifts, total] = await Promise.all([
      this.ShiftTemplate.find(filter).skip(skip).limit(limit).sort({ startTime: 1 }).lean(),
      this.ShiftTemplate.countDocuments(filter),
    ]);

    return { shifts, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createShiftTemplate(data: CreateShiftTemplateInput, userId: string) {
    // Use the document constructor + save() rather than Model.create(): mongoose 9 tightened
    // create()'s argument typing, which rejects the string createdBy/updatedBy ids (model fields are
    // ObjectId) and the CreateShiftTemplateInput/model shiftType enum divergence. The constructor
    // accepts these and casts at runtime exactly as create() did.
    const shift = new this.ShiftTemplate({ ...data, createdBy: userId, updatedBy: userId });
    await shift.save();
    return shift;
  }

  async updateShiftTemplate(id: string, data: UpdateShiftTemplateInput, userId: string) {
    const shift = await this.ShiftTemplate.findByIdAndUpdate(
      id,
      { ...data, updatedBy: userId },
      { new: true },
    ).lean();
    if (!shift) throw ApiError.notFound('ShiftTemplate');
    return shift;
  }

  async deleteShiftTemplate(id: string, userId: string) {
    const shift = await this.ShiftTemplate.findByIdAndUpdate(
      id,
      { isActive: false, updatedBy: userId },
      { new: true },
    ).lean();
    if (!shift) throw ApiError.notFound('ShiftTemplate');
    return shift;
  }

  // ── Staff Schedules ───────────────────────────────────────

  async listStaffSchedules(query: StaffScheduleQuery) {
    const { page, limit, ...filters } = query;
    const skip = (page - 1) * limit;
    const filter: QueryFilter<unknown> = { isActive: true };

    if (filters.userId) filter.userId = filters.userId;
    if (filters.branchId) filter.branchId = filters.branchId;
    if (filters.role) filter.role = filters.role;
    if (filters.isPublished !== undefined) filter.isPublished = filters.isPublished;
    if (filters.isRamadanSchedule !== undefined)
      filter.isRamadanSchedule = filters.isRamadanSchedule;
    if (filters.dateFrom || filters.dateTo) {
      filter.scheduleDate = {} as Record<string, string>;
      if (filters.dateFrom) (filter.scheduleDate as Record<string, string>).$gte = filters.dateFrom;
      if (filters.dateTo) (filter.scheduleDate as Record<string, string>).$lte = filters.dateTo;
    }

    const [schedules, total] = await Promise.all([
      this.StaffSchedule.find(filter).skip(skip).limit(limit).sort({ scheduleDate: 1 }).lean(),
      this.StaffSchedule.countDocuments(filter),
    ]);

    return { schedules, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createStaffSchedule(data: CreateStaffScheduleInput, userId: string) {
    return this.StaffSchedule.create({ ...data, createdBy: userId, updatedBy: userId });
  }

  async updateStaffSchedule(id: string, data: UpdateStaffScheduleInput, userId: string) {
    const schedule = await this.StaffSchedule.findByIdAndUpdate(
      id,
      { ...data, updatedBy: userId },
      { new: true },
    ).lean();
    if (!schedule) throw ApiError.notFound('StaffSchedule');
    return schedule;
  }

  async deleteStaffSchedule(id: string, userId: string) {
    const schedule = await this.StaffSchedule.findByIdAndUpdate(
      id,
      { isActive: false, updatedBy: userId },
      { new: true },
    ).lean();
    if (!schedule) throw ApiError.notFound('StaffSchedule');
    return schedule;
  }

  async publishStaffSchedules(data: PublishStaffScheduleInput, userId: string) {
    const result = await this.StaffSchedule.updateMany(
      { _id: { $in: data.scheduleIds }, isActive: true, isPublished: false },
      { isPublished: true, updatedBy: userId },
    );

    return { publishedCount: result.modifiedCount };
  }

  // ── Branch Config ─────────────────────────────────────────

  async updateBranchHolidays(branchId: string, data: UpdateBranchHolidaysInput, userId: string) {
    const branch = await this.Branch.findByIdAndUpdate(
      branchId,
      { holidays: data.holidays, updatedBy: userId },
      { new: true },
    ).lean();
    if (!branch) throw ApiError.notFound('Branch');
    return branch.holidays;
  }

  async updateSlotConfig(branchId: string, data: UpdateSlotConfigInput, userId: string) {
    const updateFields: Record<string, unknown> = { updatedBy: userId };
    for (const [key, value] of Object.entries(data)) {
      updateFields[`slotConfig.${key}`] = value;
    }

    const branch = await this.Branch.findByIdAndUpdate(branchId, updateFields, {
      new: true,
    }).lean();
    if (!branch) throw ApiError.notFound('Branch');
    return branch.slotConfig;
  }

  async updateOnlineBookingConfig(
    branchId: string,
    data: UpdateOnlineBookingConfigInput,
    userId: string,
  ) {
    const updateFields: Record<string, unknown> = { updatedBy: userId };
    for (const [key, value] of Object.entries(data)) {
      updateFields[`onlineBookingConfig.${key}`] = value;
    }

    const branch = await this.Branch.findByIdAndUpdate(branchId, updateFields, {
      new: true,
    }).lean();
    if (!branch) throw ApiError.notFound('Branch');
    return branch.onlineBookingConfig;
  }
}
