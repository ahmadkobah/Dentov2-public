import type { Connection, QueryFilter } from 'mongoose';
import type { IInsuranceClaim, InsuranceClaimStatus } from '../models/insurance-claim.model.js';
import { getInsuranceClaimModel } from '../models/insurance-claim.model.js';
import { getInvoiceModel } from '../models/invoice.model.js';
import { regexContains, patientNameOrClause } from './search.helpers.js';
import { ApiError } from '../../utils/api-response.js';
import type {
  CreateInsuranceClaimInput,
  UpdateClaimStatusInput,
  InsuranceClaimQuery,
  ClaimAgingQuery,
} from '@dento/shared';
import { VALID_INSURANCE_CLAIM_STATUS_TRANSITIONS } from '@dento/shared';
import { logger } from '../../utils/logger.js';
import { dispatchWebhook } from './webhook-dispatcher.js';

/**
 * Insurance Claim Service — Business logic for insurance claim CRUD
 *
 * Per V2_DATABASE.md §7.5 — insurance_claims
 * Per DENTO_V2_MASTER_PLAN.md §10 (#11 Insurance)
 * Per SECURITY_AND_ENCRYPTION.md §5 — PHI protection
 *
 * Handles:
 * - CRUD with pagination / filtering
 * - 6-status flow with validated transitions
 * - Document attachment management (PDF only, 10MB max)
 * - Patient responsibility calculation
 * - Aging report via MongoDB aggregation pipeline
 * - Link claims to invoices (update insuredAmount / patientResponsibility)
 */

export class InsuranceClaimService {
  private InsuranceClaim;
  private Invoice;
  private tenantDb: Connection;

  constructor(tenantDb: Connection) {
    this.tenantDb = tenantDb;
    this.InsuranceClaim = getInsuranceClaimModel(tenantDb);
    this.Invoice = getInvoiceModel(tenantDb);
  }

  // ── List Claims (paginated, filterable) ───────────────────

