/**
 * Service Service — CRUD
 *
 * Per V2_DATABASE.md §11.2 — services
 * Per DENTO_V2_MASTER_PLAN.md §10 (#16) — Dental Services
 */

import type { Connection, QueryFilter } from 'mongoose';
import type { IService } from '../models/service.model.js';
import { getServiceModel } from '../models/service.model.js';
import { ApiError } from '../../utils/api-response.js';
import { regexContains } from './search.helpers.js';
import type { CreateServiceInput, UpdateServiceInput, ServiceQuery } from '@dento/shared';
import { services as defaultServices } from '../../scripts/seed-data/services.js';

// ── Service Service ─────────────────────────────────────────

export class ServiceService {
  private Service;

  constructor(tenantDb: Connection) {
    this.Service = getServiceModel(tenantDb);
  }

  // ── Default services auto-seed ──────────────────────────
  private async seedDefaultServices() {
    const count = await this.Service.countDocuments({ isDefault: true });
    if (count >= defaultServices.length) return;

    for (const svc of defaultServices) {
      const { category: _catName, ...svcData } = svc;
      await this.Service.findOneAndUpdate(
        { code: svcData.code },
        {
          $set: { isDefault: true },
          $setOnInsert: { ...svcData },
        },
        { upsert: true },
      );
    }
  }

  async list(query: ServiceQuery) {
    await this.seedDefaultServices();
    const { page, limit, search, isActive, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IService> = {};
    if (isActive !== undefined) filter.isActive = isActive;
    if (search) {
      filter.$or = [
        { 'name.en': regexContains(search) },
        { 'name.ar': regexContains(search) },
        { code: regexContains(search) },
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [services, total] = await Promise.all([
      this.Service.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.Service.countDocuments(filter),
    ]);

    return {
      services,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const service = await this.Service.findById(id).lean();
    if (!service) throw ApiError.notFound('Service');
    return service;
  }

  async create(data: CreateServiceInput) {
    if (data.code) {
      const existing = await this.Service.findOne({ code: data.code }).lean();
      if (existing) throw ApiError.conflict('Service with this code already exists');
    }
    const service = await this.Service.create(data);
    return service.toJSON();
  }

  async update(id: string, data: UpdateServiceInput) {
    if (data.code) {
      const existing = await this.Service.findOne({ code: data.code, _id: { $ne: id } }).lean();
      if (existing) throw ApiError.conflict('Service with this code already exists');
    }
    const service = await this.Service.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    ).lean();
    if (!service) throw ApiError.notFound('Service');
    return service;
  }

  async delete(id: string) {
    const existing = await this.Service.findById(id).lean();
    if (existing && (existing as any).isDefault) {
      throw ApiError.badRequest('Default services cannot be deleted');
    }
    const service = await this.Service.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true },
    ).lean();
    if (!service) throw ApiError.notFound('Service');
    return service;
  }

  /** Get price for a specific branch (falls back to defaultPrice) */
  async getPriceForBranch(serviceId: string, branchId: string): Promise<number> {
    const service = await this.Service.findById(serviceId).lean();
    if (!service) throw ApiError.notFound('Service');
    const branchPrice = service.branchPrices.find((bp) => bp.branchId.toString() === branchId);
    return branchPrice ? branchPrice.price : service.defaultPrice;
  }
}
