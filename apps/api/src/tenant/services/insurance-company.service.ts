import type { Connection, QueryFilter } from 'mongoose';
import type { IInsuranceCompany } from '../models/insurance-company.model.js';
import { getInsuranceCompanyModel } from '../models/insurance-company.model.js';
import { ApiError } from '../../utils/api-response.js';
import { regexContains } from './search.helpers.js';
import type {
  CreateInsuranceCompanyInput,
  UpdateInsuranceCompanyInput,
  InsuranceCompanyQuery,
} from '@dento/shared';
import { logger } from '../../utils/logger.js';

/**
 * Insurance Company Service — Business logic for insurance company CRUD
 *
 * Per V2_DATABASE.md §7.5 — insurance_companies
 * Per DENTO_V2_MASTER_PLAN.md §10 (#11 Insurance)
 *
 * Handles:
 * - CRUD with pagination / filtering
 * - Soft deactivation (isActive = false)
 * - Company statistics (claim counts, coverage totals)
 */

export class InsuranceCompanyService {
  private InsuranceCompany;
  private tenantDb: Connection;

  constructor(tenantDb: Connection) {
    this.tenantDb = tenantDb;
    this.InsuranceCompany = getInsuranceCompanyModel(tenantDb);
  }

  // ── List Insurance Companies (paginated, filterable) ──────

  async list(query: InsuranceCompanyQuery) {
    const { page, limit, search, isActive, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IInsuranceCompany> = {};

    if (search) {
      filter.$or = [
        { 'name.en': regexContains(search) },
        { 'name.ar': regexContains(search) },
        { code: regexContains(search) },
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [companies, total] = await Promise.all([
      this.InsuranceCompany.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.InsuranceCompany.countDocuments(filter),
    ]);

    return {
      companies,
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
    const company = await this.InsuranceCompany.findById(id).lean();
    if (!company) {
      throw ApiError.notFound('Insurance company');
    }
    return company;
  }

  // ── Create ────────────────────────────────────────────────

  async create(data: CreateInsuranceCompanyInput) {
    // Check code uniqueness
    const existing = await this.InsuranceCompany.findOne({ code: data.code }).lean();
    if (existing) {
      throw ApiError.conflict(`Insurance company with code '${data.code}' already exists`);
    }

    const company = await this.InsuranceCompany.create(data);
    logger.info({ companyId: company._id, code: data.code }, 'Insurance company created');
    return company.toObject();
  }

  // ── Update ────────────────────────────────────────────────

  async update(id: string, data: UpdateInsuranceCompanyInput) {
    const company = await this.InsuranceCompany.findById(id);
    if (!company) {
      throw ApiError.notFound('Insurance company');
    }

    // If updating code, check uniqueness
    if (data.code && data.code !== company.code) {
      const existing = await this.InsuranceCompany.findOne({
        code: data.code,
        _id: { $ne: id },
      }).lean();
      if (existing) {
        throw ApiError.conflict(`Insurance company with code '${data.code}' already exists`);
      }
    }

    // Apply updates
    if (data.name) {
      if (data.name.en) company.name.en = data.name.en;
      if (data.name.ar) company.name.ar = data.name.ar;
    }
    if (data.code !== undefined) company.code = data.code;
    if (data.contactPerson !== undefined) company.contactPerson = data.contactPerson;
    if (data.phone !== undefined) company.phone = data.phone;
    if (data.email !== undefined) company.email = data.email;
    if (data.coveragePercentage !== undefined) company.coveragePercentage = data.coveragePercentage;
    if (data.maxCoverage !== undefined) company.maxCoverage = data.maxCoverage;
    if (data.isActive !== undefined) company.isActive = data.isActive;

    await company.save();
    logger.info({ companyId: id }, 'Insurance company updated');
    return company.toObject();
  }

  // ── Deactivate (soft delete) ──────────────────────────────

  async deactivate(id: string) {
    const company = await this.InsuranceCompany.findById(id);
    if (!company) {
      throw ApiError.notFound('Insurance company');
    }

    company.isActive = false;
    await company.save();
    logger.info({ companyId: id }, 'Insurance company deactivated');
    return company.toObject();
  }

  // ── Get Company Stats ─────────────────────────────────────

  async getCompanyStats(id: string) {
    const company = await this.getById(id);

    // Get claim statistics from insurance_claims collection
    try {
      const InsuranceClaim = this.tenantDb.models.InsuranceClaim;
      if (InsuranceClaim) {
        const stats = await InsuranceClaim.aggregate([
          {
            $lookup: {
              from: 'patients',
              let: { patientId: '$patientId' },
              pipeline: [
                { $match: { $expr: { $eq: ['$_id', '$$patientId'] } } },
                { $unwind: '$insurance' },
                { $match: { 'insurance.insuranceCompanyId': company._id } },
              ],
              as: 'matched',
            },
          },
          { $match: { 'matched.0': { $exists: true } } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalAmount: { $sum: '$claimedAmount' },
              approvedAmount: { $sum: { $ifNull: ['$approvedAmount', 0] } },
            },
          },
        ]);
        return { company, claimStats: stats };
      }
    } catch {
      // InsuranceClaim model may not exist yet
    }

    return { company, claimStats: [] };
  }
}
