import type { Connection, QueryFilter } from 'mongoose';
import type { IXrayType } from '../models/xray-type.model.js';
import { getXrayTypeModel } from '../models/xray-type.model.js';
import { ApiError } from '../../utils/api-response.js';
import { regexContains } from './search.helpers.js';
import type { CreateXrayTypeInput, UpdateXrayTypeInput, XrayTypeQuery } from '@dento/shared';

/**
 * X-Ray Type Service — Lookup collection CRUD
 *
 * Per V2_DATABASE.md — xray_types collection
 */

export class XrayTypeService {
  private XrayType;

  constructor(tenantDb: Connection) {
    this.XrayType = getXrayTypeModel(tenantDb);
  }

  async list(query: XrayTypeQuery) {
    const { page, limit, search, isActive, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IXrayType> = {};
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

    const [xrayTypes, total] = await Promise.all([
      this.XrayType.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.XrayType.countDocuments(filter),
    ]);

    return {
      xrayTypes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const xrayType = await this.XrayType.findById(id).lean();
    if (!xrayType) throw ApiError.notFound('X-Ray Type');
    return xrayType;
  }

  async create(data: CreateXrayTypeInput) {
    const existing = await this.XrayType.findOne({ code: data.code }).lean();
    if (existing) throw ApiError.conflict(`X-Ray type code '${data.code}' already exists`);

    const xrayType = await this.XrayType.create(data);
    return xrayType.toObject();
  }

  async update(id: string, data: UpdateXrayTypeInput) {
    const xrayType = await this.XrayType.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    ).lean();
    if (!xrayType) throw ApiError.notFound('X-Ray Type');
    return xrayType;
  }

  async delete(id: string) {
    const xrayType = await this.XrayType.findById(id);
    if (!xrayType) throw ApiError.notFound('X-Ray Type');
    await this.XrayType.findByIdAndDelete(id);
    return { message: 'X-Ray type deleted' };
  }
}
