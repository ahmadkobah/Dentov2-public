import type { Connection, QueryFilter } from 'mongoose';
import { Types } from 'mongoose';
import type { IStockCount } from '../models/stock-count.model.js';
import { getStockCountModel } from '../models/stock-count.model.js';
import { getInventoryStockModel } from '../models/inventory-stock.model.js';
import { getInventoryMovementModel } from '../models/inventory-movement.model.js';
import { getInventoryItemModel } from '../models/inventory-item.model.js';
import { ApiError } from '../../utils/api-response.js';
import { logger } from '../../utils/logger.js';
import type {
  CreateStockCountInput,
  UpdateStockCountInput,
  ApplyStockCountInput,
  StockCountQuery,
} from '@dento/shared';

/**
 * Stock Count Service — Physical inventory reconciliation
 *
 * Per DENTO_V2_MASTER_PLAN.md §16
 * Per V2_DATABASE.md §8.8 — stock_counts collection
 *
 * Lifecycle: in_progress → completed → approved (via adjustments)
 * Types: full | partial | spot_check
 * On approve: adjusts stock quantities and creates movements for discrepancies
 */
export class StockCountService {
  private StockCount;
  private Stock;
  private Movement;
  private Item;

  constructor(tenantDb: Connection) {
    this.StockCount = getStockCountModel(tenantDb);
    this.Stock = getInventoryStockModel(tenantDb);
    this.Movement = getInventoryMovementModel(tenantDb);
    this.Item = getInventoryItemModel(tenantDb);
  }

  // ── List Stock Counts (paginated) ─────────────────────────

  async list(query: StockCountQuery) {
    const {
      page = 1,
      limit = 20,
      branchId,
      status,
      countType,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const filter: QueryFilter<IStockCount> = {};

    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (countType) filter.countType = countType;

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      this.StockCount.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('branchId', 'nameEn nameAr')
        .populate('countedBy', 'name email')
        .lean(),
      this.StockCount.countDocuments(filter),
    ]);

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

  // ── Get Stock Count by ID ─────────────────────────────────

  async getById(id: string) {
    const count = await this.StockCount.findById(id)
      .populate('branchId', 'nameEn nameAr')
      .populate('items.itemId', 'sku nameEn nameAr unit')
      .populate('countedBy', 'name email')
      .populate('approvedBy', 'name email')
      .lean();

    if (!count) throw ApiError.notFound('Stock Count');
    return count;
  }

  // ── Create Stock Count ────────────────────────────────────

  async create(data: CreateStockCountInput, userId: string) {
    // Validate all items exist
    const itemIds = data.items.map((i) => i.itemId);
    const existing = await this.Item.countDocuments({ _id: { $in: itemIds } });
    if (existing !== itemIds.length) {
      throw ApiError.badRequest('One or more items not found');
    }

    // Build items with systemQuantity from current stock
    const builtItems = await Promise.all(
      data.items.map(async (item) => {
        const stock = await this.Stock.findOne({
          itemId: item.itemId,
          branchId: data.branchId,
        }).lean();

        const systemQuantity = stock?.quantity ?? 0;

        return {
          itemId: item.itemId,
          systemQuantity,
          countedQuantity: item.countedQuantity,
          discrepancy: item.countedQuantity - systemQuantity,
          notes: item.notes ?? '',
          adjustmentApplied: false,
        };
      }),
    );

    const count = await this.StockCount.create({
      branchId: data.branchId,
      countType: data.countType,
      items: builtItems,
      status: 'in_progress',
      countedBy: userId,
      startedAt: new Date(),
      notes: data.notes ?? '',
    });

    logger.info(
      { countId: count._id, countNumber: count.countNumber, countType: data.countType },
      'Stock count created',
    );
    return count.toObject();
  }

  // ── Update Count Items ────────────────────────────────────

