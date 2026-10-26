/**
 * Lab Order Type Service — Lookup CRUD + Seed
 *
 * Per V2_DATABASE.md §5.14 — lab_order_types collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#13) — Lab Order Types Settings
 */

import type { Connection, QueryFilter } from 'mongoose';
import type { ILabOrderType } from '../models/lab-order-type.model.js';
import { getLabOrderTypeModel } from '../models/lab-order-type.model.js';
import { ApiError } from '../../utils/api-response.js';
import { regexContains } from './search.helpers.js';
import type {
  CreateLabOrderTypeInput,
  UpdateLabOrderTypeInput,
  LabOrderTypeQuery,
} from '@dento/shared';

export class LabOrderTypeService {
  private LabOrderType;

  constructor(tenantDb: Connection) {
    this.LabOrderType = getLabOrderTypeModel(tenantDb);
  }

  async list(query: LabOrderTypeQuery) {
    const { page, limit, search, isActive, category, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<ILabOrderType> = {};
    if (isActive !== undefined) filter.isActive = isActive;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [{ 'name.en': regexContains(search) }, { 'name.ar': regexContains(search) }];
    }

    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [labOrderTypes, total] = await Promise.all([
      this.LabOrderType.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.LabOrderType.countDocuments(filter),
    ]);

    return {
      labOrderTypes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const labOrderType = await this.LabOrderType.findById(id).lean();
    if (!labOrderType) throw ApiError.notFound('Lab Order Type');
    return labOrderType;
  }

  async create(data: CreateLabOrderTypeInput) {
    const existing = await this.LabOrderType.findOne({ 'name.en': data.name.en }).lean();
    if (existing) throw ApiError.conflict(`Lab order type '${data.name.en}' already exists`);

    const labOrderType = await this.LabOrderType.create({ ...data, isCustom: true });
    return labOrderType.toObject();
  }

  async update(id: string, data: UpdateLabOrderTypeInput) {
    const labOrderType = await this.LabOrderType.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    ).lean();
    if (!labOrderType) throw ApiError.notFound('Lab Order Type');
    return labOrderType;
  }

  async delete(id: string) {
    const labOrderType = await this.LabOrderType.findById(id).lean();
    if (!labOrderType) throw ApiError.notFound('Lab Order Type');

    // Soft-delete: deactivate
    await this.LabOrderType.findByIdAndUpdate(id, { $set: { isActive: false } });
    return { deleted: true };
  }

  /**
   * Seed 14 default lab order types (per MASTER_PLAN §10 #13)
   * Only seeds if collection is empty — idempotent
   */
  async seedDefaults(): Promise<number> {
    const count = await this.LabOrderType.countDocuments();
    if (count > 0) return 0;

    const defaults: Array<Partial<ILabOrderType>> = [
      {
        name: { en: 'PFM Crown', ar: 'تاج معدني خزفي' },
        category: 'crown_bridge',
        defaultTurnaroundDays: 7,
        isCustom: false,
        isActive: true,
        sortOrder: 1,
      },
      {
        name: { en: 'Zirconia Crown', ar: 'تاج زركونيا' },
        category: 'crown_bridge',
        defaultTurnaroundDays: 7,
        isCustom: false,
        isActive: true,
        sortOrder: 2,
      },
      {
        name: { en: 'E-max Crown', ar: 'تاج إي ماكس' },
        category: 'crown_bridge',
        defaultTurnaroundDays: 7,
        isCustom: false,
        isActive: true,
        sortOrder: 3,
      },
      {
        name: { en: 'Bridge (3-unit)', ar: 'جسر (3 وحدات)' },
        category: 'crown_bridge',
        defaultTurnaroundDays: 10,
        isCustom: false,
        isActive: true,
        sortOrder: 4,
      },
      {
        name: { en: 'Veneer', ar: 'قشرة خزفية' },
        category: 'veneers',
        defaultTurnaroundDays: 10,
        isCustom: false,
        isActive: true,
        sortOrder: 5,
      },
      {
        name: { en: 'Complete Denture', ar: 'طقم أسنان كامل' },
        category: 'removable',
        defaultTurnaroundDays: 14,
        isCustom: false,
        isActive: true,
        sortOrder: 6,
      },
      {
        name: { en: 'Partial Denture', ar: 'طقم أسنان جزئي' },
        category: 'removable',
        defaultTurnaroundDays: 12,
        isCustom: false,
        isActive: true,
        sortOrder: 7,
      },
      {
        name: { en: 'Night Guard', ar: 'واقي ليلي' },
        category: 'other',
        defaultTurnaroundDays: 5,
        isCustom: false,
        isActive: true,
        sortOrder: 8,
      },
      {
        name: { en: 'Whitening Tray', ar: 'قالب تبييض' },
        category: 'appliances',
        defaultTurnaroundDays: 5,
        isCustom: false,
        isActive: true,
        sortOrder: 9,
      },
      {
        name: { en: 'Orthodontic Retainer', ar: 'مثبت تقويم' },
        category: 'orthodontics',
        defaultTurnaroundDays: 7,
        isCustom: false,
        isActive: true,
        sortOrder: 10,
      },
      {
        name: { en: 'Implant Crown', ar: 'تاج زرعة' },
        category: 'implants',
        defaultTurnaroundDays: 10,
        isCustom: false,
        isActive: true,
        sortOrder: 11,
      },
      {
        name: { en: 'Custom Abutment', ar: 'دعامة مخصصة' },
        category: 'implants',
        defaultTurnaroundDays: 10,
        isCustom: false,
        isActive: true,
        sortOrder: 12,
      },
      {
        name: { en: 'Surgical Guide', ar: 'دليل جراحي' },
        category: 'other',
        defaultTurnaroundDays: 7,
        isCustom: false,
        isActive: true,
        sortOrder: 13,
      },
      {
        name: { en: 'Study Model', ar: 'نموذج دراسي' },
        category: 'other',
        defaultTurnaroundDays: 3,
        isCustom: false,
        isActive: true,
        sortOrder: 14,
      },
    ];

    await this.LabOrderType.insertMany(defaults);
    return defaults.length;
  }
}
