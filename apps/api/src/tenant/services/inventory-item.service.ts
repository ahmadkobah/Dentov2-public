import type { Connection, QueryFilter } from 'mongoose';
import type { IInventoryItem } from '../models/inventory-item.model.js';
import { getInventoryItemModel } from '../models/inventory-item.model.js';
import { getInventoryStockModel } from '../models/inventory-stock.model.js';
import { getInventoryMovementModel } from '../models/inventory-movement.model.js';
import { getInventoryCategoryModel } from '../models/inventory-category.model.js';
import { regexContains } from './search.helpers.js';
import { ApiError } from '../../utils/api-response.js';
import { logger } from '../../utils/logger.js';
import { getQueue, QUEUE_NAMES } from '../../jobs/queue.js';
import type {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  InventoryItemQuery,
  StockAdjustmentInput,
  BarcodeSearch,
  InventoryMovementQuery,
} from '@dento/shared';

// ── Bilingual name transform for .lean() results ───────────
// Models store nameEn/nameAr; frontend expects name: { en, ar }
function transformBilingualNames<T>(doc: T): T {
  const d = doc as any;
  if (!d) return doc;
  if (d.nameEn !== undefined) {
    d.name = { en: d.nameEn, ar: d.nameAr || '' };
    delete d.nameEn;
    delete d.nameAr;
  }
  // Populated categoryId
  if (d.categoryId && typeof d.categoryId === 'object' && d.categoryId.nameEn !== undefined) {
    d.categoryId.name = { en: d.categoryId.nameEn, ar: d.categoryId.nameAr || '' };
    delete d.categoryId.nameEn;
    delete d.categoryId.nameAr;
  }
  // Populated branchId (stock levels)
  if (d.branchId && typeof d.branchId === 'object' && d.branchId.nameEn !== undefined) {
    d.branchId.name = { en: d.branchId.nameEn, ar: d.branchId.nameAr || '' };
    delete d.branchId.nameEn;
    delete d.branchId.nameAr;
  }
  return doc;
}

/**
 * Inventory Item Service — Business logic for inventory items CRUD
 *
 * Per DENTO_V2_MASTER_PLAN.md §16
 * Per V2_DATABASE.md §8.1 — inventory_items collection
 *
 * Handles:
 * - Item CRUD with pagination/filtering/text search
 * - Stock adjustments (add/remove) with movement tracking
 * - Low-stock detection
 * - Barcode search
 * - Movement history
 * - Soft-delete / restore
 */
export class InventoryItemService {
  private Item;
  private Stock;
  private Movement;
  private Category;

  constructor(tenantDb: Connection) {
    this.Item = getInventoryItemModel(tenantDb);
    this.Stock = getInventoryStockModel(tenantDb);
    this.Movement = getInventoryMovementModel(tenantDb);
    this.Category = getInventoryCategoryModel(tenantDb);
  }

  // ── List Items (paginated, filterable) ────────────────────

  async list(query: InventoryItemQuery) {
    const { page, limit, search, categoryId, isActive, isConsumable, lowStock, sortBy, sortOrder } =
      query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IInventoryItem> = {};

    if (isActive !== undefined) filter.isActive = isActive;
    if (categoryId) filter.categoryId = categoryId;
    if (isConsumable !== undefined) filter.isConsumable = isConsumable;

    if (search) {
      filter.$or = [
        { nameEn: regexContains(search) },
        { nameAr: regexContains(search) },
        { sku: regexContains(search) },
      ];
    }

    // Low-stock items require aggregation against stock collection
    if (lowStock) {
      return this.getLowStockItems(query);
    }

    const sortField = sortBy || 'createdAt';
    const sortDir = sortOrder === 'asc' ? 1 : -1;

    const [rawItems, total] = await Promise.all([
      this.Item.find(filter)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit)
        .populate('categoryId', 'nameEn nameAr slug')
        .lean(),
      this.Item.countDocuments(filter),
    ]);

    const items = rawItems.map(transformBilingualNames);

    // Aggregate stock totals for each item
    const itemIds = rawItems.map((i) => i._id);
    const stockAgg = await this.Stock.aggregate([
      { $match: { itemId: { $in: itemIds } } },
      {
        $group: {
          _id: '$itemId',
          totalQty: { $sum: '$quantity' },
          totalValue: { $sum: '$stockValue' },
        },
      },
    ]);
    const stockMap = new Map(stockAgg.map((s: any) => [s._id.toString(), s]));

    const enrichedItems = items.map((item: any) => {
      const stock = stockMap.get(item._id.toString());
      item.currentStock = stock?.totalQty ?? 0;
      item.stockValue = stock?.totalValue ?? 0;
      return item;
    });

