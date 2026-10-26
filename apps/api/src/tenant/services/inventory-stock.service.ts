import { Types, type Connection, type QueryFilter } from 'mongoose';
import type { IInventoryStock } from '../models/inventory-stock.model.js';
import { getInventoryStockModel } from '../models/inventory-stock.model.js';
import { getInventoryMovementModel } from '../models/inventory-movement.model.js';
import { getInventoryItemModel } from '../models/inventory-item.model.js';
import { ApiError } from '../../utils/api-response.js';
import { logger } from '../../utils/logger.js';
import type { ExpiryQuery, BulkDisposeInput } from '@dento/shared';

/**
 * Inventory Stock Service — Business logic for stock management
 *
 * Per DENTO_V2_MASTER_PLAN.md §16
 * Per V2_DATABASE.md §8.2 — inventory_stock collection
 *
 * Handles:
 * - Branch-level stock queries and summaries
 * - Batch expiry monitoring and disposal
 * - Stock reservation/un-reservation for treatment plans
 * - FIFO / Weighted Average / Last Purchase valuation
 * - Expiry dashboard (grouped by timeframe)
 * - BullMQ cron target for expired batch processing
 * - Stock reporting
 */
// Sentinel ObjectId for system-initiated operations (e.g. cron jobs)
const SYSTEM_USER_ID = new Types.ObjectId('000000000000000000000000');

export class InventoryStockService {
  private Stock;
  private Movement;
  private Item;

  constructor(tenantDb: Connection) {
    this.Stock = getInventoryStockModel(tenantDb);
    this.Movement = getInventoryMovementModel(tenantDb);
    this.Item = getInventoryItemModel(tenantDb);
  }

  // ── Get Stock by Branch (paginated) ───────────────────────

  async getStockByBranch(branchId: string, query: { page: number; limit: number }) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IInventoryStock> = { branchId };

