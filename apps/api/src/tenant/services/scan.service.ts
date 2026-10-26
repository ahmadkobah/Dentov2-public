import type { Connection, QueryFilter } from 'mongoose';
import type { IScan } from '../models/scan.model.js';
import { getScanModel } from '../models/scan.model.js';
import { getPatientModel } from '../models/patient.model.js';
import { getDoctorModel } from '../models/doctor.model.js';
import { getBranchModel } from '../models/branch.model.js';
import { regexContains, patientNameOrClause } from './search.helpers.js';
import { ApiError } from '../../utils/api-response.js';
import type { CreateScanInput, UpdateScanInput, ScanQuery } from '@dento/shared';

/**
 * Intraoral 3D Scan Service — CRUD for scan records.
 *
 * No order workflow. Scans are uploaded → ready.
 * File management (R2 upload/delete) is handled by upload.service.ts
 * and the route layer; this service only manages metadata.
 */

export class ScanService {
  private Scan;
  private tenantDb: Connection;

  constructor(tenantDb: Connection) {
    this.tenantDb = tenantDb;
    this.Scan = getScanModel(tenantDb);
    // Register models needed for populate
    getPatientModel(tenantDb);
    getDoctorModel(tenantDb);
    getBranchModel(tenantDb);
  }

  async list(query: ScanQuery) {
    const {
      page,
      limit,
      search,
      patientId,
      doctorId,
      branchId,
      scanType,
      status,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IScan> = {};

    if (patientId) filter.patientId = patientId;
    if (doctorId) filter.doctorId = doctorId;
    if (branchId) filter.branchId = branchId;
    if (scanType) filter.scanType = scanType;
    if (status) filter.status = status;

    if (dateFrom || dateTo) {
      filter.scanDate = {};
      if (dateFrom) filter.scanDate.$gte = new Date(dateFrom);
      if (dateTo) filter.scanDate.$lte = new Date(dateTo);
    }

    if (search) {
      filter.$or = [
        { scanNumber: regexContains(search) },
        { scannerModel: regexContains(search) },
        { notes: regexContains(search) },
        ...(await patientNameOrClause(this.tenantDb, search)),
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [scans, total] = await Promise.all([
      this.Scan.find(filter)
        .populate('patientId', 'firstName lastName phone')
        .populate('doctorId', 'firstName lastName')
        .populate('branchId', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.Scan.countDocuments(filter),
    ]);

    return {
      scans,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const scan = await this.Scan.findById(id)
      .populate('patientId', 'firstName lastName phone')
      .populate('doctorId', 'firstName lastName')
      .populate('branchId', 'name')
      .lean();
    if (!scan) throw ApiError.notFound('Scan');
    return scan;
  }

  async create(data: CreateScanInput) {
    const scan = await this.Scan.create(data);
    return scan.toObject();
  }

  async update(id: string, data: UpdateScanInput) {
    const scan = await this.Scan.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    ).lean();
    if (!scan) throw ApiError.notFound('Scan');
    return scan;
  }

  async delete(id: string) {
    const scan = await this.Scan.findById(id);
    if (!scan) throw ApiError.notFound('Scan');
    // Return the fileKey so the route layer can delete from R2
    const fileKey = scan.fileKey;
    await this.Scan.findByIdAndDelete(id);
    return { message: 'Scan deleted', fileKey };
  }

  /** Get all scans for a patient — for timeline/history */
  async getPatientScans(patientId: string) {
    return this.Scan.find({ patientId })
      .populate('doctorId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
  }

  /** Mark scan as ready after upload completes */
  async markReady(id: string) {
    const scan = await this.Scan.findByIdAndUpdate(
      id,
      { $set: { status: 'ready' } },
      { new: true },
    ).lean();
    if (!scan) throw ApiError.notFound('Scan');
    return scan;
  }
}
