/**
 * Doctor Service â€” List + Get + Update + Toggle active
 *
 * Per DENTO_V2_MASTER_PLAN.md Â§13 â€” Doctor Management
 * Doctors are synced from platform User (role=dentist).
 * This service manages the tenant-local Doctor record.
 */

import type { Connection, QueryFilter } from 'mongoose';
import type { IDoctor } from '../models/doctor.model.js';
import { getDoctorModel } from '../models/doctor.model.js';
import { ApiError } from '../../utils/api-response.js';
import { regexContains } from './search.helpers.js';
import type { UpdateDoctorInput, DoctorQuery } from '@dento/shared';

export class DoctorService {
  private Doctor;

  constructor(tenantDb: Connection) {
    this.Doctor = getDoctorModel(tenantDb);
  }

  async list(query: DoctorQuery) {
    const { page, limit, search, specialization, branchId, isActive, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IDoctor> = {};
    if (specialization) filter.specialization = specialization;
    if (branchId) filter.branches = branchId;
    if (isActive !== undefined) filter.isActive = isActive;
    if (search) {
      filter.$or = [
        { firstName: regexContains(search) },
        { lastName: regexContains(search) },
        { email: regexContains(search) },
        { specialization: regexContains(search) },
        { licenseNumber: regexContains(search) },
      ];
    }

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      this.Doctor.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.Doctor.countDocuments(filter),
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

  async getById(id: string) {
    const doctor = await this.Doctor.findById(id).lean();
    if (!doctor) throw new ApiError(404, 'NOT_FOUND', 'Doctor not found');
    return doctor;
  }

  async listAll(): Promise<IDoctor[]> {
    return this.Doctor.find().select('userId').lean() as unknown as Promise<IDoctor[]>;
  }

  async update(id: string, data: UpdateDoctorInput) {
    const doctor = await this.Doctor.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
    if (!doctor) throw new ApiError(404, 'NOT_FOUND', 'Doctor not found');
    return doctor;
  }

  async toggleActive(id: string) {
    const doctor = await this.Doctor.findById(id);
    if (!doctor) throw new ApiError(404, 'NOT_FOUND', 'Doctor not found');

    doctor.isActive = !doctor.isActive;
    if (!doctor.isActive) {
      doctor.terminatedAt = new Date();
    } else {
      doctor.terminatedAt = undefined as unknown as Date;
    }
    await doctor.save();
    return doctor.toObject();
  }

  async delete(id: string) {
    const doctor = await this.Doctor.findByIdAndDelete(id).lean();
    if (!doctor) throw new ApiError(404, 'NOT_FOUND', 'Doctor not found');
    return doctor;
  }

  async getSpecializations() {
    const specializations = await this.Doctor.distinct('specialization');
    return specializations.sort();
  }
}