    const [items, total] = await Promise.all([
      this.Stock.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('itemId', 'sku nameEn nameAr unit unitCost')
        .lean(),
      this.Stock.countDocuments(filter),
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

  // ── Get Stock for Item (all branches) ─────────────────────

  async getStockForItem(itemId: string) {
    const item = await this.Item.findById(itemId).lean();
    if (!item) throw ApiError.notFound('Inventory Item');

    const stocks = await this.Stock.find({ itemId }).populate('branchId', 'nameEn nameAr').lean();

    return stocks;
  }

  // ── Get Expiring Batches ──────────────────────────────────

  async getExpiringBatches(query: ExpiryQuery) {
    const { branchId, daysAhead = 90, status } = query;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    const matchStage: Record<string, any> = {
      'batches.expiryDate': { $ne: null, $lte: cutoffDate },
      'batches.status': status || 'active',
    };

    if (branchId) matchStage.branchId = new Types.ObjectId(branchId);

    const pipeline = [
      { $unwind: '$batches' },
      { $match: matchStage },
      {
        $lookup: {
          from: 'inventoryitems',
          localField: 'itemId',
          foreignField: '_id',
          as: 'item',
          pipeline: [{ $project: { sku: 1, nameEn: 1, nameAr: 1, unit: 1 } }],
        },
      },
      { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
      { $sort: { 'batches.expiryDate': 1 as const } },
    ];

    const results = await this.Stock.aggregate(pipeline);
    return results;
  }

  // ── Dispose Single Batch ──────────────────────────────────

  async disposeBatch(stockId: string, batchNumber: string, userId: string) {
    const stock = await this.Stock.findById(stockId);
    if (!stock) throw ApiError.notFound('Inventory Stock');

    const batch = stock.batches.find((b) => b.batchNumber === batchNumber);
    if (!batch) throw ApiError.notFound('Batch');

    if (batch.status !== 'active') {
      throw ApiError.badRequest(`Batch is already ${batch.status}`);
    }

    const disposedQuantity = batch.quantity;
    const previousQuantity = stock.quantity;

    batch.status = 'expired';
    batch.quantity = 0;
    stock.quantity = Math.max(0, stock.quantity - disposedQuantity);

    await stock.save();

    // Record movement
    await this.Movement.create({
      itemId: stock.itemId,
      branchId: stock.branchId,
      movementType: 'expired',
      quantity: disposedQuantity,
      previousQuantity,
      newQuantity: stock.quantity,
      unitCost: batch.unitCost,
      referenceType: 'expiry_check',
      referenceId: null,
      batchNumber: batch.batchNumber,
      lotNumber: batch.lotNumber,
      expiryDate: batch.expiryDate,
      notes: 'Batch disposed — expired',
      createdBy: userId,
    });

    logger.info({ stockId, batchNumber, disposedQuantity }, 'Batch disposed');

    return { disposedQuantity };
  }

  // ── Bulk Dispose Expired Batches ──────────────────────────

  async bulkDispose(data: BulkDisposeInput, userId: string) {
    let disposed = 0;

    for (const item of data.items) {
      try {
        await this.disposeBatch(item.stockId, item.batchNumber, userId);
        disposed++;
      } catch (err) {
        logger.warn(
          { stockId: item.stockId, batchNumber: item.batchNumber, error: err },
          'Failed to dispose batch in bulk operation',
        );
      }
    }

    logger.info({ disposed, total: data.items.length }, 'Bulk dispose completed');
    return { disposed, total: data.items.length };
  }

  // ── Reserve Stock (for treatment plans) ───────────────────

  async reserveStock(itemId: string, branchId: string, quantity: number, userId: string) {
    const stock = await this.Stock.findOne({ itemId, branchId });
    if (!stock) throw ApiError.notFound('Inventory Stock');

    if (stock.availableQuantity < quantity) {
      throw ApiError.badRequest(
        `Insufficient available stock: ${stock.availableQuantity} < ${quantity}`,
      );
    }

    const previousQuantity = stock.quantity;
    stock.reservedQuantity += quantity;
    await stock.save(); // pre-save recomputes availableQuantity

    await this.Movement.create({
      itemId,
      branchId,
      movementType: 'reserved',
      quantity,
      previousQuantity,
      newQuantity: stock.quantity,
      unitCost: 0,
      referenceType: 'treatment_plan',
      referenceId: null,
      notes: `Reserved ${quantity} units`,
      createdBy: userId,
    });

    logger.info({ itemId, branchId, quantity }, 'Stock reserved');
  }

  // ── Unreserve Stock (release reservation) ─────────────────

  async unreserveStock(itemId: string, branchId: string, quantity: number, userId: string) {
    const stock = await this.Stock.findOne({ itemId, branchId });
    if (!stock) throw ApiError.notFound('Inventory Stock');

    if (stock.reservedQuantity < quantity) {
      throw ApiError.badRequest(
        `Cannot unreserve ${quantity} — only ${stock.reservedQuantity} reserved`,
      );
    }

    const previousQuantity = stock.quantity;
    stock.reservedQuantity -= quantity;
    await stock.save(); // pre-save recomputes availableQuantity

    await this.Movement.create({
      itemId,
      branchId,
      movementType: 'unreserved',
      quantity,
      previousQuantity,
      newQuantity: stock.quantity,
      unitCost: 0,
      referenceType: 'treatment_plan',
      referenceId: null,
      notes: `Released ${quantity} reserved units`,
      createdBy: userId,
    });

    logger.info({ itemId, branchId, quantity }, 'Stock unreserved');
  }

  // ── Adjust Stock Quantity ─────────────────────────────────

  async adjustStock(
    itemId: string,
    branchId: string,
    newQuantity: number,
    reason: string,
    userId: string,
  ) {
    const item = await this.Item.findById(itemId).lean();
    if (!item) throw ApiError.notFound('Inventory Item');

    let stock = await this.Stock.findOne({ itemId, branchId });

    if (!stock) {
      // Create a new stock record if none exists
      stock = new this.Stock({
        itemId,
        branchId,
        quantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        batches: [],
        stockValue: 0,
        valuationMethod: 'weighted_average',
        weightedAvgCost: 0,
      });
    }

    const previousQuantity = stock.quantity;
    const delta = newQuantity - previousQuantity;

    stock.quantity = newQuantity;
    stock.availableQuantity = newQuantity - stock.reservedQuantity;
    await stock.save();

    // Record movement
    await this.Movement.create({
      itemId,
      branchId,
      movementType: delta >= 0 ? 'adjustment_add' : 'adjustment_remove',
      quantity: Math.abs(delta),
      previousQuantity,
      newQuantity,
      notes: reason || 'Manual stock adjustment',
      createdBy: userId,
    });

    logger.info(
      { itemId, branchId, previousQuantity, newQuantity, delta },
      'Stock adjusted manually',
    );

    return stock.toObject();
  }

  // ── Recalculate Stock Value ───────────────────────────────

  async recalculateStockValue(stockId: string) {
    const stock = await this.Stock.findById(stockId);
    if (!stock) throw ApiError.notFound('Inventory Stock');

    const activeBatches = stock.batches.filter((b) => b.status === 'active');

    switch (stock.valuationMethod) {
      case 'fifo': {
        // Sum of (batch.quantity × batch.unitCost) for active batches
        stock.stockValue = activeBatches.reduce((sum, b) => sum + b.quantity * b.unitCost, 0);
        break;
      }
      case 'weighted_average': {
        // Weighted average cost × total quantity
        const totalQty = activeBatches.reduce((s, b) => s + b.quantity, 0);
        const totalCost = activeBatches.reduce((s, b) => s + b.quantity * b.unitCost, 0);
        stock.weightedAvgCost = totalQty > 0 ? totalCost / totalQty : 0;
        stock.stockValue = stock.quantity * stock.weightedAvgCost;
        break;
      }
      case 'last_purchase': {
        // Last batch unit cost × quantity
        const lastBatch = activeBatches.sort(
          (a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime(),
        )[0];
        const lastCost = lastBatch?.unitCost ?? 0;
        stock.stockValue = stock.quantity * lastCost;
        break;
      }
    }

    await stock.save();
    logger.info(
      { stockId, valuationMethod: stock.valuationMethod, stockValue: stock.stockValue },
      'Stock value recalculated',
    );

    return { stockValue: stock.stockValue, valuationMethod: stock.valuationMethod };
  }

  // ── Stock Summary per Branch ──────────────────────────────

  async getStockSummary(branchId: string) {
    const pipeline = [
      { $match: { branchId: new Types.ObjectId(branchId) } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalReserved: { $sum: '$reservedQuantity' },
          totalAvailable: { $sum: '$availableQuantity' },
          totalValue: { $sum: '$stockValue' },
        },
      },
    ];

    const result = await this.Stock.aggregate(pipeline);
    return (
      result[0] ?? {
        totalItems: 0,
        totalQuantity: 0,
        totalReserved: 0,
        totalAvailable: 0,
        totalValue: 0,
      }
    );
  }

  // ── Expiry Dashboard (grouped by timeframe) ───────────────

  async getExpiryDashboard(branchId: string) {
    const now = new Date();
    const d30 = new Date(now.getTime() + 30 * 86400000);
    const d60 = new Date(now.getTime() + 60 * 86400000);
    const d90 = new Date(now.getTime() + 90 * 86400000);

    const matchStage: Record<string, any> = {
      'batches.status': 'active',
      'batches.expiryDate': { $ne: null },
    };
    if (branchId) matchStage.branchId = new Types.ObjectId(branchId);

    const pipeline = [
      { $unwind: '$batches' },
      { $match: matchStage },
      {
        $addFields: {
          expiryGroup: {
            $switch: {
              branches: [
                { case: { $lt: ['$batches.expiryDate', now] }, then: 'expired' },
                { case: { $lt: ['$batches.expiryDate', d30] }, then: 'expiring_30' },
                { case: { $lt: ['$batches.expiryDate', d60] }, then: 'expiring_60' },
                { case: { $lt: ['$batches.expiryDate', d90] }, then: 'expiring_90' },
              ],
              default: 'ok',
            },
          },
        },
      },
      {
        $group: {
          _id: '$expiryGroup',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$batches.quantity' },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const results = await this.Stock.aggregate(
      pipeline as unknown as Parameters<typeof this.Stock.aggregate>[0],
    );

    // Build structured dashboard
    const dashboard: Record<string, { count: number; totalQuantity: number }> = {
      expired: { count: 0, totalQuantity: 0 },
      expiring_30: { count: 0, totalQuantity: 0 },
      expiring_60: { count: 0, totalQuantity: 0 },
      expiring_90: { count: 0, totalQuantity: 0 },
      ok: { count: 0, totalQuantity: 0 },
    };

    for (const r of results) {
      if (dashboard[r._id]) {
        dashboard[r._id] = { count: r.count, totalQuantity: r.totalQuantity };
      }
    }

    return dashboard;
  }

  // ── Process Expired Batches (BullMQ cron target) ──────────

  async processExpiredBatches() {
    const now = new Date();
    let processedCount = 0;

    const stocks = await this.Stock.find({
      'batches.expiryDate': { $lte: now },
      'batches.status': 'active',
    });

    for (const stock of stocks) {
      for (const batch of stock.batches) {
        if (batch.status === 'active' && batch.expiryDate && batch.expiryDate <= now) {
          const disposedQuantity = batch.quantity;
          const previousQuantity = stock.quantity;

          batch.status = 'expired';
          batch.quantity = 0;
          stock.quantity = Math.max(0, stock.quantity - disposedQuantity);

          await this.Movement.create({
            itemId: stock.itemId,
            branchId: stock.branchId,
            movementType: 'expired',
            quantity: disposedQuantity,
            previousQuantity,
            newQuantity: stock.quantity,
            unitCost: batch.unitCost,
            referenceType: 'expiry_check',
            referenceId: null,
            batchNumber: batch.batchNumber,
            lotNumber: batch.lotNumber,
            expiryDate: batch.expiryDate,
            notes: 'Auto-expired by cron job',
            createdBy: SYSTEM_USER_ID,
          });

          processedCount++;
        }
      }
      await stock.save();
    }

    logger.info({ processedCount }, 'Expired batches processed by cron');
    return { processedCount };
  }

  // ── Stock Report (movement-based) ─────────────────────────

  async getStockReport(branchId: string, dateRange: { from: string; to: string }) {
    const pipeline = [
      {
        $match: {
          branchId: new Types.ObjectId(branchId),
          createdAt: {
            $gte: new Date(dateRange.from),
            $lte: new Date(dateRange.to),
          },
        },
      },
      {
        $group: {
          _id: { itemId: '$itemId', movementType: '$movementType' },
          totalQuantity: { $sum: '$quantity' },
          totalCost: { $sum: '$totalCost' },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'inventoryitems',
          localField: '_id.itemId',
          foreignField: '_id',
          as: 'item',
          pipeline: [{ $project: { sku: 1, nameEn: 1, nameAr: 1, unit: 1 } }],
        },
      },
      { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
      { $sort: { '_id.itemId': 1 as const, '_id.movementType': 1 as const } },
    ];

    const result = await this.Movement.aggregate(pipeline);
    return result;
  }
}
