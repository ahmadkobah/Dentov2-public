import type { Connection, QueryFilter } from 'mongoose';
import type { ICbctScanRegion } from '../models/cbct-scan-region.model.js';
import { getCbctScanRegionModel } from '../models/cbct-scan-region.model.js';
import { ApiError } from '../../utils/api-response.js';
import { regexContains } from './search.helpers.js';
import type {
  CreateCbctScanRegionInput,
  UpdateCbctScanRegionInput,
  CbctScanRegionQuery,
} from '@dento/shared';

/**
 * CBCT Scan Region Service — Lookup/seed collection CRUD
 *
 * Per V2_DATABASE.md — cbct_scan_regions collection
 */

export class CbctScanRegionService {
  private CbctScanRegion;

  constructor(tenantDb: Connection) {
    this.CbctScanRegion = getCbctScanRegionModel(tenantDb);
  }

  async list(query: CbctScanRegionQuery) {
    const { page, limit, search, isActive, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<ICbctScanRegion> = {};
    if (isActive !== undefined) filter.isActive = isActive;
    if (search) {
      filter.$or = [
        { code: regexContains(search) },
        { 'name.en': regexContains(search) },
        { 'name.ar': regexContains(search) },
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [regions, total] = await Promise.all([
      this.CbctScanRegion.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.CbctScanRegion.countDocuments(filter),
    ]);

    return {
      regions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const region = await this.CbctScanRegion.findById(id).lean();
    if (!region) throw ApiError.notFound('CBCT Scan Region');
    return region;
  }

  async create(data: CreateCbctScanRegionInput) {
    const existing = await this.CbctScanRegion.findOne({ code: data.code }).lean();
    if (existing) throw ApiError.conflict(`CBCT scan region code '${data.code}' already exists`);

    const region = await this.CbctScanRegion.create(data);
    return region.toObject();
  }

  async update(id: string, data: UpdateCbctScanRegionInput) {
    const region = await this.CbctScanRegion.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    ).lean();
    if (!region) throw ApiError.notFound('CBCT Scan Region');
    return region;
  }

  async delete(id: string) {
    const region = await this.CbctScanRegion.findById(id);
    if (!region) throw ApiError.notFound('CBCT Scan Region');
    await this.CbctScanRegion.findByIdAndDelete(id);
    return { message: 'CBCT scan region deleted' };
  }
}
