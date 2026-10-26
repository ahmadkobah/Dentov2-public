import mongoose, { type Connection } from 'mongoose';
import { getInventoryItemModel } from '../models/inventory-item.model.js';
import { getInventoryStockModel } from '../models/inventory-stock.model.js';
import { getInventoryMovementModel } from '../models/inventory-movement.model.js';
import { getRedis } from '../../config/redis.js';
import { logger } from '../../utils/logger.js';

/**
 * Inventory Report Pipeline Service — MongoDB aggregation pipelines
 *
 * Per PHASE_5_REMAINING_IMPLEMENTATION_PLAN.md — Phase D
 * Per DENTO_V2_MASTER_PLAN.md §16 — Inventory reports
 *
 * D1–D10 inventory reports. All use Redis caching (5 min TTL).
 * Each method returns: { summary, chart, table }
 */

// ── Redis Cache Helper ──────────────────────────────────────

const CACHE_TTL = 300; // 5 minutes

async function getOrSet<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  try {
    const redis = getRedis();
    const cached = await redis.get(key);
    if (cached) {
      logger.debug({ key }, 'Inventory report cache hit');
      return JSON.parse(cached) as T;
    }
    const result = await fn();
    await redis.setex(key, ttl, JSON.stringify(result));
    return result;
  } catch {
    logger.warn({ key }, 'Redis unavailable for inventory report cache, executing directly');
    return fn();
  }
}

// ── Report Filters ──────────────────────────────────────────

interface ReportFilters {
  from?: string;
  to?: string;
  branchId?: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

/**
 * Aggregation `$match` does not auto-cast string ids to ObjectId (unlike
 * `find`), so branch filters silently match nothing. Cast when valid.
 */
function toMatchId(id: string): mongoose.Types.ObjectId | string {
  return mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id;
}

function buildDateMatch(filters: ReportFilters, dateField = 'createdAt'): Record<string, unknown> {
  const match: Record<string, unknown> = {};
  if (filters.from || filters.to) {
    match[dateField] = {};
    if (filters.from) (match[dateField] as Record<string, unknown>).$gte = new Date(filters.from);
    if (filters.to) (match[dateField] as Record<string, unknown>).$lte = new Date(filters.to);
  }
  if (filters.branchId) match.branchId = toMatchId(filters.branchId);
  return match;
}

function cacheKey(tenantId: string, reportType: string, filters: ReportFilters): string {
  return `inv-report:${tenantId}:${reportType}:${JSON.stringify(filters)}`;
}

// ── Service Class ───────────────────────────────────────────

export class InventoryReportPipelineService {
  private Item;
  private Stock;
  private Movement;
  private tenantId: string;

  constructor(tenantDb: Connection, tenantId: string) {
    this.Item = getInventoryItemModel(tenantDb);
    this.Stock = getInventoryStockModel(tenantDb);
    this.Movement = getInventoryMovementModel(tenantDb);
    this.tenantId = tenantId;
  }

  // ── D1: Material Usage Report ─────────────────────────────

