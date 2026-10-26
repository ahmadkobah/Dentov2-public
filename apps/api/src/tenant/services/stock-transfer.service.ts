import type { Connection, QueryFilter } from 'mongoose';
import { Types } from 'mongoose';
import type { IStockTransfer } from '../models/stock-transfer.model.js';
import { getStockTransferModel } from '../models/stock-transfer.model.js';
import { getInventoryStockModel } from '../models/inventory-stock.model.js';
import { getInventoryMovementModel } from '../models/inventory-movement.model.js';
import { getInventoryItemModel } from '../models/inventory-item.model.js';
import { ApiError } from '../../utils/api-response.js';
import { logger } from '../../utils/logger.js';
import type {
  CreateStockTransferInput,
  UpdateTransferStatusInput,
  StockTransferQuery,
} from '@dento/shared';

/**
 * Stock Transfer Service — Inter-branch inventory transfer workflow
 *
 * Per DENTO_V2_MASTER_PLAN.md §16
 * Per V2_DATABASE.md §8.7 — stock_transfers collection
 *
 * Lifecycle: draft → in_transit → received (or cancelled at draft/in_transit)
 * On receive: deduct source stock, add destination stock, 2 movements per item
 */
export class StockTransferService {
  private Transfer;
  private Stock;
  private Movement;
  private Item;

  constructor(tenantDb: Connection) {
    this.Transfer = getStockTransferModel(tenantDb);
    this.Stock = getInventoryStockModel(tenantDb);
    this.Movement = getInventoryMovementModel(tenantDb);
    this.Item = getInventoryItemModel(tenantDb);
  }

  // ── List Transfers (paginated) ────────────────────────────

