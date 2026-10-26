import type { Connection, QueryFilter } from 'mongoose';
import type { IInventoryCategory } from '../models/inventory-category.model.js';
import { getInventoryCategoryModel } from '../models/inventory-category.model.js';
import { getInventoryItemModel } from '../models/inventory-item.model.js';
import { ApiError } from '../../utils/api-response.js';
import { regexContains } from './search.helpers.js';
import { logger } from '../../utils/logger.js';
import type {
  CreateInventoryCategoryInput,
  UpdateInventoryCategoryInput,
  InventoryCategoryQuery,
} from '@dento/shared';

// ── Bilingual name transform for .lean() results ───────────
function transformCategoryNames<T>(doc: T): T {
  const d = doc as any;
  if (!d) return doc;
  if (d.nameEn !== undefined) {
    d.name = { en: d.nameEn, ar: d.nameAr || '' };
    delete d.nameEn;
    delete d.nameAr;
  }
  if (d.parentId && typeof d.parentId === 'object' && d.parentId.nameEn !== undefined) {
    d.parentId.name = { en: d.parentId.nameEn, ar: d.parentId.nameAr || '' };
    delete d.parentId.nameEn;
    delete d.parentId.nameAr;
  }
  return doc;
}

/**
 * Inventory Category Service — Business logic for category CRUD
 *
 * Per DENTO_V2_MASTER_PLAN.md §16
 * Per V2_DATABASE.md §8.4 — inventory_categories collection
 *
 * Handles:
 * - Category CRUD with pagination/filtering
 * - Hierarchical parent/child validation
 * - Soft-delete with item reference check
 * - Restore
 */
export class InventoryCategoryService {
  private Category;
  private Item;

  constructor(tenantDb: Connection) {
    this.Category = getInventoryCategoryModel(tenantDb);
    this.Item = getInventoryItemModel(tenantDb);
  }

  // ── List Categories (paginated, filterable) ───────────────

  async list(query: InventoryCategoryQuery) {
    const { page, limit, search, parentId, isActive } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IInventoryCategory> = {};

    if (isActive !== undefined) filter.isActive = isActive;
    if (parentId !== undefined) filter.parentId = parentId;

    if (search) {
      filter.$or = [
        { nameEn: regexContains(search) },
        { nameAr: regexContains(search) },
        { slug: regexContains(search) },
      ];
    }

    const [rawItems, total] = await Promise.all([
      this.Category.find(filter)
        .sort({ sortOrder: 1, nameEn: 1 })
        .skip(skip)
        .limit(limit)
        .populate('parentId', 'nameEn nameAr slug')
        .lean(),
      this.Category.countDocuments(filter),
    ]);

    const items = rawItems.map(transformCategoryNames);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Get Category by ID ────────────────────────────────────

  async getById(id: string) {
    const category = await this.Category.findById(id)
      .populate('parentId', 'nameEn nameAr slug')
      .lean();

    if (!category) throw ApiError.notFound('Inventory Category');
    return transformCategoryNames(category);
  }

  // ── Create Category ───────────────────────────────────────

  async create(data: CreateInventoryCategoryInput, userId: string) {
    // Validate parentId if provided
    if (data.parentId) {
      const parent = await this.Category.findById(data.parentId).lean();
      if (!parent) throw ApiError.badRequest('Invalid parentId — parent category not found');
    }

    const category = new this.Category({
      ...data,
      createdBy: userId,
    });
    await category.save();

    logger.info({ slug: category.slug, categoryId: category._id }, 'Inventory category created');
    return category.toObject();
  }

  // ── Update Category ───────────────────────────────────────

  async update(id: string, data: UpdateInventoryCategoryInput, userId: string) {
    const category = await this.Category.findById(id);
    if (!category) throw ApiError.notFound('Inventory Category');

    // Validate parentId if being changed
    if (data.parentId && data.parentId !== category.parentId?.toString()) {
      // Prevent self-reference
      if (data.parentId === id) {
        throw ApiError.badRequest('Category cannot be its own parent');
      }
      const parent = await this.Category.findById(data.parentId).lean();
      if (!parent) throw ApiError.badRequest('Invalid parentId — parent category not found');
    }

    Object.assign(category, data, { updatedBy: userId });
    await category.save();

    logger.info({ slug: category.slug, categoryId: category._id }, 'Inventory category updated');
    return category.toObject();
  }

  // ── Soft Delete ───────────────────────────────────────────

  async softDelete(id: string, userId: string) {
    const category = await this.Category.findById(id);
    if (!category) throw ApiError.notFound('Inventory Category');

    // Block if items reference this category
    const itemCount = await this.Item.countDocuments({ categoryId: id, isActive: true });
    if (itemCount > 0) {
      throw ApiError.badRequest(
        `Cannot deactivate category — ${itemCount} active item(s) reference it`,
      );
    }

    category.isActive = false;
    category.updatedBy = userId as any;
    await category.save();

    logger.info(
      { slug: category.slug, categoryId: category._id },
      'Inventory category deactivated',
    );
    return category.toObject();
  }

  // ── Restore ───────────────────────────────────────────────

  async restore(id: string, userId: string) {
    const category = await this.Category.findById(id);
    if (!category) throw ApiError.notFound('Inventory Category');

    category.isActive = true;
    category.updatedBy = userId as any;
    await category.save();

    logger.info({ slug: category.slug, categoryId: category._id }, 'Inventory category restored');
    return category.toObject();
  }
}