  async materialUsage(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'material_usage', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match: Record<string, unknown> = {
        ...buildDateMatch(filters),
        movementType: { $in: ['sale', 'consumed', 'adjustment_remove', 'expired', 'damaged'] },
      };

      const [chartData, summaryData] = await Promise.all([
        this.Movement.aggregate([
          { $match: match },
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
            },
          },
          { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
          { $sort: { totalCost: -1 } },
        ]),
        this.Movement.aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              totalQuantityUsed: { $sum: '$quantity' },
              totalCostUsed: { $sum: '$totalCost' },
              totalMovements: { $sum: 1 },
              uniqueItems: { $addToSet: '$itemId' },
            },
          },
        ]),
      ]);

      const summary = summaryData[0] || {
        totalQuantityUsed: 0,
        totalCostUsed: 0,
        totalMovements: 0,
        uniqueItems: [],
      };

      return {
        summary: {
          totalQuantityUsed: summary.totalQuantityUsed,
          totalCostUsed: Math.round((summary.totalCostUsed || 0) * 100) / 100,
          totalMovements: summary.totalMovements,
          uniqueItemCount: (summary.uniqueItems as unknown[]).length,
        },
        chart: chartData.map((d: Record<string, unknown>) => ({
          itemName: (d.item as Record<string, unknown>)?.nameEn || 'Unknown',
          movementType: (d._id as Record<string, unknown>).movementType,
          quantity: d.totalQuantity,
          cost: d.totalCost,
        })),
        table: chartData,
      };
    });
  }

  // ── D2: Stock Valuation Report ────────────────────────────

  async stockValuation(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'stock_valuation', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const stockMatch: Record<string, unknown> = {};
      if (filters.branchId) stockMatch.branchId = toMatchId(filters.branchId);

      const [byCategory, totals] = await Promise.all([
        this.Stock.aggregate([
          { $match: stockMatch },
          {
            $lookup: {
              from: 'inventoryitems',
              localField: 'itemId',
              foreignField: '_id',
              as: 'item',
            },
          },
          { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: '$item.categoryId',
              totalValue: { $sum: '$stockValue' },
              totalQuantity: { $sum: '$quantity' },
              itemCount: { $sum: 1 },
              avgUnitCost: { $avg: '$item.unitCost' },
            },
          },
          {
            $lookup: {
              from: 'inventorycategories',
              localField: '_id',
              foreignField: '_id',
              as: 'category',
            },
          },
          { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
          { $sort: { totalValue: -1 } },
        ]),
        this.Stock.aggregate([
          { $match: stockMatch },
          {
            $group: {
              _id: null,
              grandTotal: { $sum: '$stockValue' },
              totalQuantity: { $sum: '$quantity' },
              totalRecords: { $sum: 1 },
            },
          },
        ]),
      ]);

      const summaryData = totals[0] || { grandTotal: 0, totalQuantity: 0, totalRecords: 0 };

      return {
        summary: {
          grandTotal: Math.round((summaryData.grandTotal || 0) * 100) / 100,
          totalQuantity: summaryData.totalQuantity,
          totalStockRecords: summaryData.totalRecords,
          categoryCount: byCategory.length,
        },
        chart: byCategory.map((d: Record<string, unknown>) => ({
          category: (d.category as Record<string, unknown>)?.nameEn || 'Uncategorized',
          value: d.totalValue,
          quantity: d.totalQuantity,
          items: d.itemCount,
        })),
        table: byCategory,
      };
    });
  }

  // ── D3: Expiry Report ─────────────────────────────────────

  async expiryReport(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'expiry_report', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const stockMatch: Record<string, unknown> = {};
      if (filters.branchId) stockMatch.branchId = toMatchId(filters.branchId);

      const now = new Date();
      const d30 = new Date(now.getTime() + 30 * 86400000);
      const d60 = new Date(now.getTime() + 60 * 86400000);
      const d90 = new Date(now.getTime() + 90 * 86400000);

      const result = await this.Stock.aggregate([
        { $match: stockMatch },
        { $unwind: '$batches' },
        // Batch status enum is active | expired | recalled | quarantine — there
        // is no 'disposed', so the old `$ne: 'disposed'` was a no-op. Exclude
        // batches pulled from circulation (recalled/quarantine); keep active +
        // naturally-expired so the "expired" bucket is still populated.
        { $match: { 'batches.status': { $nin: ['recalled', 'quarantine'] } } },
        {
          $addFields: {
            expiryBucket: {
              $switch: {
                branches: [
                  { case: { $lt: ['$batches.expiryDate', now] }, then: 'expired' },
                  { case: { $lt: ['$batches.expiryDate', d30] }, then: 'within_30d' },
                  { case: { $lt: ['$batches.expiryDate', d60] }, then: 'within_60d' },
                  { case: { $lt: ['$batches.expiryDate', d90] }, then: 'within_90d' },
                ],
                default: 'ok',
              },
            },
          },
        },
        {
          $group: {
            _id: '$expiryBucket',
            totalBatches: { $sum: 1 },
            totalQuantity: { $sum: '$batches.quantity' },
            totalValue: { $sum: { $multiply: ['$batches.quantity', '$batches.unitCost'] } },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const bucketMap: Record<string, { batches: number; quantity: number; value: number }> = {};
      for (const r of result) {
        const row = r as {
          _id: string;
          totalBatches: number;
          totalQuantity: number;
          totalValue: number;
        };
        bucketMap[row._id] = {
          batches: row.totalBatches,
          quantity: row.totalQuantity,
          value: Math.round(row.totalValue * 100) / 100,
        };
      }

      const expired = bucketMap['expired'] || { batches: 0, quantity: 0, value: 0 };
      const w30 = bucketMap['within_30d'] || { batches: 0, quantity: 0, value: 0 };
      const w60 = bucketMap['within_60d'] || { batches: 0, quantity: 0, value: 0 };
      const w90 = bucketMap['within_90d'] || { batches: 0, quantity: 0, value: 0 };

      return {
        summary: {
          expiredBatches: expired.batches,
          expiredValue: expired.value,
          atRiskValue: Math.round((w30.value + w60.value + w90.value) * 100) / 100,
          totalBatches: Object.values(bucketMap).reduce((s, b) => s + b.batches, 0),
        },
        chart: [
          { bucket: 'Expired', ...expired },
          { bucket: '< 30 days', ...w30 },
          { bucket: '30–60 days', ...w60 },
          { bucket: '60–90 days', ...w90 },
        ],
        table: result,
      };
    });
  }

  // ── D4: Consumption Forecast ──────────────────────────────

  async consumptionForecast(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'consumption_forecast', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const itemMatch: Record<string, unknown> = { isActive: true };

      // Get items with avgMonthlyUsage > 0
      const items = await this.Item.aggregate([
        { $match: { ...itemMatch, avgMonthlyUsage: { $gt: 0 } } },
        {
          $lookup: {
            from: 'inventorystocks',
            let: { itemId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$itemId', '$$itemId'] },
                  ...(filters.branchId ? { branchId: toMatchId(filters.branchId) } : {}),
                },
              },
              {
                $group: {
                  _id: null,
                  totalAvailable: { $sum: '$availableQuantity' },
                },
              },
            ],
            as: 'stockAgg',
          },
        },
        { $unwind: { path: '$stockAgg', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            currentStock: { $ifNull: ['$stockAgg.totalAvailable', 0] },
            monthsUntilDepletion: {
              $cond: {
                if: { $gt: ['$avgMonthlyUsage', 0] },
                then: {
                  $divide: [{ $ifNull: ['$stockAgg.totalAvailable', 0] }, '$avgMonthlyUsage'],
                },
                else: null,
              },
            },
          },
        },
        { $sort: { monthsUntilDepletion: 1 } },
        { $limit: 100 },
      ]);

      const critical = items.filter(
        (i: Record<string, unknown>) =>
          (i.monthsUntilDepletion as number) !== null && (i.monthsUntilDepletion as number) <= 1,
      );
      const warning = items.filter(
        (i: Record<string, unknown>) =>
          (i.monthsUntilDepletion as number) !== null &&
          (i.monthsUntilDepletion as number) > 1 &&
          (i.monthsUntilDepletion as number) <= 3,
      );

      return {
        summary: {
          totalTrackedItems: items.length,
          criticalItems: critical.length,
          warningItems: warning.length,
          avgMonthsRemaining:
            items.length > 0
              ? Math.round(
                  (items.reduce(
                    (s: number, i: Record<string, unknown>) =>
                      s + ((i.monthsUntilDepletion as number) || 0),
                    0,
                  ) /
                    items.length) *
                    10,
                ) / 10
              : 0,
        },
        chart: items.slice(0, 20).map((i: Record<string, unknown>) => ({
          item: i.nameEn,
          sku: i.sku,
          currentStock: i.currentStock,
          avgMonthlyUsage: i.avgMonthlyUsage || 0,
          monthsUntilDepletion:
            i.monthsUntilDepletion !== null
              ? Math.round((i.monthsUntilDepletion as number) * 10) / 10
              : null,
        })),
        table: items,
      };
    });
  }

  // ── D6: Stock Movement History Report ─────────────────────

  async stockMovementHistory(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'stock_movement_history', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match = buildDateMatch(filters);

      const [byType, timeline, totals] = await Promise.all([
        // Group by movement type
        this.Movement.aggregate([
          { $match: match },
          {
            $group: {
              _id: '$movementType',
              count: { $sum: 1 },
              totalQuantity: { $sum: '$quantity' },
              totalCost: { $sum: '$totalCost' },
            },
          },
          { $sort: { count: -1 } },
        ]),
        // Daily timeline
        this.Movement.aggregate([
          { $match: match },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' },
              },
              inbound: {
                $sum: {
                  $cond: [
                    {
                      $in: [
                        '$movementType',
                        ['purchase', 'adjustment_add', 'transfer_in', 'return_patient'],
                      ],
                    },
                    '$quantity',
                    0,
                  ],
                },
              },
              outbound: {
                $sum: {
                  $cond: [
                    {
                      $in: [
                        '$movementType',
                        [
                          'sale',
                          'consumed',
                          'adjustment_remove',
                          'transfer_out',
                          'expired',
                          'damaged',
                        ],
                      ],
                    },
                    '$quantity',
                    0,
                  ],
                },
              },
              totalMovements: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        ]),
        // Grand totals
        this.Movement.aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              totalMovements: { $sum: 1 },
              totalQuantity: { $sum: '$quantity' },
              totalCost: { $sum: '$totalCost' },
            },
          },
        ]),
      ]);

      const summaryRow = totals[0] || { totalMovements: 0, totalQuantity: 0, totalCost: 0 };

      return {
        summary: {
          totalMovements: summaryRow.totalMovements,
          totalQuantity: summaryRow.totalQuantity,
          totalCost: Math.round((summaryRow.totalCost || 0) * 100) / 100,
          movementTypes: byType.length,
        },
        chart: timeline.map((d: Record<string, unknown>) => ({
          period: d._id,
          inbound: d.inbound,
          outbound: d.outbound,
          movements: d.totalMovements,
        })),
        table: byType,
      };
    });
  }

  // ── D8: Low Stock Alert Report ────────────────────────────

  async lowStock(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'low_stock', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const stockMatch: Record<string, unknown> = {};
      if (filters.branchId) stockMatch.branchId = toMatchId(filters.branchId);

      const items = await this.Stock.aggregate([
        { $match: stockMatch },
        {
          $lookup: {
            from: 'inventoryitems',
            localField: 'itemId',
            foreignField: '_id',
            as: 'item',
          },
        },
        { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            $expr: { $lte: ['$availableQuantity', '$item.reorderLevel'] },
            'item.isActive': true,
          },
        },
        {
          $addFields: {
            daysToStockout: {
              $cond: {
                if: { $gt: ['$item.avgMonthlyUsage', 0] },
                then: {
                  $multiply: [{ $divide: ['$availableQuantity', '$item.avgMonthlyUsage'] }, 30],
                },
                else: null,
              },
            },
          },
        },
        { $sort: { daysToStockout: 1 } },
      ]);

      const outOfStock = items.filter(
        (i: Record<string, unknown>) => (i.availableQuantity as number) === 0,
      );
      const critical = items.filter(
        (i: Record<string, unknown>) =>
          (i.availableQuantity as number) > 0 &&
          (i.availableQuantity as number) <=
            (((i.item as Record<string, unknown>)?.minStockLevel as number) || 0),
      );

      return {
        summary: {
          totalLowStockItems: items.length,
          outOfStockCount: outOfStock.length,
          criticalCount: critical.length,
          avgDaysToStockout:
            items.length > 0
              ? Math.round(
                  (items
                    .filter((i: Record<string, unknown>) => i.daysToStockout !== null)
                    .reduce(
                      (s: number, i: Record<string, unknown>) => s + (i.daysToStockout as number),
                      0,
                    ) /
                    Math.max(
                      items.filter((i: Record<string, unknown>) => i.daysToStockout !== null)
                        .length,
                      1,
                    )) *
                    10,
                ) / 10
              : 0,
        },
        chart: items.slice(0, 30).map((i: Record<string, unknown>) => ({
          item: (i.item as Record<string, unknown>)?.nameEn || 'Unknown',
          sku: (i.item as Record<string, unknown>)?.sku,
          available: i.availableQuantity,
          reorderLevel: (i.item as Record<string, unknown>)?.reorderLevel,
          daysToStockout:
            i.daysToStockout !== null ? Math.round((i.daysToStockout as number) * 10) / 10 : null,
        })),
        table: items,
      };
    });
  }

  // ── D9: Dead Stock Report ─────────────────────────────────

  async deadStock(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'dead_stock', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      // Default: items with no movements in 90 days
      const cutoffDays = 90;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - cutoffDays);

      const stockMatch: Record<string, unknown> = { quantity: { $gt: 0 } };
      if (filters.branchId) stockMatch.branchId = toMatchId(filters.branchId);

      // Find stock records, lookup item, check last movement
      const items = await this.Stock.aggregate([
        { $match: stockMatch },
        {
          $lookup: {
            from: 'inventoryitems',
            localField: 'itemId',
            foreignField: '_id',
            as: 'item',
          },
        },
        { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'inventorymovements',
            let: { itemId: '$itemId', branchId: '$branchId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$itemId', '$$itemId'] }, { $eq: ['$branchId', '$$branchId'] }],
                  },
                },
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
            ],
            as: 'lastMovement',
          },
        },
        { $unwind: { path: '$lastMovement', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            $or: [
              { lastMovement: { $exists: false } },
              { 'lastMovement.createdAt': { $lt: cutoffDate } },
            ],
          },
        },
        {
          $addFields: {
            daysSinceLastMovement: {
              $cond: {
                if: { $ifNull: ['$lastMovement.createdAt', false] },
                then: {
                  $divide: [{ $subtract: [new Date(), '$lastMovement.createdAt'] }, 86400000],
                },
                else: null,
              },
            },
            lockedValue: { $multiply: ['$quantity', { $ifNull: ['$item.unitCost', 0] }] },
          },
        },
        { $sort: { lockedValue: -1 } },
      ]);

      const totalLockedValue = items.reduce(
        (s: number, i: Record<string, unknown>) => s + ((i.lockedValue as number) || 0),
        0,
      );

      return {
        summary: {
          deadStockItems: items.length,
          totalLockedValue: Math.round(totalLockedValue * 100) / 100,
          cutoffDays,
          avgDaysSinceMovement:
            items.length > 0
              ? Math.round(
                  (items
                    .filter((i: Record<string, unknown>) => i.daysSinceLastMovement !== null)
                    .reduce(
                      (s: number, i: Record<string, unknown>) =>
                        s + (i.daysSinceLastMovement as number),
                      0,
                    ) /
                    Math.max(
                      items.filter((i: Record<string, unknown>) => i.daysSinceLastMovement !== null)
                        .length,
                      1,
                    )) *
                    10,
                ) / 10
              : 0,
        },
        chart: items.slice(0, 20).map((i: Record<string, unknown>) => ({
          item: (i.item as Record<string, unknown>)?.nameEn || 'Unknown',
          sku: (i.item as Record<string, unknown>)?.sku,
          quantity: i.quantity,
          lockedValue: Math.round(((i.lockedValue as number) || 0) * 100) / 100,
          daysSinceMovement:
            i.daysSinceLastMovement !== null ? Math.round(i.daysSinceLastMovement as number) : null,
        })),
        table: items,
      };
    });
  }

  // ── D10: ABC Analysis Report ──────────────────────────────

  async abcAnalysis(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'abc_analysis', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const movementMatch: Record<string, unknown> = {
        ...buildDateMatch(filters),
        movementType: { $in: ['sale', 'consumed'] },
      };

      // Get annual consumption value per item
      const consumption = await this.Movement.aggregate([
        { $match: movementMatch },
        {
          $group: {
            _id: '$itemId',
            totalConsumptionValue: { $sum: '$totalCost' },
            totalQuantity: { $sum: '$quantity' },
            movementCount: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'inventoryitems',
            localField: '_id',
            foreignField: '_id',
            as: 'item',
          },
        },
        { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
        { $sort: { totalConsumptionValue: -1 } },
      ]);

      // Calculate cumulative % for ABC classification
      const grandTotal = consumption.reduce(
        (s: number, c: Record<string, unknown>) => s + ((c.totalConsumptionValue as number) || 0),
        0,
      );

      let cumulative = 0;
      const classified = consumption.map((c: Record<string, unknown>) => {
        cumulative += (c.totalConsumptionValue as number) || 0;
        const cumulativePercent = grandTotal > 0 ? (cumulative / grandTotal) * 100 : 0;

        let classification: 'A' | 'B' | 'C';
        if (cumulativePercent <= 80) classification = 'A';
        else if (cumulativePercent <= 95) classification = 'B';
        else classification = 'C';

        return {
          ...c,
          cumulativePercent: Math.round(cumulativePercent * 10) / 10,
          classification,
          percentOfTotal:
            grandTotal > 0
              ? Math.round((((c.totalConsumptionValue as number) || 0) / grandTotal) * 1000) / 10
              : 0,
        } as Record<string, unknown> & {
          cumulativePercent: number;
          classification: 'A' | 'B' | 'C';
          percentOfTotal: number;
          totalConsumptionValue?: number;
          item?: Record<string, unknown>;
        };
      });

      const aItems = classified.filter((c) => c.classification === 'A');
      const bItems = classified.filter((c) => c.classification === 'B');
      const cItems = classified.filter((c) => c.classification === 'C');

      return {
        summary: {
          totalItems: classified.length,
          grandTotal: Math.round(grandTotal * 100) / 100,
          classA: {
            count: aItems.length,
            value:
              Math.round(
                aItems.reduce((s, i) => s + ((i.totalConsumptionValue as number) || 0), 0) * 100,
              ) / 100,
            percentOfItems:
              classified.length > 0
                ? Math.round((aItems.length / classified.length) * 1000) / 10
                : 0,
          },
          classB: {
            count: bItems.length,
            value:
              Math.round(
                bItems.reduce((s, i) => s + ((i.totalConsumptionValue as number) || 0), 0) * 100,
              ) / 100,
            percentOfItems:
              classified.length > 0
                ? Math.round((bItems.length / classified.length) * 1000) / 10
                : 0,
          },
          classC: {
            count: cItems.length,
            value:
              Math.round(
                cItems.reduce((s, i) => s + ((i.totalConsumptionValue as number) || 0), 0) * 100,
              ) / 100,
            percentOfItems:
              classified.length > 0
                ? Math.round((cItems.length / classified.length) * 1000) / 10
                : 0,
          },
        },
        chart: classified.slice(0, 30).map((c) => ({
          item: (c.item as Record<string, unknown>)?.nameEn || 'Unknown',
          sku: (c.item as Record<string, unknown>)?.sku,
          value: c.totalConsumptionValue,
          percentOfTotal: c.percentOfTotal,
          classification: c.classification,
        })),
        table: classified,
      };
    });
  }

  // ── Dispatcher — route by report type ─────────────────────

  async getReport(reportType: string, filters: ReportFilters) {
    switch (reportType) {
      case 'material_usage':
        return this.materialUsage(filters);
      case 'stock_valuation':
        return this.stockValuation(filters);
      case 'expiry_report':
        return this.expiryReport(filters);
      case 'consumption_forecast':
        return this.consumptionForecast(filters);
      case 'stock_movement_history':
        return this.stockMovementHistory(filters);
      case 'low_stock':
        return this.lowStock(filters);
      case 'dead_stock':
        return this.deadStock(filters);
      case 'abc_analysis':
        return this.abcAnalysis(filters);
      default:
        return null;
    }
  }
}
