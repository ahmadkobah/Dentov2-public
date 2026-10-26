import type { Connection, QueryFilter } from 'mongoose';
import type { IDentalChart } from '../models/dental-chart.model.js';
import { getDentalChartModel, getDentalChartHistoryModel } from '../models/dental-chart.model.js';
import { ApiError } from '../../utils/api-response.js';
import type {
  CreateDentalChartInput,
  UpdateDentalChartInput,
  DentalChartQuery,
  DentalChartHistoryQuery,
} from '@dento/shared';
import type { SnapshotTrigger } from '../models/dental-chart.model.js';

/**
 * Dental Chart Service — Business logic for dental chart CRUD + snapshots
 *
 * Handles:
 * - Per-tooth chart entries (UPSERT pattern: create or update)
 * - Full mouth chart retrieval
 * - Chart history snapshots (manual + auto on treatment)
 * - Chart deletion
 */
export class DentalChartService {
  private DentalChart;
  private ChartHistory;

  constructor(tenantDb: Connection) {
    this.DentalChart = getDentalChartModel(tenantDb);
    this.ChartHistory = getDentalChartHistoryModel(tenantDb);
  }

  // ── Get full chart for patient ────────────────────────────

  async getChart(query: DentalChartQuery) {
    const filter: QueryFilter<IDentalChart> = { patientId: query.patientId };
    if (query.numberingSystem) {
      filter.numberingSystem = query.numberingSystem;
    }

    const entries = await this.DentalChart.find(filter).sort({ toothNumber: 1 }).lean();

    return { entries, total: entries.length };
  }

  // ── Get single tooth entry ────────────────────────────────

  async getById(id: string) {
    const entry = await this.DentalChart.findById(id).lean();
    if (!entry) {
      throw ApiError.notFound('DentalChart entry');
    }
    return entry;
  }

  // ── Create or update tooth entry (UPSERT) ─────────────────

  async upsert(data: CreateDentalChartInput, updatedBy: string) {
    const entry = await this.DentalChart.findOneAndUpdate(
      { patientId: data.patientId, toothNumber: data.toothNumber },
      {
        $set: {
          ...data,
          updatedBy,
        },
      },
      { new: true, upsert: true, runValidators: true },
    ).lean();

    return entry;
  }

  // ── Update single entry ───────────────────────────────────

  async update(id: string, data: UpdateDentalChartInput, updatedBy: string) {
    const entry = await this.DentalChart.findByIdAndUpdate(
      id,
      { $set: { ...data, updatedBy } },
      { new: true, runValidators: true },
    ).lean();

    if (!entry) {
      throw ApiError.notFound('DentalChart entry');
    }

    return entry;
  }

  // ── Delete single entry ───────────────────────────────────

  async delete(id: string) {
    const entry = await this.DentalChart.findByIdAndDelete(id).lean();
    if (!entry) {
      throw ApiError.notFound('DentalChart entry');
    }

    return { message: 'Dental chart entry deleted' };
  }

  // ── Bulk upsert (update multiple teeth at once) ───────────

  async bulkUpsert(
    patientId: string,
    entries: Omit<CreateDentalChartInput, 'patientId'>[],
    updatedBy: string,
  ) {
    const ops = entries.map((entry) => ({
      updateOne: {
        filter: { patientId, toothNumber: entry.toothNumber } as Record<string, unknown>,
        update: { $set: { ...entry, patientId, updatedBy } as Record<string, unknown> },
        upsert: true,
      },
    }));

    await this.DentalChart.bulkWrite(ops as Parameters<typeof this.DentalChart.bulkWrite>[0]);

    // Return updated chart
    return this.getChart({ patientId });
  }

  // ── Create snapshot (history) ─────────────────────────────

  async createSnapshot(
    patientId: string,
    recordedBy: string,
    notes?: string,
    procedureNoteTeeth?: { toothNumber: number; procedureName: string }[],
    trigger: SnapshotTrigger = 'manual',
  ) {
    // Get current full chart
    const entries = await this.DentalChart.find({ patientId }).lean();

    const snapshot = await this.ChartHistory.create({
      patientId,
      trigger,
      chartData: {
        entries,
        procedureNoteTeeth: procedureNoteTeeth ?? [],
        capturedAt: new Date().toISOString(),
      },
      notes,
      recordedBy,
      recordedAt: new Date(),
    });

    // Clear chart entries after snapshot so next session starts fresh
    await this.DentalChart.deleteMany({ patientId });

    return snapshot.toObject();
  }

  // ── List history snapshots ────────────────────────────────

  async listHistory(query: DentalChartHistoryQuery) {
    const { patientId, page, limit } = query;
    const skip = (page - 1) * limit;

    const [snapshots, total] = await Promise.all([
      this.ChartHistory.find({ patientId }).sort({ recordedAt: -1 }).skip(skip).limit(limit).lean(),
      this.ChartHistory.countDocuments({ patientId }),
    ]);

    return {
      snapshots,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Get single snapshot ───────────────────────────────────

  async getSnapshot(id: string) {
    const snapshot = await this.ChartHistory.findById(id).lean();
    if (!snapshot) {
      throw ApiError.notFound('Chart history snapshot');
    }
    return snapshot;
  }
}
