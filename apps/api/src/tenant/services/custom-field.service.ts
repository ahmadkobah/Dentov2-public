/**
 * Custom Field Service — Business Logic
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 — Custom Fields
 * Dynamic user-defined fields per entity type (patient, appointment, etc.)
 */

import type { Connection } from 'mongoose';
import mongoose from 'mongoose';
import {
  getCustomFieldModel,
  type ICustomField,
  type CustomFieldEntity,
} from '../models/custom-field.model.js';
import { regexContains } from './search.helpers.js';
import { ApiError } from '../../utils/api-response.js';

export class CustomFieldService {
  private CustomFieldModel;

  constructor(tenantDb: Connection) {
    this.CustomFieldModel = getCustomFieldModel(tenantDb);
  }

  /**
   * List custom fields — optional filter by entity type
   */
  async list(query: {
    entity?: string;
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }) {
    const { entity, page = 1, limit = 50, search, isActive } = query;
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};

    if (entity) filter.entity = entity;
    if (isActive !== undefined) filter.isActive = isActive;
    if (search) {
      filter.$or = [
        { fieldKey: regexContains(search) },
        { 'label.en': regexContains(search) },
        { 'label.ar': regexContains(search) },
      ];
    }

    const [data, total] = await Promise.all([
      this.CustomFieldModel.find(filter)
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.CustomFieldModel.countDocuments(filter),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get a single custom field by ID
   */
  async getById(id: string) {
    const doc = await this.CustomFieldModel.findById(id).lean();
    if (!doc) throw new ApiError(404, 'Custom field not found', 'CUSTOM_FIELD_NOT_FOUND');
    return doc;
  }

  /**
   * Create a new custom field
   */
  async create(input: Partial<ICustomField>, userId: string) {
    // Check for duplicate fieldKey+entity
    const existing = await this.CustomFieldModel.findOne({
      entity: input.entity,
      fieldKey: input.fieldKey,
    });
    if (existing) {
      throw new ApiError(
        409,
        `Custom field "${input.fieldKey}" already exists for ${input.entity}`,
        'CUSTOM_FIELD_DUPLICATE',
      );
    }

    // Schema path is ObjectId (interface types it as string); mongoose casts the
    // string id on write, so this is runtime-equivalent to passing an ObjectId.
    const doc = await this.CustomFieldModel.create({
      ...input,
      createdBy: userId,
    });

    return doc.toObject();
  }

  /**
   * Update a custom field
   */
  async update(id: string, input: Partial<ICustomField>, userId: string) {
    // If changing fieldKey+entity, check for duplicates
    if (input.fieldKey || input.entity) {
      const current = await this.CustomFieldModel.findById(id);
      if (!current) throw new ApiError(404, 'Custom field not found', 'CUSTOM_FIELD_NOT_FOUND');

      const checkEntity = input.entity || current.entity;
      const checkKey = input.fieldKey || current.fieldKey;

      const duplicate = await this.CustomFieldModel.findOne({
        _id: { $ne: id },
        entity: checkEntity,
        fieldKey: checkKey,
      });
      if (duplicate) {
        throw new ApiError(
          409,
          `Custom field "${checkKey}" already exists for ${checkEntity}`,
          'CUSTOM_FIELD_DUPLICATE',
        );
      }
    }

    const doc = await this.CustomFieldModel.findByIdAndUpdate(
      id,
      { $set: { ...input, updatedBy: new mongoose.Types.ObjectId(userId) } },
      { new: true, lean: true },
    );

    if (!doc) throw new ApiError(404, 'Custom field not found', 'CUSTOM_FIELD_NOT_FOUND');
    return doc;
  }

  /**
   * Toggle active status (soft-delete)
   */
  async toggleActive(id: string, isActive: boolean, userId: string) {
    const doc = await this.CustomFieldModel.findByIdAndUpdate(
      id,
      { $set: { isActive, updatedBy: new mongoose.Types.ObjectId(userId) } },
      { new: true, lean: true },
    );
    if (!doc) throw new ApiError(404, 'Custom field not found', 'CUSTOM_FIELD_NOT_FOUND');
    return doc;
  }

  /**
   * Delete a custom field permanently
   */
  async delete(id: string) {
    const doc = await this.CustomFieldModel.findByIdAndDelete(id);
    if (!doc) throw new ApiError(404, 'Custom field not found', 'CUSTOM_FIELD_NOT_FOUND');
  }

  /**
   * Get fields for an entity type (for form rendering)
   */
  async getFieldsForEntity(entity: string) {
    return this.CustomFieldModel.find({ entity: entity as CustomFieldEntity, isActive: true })
      .sort({ sortOrder: 1 })
      .lean();
  }
}