  async list(query: InsuranceClaimQuery) {
    const { page, limit, search, status, patientId, dateFrom, dateTo, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IInsuranceClaim> = {};

    if (search) {
      filter.$or = [
        { claimNumber: regexContains(search) },
        ...(await patientNameOrClause(this.tenantDb, search)),
      ];
    }

    if (status) filter.status = status;
    if (patientId) filter.patientId = patientId;

    if (dateFrom || dateTo) {
      filter.claimDate = {};
      if (dateFrom) filter.claimDate.$gte = new Date(dateFrom);
      if (dateTo) filter.claimDate.$lte = new Date(dateTo);
    }

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [claims, total] = await Promise.all([
      this.InsuranceClaim.find(filter)
        .populate('patientId', 'firstName lastName patientCode')
        .populate('invoiceId', 'invoiceNumber totalAmount')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.InsuranceClaim.countDocuments(filter),
    ]);

    return {
      claims,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Get by ID ─────────────────────────────────────────────

  async getById(id: string) {
    const claim = await this.InsuranceClaim.findById(id)
      .populate('patientId', 'firstName lastName patientCode insurance')
      .populate('invoiceId', 'invoiceNumber totalAmount amountPaid balanceDue status')
      .lean();

    if (!claim) {
      throw ApiError.notFound('Insurance claim');
    }
    return claim;
  }

  // ── Create Claim ──────────────────────────────────────────

  async create(data: CreateInsuranceClaimInput, userId: string) {
    // Verify invoice exists
    const invoice = await this.Invoice.findById(data.invoiceId).lean();
    if (!invoice) {
      throw ApiError.notFound('Invoice');
    }

    // Verify claimed amount doesn't exceed total
    if (data.claimedAmount > data.totalAmount) {
      throw ApiError.badRequest('Claimed amount cannot exceed total amount');
    }

    const claim = await this.InsuranceClaim.create({
      ...data,
      claimDate: new Date(data.claimDate),
      serviceDate: new Date(data.serviceDate),
      status: 'submitted',
      createdBy: userId,
    });

    logger.info({ claimId: claim._id, claimNumber: claim.claimNumber }, 'Insurance claim created');

    // Dispatch webhook
    try {
      const tenantSlug = this.tenantDb.name?.replace('tenant_', '') || '';
      await dispatchWebhook(this.tenantDb, {
        tenantId: tenantSlug,
        tenantSlug,
        event: 'insurance_claim.created',
        data: {
          claimId: claim._id,
          claimNumber: claim.claimNumber,
          patientId: claim.patientId,
          invoiceId: claim.invoiceId,
          claimedAmount: claim.claimedAmount,
          status: claim.status,
        },
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to dispatch insurance_claim.created webhook');
    }

    return claim.toObject();
  }

  // ── Update Claim Status ───────────────────────────────────

  async updateStatus(id: string, data: UpdateClaimStatusInput, _userId: string) {
    const claim = await this.InsuranceClaim.findById(id);
    if (!claim) {
      throw ApiError.notFound('Insurance claim');
    }

    // Validate status transition
    const currentStatus = claim.status as InsuranceClaimStatus;
    const targetStatus = data.status;
    const validTransitions = VALID_INSURANCE_CLAIM_STATUS_TRANSITIONS[currentStatus];

    if (!validTransitions.includes(targetStatus)) {
      throw ApiError.badRequest(
        `Cannot transition from '${currentStatus}' to '${targetStatus}'. Valid: ${validTransitions.join(', ')}`,
      );
    }

    // Apply status-specific updates
    claim.status = targetStatus;

    if (targetStatus === 'approved' || targetStatus === 'partially_approved') {
      if (data.approvedAmount === undefined) {
        throw ApiError.badRequest('Approved amount is required when approving a claim');
      }
      claim.approvedAmount = data.approvedAmount;
      claim.patientResponsibility = claim.totalAmount - data.approvedAmount;

      // Update linked invoice insurance fields
      await this.Invoice.findByIdAndUpdate(claim.invoiceId, {
        insuranceClaimId: claim._id,
        insuredAmount: data.approvedAmount,
        patientResponsibility: claim.totalAmount - data.approvedAmount,
      });
    }

    if (targetStatus === 'denied') {
      if (!data.denialReason) {
        throw ApiError.badRequest('Denial reason is required when denying a claim');
      }
      claim.denialReason = data.denialReason;
      claim.approvedAmount = 0;
      claim.patientResponsibility = claim.totalAmount;

      // Update linked invoice — patient pays full
      await this.Invoice.findByIdAndUpdate(claim.invoiceId, {
        insuranceClaimId: claim._id,
        insuredAmount: 0,
        patientResponsibility: claim.totalAmount,
      });
    }

    if (data.patientResponsibility !== undefined) {
      claim.patientResponsibility = data.patientResponsibility;
    }

    await claim.save();
    logger.info(
      { claimId: id, from: currentStatus, to: targetStatus },
      'Insurance claim status updated',
    );

    // Dispatch webhook
    try {
      const tenantSlug = this.tenantDb.name?.replace('tenant_', '') || '';
      await dispatchWebhook(this.tenantDb, {
        tenantId: tenantSlug,
        tenantSlug,
        event: 'insurance_claim.status_updated',
        data: {
          claimId: id,
          claimNumber: claim.claimNumber,
          fromStatus: currentStatus,
          toStatus: targetStatus,
          approvedAmount: claim.approvedAmount,
          patientResponsibility: claim.patientResponsibility,
        },
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to dispatch insurance_claim.status_updated webhook');
    }

    return claim.toObject();
  }

  // ── Attach Document ───────────────────────────────────────

  async attachDocument(id: string, doc: { name: string; url: string; type: string }) {
    const claim = await this.InsuranceClaim.findById(id);
    if (!claim) {
      throw ApiError.notFound('Insurance claim');
    }

    // Validate document type (PDF only per SECURITY §8)
    if (doc.type !== 'application/pdf') {
      throw ApiError.badRequest('Only PDF documents are allowed for insurance claims');
    }

    claim.documents.push(doc);
    await claim.save();
    logger.info({ claimId: id, docName: doc.name }, 'Document attached to claim');
    return claim.toObject();
  }

  // ── Remove Document ───────────────────────────────────────

  async removeDocument(id: string, docId: string) {
    const claim = await this.InsuranceClaim.findById(id);
    if (!claim) {
      throw ApiError.notFound('Insurance claim');
    }

    const docIndex = claim.documents.findIndex(
      (d) => (d as unknown as { _id: { toString(): string } })._id.toString() === docId,
    );
    if (docIndex === -1) {
      throw ApiError.notFound('Document');
    }

    claim.documents.splice(docIndex, 1);
    await claim.save();
    logger.info({ claimId: id, docId }, 'Document removed from claim');
    return claim.toObject();
  }

  // ── Aging Report (MongoDB aggregation) ────────────────────

  async getAgingReport(query: ClaimAgingQuery) {
    const asOfDate = query.asOfDate ? new Date(query.asOfDate) : new Date();

    const matchStage: Record<string, unknown> = {
      status: { $in: ['submitted', 'under_review'] },
    };

    // Build pipeline with optional insuranceCompanyId filter via patient lookup
    const pipeline: Record<string, unknown>[] = [{ $match: matchStage }];

    if (query.insuranceCompanyId) {
      // Join to patients collection to filter by insurance company
      const { Types } = await import('mongoose');
      const companyOid = new Types.ObjectId(query.insuranceCompanyId);
      pipeline.push(
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: '_patient',
          },
        },
        { $unwind: '$_patient' },
        {
          $match: {
            '_patient.insurance': {
              $elemMatch: { insuranceCompanyId: companyOid },
            },
          },
        },
        { $project: { _patient: 0 } },
      );
    }

    pipeline.push(
      {
        $addFields: {
          ageDays: {
            $divide: [{ $subtract: [asOfDate, '$claimDate'] }, 1000 * 60 * 60 * 24],
          },
        },
      },
      {
        $bucket: {
          groupBy: '$ageDays',
          boundaries: [0, 30, 60, 90, Infinity],
          default: 'Over 90',
          output: {
            count: { $sum: 1 },
            totalAmount: { $sum: '$claimedAmount' },
            claims: {
              $push: {
                claimNumber: '$claimNumber',
                claimedAmount: '$claimedAmount',
                ageDays: { $round: ['$ageDays', 0] },
              },
            },
          },
        },
      },
    );

    const result = await this.InsuranceClaim.aggregate(
      pipeline as unknown as Parameters<typeof this.InsuranceClaim.aggregate>[0],
    );

    // Format bucket labels
    const bucketLabels: Record<string, string> = {
      '0': '0-30 days',
      '30': '31-60 days',
      '60': '61-90 days',
      '90': '90+ days',
      'Over 90': '90+ days',
    };

    const aging = result.map((bucket) => ({
      range: bucketLabels[String(bucket._id)] || `${bucket._id}+ days`,
      count: bucket.count,
      totalAmount: bucket.totalAmount,
      claims: bucket.claims,
    }));

    return { aging, asOfDate: asOfDate.toISOString() };
  }
}
