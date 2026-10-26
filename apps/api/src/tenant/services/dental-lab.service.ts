/**
 * Dental Lab Service — CRUD
 *
 * Per V2_DATABASE.md §5.13 — dental_labs collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#13) — Dental Labs
 */

import type { Connection, QueryFilter } from 'mongoose';
import type { IDentalLab } from '../models/dental-lab.model.js';
import { getDentalLabModel } from '../models/dental-lab.model.js';
import { ApiError } from '../../utils/api-response.js';
import { regexContains } from './search.helpers.js';
import type { CreateDentalLabInput, UpdateDentalLabInput, DentalLabQuery } from '@dento/shared';

export class DentalLabService {
  private DentalLab;

  constructor(tenantDb: Connection) {
    this.DentalLab = getDentalLabModel(tenantDb);
  }

  async list(query: DentalLabQuery) {
    const { page, limit, search, isActive, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IDentalLab> = {};
    if (isActive !== undefined) filter.isActive = isActive;
    if (search) {
      filter.$or = [
        { name: regexContains(search) },
        { contactPerson: regexContains(search) },
        { city: regexContains(search) },
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [dentalLabs, total] = await Promise.all([
      this.DentalLab.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.DentalLab.countDocuments(filter),
    ]);

    return {
      dentalLabs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const dentalLab = await this.DentalLab.findById(id).lean();
    if (!dentalLab) throw ApiError.notFound('Dental Lab');
    return dentalLab;
  }

  async create(data: CreateDentalLabInput) {
    const existing = await this.DentalLab.findOne({ name: data.name }).lean();
    if (existing) throw ApiError.conflict('Dental Lab with this name already exists');
    const dentalLab = await this.DentalLab.create(data);
    return dentalLab.toJSON();
  }

  async update(id: string, data: UpdateDentalLabInput) {
    if (data.name) {
      const existing = await this.DentalLab.findOne({ name: data.name, _id: { $ne: id } }).lean();
      if (existing) throw ApiError.conflict('Dental Lab with this name already exists');
    }
    const dentalLab = await this.DentalLab.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    ).lean();
    if (!dentalLab) throw ApiError.notFound('Dental Lab');
    return dentalLab;
  }

  async delete(id: string) {
    const dentalLab = await this.DentalLab.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true },
    ).lean();
    if (!dentalLab) throw ApiError.notFound('Dental Lab');
    return dentalLab;
  }
}