    return {
      items: enrichedItems,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Get Item by ID ────────────────────────────────────────

  async getById(id: string) {
    const item = await this.Item.findById(id).populate('categoryId', 'nameEn nameAr slug').lean();

    if (!item) throw ApiError.notFound('Inventory Item');

    // Aggregate total stock across all branches
    const stockAgg = await this.Stock.aggregate([
      { $match: { itemId: item._id } },
      {
        $group: { _id: null, totalQty: { $sum: '$quantity' }, totalValue: { $sum: '$stockValue' } },
      },
    ]);
    const transformed = transformBilingualNames(item) as any;
    transformed.currentStock = stockAgg[0]?.totalQty ?? 0;
    transformed.stockValue = stockAgg[0]?.totalValue ?? 0;

    return transformed;
  }

  // ── Create Item ───────────────────────────────────────────

  async create(data: CreateInventoryItemInput, userId: string) {
    // Verify category exists
    const category = await this.Category.findById(data.categoryId).lean();
    if (!category) throw ApiError.badRequest('Invalid categoryId — category not found');

    const item = new this.Item({
      ...data,
      createdBy: userId,
    });
    await item.save();

    logger.info({ sku: item.sku, itemId: item._id }, 'Inventory item created');
    return item.toObject();
  }

  // ── Update Item ───────────────────────────────────────────

  async update(id: string, data: UpdateInventoryItemInput, userId: string) {
    const item = await this.Item.findById(id);
    if (!item) throw ApiError.notFound('Inventory Item');

    // Verify categoryId if being changed
    if (data.categoryId && data.categoryId !== item.categoryId?.toString()) {
      const category = await this.Category.findById(data.categoryId).lean();
      if (!category) throw ApiError.badRequest('Invalid categoryId — category not found');
    }

    Object.assign(item, data, { updatedBy: userId });
    await item.save();

    logger.info({ sku: item.sku, itemId: item._id }, 'Inventory item updated');
    return item.toObject();
  }

  // ── Soft Delete ───────────────────────────────────────────

  async softDelete(id: string, userId: string) {
    const item = await this.Item.findById(id);
    if (!item) throw ApiError.notFound('Inventory Item');

    // Check for reserved stock — cannot deactivate if stock is reserved
    const reservedStock = await this.Stock.findOne({
      itemId: id,
      reservedQuantity: { $gt: 0 },
    }).lean();

    if (reservedStock) {
      throw ApiError.badRequest('Cannot deactivate item — has reserved stock in treatment plans');
    }

    item.isActive = false;
    item.updatedBy = userId as any;
    await item.save();

    logger.info({ sku: item.sku, itemId: item._id }, 'Inventory item deactivated');
    return item.toObject();
  }

  // ── Restore ───────────────────────────────────────────────

  async restore(id: string, userId: string) {
    const item = await this.Item.findById(id);
    if (!item) throw ApiError.notFound('Inventory Item');

    item.isActive = true;
    item.updatedBy = userId as any;
    await item.save();

    logger.info({ sku: item.sku, itemId: item._id }, 'Inventory item restored');
    return item.toObject();
  }

  // ── Get Stock Levels (all branches for an item) ───────────

  async getStockLevels(itemId: string) {
    const item = await this.Item.findById(itemId).lean();
    if (!item) throw ApiError.notFound('Inventory Item');

    const stocks = await this.Stock.find({ itemId }).populate('branchId', 'nameEn nameAr').lean();

    return stocks.map(transformBilingualNames);
  }

  // ── Adjust Stock (manual add/remove) ─────────────────────

  async adjustStock(itemId: string, data: StockAdjustmentInput, userId: string) {
    const item = await this.Item.findById(itemId);
    if (!item) throw ApiError.notFound('Inventory Item');

    // Find or create stock record for this branch
    let stock = await this.Stock.findOne({ itemId, branchId: data.branchId });
    if (!stock) {
      stock = new this.Stock({ itemId, branchId: data.branchId, quantity: 0 });
    }

    const previousQuantity = stock.quantity;

    if (data.type === 'adjustment_add') {
      stock.quantity += data.quantity;

      // Add batch if batch info provided
      if (data.batchNumber || data.expiryDate) {
        stock.batches.push({
          batchNumber: data.batchNumber ?? '',
          lotNumber: data.lotNumber ?? '',
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          quantity: data.quantity,
          receivedDate: new Date(),
          purchaseOrderId: null,
          unitCost: data.unitCost ?? item.unitCost,
          status: 'active',
        } as any);
      }
    } else {
      // adjustment_remove — FIFO: consume from oldest active batch first
      if (stock.quantity < data.quantity) {
        throw ApiError.badRequest('Insufficient stock for adjustment');
      }
      stock.quantity -= data.quantity;

      // Decrement batch quantities oldest-first (FIFO)
      let remaining = data.quantity;
      const activeBatches = stock.batches
        .filter((b) => b.status === 'active' && b.quantity > 0)
        .sort((a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime());

      for (const batch of activeBatches) {
        if (remaining <= 0) break;
        const deduct = Math.min(batch.quantity, remaining);
        batch.quantity -= deduct;
        remaining -= deduct;
      }
    }

    await stock.save(); // triggers pre-save → recomputes availableQuantity

    // Record movement
    await this.Movement.create({
      itemId,
      branchId: data.branchId,
      movementType: data.type,
      quantity: data.quantity,
      previousQuantity,
      newQuantity: stock.quantity,
      unitCost: data.unitCost ?? item.unitCost,
      referenceType: 'manual',
      referenceId: null,
      batchNumber: data.batchNumber ?? '',
      lotNumber: data.lotNumber ?? '',
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      notes: data.reason ?? '',
      createdBy: userId,
    });

    logger.info(
      { itemId, branchId: data.branchId, type: data.type, quantity: data.quantity },
      'Stock adjusted',
    );

    // L3: Real-time reorder trigger — after stock decrease, check if item fell below reorderLevel
    if (data.type === 'adjustment_remove') {
      this.checkAndTriggerReorder(itemId).catch((err) =>
        logger.warn({ err, itemId }, 'Real-time reorder check failed'),
      );
    }
  }

  // ── Real-time Reorder Check (L3) ─────────────────────────

  /**
   * After a stock decrease, checks if total available fell below reorderLevel.
   * If so, queues an immediate auto-reorder job for this specific item.
   */
  async checkAndTriggerReorder(itemId: string) {
    const item = await this.Item.findById(itemId).lean();
    if (!item || !item.isActive || !item.reorderQuantity) return;

    // Compute total available across all branches
    const stocks = await this.Stock.find({ itemId }).lean();
    const totalAvailable = stocks.reduce((sum, s) => sum + (s.availableQuantity ?? 0), 0);

    if (totalAvailable <= item.reorderLevel) {
      const queue = getQueue(QUEUE_NAMES.INVENTORY_AUTO_REORDER);
      await queue.add('check-reorder-immediate', {
        itemId,
        sku: item.sku,
        totalAvailable,
        reorderLevel: item.reorderLevel,
      });

      logger.info(
        { itemId, sku: item.sku, totalAvailable, reorderLevel: item.reorderLevel },
        'Real-time reorder check queued',
      );
    }
  }

  // ── Get Low Stock Items ───────────────────────────────────

  async getLowStockItems(query?: InventoryItemQuery) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const skip = (page - 1) * limit;

    const pipeline = [
      // Match active items (+ optional text search on name/sku — mirrors list())
      {
        $match: {
          isActive: true,
          ...(query?.search
            ? {
                $or: [
                  { nameEn: regexContains(query.search) },
                  { nameAr: regexContains(query.search) },
                  { sku: regexContains(query.search) },
                ],
              }
            : {}),
        },
      },
      // Join with stock
      {
        $lookup: {
          from: 'inventorystocks',
          localField: '_id',
          foreignField: 'itemId',
          as: 'stocks',
        },
      },
      // Compute total available across branches
      {
        $addFields: {
          totalAvailable: { $sum: '$stocks.availableQuantity' },
        },
      },
      // Filter where available ≤ reorderLevel
      {
        $match: {
          $expr: { $lte: ['$totalAvailable', '$reorderLevel'] },
        },
      },
      // Facet for pagination
      {
        $facet: {
          items: [
            { $sort: { totalAvailable: 1 } },
            { $skip: skip },
            { $limit: limit },
            { $project: { stocks: 0 } },
          ],
          count: [{ $count: 'total' }],
        },
      },
    ];

    const result = await this.Item.aggregate(
      pipeline as unknown as Parameters<typeof this.Item.aggregate>[0],
    );
    const items = (result[0]?.items ?? []).map(transformBilingualNames);
    const total = result[0]?.count?.[0]?.total ?? 0;

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

  // ── Find by Barcode ───────────────────────────────────────

  async findByBarcode(data: BarcodeSearch) {
    const item = await this.Item.findOne({
      barcode: data.code,
      isActive: true,
    })
      .populate('categoryId', 'nameEn nameAr slug')
      .lean();

    if (!item) throw ApiError.notFound('Inventory Item');
    return transformBilingualNames(item);
  }

  // ── Movement History ──────────────────────────────────────

  async getMovementHistory(itemId: string, query: InventoryMovementQuery) {
    const item = await this.Item.findById(itemId).lean();
    if (!item) throw ApiError.notFound('Inventory Item');

    const { page, limit, branchId, movementType, referenceType, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<any> = { itemId };

    if (branchId) filter.branchId = branchId;
    if (movementType) filter.movementType = movementType;
    if (referenceType) filter.referenceType = referenceType;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const [movements, total] = await Promise.all([
      this.Movement.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'firstName lastName')
        .lean(),
      this.Movement.countDocuments(filter),
    ]);

    return {
      movements,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
