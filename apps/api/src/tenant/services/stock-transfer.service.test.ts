/**
 * StockTransferService — Unit Tests
 *
 * Tests list filtering (double populate), creation with branch/stock validation,
 * insufficient stock guard, same-branch rejection, and status transitions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StockTransferService } from './stock-transfer.service.js';
import { ApiError } from '../../utils/api-response.js';
import type { Connection } from 'mongoose';

// ── Helpers ────────────────────────────────────────────────

function chainable<T>(doc: T) {
  const c: Record<string, unknown> = {
    lean: vi.fn().mockResolvedValue(doc),
    populate: vi.fn().mockImplementation(() => c),
    then: (res: (v: T) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(doc).then(res, rej),
    catch: (fn: (e: unknown) => unknown) => Promise.resolve(doc).catch(fn),
  };
  return c;
}

// ── Mock Data ──────────────────────────────────────────────

const VALID_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const BRANCH_1 = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const BRANCH_2 = 'cccccccccccccccccccccccc';
const ITEM_1 = 'dddddddddddddddddddddddd';

const mockTransfer = {
  _id: VALID_ID,
  transferNumber: 'TRF-2025-001',
  fromBranchId: BRANCH_1,
  toBranchId: BRANCH_2,
  status: 'draft',
  items: [{ itemId: ITEM_1, quantity: 20, sku: 'SKU-001' }],
  createdBy: 'user-1',
};

function mockTransferDoc(overrides: Record<string, unknown> = {}) {
  return {
    ...mockTransfer,
    ...overrides,
    save: vi.fn().mockResolvedValue(undefined),
    toObject: vi.fn().mockReturnValue({ ...mockTransfer, ...overrides }),
  };
}

function createMockTransferModel() {
  const doc = mockTransferDoc();
  return {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue(chainable([mockTransfer])),
        }),
      }),
    }),
    findById: vi.fn().mockReturnValue(chainable(doc)),
    create: vi.fn().mockResolvedValue({
      ...mockTransfer,
      toObject: vi.fn().mockReturnValue(mockTransfer),
    }),
    countDocuments: vi.fn().mockResolvedValue(1),
  };
}

function createMockStockModel() {
  return {
    findOne: vi.fn().mockImplementation(() => {
      const stockDoc = {
        _id: 'stock-1',
        itemId: ITEM_1,
        branchId: BRANCH_1,
        quantity: 100,
        reservedQuantity: 0,
        availableQuantity: 100,
        batches: [],
        save: vi.fn().mockResolvedValue(undefined),
      };
      return chainable(stockDoc);
    }),
    findOneAndUpdate: vi.fn().mockResolvedValue({}),
  };
}

function createMockMovementModel() {
  return {
    create: vi.fn().mockResolvedValue({}),
  };
}

function createMockItemModel() {
  return {
    findById: vi
      .fn()
      .mockReturnValue(
        chainable({ _id: ITEM_1, sku: 'SKU-001', nameEn: 'Test Item', isActive: true }),
      ),
    countDocuments: vi.fn().mockResolvedValue(1),
  };
}

// ── Mock Modules ───────────────────────────────────────────

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../services/webhook-dispatcher.js', () => ({
  dispatchWebhook: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../models/stock-transfer.model.js', () => ({
  getStockTransferModel: vi.fn(() => createMockTransferModel()),
}));

vi.mock('../models/inventory-stock.model.js', () => ({
  getInventoryStockModel: vi.fn(() => createMockStockModel()),
}));

vi.mock('../models/inventory-movement.model.js', () => ({
  getInventoryMovementModel: vi.fn(() => createMockMovementModel()),
}));

vi.mock('../models/inventory-item.model.js', () => ({
  getInventoryItemModel: vi.fn(() => createMockItemModel()),
}));

// ── Tests ──────────────────────────────────────────────────

describe('StockTransferService', () => {
  let service: StockTransferService;
  const mockConnection = {} as Connection;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StockTransferService(mockConnection);
  });

  describe('list', () => {
    it('should return paginated transfers', async () => {
      const result = await service.list({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by status', async () => {
      const findFn = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue(chainable([mockTransfer])),
          }),
        }),
      });

      const { getStockTransferModel } = await import('../models/stock-transfer.model.js');
      (getStockTransferModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockTransferModel(),
        find: findFn,
      });

      const svc = new StockTransferService(mockConnection);
      await svc.list({ page: 1, limit: 20, status: 'draft' });

      const filterArg = findFn.mock.calls[0]?.[0];
      expect(filterArg.status).toBe('draft');
    });
  });

  describe('create', () => {
    it('should reject transfer to same branch', async () => {
      await expect(
        service.create(
          {
            fromBranchId: BRANCH_1,
            toBranchId: BRANCH_1,
            items: [{ itemId: ITEM_1, quantity: 20 }],
          },
          'user-1',
        ),
      ).rejects.toThrow(ApiError);
    });

    it('should create transfer with stock validation', async () => {
      // Stock mock returns available qty 100, requesting 20
      const result = await service.create(
        { fromBranchId: BRANCH_1, toBranchId: BRANCH_2, items: [{ itemId: ITEM_1, quantity: 20 }] },
        'user-1',
      );

      expect(result).toBeDefined();
    });

    it('should reject when insufficient stock available', async () => {
      const { getInventoryStockModel } = await import('../models/inventory-stock.model.js');
      (getInventoryStockModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockStockModel(),
        findOne: vi.fn().mockImplementation(() =>
          chainable({
            _id: 'stock-1',
            quantity: 5,
            reservedQuantity: 0,
            availableQuantity: 5,
            save: vi.fn().mockResolvedValue(undefined),
          }),
        ),
      });

      const svc = new StockTransferService(mockConnection);
      await expect(
        svc.create(
          {
            fromBranchId: BRANCH_1,
            toBranchId: BRANCH_2,
            items: [{ itemId: ITEM_1, quantity: 100 }],
          },
          'user-1',
        ),
      ).rejects.toThrow();
    });
  });

  describe('updateStatus', () => {
    it('should reject invalid status transition', async () => {
      const doc = mockTransferDoc({ status: 'received' });

      const { getStockTransferModel } = await import('../models/stock-transfer.model.js');
      (getStockTransferModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockTransferModel(),
        findById: vi.fn().mockReturnValue(chainable(doc)),
      });

      const svc = new StockTransferService(mockConnection);
      // received → approve is not valid
      await expect(svc.updateStatus(VALID_ID, { action: 'approve' }, 'user-1')).rejects.toThrow();
    });
  });
});
