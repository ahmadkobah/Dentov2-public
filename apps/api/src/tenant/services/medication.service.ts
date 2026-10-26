import type { Connection, QueryFilter } from 'mongoose';
import type { IMedication } from '../models/medication.model.js';
import { getMedicationModel } from '../models/medication.model.js';
import { ApiError } from '../../utils/api-response.js';
import { regexContains } from './search.helpers.js';
import type { CreateMedicationInput, UpdateMedicationInput, MedicationQuery } from '@dento/shared';

/**
 * Medication Service — Business logic for medications catalog CRUD
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 (Module #10 Prescriptions)
 * ~100 seed medications per tenant. isCustom=false are non-deletable (deactivatable only).
 */

export class MedicationService {
  private Medication;

  constructor(tenantDb: Connection) {
    this.Medication = getMedicationModel(tenantDb);
  }

  async list(query: MedicationQuery) {
    const { page, limit, search, category, dosageForm, isActive, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IMedication> = {};

    if (isActive !== undefined) {
      filter.isActive = isActive;
    } else {
      filter.isActive = true;
    }

    if (category) filter.category = category;
    if (dosageForm) filter.dosageForm = dosageForm;

    if (search) {
      filter.$or = [
        { nameEn: regexContains(search) },
        { nameAr: regexContains(search) },
        { genericName: regexContains(search) },
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [medications, total] = await Promise.all([
      this.Medication.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.Medication.countDocuments(filter),
    ]);

    return {
      medications,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const medication = await this.Medication.findById(id).lean();
    if (!medication) throw ApiError.notFound('Medication');
    return medication;
  }

  async create(data: CreateMedicationInput) {
    const medication = await this.Medication.create({ ...data, isCustom: true });
    return medication.toObject();
  }

  async update(id: string, data: UpdateMedicationInput) {
    const medication = await this.Medication.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    ).lean();
    if (!medication) throw ApiError.notFound('Medication');
    return medication;
  }

  async softDelete(id: string) {
    const medication = await this.Medication.findById(id).lean();
    if (!medication) throw ApiError.notFound('Medication');

    // Seed medications cannot be deleted, only deactivated
    if (!medication.isCustom) {
      await this.Medication.findByIdAndUpdate(id, { $set: { isActive: false } });
      return { message: 'Seed medication deactivated (cannot be deleted)' };
    }

    await this.Medication.findByIdAndUpdate(id, { $set: { isActive: false } });
    return { message: 'Medication deactivated' };
  }

  async restore(id: string) {
    const medication = await this.Medication.findByIdAndUpdate(
      id,
      { $set: { isActive: true } },
      { new: true },
    ).lean();
    if (!medication) throw ApiError.notFound('Medication');
    return medication;
  }

  /** Autocomplete search — lightweight results for prescription form */
  async autocomplete(search: string, limit = 10) {
    const filter: QueryFilter<IMedication> = {
      isActive: true,
      $or: [
        { nameEn: regexContains(search) },
        { nameAr: regexContains(search) },
        { genericName: regexContains(search) },
      ],
    };

    return this.Medication.find(filter)
      .select(
        'nameEn nameAr genericName category dosageForm strength defaultDosage defaultFrequency defaultDuration instructionsEn instructionsAr',
      )
      .limit(limit)
      .lean();
  }
}