  async list(query: StockTransferQuery) {
    const {
      page = 1,
      limit = 20,
      fromBranchId,
      toBranchId,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const filter: QueryFilter<IStockTransfer> = {};

    if (fromBranchId) filter.fromBranchId = fromBranchId;
    if (toBranchId) filter.toBranchId = toBranchId;
    if (status) filter.status = status;

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      this.Transfer.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('fromBranchId', 'nameEn nameAr')
        .populate('toBranchId', 'nameEn nameAr')
        .lean(),
      this.Transfer.countDocuments(filter),
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

  // ── Get Transfer by ID ────────────────────────────────────

  async getById(id: string) {
    const transfer = await this.Transfer.findById(id)
      .populate('fromBranchId', 'nameEn nameAr')
      .populate('toBranchId', 'nameEn nameAr')
      .populate('items.itemId', 'sku nameEn nameAr unit')
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('receivedBy', 'name email')
      .lean();

    if (!transfer) throw ApiError.notFound('Stock Transfer');
    return transfer;
  }

  // ── Create Draft Transfer ─────────────────────────────────

  async create(data: CreateStockTransferInput, userId: string) {
    if (data.fromBranchId === data.toBranchId) {
      throw ApiError.badRequest('Source and destination branch must be different');
    }

    // Validate all items exist
    const itemIds = data.items.map((i) => i.itemId);
    const existing = await this.Item.countDocuments({ _id: { $in: itemIds } });
    if (existing !== itemIds.length) {
      throw ApiError.badRequest('One or more items not found');
    }

    // Validate sufficient stock and reserve at source branch
    for (const item of data.items) {
      const stock = await this.Stock.findOne({
        itemId: item.itemId,
        branchId: data.fromBranchId,
      });

      if (!stock || stock.availableQuantity < item.quantity) {
        throw ApiError.badRequest(
          `Insufficient stock for item ${item.itemId} at source branch (available: ${stock?.availableQuantity ?? 0}, requested: ${item.quantity})`,
        );
      }

      // M6: Reserve stock to prevent race condition
      stock.reservedQuantity += item.quantity;
      await stock.save(); // pre-save recomputes availableQuantity
    }

    const transfer = await this.Transfer.create({
      ...data,
      status: 'draft',
      requestedBy: userId,
      requestedAt: new Date(),
    });

    logger.info(
      { transferId: transfer._id, transferNumber: transfer.transferNumber },
      'Stock transfer created — stock reserved at source',
    );
    return transfer.toObject();
  }

  // ── Update Transfer Status ────────────────────────────────

  async updateStatus(id: string, data: UpdateTransferStatusInput, userId: string) {
    const transfer = await this.Transfer.findById(id);
    if (!transfer) throw ApiError.notFound('Stock Transfer');

    switch (data.action) {
      case 'approve':
      case 'ship':
        return this.approveTransfer(transfer, userId, data.notes);

      case 'receive':
        return this.receiveTransfer(transfer, userId, data.notes);

      case 'cancel':
      case 'reject':
        return this.cancelTransfer(transfer, userId, data.notes);

      default:
        throw ApiError.badRequest(`Unknown action: ${data.action}`);
    }
  }

  // ── Approve / Ship Transfer ───────────────────────────────

  private async approveTransfer(
    transfer: InstanceType<typeof this.Transfer>,
    userId: string,
    notes?: string,
  ) {
    if (transfer.status !== 'draft') {
      throw ApiError.badRequest('Can only approve transfers in draft status');
    }

    transfer.status = 'in_transit';
    transfer.approvedBy = new Types.ObjectId(userId);
    transfer.approvedAt = new Date();
    transfer.shippedAt = new Date();
    if (notes) transfer.notes = notes;

    await transfer.save();

    logger.info(
      { transferId: transfer._id, transferNumber: transfer.transferNumber },
      'Stock transfer approved and shipped',
    );
    return transfer.toObject();
  }

  // ── Receive Transfer (execute stock operations) ───────────

  private async receiveTransfer(
    transfer: InstanceType<typeof this.Transfer>,
    userId: string,
    notes?: string,
  ) {
    if (transfer.status !== 'in_transit') {
      throw ApiError.badRequest('Can only receive transfers that are in transit');
    }

    for (const item of transfer.items) {
      // ─ Deduct from source branch (unreserve + deduct) ─
      const sourceStock = await this.Stock.findOne({
        itemId: item.itemId,
        branchId: transfer.fromBranchId,
      });

      if (!sourceStock) {
        throw ApiError.badRequest(
          `Stock record not found for item ${item.itemId} at source branch`,
        );
      }

      const sourcePrev = sourceStock.quantity;
      // Release reservation and deduct actual quantity
      sourceStock.reservedQuantity = Math.max(0, sourceStock.reservedQuantity - item.quantity);
      sourceStock.quantity = Math.max(0, sourceStock.quantity - item.quantity);
      await sourceStock.save();

      await this.Movement.create({
        itemId: item.itemId,
        branchId: transfer.fromBranchId,
        movementType: 'transfer_out',
        quantity: item.quantity,
        previousQuantity: sourcePrev,
        newQuantity: sourceStock.quantity,
        unitCost: 0,
        referenceType: 'transfer',
        referenceId: transfer._id,
        transferId: transfer._id,
        fromBranchId: transfer.fromBranchId,
        toBranchId: transfer.toBranchId,
        batchNumber: item.batchNumber || '',
        createdBy: userId,
      });

      // ─ Add to destination branch ─ (use findOne + save for pre-save hook)
      let destStock = await this.Stock.findOne({
        itemId: item.itemId,
        branchId: transfer.toBranchId,
      });
      if (!destStock) {
        destStock = new this.Stock({
          itemId: item.itemId,
          branchId: transfer.toBranchId,
          quantity: 0,
        });
      }

      const destPrev = destStock.quantity;
      destStock.quantity += item.quantity;
      await destStock.save(); // pre-save recomputes availableQuantity

      await this.Movement.create({
        itemId: item.itemId,
        branchId: transfer.toBranchId,
        movementType: 'transfer_in',
        quantity: item.quantity,
        previousQuantity: destPrev,
        newQuantity: destStock.quantity,
        unitCost: 0,
        referenceType: 'transfer',
        referenceId: transfer._id,
        transferId: transfer._id,
        fromBranchId: transfer.fromBranchId,
        toBranchId: transfer.toBranchId,
        batchNumber: item.batchNumber || '',
        createdBy: userId,
      });
    }

    transfer.status = 'received';
    transfer.receivedBy = new Types.ObjectId(userId);
    transfer.receivedAt = new Date();
    if (notes) transfer.notes = notes;

    await transfer.save();

    logger.info(
      {
        transferId: transfer._id,
        transferNumber: transfer.transferNumber,
        itemCount: transfer.items.length,
      },
      'Stock transfer received — stock updated',
    );
    return transfer.toObject();
  }

  // ── Cancel Transfer ───────────────────────────────────────

  private async cancelTransfer(
    transfer: InstanceType<typeof this.Transfer>,
    _userId: string,
    notes?: string,
  ) {
    if (!['draft', 'in_transit'].includes(transfer.status)) {
      throw ApiError.badRequest('Can only cancel transfers in draft or in_transit status');
    }

    // M6: Unreserve stock that was reserved on creation
    for (const item of transfer.items) {
      const stock = await this.Stock.findOne({
        itemId: item.itemId,
        branchId: transfer.fromBranchId,
      });
      if (stock) {
        stock.reservedQuantity = Math.max(0, stock.reservedQuantity - item.quantity);
        await stock.save(); // pre-save recomputes availableQuantity
      }
    }

    transfer.status = 'cancelled';
    if (notes) transfer.notes = notes;

    await transfer.save();

    logger.info(
      { transferId: transfer._id, transferNumber: transfer.transferNumber },
      'Stock transfer cancelled — reservations released',
    );
    return transfer.toObject();
  }
}
