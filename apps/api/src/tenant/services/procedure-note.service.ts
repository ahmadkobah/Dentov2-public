import type { Connection, QueryFilter } from 'mongoose';
import type { IProcedureNote, IProcedureNoteTemplate } from '../models/procedure-note.model.js';
import {
  getProcedureNoteModel,
  getProcedureNoteTemplateModel,
} from '../models/procedure-note.model.js';
import { DentalChartService } from './dental-chart.service.js';
import { InventoryItemService } from './inventory-item.service.js';
import { getTreatmentPlanModel } from '../models/treatment-plan.model.js';
import { getServiceModel } from '../models/service.model.js';
import { regexContains, patientNameOrClause } from './search.helpers.js';
import { ApiError } from '../../utils/api-response.js';
import { logger } from '../../utils/logger.js';
import { decryptField, isEncryptedString } from '../../utils/encryption.js';
import type {
  CreateProcedureNoteInput,
  UpdateProcedureNoteInput,
  ProcedureNoteQuery,
  CreateProcedureNoteTemplateInput,
  UpdateProcedureNoteTemplateInput,
  ProcedureNoteTemplateQuery,
} from '@dento/shared';

// Defensive decrypt for procedure-note lean docs. Idempotent.
const NOTE_ENCRYPTED_PATHS = [
  'procedurePerformed',
  'materialsUsed',
  'anesthesiaUsed',
  'complications',
  'postOpInstructions',
] as const;
function decryptProcedureNoteLean<T>(doc: T): T {
  if (!doc || typeof doc !== 'object') return doc;
  const d = doc as Record<string, unknown>;
  for (const k of NOTE_ENCRYPTED_PATHS) {
    const v = d[k];
    if (typeof v === 'string' && isEncryptedString(v)) d[k] = decryptField(v);
  }
  return doc;
}

/**
 * Procedure Note Service — Business logic for procedure notes + templates
 *
 * Handles:
 * - CRUD for procedure notes (direct or plan-based)
 * - Linking to treatment_plan + treatment_plan_item
 * - Template management (CRUD for reusable templates)
 * - Cross-links to imaging (xrays, cbcts)
 */
export class ProcedureNoteService {
  private ProcedureNote;
  private Template;
  private tenantDb: Connection;

  constructor(tenantDb: Connection) {
    this.tenantDb = tenantDb;
    this.ProcedureNote = getProcedureNoteModel(tenantDb);
    this.Template = getProcedureNoteTemplateModel(tenantDb);
  }

  // ══════════════════════════════════════════════════════════
  // Procedure Notes
  // ══════════════════════════════════════════════════════════

  // ── List Notes (paginated) ────────────────────────────────