  async updateItems(id: string, data: UpdateStockCountInput, _userId: string) {
    const count = await this.StockCount.findById(id);
    if (!count) throw ApiError.notFound('Stock Count');

    if (count.status !== 'in_progress') {
      throw ApiError.badRequest('Can only update items for in-progress counts');
    }

    if (data.items) {
      for (const incoming of data.items) {
        const existing = count.items.find((i) => i.itemId.toString() === incoming.itemId);

        if (existing) {
          existing.countedQuantity = incoming.countedQuantity;
          if (incoming.notes) existing.notes = incoming.notes;
        } else {
          // New item — look up system quantity
          const stock = await this.Stock.findOne({
            itemId: incoming.itemId,
            branchId: count.branchId,
          }).lean();

          count.items.push({
            itemId: incoming.itemId,
            systemQuantity: stock?.quantity ?? 0,
            countedQuantity: incoming.countedQuantity,
            discrepancy: 0, // computed by pre-save
            notes: incoming.notes ?? '',
            adjustmentApplied: false,
          } as any);
        }
      }
    }

    if (data.notes !== undefined) {
      count.notes = data.notes;
    }

    await count.save(); // pre-save recalculates discrepancy + summary

    logger.info({ countId: id }, 'Stock count items updated');
    return count.toObject();
  }

  // ── Complete Count ────────────────────────────────────────

  async complete(id: string, _userId: string) {
    const count = await this.StockCount.findById(id);
    if (!count) throw ApiError.notFound('Stock Count');

    if (count.status !== 'in_progress') {
      throw ApiError.badRequest('Can only complete in-progress counts');
    }

    count.status = 'completed';
    count.completedAt = new Date();
    await count.save();

    logger.info({ countId: id, countNumber: count.countNumber }, 'Stock count completed');
    return count.toObject();
  }

  // ── Approve & Apply Adjustments ───────────────────────────

  async approve(id: string, data: ApplyStockCountInput, userId: string) {
    const count = await this.StockCount.findById(id);
    if (!count) throw ApiError.notFound('Stock Count');

    if (count.status !== 'completed') {
      throw ApiError.badRequest('Can only approve completed counts');
    }

    // L3: Guard against double-approve
    if (count.approvedBy) {
      throw ApiError.badRequest('Stock count has already been approved');
    }

    let adjustedCount = 0;
    let totalDiscrepancyValue = 0;

    for (const item of count.items) {
      const shouldApply =
        data.itemIds.includes(item.itemId.toString()) &&
        item.discrepancy !== 0 &&
        !item.adjustmentApplied;

      if (!shouldApply) continue;

      // Update stock to match counted quantity
      const stock = await this.Stock.findOne({
        itemId: item.itemId,
        branchId: count.branchId,
      });

      if (!stock) continue;

      // M7: Compute discrepancy value using item unit cost
      const inventoryItem = await this.Item.findById(item.itemId).lean();
      const unitCost = inventoryItem?.unitCost ?? 0;
      totalDiscrepancyValue += Math.abs(item.discrepancy) * unitCost;

      const previousQuantity = stock.quantity;
      stock.quantity = item.countedQuantity;
      stock.lastCountedAt = new Date();
      stock.lastCountedBy = new Types.ObjectId(userId);
      stock.lastCountResult =
        item.discrepancy === 0 ? 'match' : item.discrepancy > 0 ? 'surplus' : 'deficit';
      stock.countDiscrepancy = item.discrepancy;

      await stock.save();

      // Create adjustment movement
      const movementType = item.discrepancy > 0 ? 'adjustment_add' : 'adjustment_remove';

      await this.Movement.create({
        itemId: item.itemId,
        branchId: count.branchId,
        movementType,
        quantity: Math.abs(item.discrepancy),
        previousQuantity,
        newQuantity: item.countedQuantity,
        unitCost,
        referenceType: 'stock_count',
        referenceId: count._id,
        notes: data.notes || 'Stock count adjustment',
        createdBy: userId,
      });

      item.adjustmentApplied = true;
      adjustedCount++;
    }

    // M5: Transition to 'approved' status
    count.status = 'approved';
    count.approvedBy = new Types.ObjectId(userId);

    // M7: Store computed discrepancy value in summary
    if (count.summary) {
      count.summary.totalDiscrepancyValue = totalDiscrepancyValue;
    }

    await count.save();

    logger.info(
      { countId: id, countNumber: count.countNumber, adjustedCount, totalDiscrepancyValue },
      'Stock count approved — adjustments applied',
    );
    return count.toObject();
  }

  // ── Cancel Count ──────────────────────────────────────────

  async cancel(id: string, _userId: string) {
    const count = await this.StockCount.findById(id);
    if (!count) throw ApiError.notFound('Stock Count');

    if (count.status !== 'in_progress') {
      throw ApiError.badRequest('Can only cancel in-progress counts');
    }

    count.status = 'cancelled';
    await count.save();

    logger.info({ countId: id, countNumber: count.countNumber }, 'Stock count cancelled');
    return count.toObject();
  }
}
