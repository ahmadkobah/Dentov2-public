import type { Connection, QueryFilter } from 'mongoose';
import {
  getAttendanceModel,
  type IAttendance,
  type AttendanceStatus,
} from '../models/attendance.model.js';
import { getStaffScheduleModel } from '../models/staff-schedule.model.js';
import { ApiError } from '../../utils/api-response.js';
import type {
  ClockInInput,
  ClockOutInput,
  AttendanceQuery,
  ManualAttendanceInput,
} from '@dento/shared';

/**
 * Attendance Service — Clock in/out, hours calculation, late detection
 *
 * Per IMPLEMENTATION_ROADMAP.md §Phase 3, Week 9:
 * - Clock in (creates attendance record)
 * - Clock out (updates record, calculates hours)
 * - Status detection (present, late, absent, half_day)
 * - List with filters
 *
 * Per BUILD_RULES §5.2 — Service layer (constructor receives Connection)
 */

export class AttendanceService {
  private Attendance;
  private StaffSchedule;

  constructor(tenantDb: Connection) {
    this.Attendance = getAttendanceModel(tenantDb);
    this.StaffSchedule = getStaffScheduleModel(tenantDb);
  }

  // ── List Attendance ───────────────────────────────────────

  async list(query: AttendanceQuery) {
    const { page, limit, userId, branchId, dateFrom, dateTo, status, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IAttendance> = {};
    if (userId) filter.userId = userId;
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;

    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = dateFrom;
      if (dateTo) filter.date.$lte = dateTo;
    }

    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [records, total] = await Promise.all([
      this.Attendance.find(filter).skip(skip).limit(limit).sort(sort).lean(),
      this.Attendance.countDocuments(filter),
    ]);

    return { records, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Clock In ──────────────────────────────────────────────

  async clockIn(data: ClockInInput, userId: string) {
    const today = new Date().toISOString().split('T')[0];

    // Check if already clocked in today
    const existing = await this.Attendance.findOne({ userId, date: today }).lean();
    if (existing) {
      throw ApiError.badRequest('Already clocked in today');
    }

    const now = new Date();
    const checkInTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Find scheduled start time to calculate lateness
    const schedule = await this.StaffSchedule.findOne({
      userId,
      branchId: data.branchId,
      scheduleDate: today,
      isActive: true,
    }).lean();

    let scheduledStart: string | undefined;
    let scheduledEnd: string | undefined;
    let lateMinutes = 0;
    let status: AttendanceStatus = 'present';

    if (schedule) {
      scheduledStart = schedule.startTime;
      scheduledEnd = schedule.endTime;

      // Calculate late minutes
      if (scheduledStart) {
        const scheduledMinutes = this.timeToMinutes(scheduledStart);
        const actualMinutes = this.timeToMinutes(checkInTime);
        if (actualMinutes > scheduledMinutes) {
          lateMinutes = actualMinutes - scheduledMinutes;
          status = 'late';
        }
      }
    }

    const record = await this.Attendance.create({
      userId,
      branchId: data.branchId,
      date: today,
      checkIn: checkInTime,
      scheduledStart,
      scheduledEnd,
      status,
      lateMinutes,
      notes: data.notes,
      createdBy: userId,
      updatedBy: userId,
    });

    return record.toObject();
  }

  // ── Clock Out ─────────────────────────────────────────────

  async clockOut(data: ClockOutInput, userId: string) {
    const today = new Date().toISOString().split('T')[0];

    const record = await this.Attendance.findOne({ userId, date: today });
    if (!record) {
      throw ApiError.badRequest('No clock-in record found for today');
    }
    if (record.checkOut) {
      throw ApiError.badRequest('Already clocked out today');
    }

    const now = new Date();
    const checkOutTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    record.checkOut = checkOutTime;
    record.updatedBy = userId as unknown as typeof record.updatedBy;

    // Calculate actual hours
    const checkInMinutes = this.timeToMinutes(record.checkIn!);
    const checkOutMinutes = this.timeToMinutes(checkOutTime);
    let workedMinutes = checkOutMinutes - checkInMinutes;

    // Subtract break if recorded
    if (record.breakStart && record.breakEnd) {
      const breakMinutes =
        this.timeToMinutes(record.breakEnd) - this.timeToMinutes(record.breakStart);
      workedMinutes -= breakMinutes;
    }

    record.actualHours = Math.max(0, workedMinutes / 60);

    // Determine if half-day (less than 4 hours)
    if (record.actualHours < 4 && record.status !== 'late') {
      record.status = 'half_day';
    }

    // Calculate overtime if scheduled end exists
    if (record.scheduledEnd) {
      const scheduledEndMinutes = this.timeToMinutes(record.scheduledEnd);
      if (checkOutMinutes > scheduledEndMinutes) {
        record.overtime = (checkOutMinutes - scheduledEndMinutes) / 60;
      }
    }

    if (data.notes) {
      record.notes = data.notes;
    }

    await record.save();
    return record.toObject();
  }

  // ── Manual Attendance ─────────────────────────────────────

  async createManual(data: ManualAttendanceInput, creatorId: string) {
    const existing = await this.Attendance.findOne({
      userId: data.userId,
      date: data.date,
    }).lean();
    if (existing) {
      throw ApiError.badRequest(`Attendance record already exists for ${data.date}`);
    }

    // Calculate actual hours
    let actualHours = 0;
    if (data.checkIn && data.checkOut) {
      let workedMinutes = this.timeToMinutes(data.checkOut) - this.timeToMinutes(data.checkIn);
      if (data.breakStart && data.breakEnd) {
        workedMinutes -= this.timeToMinutes(data.breakEnd) - this.timeToMinutes(data.breakStart);
      }
      actualHours = Math.max(0, workedMinutes / 60);
    }

    const record = await this.Attendance.create({
      ...data,
      actualHours,
      verifiedBy: creatorId,
      createdBy: creatorId,
      updatedBy: creatorId,
    });

    return record.toObject();
  }

  // ── Break Management ──────────────────────────────────────

  async startBreak(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const record = await this.Attendance.findOne({ userId, date: today });
    if (!record) throw ApiError.badRequest('No clock-in record found for today');
    if (record.breakStart) throw ApiError.badRequest('Break already started');

    const now = new Date();
    record.breakStart = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    record.updatedBy = userId as unknown as typeof record.updatedBy;
    await record.save();

    return record.toObject();
  }

  async endBreak(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const record = await this.Attendance.findOne({ userId, date: today });
    if (!record) throw ApiError.badRequest('No clock-in record found for today');
    if (!record.breakStart) throw ApiError.badRequest('No active break to end');
    if (record.breakEnd) throw ApiError.badRequest('Break already ended');

    const now = new Date();
    record.breakEnd = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    record.updatedBy = userId as unknown as typeof record.updatedBy;
    await record.save();

    return record.toObject();
  }

  // ── Utilities ─────────────────────────────────────────────

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