  async list(query: ProcedureNoteQuery) {
    const {
      page,
      limit,
      patientId,
      doctorId,
      appointmentId,
      treatmentPlanId,
      search,
      sortBy,
      sortOrder,
    } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IProcedureNote> = {};
    if (patientId) filter.patientId = patientId;
    if (doctorId) filter.doctorId = doctorId;
    if (appointmentId) filter.appointmentId = appointmentId;
    if (treatmentPlanId) filter.treatmentPlanId = treatmentPlanId;
    if (search) {
      filter.$or = [
        { procedureName: regexContains(search) },
        { teethInvolved: regexContains(search) },
        { notes: regexContains(search) },
        ...(await patientNameOrClause(this.tenantDb, search)),
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [notes, total] = await Promise.all([
      this.ProcedureNote.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.ProcedureNote.countDocuments(filter),
    ]);

    for (const n of notes) decryptProcedureNoteLean(n);
    return {
      notes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Get by ID ─────────────────────────────────────────────

  async getById(id: string) {
    const note = await this.ProcedureNote.findById(id).lean();
    if (!note) {
      throw ApiError.notFound('ProcedureNote');
    }
    decryptProcedureNoteLean(note);
    return note;
  }

  // ── Create ────────────────────────────────────────────────

  async create(data: CreateProcedureNoteInput) {
    const note = await this.ProcedureNote.create(data);
    const result = note.toObject();

    // Auto-snapshot: capture dental chart state when a procedure note is created
    if (data.patientId) {
      // Build per-entry teeth with service names for grouped colors in chart history
      const procedureNoteTeeth = this.buildProcedureNoteTeeth(data);
      this.autoSnapshot(data.patientId, 'procedure_note_created', procedureNoteTeeth).catch((err) =>
        logger.warn({ err }, 'Auto-snapshot failed after procedure note creation'),
      );
    }

    // L4: Clinical auto-deduction — deduct required materials from inventory
    // Phase 10.5: Only deduct on completion to avoid double-counting drafts.
    if ((data as { status?: string }).status === 'completed') {
      this.runMaterialDeduction(
        (note._id as { toString(): string }).toString(),
        data.treatmentPlanItemId as string | undefined,
        data.serviceId as string | undefined,
        data.appointmentId as string | undefined,
        data.doctorId as string,
      ).catch((err) => logger.warn({ err }, 'Clinical auto-deduction failed'));
    }

    // Phase 7.2 — Sync linked treatment-plan item status with this note.
    if (data.treatmentPlanItemId) {
      const itemStatus =
        (data as { status?: string }).status === 'completed' ? 'completed' : 'scheduled';
      this.syncTreatmentPlanItem(
        data.treatmentPlanId,
        data.treatmentPlanItemId,
        (note._id as { toString(): string }).toString(),
        itemStatus,
      ).catch((err) => logger.warn({ err }, 'Treatment-plan item sync failed'));
    }

    return result;
  }

  // ── Clinical Auto-Deduction (L4) ─────────────────────────

  // ── Auto-Snapshot Helper ─────────────────────────────────

  /**
   * Phase 10.5: Unified material deduction entry point.
   * Resolves materials list from treatment-plan item OR direct serviceId,
   * resolves branchId from treatment plan or appointment, then deducts each
   * non-optional material once. Sets `materialsDeducted` to prevent re-runs.
   */
  private async runMaterialDeduction(
    procedureNoteId: string,
    treatmentPlanItemId: string | undefined,
    serviceId: string | undefined,
    appointmentId: string | undefined,
    userId: string,
  ): Promise<void> {
    // Re-load to check the latest deduction flag (avoid double-deduction races)
    const current = await this.ProcedureNote.findById(procedureNoteId).lean();
    if (!current || (current as { materialsDeducted?: boolean }).materialsDeducted) return;

    const Service = getServiceModel(this.tenantDb);
    const inventoryService = new InventoryItemService(this.tenantDb);

    let resolvedServiceId: string | undefined = serviceId;
    let branchId: string | undefined;

    if (treatmentPlanItemId) {
      const TreatmentPlan = getTreatmentPlanModel(this.tenantDb);
      const plan = await TreatmentPlan.findOne(
        { 'items._id': treatmentPlanItemId },
        { 'items.$': 1, branchId: 1 },
      ).lean();
      const planItem = plan?.items?.[0] as { serviceId?: { toString(): string } } | undefined;
      resolvedServiceId = resolvedServiceId ?? planItem?.serviceId?.toString();
      branchId = (plan as { branchId?: { toString(): string } } | null)?.branchId?.toString();
    }

    if (!branchId && appointmentId) {
      // Lazy-import appointment model to avoid circular dependency
      const { getAppointmentModel } = await import('../models/appointment.model.js');
      const Appointment = getAppointmentModel(this.tenantDb);
      const appt = await Appointment.findById(appointmentId).select('branchId').lean();
      branchId = (appt as { branchId?: { toString(): string } } | null)?.branchId?.toString();
    }

    if (!resolvedServiceId || !branchId) {
      logger.info(
        { procedureNoteId, resolvedServiceId, branchId },
        'Skipping auto-deduction: missing serviceId or branchId',
      );
      return;
    }

    const service = await Service.findById(resolvedServiceId).select('requiredMaterials').lean();
    if (!service?.requiredMaterials?.length) return;

    for (const material of service.requiredMaterials) {
      if (material.isOptional) continue;
      try {
        await inventoryService.adjustStock(
          material.itemId.toString(),
          {
            branchId,
            type: 'adjustment_remove',
            quantity: material.quantity,
            reason: `Auto-deducted on procedure completion (note: ${procedureNoteId})`,
          } as never,
          userId,
        );
      } catch (err) {
        logger.warn(
          { err, itemId: material.itemId.toString(), procedureNoteId },
          'Auto-deduction: failed to deduct material (insufficient stock?)',
        );
      }
    }

    await this.ProcedureNote.updateOne(
      { _id: procedureNoteId },
      { $set: { materialsDeducted: true, materialsDeductedAt: new Date() } },
    );
  }

  private async autoSnapshot(
    patientId: string,
    trigger: string,
    procedureNoteTeeth?: { toothNumber: number; procedureName: string }[],
  ) {
    const chartService = new DentalChartService(this.tenantDb);
    await chartService.createSnapshot(
      patientId,
      'system',
      `Auto-snapshot: ${trigger}`,
      procedureNoteTeeth,
      'procedure_note',
    );
  }

  /**
   * Phase 7.2 — Mirror procedure-note status into the linked treatment-plan item.
   * `scheduled` when a draft note is opened from an item, `completed` when the
   * note is marked completed.  Also stores the procedureNoteId on the item so
   * the UI can link back from the plan row.
   */
  private async syncTreatmentPlanItem(
    treatmentPlanId: string | undefined,
    treatmentPlanItemId: string,
    procedureNoteId: string,
    itemStatus: 'scheduled' | 'completed',
  ): Promise<void> {
    const TreatmentPlan = getTreatmentPlanModel(this.tenantDb);

    // Locate the plan if planId not provided (item ids are unique across plans).
    const planFilter = treatmentPlanId
      ? { _id: treatmentPlanId }
      : { 'items._id': treatmentPlanItemId };
    const plan = await TreatmentPlan.findOne(planFilter);
    if (!plan) return;

    const item = (
      plan.items as unknown as { id: (id: string) => Record<string, unknown> | null }
    ).id(treatmentPlanItemId);
    if (!item) return;

    // Don't downgrade a completed item back to scheduled.
    if (item.status === 'completed' && itemStatus === 'scheduled') return;

    item.status = itemStatus;
    item.procedureNoteId = procedureNoteId;
    if (itemStatus === 'completed') {
      item.completedAt = new Date();
    }
    await plan.save();
  }

  private parseTeethInvolved(
    teethInvolved: string | undefined,
    procedureName: string,
  ): { toothNumber: number; procedureName: string }[] {
    if (!teethInvolved) return [];
    return teethInvolved
      .split(/[,;\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= 85)
      .map((toothNumber) => ({ toothNumber, procedureName }));
  }

  /**
   * Build per-entry procedure note teeth from teethDetails (if available),
   * falling back to the flat teethInvolved string. Each entry keeps its own
   * serviceName so the history tab can color-code them separately.
   */
  private buildProcedureNoteTeeth(
    data: Record<string, unknown>,
  ): { toothNumber: number; procedureName: string; entryIndex?: number }[] {
    const details = data.teethDetails as
      | { entries?: { teeth?: string[]; serviceName?: string }[] }
      | undefined;

    if (details?.entries?.length) {
      const result: { toothNumber: number; procedureName: string; entryIndex: number }[] = [];
      for (let i = 0; i < details.entries.length; i++) {
        const entry = details.entries[i];
        const label = entry.serviceName || `Entry ${i + 1}`;
        for (const t of entry.teeth ?? []) {
          const n = parseInt(t, 10);
          if (!isNaN(n) && n >= 1 && n <= 85) {
            result.push({ toothNumber: n, procedureName: label, entryIndex: i });
          }
        }
      }
      if (result.length > 0) return result;
    }

    // Fallback to flat string
    return this.parseTeethInvolved(
      data.teethInvolved as string | undefined,
      data.procedureName as string,
    );
  }

  // ── Update ────────────────────────────────────────────────

  async update(id: string, data: UpdateProcedureNoteInput) {
    const existing = await this.ProcedureNote.findById(id).lean();
    if (!existing) {
      throw ApiError.notFound('ProcedureNote');
    }

    const note = await this.ProcedureNote.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    ).lean();

    if (!note) {
      throw ApiError.notFound('ProcedureNote');
    }

    // Auto-snapshot on update
    if (existing.patientId) {
      const procedureNoteTeeth = this.parseTeethInvolved(note.teethInvolved, note.procedureName);
      this.autoSnapshot(
        existing.patientId.toString(),
        'procedure_note_updated',
        procedureNoteTeeth,
      ).catch((err) => logger.warn({ err }, 'Auto-snapshot failed after procedure note update'));
    }

    // Phase 10.5: Auto-deduct materials when procedure note transitions to completed.
    if (
      existing.status !== 'completed' &&
      (note as { status?: string }).status === 'completed' &&
      !(note as { materialsDeducted?: boolean }).materialsDeducted
    ) {
      this.runMaterialDeduction(
        id,
        (note as { treatmentPlanItemId?: { toString(): string } }).treatmentPlanItemId?.toString(),
        (note as { serviceId?: { toString(): string } }).serviceId?.toString(),
        (note as { appointmentId?: { toString(): string } }).appointmentId?.toString(),
        (note as { doctorId?: { toString(): string } }).doctorId?.toString() ?? 'system',
      ).catch((err) => logger.warn({ err }, 'Clinical auto-deduction on completion failed'));
    }

    // Phase 7.2 — Mirror status into the linked treatment-plan item.
    const linkedItemId = (note as { treatmentPlanItemId?: { toString(): string } | string })
      .treatmentPlanItemId;
    if (linkedItemId) {
      const linkedPlanId = (note as { treatmentPlanId?: { toString(): string } | string })
        .treatmentPlanId;
      const itemStatus =
        (note as { status?: string }).status === 'completed' ? 'completed' : 'scheduled';
      this.syncTreatmentPlanItem(
        typeof linkedPlanId === 'string' ? linkedPlanId : linkedPlanId?.toString(),
        typeof linkedItemId === 'string' ? linkedItemId : linkedItemId.toString(),
        id,
        itemStatus,
      ).catch((err) => logger.warn({ err }, 'Treatment-plan item sync failed on update'));
    }

    return note;
  }

  // ── Delete ────────────────────────────────────────────────

  async delete(id: string) {
    const note = await this.ProcedureNote.findById(id).lean();
    if (!note) {
      throw ApiError.notFound('ProcedureNote');
    }

    // Snapshot before deletion for audit
    if (note.patientId) {
      const procedureNoteTeeth = this.parseTeethInvolved(note.teethInvolved, note.procedureName);
      this.autoSnapshot(
        note.patientId.toString(),
        'procedure_note_deleted',
        procedureNoteTeeth,
      ).catch((err) => logger.warn({ err }, 'Auto-snapshot failed before procedure note deletion'));
    }

    await this.ProcedureNote.findByIdAndDelete(id);
    return { message: 'Procedure note deleted' };
  }

  // ══════════════════════════════════════════════════════════
  // Templates
  // ══════════════════════════════════════════════════════════

  // ── List Templates ────────────────────────────────────────

  async listTemplates(query: ProcedureNoteTemplateQuery) {
    const { page, limit, procedureType, isActive } = query;
    const templateType = (query as { templateType?: string }).templateType;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IProcedureNoteTemplate> = {};
    if (procedureType) filter.procedureType = procedureType;
    if (templateType) (filter as Record<string, unknown>).templateType = templateType;
    if (isActive !== undefined) filter.isActive = isActive;

    const [templates, total] = await Promise.all([
      this.Template.find(filter).sort({ sortOrder: 1 }).skip(skip).limit(limit).lean(),
      this.Template.countDocuments(filter),
    ]);

    return {
      templates,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Get Template by ID ────────────────────────────────────

  async getTemplateById(id: string) {
    const template = await this.Template.findById(id).lean();
    if (!template) {
      throw ApiError.notFound('ProcedureNoteTemplate');
    }
    return template;
  }

  // ── Create Template ───────────────────────────────────────

  async createTemplate(data: CreateProcedureNoteTemplateInput) {
    const template = await this.Template.create(data);
    return template.toObject();
  }

  // ── Update Template ───────────────────────────────────────

  async updateTemplate(id: string, data: UpdateProcedureNoteTemplateInput) {
    const template = await this.Template.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    ).lean();

    if (!template) {
      throw ApiError.notFound('ProcedureNoteTemplate');
    }

    return template;
  }

  // ── Delete Template ───────────────────────────────────────

  async deleteTemplate(id: string) {
    const template = await this.Template.findByIdAndDelete(id).lean();
    if (!template) {
      throw ApiError.notFound('ProcedureNoteTemplate');
    }
    return { message: 'Procedure note template deleted' };
  }
}
