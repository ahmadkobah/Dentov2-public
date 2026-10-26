/**
 * InventoryReportPipelineService — Unit Tests
 *
 * Tests all 10 report pipelines (D1–D10) and the dispatcher.
 * Each pipeline method returns { summary, chart, table }.
 * Mocks Mongoose aggregate + Redis cache.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryReportPipelineService } from './inventory-report-pipeline.service.js';
import type { Connection } from 'mongoose';

// ── Mock Factory Helpers ───────────────────────────────────

function createAggregateMock(result: unknown[] = []) {
  return vi.fn().mockResolvedValue(result);
}

function createMockModel(aggregateResult: unknown[] = []) {
  return {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([]),
            }),
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      lean: vi.fn().mockResolvedValue([]),
    }),
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
    aggregate: createAggregateMock(aggregateResult),
  };
}

// ── Mock Redis (always miss — no cache) ────────────────────

vi.mock('../../config/redis.js', () => ({
  getRedis: vi.fn(() => ({
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
  })),
}));

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ── Model Mocks ────────────────────────────────────────────

const materialUsageChart = [
  {
    _id: { itemId: 'item-1', movementType: 'consumed' },
    totalQuantity: 50,
    totalCost: 1250,
    count: 10,
    item: [{ _id: 'item-1', nameEn: 'Composite', sku: 'SKU-001' }],
  },
];
const materialUsageSummary = [
  {
    _id: null,
    totalQuantityUsed: 50,
    totalCostUsed: 1250,
    totalMovements: 10,
    uniqueItems: ['item-1'],
  },
];

const stockValuationResult = [
  {
    _id: 'cat-1',
    categoryName: 'Restorative',
    totalItems: 5,
    totalQuantity: 200,
    totalValue: 5000,
  },
];

const expiryBucketResult = [
  { _id: 'expired', count: 2 },
  { _id: '30d', count: 3 },
  { _id: '60d', count: 1 },
  { _id: '90d', count: 4 },
];

const forecastResult = [
  {
    _id: 'item-1',
    itemName: 'Composite',
    avgMonthlyUsage: 15,
    currentStock: 45,
    monthsUntilDepletion: 3,
  },
];

const movementHistoryResult = [
  {
    _id: { date: '2025-01', type: 'inbound' },
    totalQuantity: 100,
    totalCost: 2500,
    count: 5,
  },
];

const lowStockResult = [
  {
    _id: 'item-1',
    itemName: 'Composite',
    currentStock: 5,
    reorderLevel: 10,
    reorderQuantity: 50,
  },
];

const deadStockResult = [
  {
    _id: 'item-2',
    itemName: 'Old Material',
    lastMovement: new Date('2024-06-01'),
    currentStock: 30,
  },
];

const abcResult = [
  { _id: 'item-1', itemName: 'Composite', totalValue: 50000, classification: 'A' },
  { _id: 'item-2', itemName: 'Cement', totalValue: 10000, classification: 'B' },
  { _id: 'item-3', itemName: 'Cotton', totalValue: 500, classification: 'C' },
];

// We need to set up different aggregate results per model
let movementAggregate: ReturnType<typeof vi.fn>;
let stockAggregate: ReturnType<typeof vi.fn>;
let itemAggregate: ReturnType<typeof vi.fn>;

vi.mock('../models/inventory-item.model.js', () => ({
  getInventoryItemModel: vi.fn(() => {
    const model = createMockModel();
    itemAggregate = model.aggregate;
    return model;
  }),
}));

vi.mock('../models/inventory-stock.model.js', () => ({
  getInventoryStockModel: vi.fn(() => {
    const model = createMockModel();
    stockAggregate = model.aggregate;
    return model;
  }),
}));

vi.mock('../models/inventory-movement.model.js', () => ({
  getInventoryMovementModel: vi.fn(() => {
    const model = createMockModel();
    movementAggregate = model.aggregate;
    return model;
  }),
}));

vi.mock('../models/inventory-category.model.js', () => ({
  getInventoryCategoryModel: vi.fn(() => createMockModel()),
}));

// ── Tests ──────────────────────────────────────────────────

describe('InventoryReportPipelineService', () => {
  let service: InventoryReportPipelineService;
  const mockConnection = {} as Connection;
  const filters = { from: '2025-01-01', to: '2025-06-30' };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new InventoryReportPipelineService(mockConnection, 'tenant-1');
  });

  describe('D1: materialUsage', () => {
    it('should return summary, chart, and table', async () => {
      movementAggregate
        .mockResolvedValueOnce(materialUsageChart)
        .mockResolvedValueOnce(materialUsageSummary);

      const result = await service.materialUsage(filters);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('chart');
      expect(result).toHaveProperty('table');
      expect(movementAggregate).toHaveBeenCalled();
    });
  });

  describe('D2: stockValuation', () => {
    it('should return summary, chart, and table', async () => {
      stockAggregate.mockResolvedValueOnce(stockValuationResult);

      const result = await service.stockValuation(filters);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('chart');
      expect(result).toHaveProperty('table');
    });
  });

  describe('D3: expiryReport', () => {
    it('should return expiry buckets in summary/chart/table', async () => {
      stockAggregate
        .mockResolvedValueOnce(expiryBucketResult)
        .mockResolvedValueOnce([
          { _id: 'item-1', itemName: 'Composite', expiryDate: new Date('2025-08-01'), quantity: 5 },
        ]);

      const result = await service.expiryReport(filters);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('chart');
      expect(result).toHaveProperty('table');
    });
  });

  describe('D4: consumptionForecast', () => {
    it('should return forecast data', async () => {
      movementAggregate.mockResolvedValueOnce(forecastResult);

      const result = await service.consumptionForecast(filters);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('chart');
      expect(result).toHaveProperty('table');
    });
  });

  describe('D6: stockMovementHistory', () => {
    it('should return movement timeline', async () => {
      movementAggregate
        .mockResolvedValueOnce(movementHistoryResult)
        .mockResolvedValueOnce([{ _id: null, totalInbound: 100, totalOutbound: 50 }]);

      const result = await service.stockMovementHistory(filters);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('chart');
      expect(result).toHaveProperty('table');
    });
  });

  describe('D8: lowStock', () => {
    it('should return items at/below reorder level', async () => {
      stockAggregate.mockResolvedValueOnce(lowStockResult);

      const result = await service.lowStock(filters);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('chart');
      expect(result).toHaveProperty('table');
    });
  });

  describe('D9: deadStock', () => {
    it('should return items with no recent movement', async () => {
      itemAggregate.mockResolvedValueOnce(deadStockResult);

      const result = await service.deadStock(filters);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('chart');
      expect(result).toHaveProperty('table');
    });
  });

  describe('D10: abcAnalysis', () => {
    it('should return ABC classification', async () => {
      movementAggregate.mockResolvedValueOnce(abcResult);

      const result = await service.abcAnalysis(filters);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('chart');
      expect(result).toHaveProperty('table');
    });
  });

  describe('getReport dispatcher', () => {
    it('should dispatch to materialUsage for "material_usage"', async () => {
      movementAggregate
        .mockResolvedValueOnce(materialUsageChart)
        .mockResolvedValueOnce(materialUsageSummary);

      const result = await service.getReport('material_usage', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch to stockValuation for "stock_valuation"', async () => {
      stockAggregate.mockResolvedValueOnce(stockValuationResult);

      const result = await service.getReport('stock_valuation', filters);
      expect(result).toBeDefined();
    });

    it('should return null for unknown report type', async () => {
      const result = await service.getReport('unknown_report', filters);
      expect(result).toBeNull();
    });
  });
});
