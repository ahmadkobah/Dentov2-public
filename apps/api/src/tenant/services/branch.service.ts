/**
 * Branch Service — Tenant DB (factory pattern)
 *
 * Per DENTO_V2_MASTER_PLAN §13, §22 — Multi-Branch + Schedule Validation
 * Per V2_DATABASE §11.4 — branches collection
 *
 * Manages branch CRUD, chairs, working hours, holidays, ramadan mode,
 * slot configuration, and online booking configuration.
 */

import type { Connection, QueryFilter } from 'mongoose';
import type { IBranch } from '../models/branch.model.js';
import { getBranchModel } from '../models/branch.model.js';
import { getAppointmentModel } from '../models/appointment.model.js';
import { ApiError } from '../../utils/api-response.js';
import { regexContains } from './search.helpers.js';
import type { CreateBranchInput, UpdateBranchInput, BranchListQuery } from '@dento/shared';

export class BranchService {
  private Branch;

  constructor(tenantDb: Connection) {
    this.Branch = getBranchModel(tenantDb);
  }

  /** List branches with pagination and filtering */
  async list(query: BranchListQuery) {
    const { page, limit, search, isActive, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IBranch> = {};
    if (isActive !== undefined) filter.isActive = isActive;
    if (search) {
      filter.$or = [
        { 'name.en': regexContains(search) },
        { 'name.ar': regexContains(search) },
        { code: regexContains(search) },
        { city: regexContains(search) },
      ];
    }

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      this.Branch.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.Branch.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Get branch by ID */
  async getById(id: string) {
    const branch = await this.Branch.findById(id).lean();
    if (!branch) throw new ApiError(404, 'BRANCH_NOT_FOUND', 'Branch not found');
    return branch;
  }

  /** Create a new branch */
  async create(data: CreateBranchInput, createdBy: string) {
    // Check unique code
    const existing = await this.Branch.findOne({ code: data.code });
    if (existing) {
      throw new ApiError(409, 'BRANCH_CODE_EXISTS', `Branch code "${data.code}" already exists`);
    }

    const branch = await this.Branch.create({
      ...data,
      createdBy,
    });

    return branch.toObject();
  }

  /** Update an existing branch */
  async update(id: string, data: UpdateBranchInput, updatedBy: string) {
    const branch = await this.Branch.findByIdAndUpdate(
      id,
      { $set: { ...data, updatedBy } },
      { new: true },
    ).lean();

    if (!branch) throw new ApiError(404, 'BRANCH_NOT_FOUND', 'Branch not found');

    // Check for conflicting future appointments when hours change
    const warnings: string[] = [];
    const hoursChanged = data.workingHours || data.ramadanHours || data.holidays;
    if (hoursChanged) {
      const conflicts = await this.findConflictingAppointments(branch as unknown as IBranch);
      if (conflicts > 0) {
        warnings.push(
          `${conflicts} upcoming appointment(s) now fall outside the updated working hours. Please review and reschedule them.`,
        );
      }
    }

    return { branch, warnings };
  }

  /** Find future appointments that conflict with updated branch hours */
  private async findConflictingAppointments(branch: IBranch): Promise<number> {
    const Appointment = getAppointmentModel(this.Branch.db);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureAppointments = await Appointment.find({
      branchId: branch._id,
      date: { $gte: today },
      status: { $nin: ['cancelled', 'completed', 'no_show'] },
    })
      .select('date startTime endTime')
      .lean();

    const hours =
      branch.isRamadanMode && branch.ramadanHours?.length
        ? branch.ramadanHours
        : branch.workingHours;

    let conflictCount = 0;
    for (const appt of futureAppointments) {
      const apptDate = new Date(appt.date);
      const dayOfWeek = apptDate.getDay();

      // Check holidays
      const dateStr = apptDate.toISOString().slice(0, 10);
      const isHoliday = branch.holidays?.some((h) => (h as { date: string }).date === dateStr);
      if (isHoliday) {
        conflictCount++;
        continue;
      }

      // Check working hours
      const dayHours = hours?.find((h) => h.dayOfWeek === dayOfWeek);
      if (!dayHours || dayHours.isClosed) {
        conflictCount++;
        continue;
      }

      if (appt.startTime < dayHours.openTime || appt.endTime > dayHours.closeTime) {
        conflictCount++;
      }
    }

    return conflictCount;
  }

  /** Toggle branch active status */
  async toggleActive(id: string) {
    const branch = await this.Branch.findById(id);
    if (!branch) throw new ApiError(404, 'BRANCH_NOT_FOUND', 'Branch not found');

    branch.isActive = !branch.isActive;
    await branch.save();
    return branch.toObject();
  }

  /** Toggle Ramadan mode for a branch */
  async toggleRamadanMode(id: string) {
    const branch = await this.Branch.findById(id);
    if (!branch) throw new ApiError(404, 'BRANCH_NOT_FOUND', 'Branch not found');

    branch.isRamadanMode = !branch.isRamadanMode;
    await branch.save();
    return branch.toObject();
  }

  /** Get all active branches (for dropdowns) */
  async listActive() {
    return this.Branch.find({ isActive: true })
      .select('name code isPrimary chairs')
      .sort({ isPrimary: -1, 'name.en': 1 })
      .lean();
  }
}
