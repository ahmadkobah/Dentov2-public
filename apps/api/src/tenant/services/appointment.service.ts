import type { Connection, QueryFilter } from 'mongoose';
import { Types } from 'mongoose';
import type { IAppointment } from '../models/appointment.model.js';
import { getAppointmentModel } from '../models/appointment.model.js';
import { getAppointmentTypeModel } from '../models/appointment-type.model.js';
import { getPatientModel } from '../models/patient.model.js';
import { getDoctorModel } from '../models/doctor.model.js';
import { getProcedureNoteModel } from '../models/procedure-note.model.js';
import { getServiceModel } from '../models/service.model.js';
import { getInvoiceModel } from '../models/invoice.model.js';
import { getBranchModel } from '../models/branch.model.js';
import { ApiError } from '../../utils/api-response.js';
import { decryptField } from '../../utils/encryption.js';
import { ScheduleValidationService } from './schedule-validation.service.js';
import { socketEmitter } from '../../plugins/socket.plugin.js';
import { dispatchWebhook } from './webhook-dispatcher.js';
import { logger } from '../../utils/logger.js';
import { NotificationService } from '../../services/notification.service.js';
import type { TenantWebhookEvent } from '@dento/shared';
import type { UserRole } from '../middleware/role-guard.js';
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  AppointmentQuery,
  CreateAppointmentTypeInput,
  UpdateAppointmentTypeInput,
} from '@dento/shared';
import { VALID_STATUS_TRANSITIONS } from '@dento/shared';

/**
 * Detects MongoDB E11000 duplicate-key errors raised by the
 * `doctor_slot_unique_active` partial unique index on Appointment.
 * Used to map race-condition slot collisions to a 409 response.
 */
function isSlotTakenError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: number; message?: string };
  return (
    e.code === 11000 &&
    typeof e.message === 'string' &&
    e.message.includes('doctor_slot_unique_active')
  );
}

type AppointmentAccessContext = {
  userId: string;
  role: UserRole;
};

const SELF_SCOPED_APPOINTMENT_ROLES = new Set<UserRole>(['dentist', 'hygienist']);

function toIdString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'object' && '_id' in value) {
    return String((value as Record<string, unknown>)._id);
  }
  return String(value);
}

/**
 * Appointment Service — Business logic for appointments and types
 *
 * Handles:
 * - Appointment CRUD with calendar views
 * - 3-level schedule validation (Branch Hours → Doctor Schedule → Conflict)
 * - Status flow enforcement
 * - Appointment type management
 */

/** Decrypt PII fields on a populated patient sub-document. */
function decryptPatientPii(patient: Record<string, unknown>): Record<string, unknown> {
  try {
    const result = { ...patient };
    if (typeof result.phone === 'string') result.phone = decryptField(result.phone);
    if (typeof result.email === 'string') result.email = decryptField(result.email);
    return result;
  } catch {
    return patient;
  }
}

export class AppointmentService {
  private Appointment;
  private AppointmentType;
  private Doctor;
  private scheduleValidator;
  private tenantDb: Connection;
  private tenantSlug: string;

  constructor(tenantDb: Connection) {
    this.tenantDb = tenantDb;
    this.tenantSlug = tenantDb.name?.replace('tenant_', '') || '';
    this.Appointment = getAppointmentModel(tenantDb);
    this.AppointmentType = getAppointmentTypeModel(tenantDb);
    this.Doctor = getDoctorModel(tenantDb);
    this.scheduleValidator = new ScheduleValidationService(tenantDb);
    // Register models needed for populate
    getPatientModel(tenantDb);
  }

  // ══════════════════════════════════════════════════════════
  // ── Appointments ──────────────────────────────────────────
  // ══════════════════════════════════════════════════════════

  private async getCallerDoctorId(access?: AppointmentAccessContext): Promise<string | null> {
    if (!access || !SELF_SCOPED_APPOINTMENT_ROLES.has(access.role)) return null;

    const doctor = await this.Doctor.findOne({ userId: access.userId, isActive: true })
      .select('_id')
      .lean<{ _id: unknown }>();

    if (!doctor?._id) {
      throw ApiError.forbidden('No active doctor profile is linked to this user');
    }

    return String(doctor._id);
  }

  private assertAppointmentDoctorAccess(doctorId: unknown, callerDoctorId: string): void {
    if (toIdString(doctorId) !== callerDoctorId) {
      throw ApiError.forbidden('You can only access your own appointments');
    }
  }

  async listAppointments(query: AppointmentQuery, access?: AppointmentAccessContext) {
    const {
      page,
      limit,
      date,
      dateFrom,
      dateTo,
      doctorId,
      branchId,
      patientId,
      status,
      type,
      sortBy,
      sortOrder,
    } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IAppointment> = {};

    // Date filters
    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      filter.date = { $gte: dayStart, $lte: dayEnd };
    } else if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const callerDoctorId = await this.getCallerDoctorId(access);
    if (callerDoctorId) {
      if (doctorId && doctorId !== callerDoctorId) {
        throw ApiError.forbidden('You can only access your own appointments');
      }
      filter.doctorId = callerDoctorId;
    } else if (doctorId) {
      filter.doctorId = doctorId;
    }
    if (branchId) filter.branchId = branchId;
    if (patientId) filter.patientId = patientId;
    if (status) filter.status = status;
    if (type) filter.type = type as IAppointment['type'];

    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    // Secondary sort by startTime for day views
    if (sortBy === 'date') sort.startTime = 1;

    const [rawAppointments, total] = await Promise.all([
      this.Appointment.find(filter)
        .populate('patientId', 'firstName lastName patientCode phone medicalHistory allergies')
        .populate('doctorId', 'firstName lastName specialization color')
        .populate('appointmentTypeId', 'name color defaultDuration')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean<Record<string, unknown>[]>(),
      this.Appointment.countDocuments(filter),
    ]);

    // Remap populated ObjectId fields to friendly names for the frontend
    const appointments = rawAppointments.map((apt: Record<string, unknown>) => {
      const { patientId, doctorId, appointmentTypeId, ...rest } = apt;
      return {
        ...rest,
        patientId:
          typeof patientId === 'object' && patientId !== null
            ? (patientId as Record<string, unknown>)._id
            : patientId,
        doctorId:
          typeof doctorId === 'object' && doctorId !== null
            ? (doctorId as Record<string, unknown>)._id
            : doctorId,
        appointmentTypeId:
          typeof appointmentTypeId === 'object' && appointmentTypeId !== null
            ? (appointmentTypeId as Record<string, unknown>)._id
            : appointmentTypeId,
        patient:
          typeof patientId === 'object'
            ? decryptPatientPii(patientId as Record<string, unknown>)
            : undefined,
        doctor: typeof doctorId === 'object' ? doctorId : undefined,
        appointmentType: typeof appointmentTypeId === 'object' ? appointmentTypeId : undefined,
      };
    });

    return {
      appointments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAppointmentById(id: string, access?: AppointmentAccessContext) {
    const raw = await this.Appointment.findById(id)
      .populate(
        'patientId',
        'firstName lastName patientCode phone email dateOfBirth gender medicalHistory allergies',
      )
      .populate('doctorId', 'firstName lastName specialization color')
      .populate('appointmentTypeId', 'name color defaultDuration code')
      .lean<Record<string, unknown>>();

    if (!raw) {
      throw ApiError.notFound('Appointment');
    }

    const callerDoctorId = await this.getCallerDoctorId(access);
    if (callerDoctorId) this.assertAppointmentDoctorAccess(raw.doctorId, callerDoctorId);

    const { patientId, doctorId, appointmentTypeId, ...rest } = raw;
    return {
      ...rest,
      patientId:
        typeof patientId === 'object' && patientId !== null
          ? (patientId as Record<string, unknown>)._id
          : patientId,
      doctorId:
        typeof doctorId === 'object' && doctorId !== null
          ? (doctorId as Record<string, unknown>)._id
          : doctorId,
      appointmentTypeId:
        typeof appointmentTypeId === 'object' && appointmentTypeId !== null
          ? (appointmentTypeId as Record<string, unknown>)._id
          : appointmentTypeId,
      patient:
        typeof patientId === 'object'
          ? decryptPatientPii(patientId as Record<string, unknown>)
          : undefined,
      doctor: typeof doctorId === 'object' ? doctorId : undefined,
      appointmentType: typeof appointmentTypeId === 'object' ? appointmentTypeId : undefined,
    };
  }

  async createAppointment(data: CreateAppointmentInput, createdBy: string) {
    // 3-tier schedule validation: Branch Hours → Doctor Schedule → Conflict
    await this.scheduleValidator.validate(
      data.branchId,
      data.doctorId,
      data.date,
      data.startTime,
      data.endTime,
    );

    // Auto-copy defaultFee from appointment type → consultationFee
    const createData: Record<string, unknown> = {
      ...data,
      date: new Date(data.date),
      createdBy,
    };
    if (data.appointmentTypeId && data.consultationFee == null) {
      const apptType = await this.AppointmentType.findById(data.appointmentTypeId)
        .select('defaultFee')
        .lean();
      if (apptType?.defaultFee != null) {
        createData.consultationFee = apptType.defaultFee;
      }
    }

    const appointment = await this.Appointment.create(createData).catch((err: unknown) => {
      if (isSlotTakenError(err)) {
        throw ApiError.conflict(
          'This time slot was just booked. Please refresh and choose a different time.',
        );
      }
      throw err;
    });

    const result = appointment.toObject();

    // Emit Socket.io event for real-time calendar/queue updates
    try {
      socketEmitter.queueUpdate(data.branchId, {
        type: 'appointment_created',
        data: {
          id: result._id.toString(),
          branchId: data.branchId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch {
      /* Socket not initialized in tests */
    }

    // Dispatch webhook (fire-and-forget)
    this.fireWebhook('appointment.created', {
      appointmentId: result._id.toString(),
      patientId: data.patientId,
      doctorId: data.doctorId,
      branchId: data.branchId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
    });

    // Send notification (fire-and-forget)
    this.sendNotification('appointment.created', {
      recipients: [
        { userId: data.doctorId },
        ...(createdBy !== data.doctorId ? [{ userId: createdBy }] : []),
      ],
      variables: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
      },
      relatedEntity: { type: 'appointment' as const, id: result._id.toString() },
    });

    return result;
  }

  async updateAppointment(id: string, data: UpdateAppointmentInput, userId: string) {
    const existing = await this.Appointment.findById(id);
    if (!existing) {
      throw ApiError.notFound('Appointment');
    }

    // Validate status transition
    if (data.status && data.status !== existing.status) {
      const allowedTransitions = VALID_STATUS_TRANSITIONS[existing.status] || [];
      if (!allowedTransitions.includes(data.status)) {
        throw ApiError.badRequest(
          `Invalid status transition: ${existing.status} → ${data.status}. Allowed: ${allowedTransitions.join(', ') || 'none (terminal state)'}`,
        );
      }

      // Set timing fields based on status
      if (data.status === 'arrived') {
        (data as Record<string, unknown>).arrivedAt = new Date();
      } else if (data.status === 'in_progress') {
        (data as Record<string, unknown>).startedAt = new Date();
      } else if (data.status === 'completed') {
        (data as Record<string, unknown>).completedAt = new Date();
      } else if (data.status === 'cancelled') {
        (data as Record<string, unknown>).cancelledBy = userId;
      }
    }

    // Detect reschedule (date/time changed)
    const isReschedule =
      !!(data.date || data.startTime || data.endTime) &&
      ((data.date && data.date !== existing.date.toISOString().split('T')[0]) ||
        (data.startTime && data.startTime !== existing.startTime) ||
        (data.endTime && data.endTime !== existing.endTime));

    // If rescheduling time, run full 3-tier validation
    if (data.date || data.startTime || data.endTime) {
      const branchId = data.branchId || existing.branchId.toString();
      const doctorId = data.doctorId || existing.doctorId.toString();
      const date = data.date || existing.date.toISOString().split('T')[0];
      const startTime = data.startTime || existing.startTime;
      const endTime = data.endTime || existing.endTime;
      await this.scheduleValidator.validate(branchId, doctorId, date, startTime, endTime, id);
    }

    const updateData: Record<string, unknown> = { ...data };
    // Phase 2.8 — strip non-persistent transport flag
    delete updateData.cancelSource;
    updateData.updatedBy = userId;
    if (data.date) {
      updateData.date = new Date(data.date);
    }

    const appointment = await this.Appointment.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    ).lean();

    // Emit Socket.io event for real-time calendar update
    if (appointment) {
      try {
        const branchId = (appointment.branchId || existing.branchId).toString();
        socketEmitter.queueUpdate(branchId, {
          type: data.status ? 'appointment_status_changed' : 'appointment_updated',
          data: {
            id,
            branchId,
            timestamp: new Date().toISOString(),
            ...(data.status && { oldStatus: existing.status, newStatus: data.status }),
          },
        });
      } catch {
        /* Socket not initialized in tests */
      }

      // Dispatch webhook (fire-and-forget)
      this.fireWebhook('appointment.updated', {
        appointmentId: id,
        ...(data.status && { status: data.status, previousStatus: existing.status }),
      });

      // Notify on status changes (cancelled, completed, no_show, confirmed)
      if (data.status && ['cancelled', 'completed', 'no_show', 'confirmed'].includes(data.status)) {
        // Phase 2.8 — differentiate cancel source
        let templateKey = `appointment.${data.status}`;
        if (data.status === 'cancelled') {
          const source = (data as { cancelSource?: 'patient' | 'clinic' | 'no_show' }).cancelSource;
          if (source === 'patient') templateKey = 'appointment.cancelled_by_patient';
          else if (source === 'clinic') templateKey = 'appointment.cancelled_by_clinic';
        }

        // Phase 2.3 — include patient as recipient
        this.sendNotification(templateKey, {
          recipients: [
            { userId: existing.doctorId.toString() },
            ...(userId !== existing.doctorId.toString() ? [{ userId }] : []),
            { patientId: existing.patientId.toString() },
          ],
          variables: {
            appointmentId: id,
            status: data.status,
            previousStatus: existing.status,
            date: existing.date.toISOString().split('T')[0],
            startTime: existing.startTime,
          },
          relatedEntity: { type: 'appointment' as const, id },
        });
      }

      // Phase 2.1 — Notify patient on reschedule (no status change required)
      if (isReschedule && (!data.status || data.status === existing.status)) {
        this.sendNotification('appointment.rescheduled', {
          recipients: [
            { userId: existing.doctorId.toString() },
            { patientId: existing.patientId.toString() },
          ],
          variables: {
            appointmentId: id,
            oldDate: existing.date.toISOString().split('T')[0],
            oldStartTime: existing.startTime,
            newDate: data.date ?? existing.date.toISOString().split('T')[0],
            newStartTime: data.startTime ?? existing.startTime,
          },
          relatedEntity: { type: 'appointment' as const, id },
        });
      }

      // Auto-create draft procedure note when appointment starts
      if (data.status === 'in_progress') {
        this.autoCreateProcedureNote(existing).catch((err) =>
          logger.warn({ err, appointmentId: id }, 'Auto-create procedure note failed (non-fatal)'),
        );
      }

      // Auto-generate draft invoice when appointment completes
      if (data.status === 'completed') {
        this.autoGenerateInvoice(existing, userId).catch((err) =>
          logger.warn({ err, appointmentId: id }, 'Auto-generate invoice failed (non-fatal)'),
        );
        // Phase 5.9 — bump patient.nextVisitDue using recallMonths
        this.bumpPatientRecall(existing.patientId.toString()).catch((err) =>
          logger.warn({ err, appointmentId: id }, 'Recall bump failed (non-fatal)'),
        );
      }

      // Phase 3.5 — Auto-generate no-show fee invoice on no_show transition.
      // (Patient-initiated late cancellations are handled in cancelAppointment.)
      if (data.status === 'no_show') {
        this.applyCancellationFee(existing, 'no_show', userId).catch((err) =>
          logger.warn({ err, appointmentId: id }, 'No-show fee invoice failed (non-fatal)'),
        );
      }
    }

    return appointment;
  }

  // ── Auto-create draft procedure note when appointment starts ──

  private async autoCreateProcedureNote(appointment: IAppointment) {
    const ProcedureNote = getProcedureNoteModel(this.tenantDb);

    // Check if a procedure note for this appointment already exists
    const existing = await ProcedureNote.findOne({
      appointmentId: appointment._id,
    }).lean();
    if (existing) return; // Already created (e.g. manual or restart)

    // Resolve appointment type name for the procedure name
    let procedureName = 'Appointment';
    if (appointment.appointmentTypeId) {
      const apptType = await this.AppointmentType.findById(appointment.appointmentTypeId)
        .select('name')
        .lean();
      if (apptType?.name) {
        procedureName = (apptType.name as { en: string }).en || 'Appointment';
      }
    }

    await ProcedureNote.create({
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      appointmentId: appointment._id,
      procedureName,
      status: 'draft',
    });

    logger.info(
      { appointmentId: appointment._id.toString() },
      'Auto-created draft procedure note for started appointment',
    );
  }

  // ── Phase 5.9 — bump patient.nextVisitDue using their recallMonths ──
  private async bumpPatientRecall(patientId: string): Promise<void> {
    const Patient = getPatientModel(this.tenantDb);
    const patient = await Patient.findById(patientId).select('recallMonths').lean();
    const months = patient?.recallMonths;
    if (!months || months < 1) return;
    const next = new Date();
    next.setMonth(next.getMonth() + months);
    await Patient.updateOne({ _id: patientId }, { $set: { nextVisitDue: next } });
  }

  // ── Auto-generate draft invoice when appointment completes ──

  private async autoGenerateInvoice(appointment: IAppointment, userId: string) {
    const Invoice = getInvoiceModel(this.tenantDb);

    // Check if an invoice for this appointment already exists
    const existingInvoice = await Invoice.findOne({
      appointmentId: appointment._id,
    }).lean();
    if (existingInvoice) return;

    const items: {
      description: string;
      serviceId?: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      total: number;
    }[] = [];

    // Line 1: Appointment type consultation fee
    if (appointment.consultationFee && appointment.consultationFee > 0) {
      let feeLabel = 'Consultation Fee';
      if (appointment.appointmentTypeId) {
        const apptType = await this.AppointmentType.findById(appointment.appointmentTypeId)
          .select('name')
          .lean();
        if (apptType?.name) {
          feeLabel = `${(apptType.name as { en: string }).en} Fee`;
        }
      }
      items.push({
        description: feeLabel,
        quantity: 1,
        unitPrice: appointment.consultationFee,
        discount: 0,
        total: appointment.consultationFee,
      });
    }

    // Lines 2+: Services from procedure notes linked to this appointment
    const ProcedureNote = getProcedureNoteModel(this.tenantDb);
    const notes = await ProcedureNote.find({
      appointmentId: appointment._id,
    }).lean();

    const Service = getServiceModel(this.tenantDb);

    // Track which treatment plans already have invoices to avoid double-billing
    const planInvoiceCache = new Map<string, boolean>();

    for (const note of notes) {
      // Skip items whose treatment plan already has an invoice
      if (note.treatmentPlanItemId) {
        const TreatmentPlan = (
          await import('../models/treatment-plan.model.js')
        ).getTreatmentPlanModel(this.tenantDb);
        const parentPlan = await TreatmentPlan.findOne({ 'items._id': note.treatmentPlanItemId })
          .select('_id')
          .lean();
        if (parentPlan) {
          const planId = parentPlan._id.toString();
          if (!planInvoiceCache.has(planId)) {
            const hasInvoice = await Invoice.exists({ treatmentPlanId: parentPlan._id });
            planInvoiceCache.set(planId, !!hasInvoice);
          }
          if (planInvoiceCache.get(planId)) continue;
        }
      }

      // Direct service link on the procedure note
      if (note.serviceId) {
        const service = await Service.findById(note.serviceId).select('name defaultPrice').lean();
        if (service) {
          const price = (service as any).defaultPrice || 0;
          items.push({
            description: (service as any).name?.en || note.procedureName,
            serviceId: note.serviceId.toString(),
            quantity: 1,
            unitPrice: price,
            discount: 0,
            total: price,
          });
        }
      }

      // Services via treatment plan item
      if (note.treatmentPlanItemId && !note.serviceId) {
        const TreatmentPlan = (
          await import('../models/treatment-plan.model.js')
        ).getTreatmentPlanModel(this.tenantDb);
        const plan = await TreatmentPlan.findOne(
          { 'items._id': note.treatmentPlanItemId },
          { 'items.$': 1 },
        ).lean();
        if (plan?.items?.length) {
          const planItem = plan.items[0] as any;
          const price = planItem.unitPrice || planItem.cost || 0;
          items.push({
            description: planItem.description || planItem.procedureName || note.procedureName,
            serviceId: planItem.serviceId?.toString(),
            quantity: planItem.quantity || 1,
            unitPrice: price,
            discount: planItem.discount || 0,
            total: (planItem.quantity || 1) * price - (planItem.discount || 0),
          });
        }
      }
    }

    // Only create invoice if there are items to bill
    if (items.length === 0) return;

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);

    await Invoice.create({
      patientId: appointment.patientId,
      branchId: appointment.branchId,
      appointmentId: appointment._id,
      items,
      subtotal,
      discountAmount: 0,
      discountPercentage: 0,
      taxAmount: 0,
      taxPercentage: 0,
      totalAmount: subtotal,
      amountPaid: 0,
      balanceDue: subtotal,
      status: 'draft',
      insuredAmount: 0,
      patientResponsibility: subtotal,
      createdBy: userId,
    });

    logger.info(
      {
        appointmentId: appointment._id.toString(),
        itemCount: items.length,
        totalAmount: subtotal,
      },
      'Auto-generated draft invoice for completed appointment',
    );
  }

  async cancelAppointment(
    id: string,
    reason: string,
    cancelledBy: string,
    cancelSource: 'patient' | 'clinic' | 'no_show' = 'clinic',
  ) {
    // Capture pre-cancel state for late-fee evaluation (Phase 3.5) and
    // waitlist back-fill (Phase 6.4).
    const pre = await this.Appointment.findById(id)
      .select('date startTime endTime branchId doctorId patientId')
      .lean();

    const result = await this.updateAppointment(
      id,
      {
        status: 'cancelled',
        cancellationReason: reason,
        // Phase 2.8 — carried via updateAppointment for templateKey routing
        cancelSource,
      } as UpdateAppointmentInput & { cancelSource?: 'patient' | 'clinic' | 'no_show' },
      cancelledBy,
    );

    // Phase 3.5 — late-cancel / no-show fee invoice (fire-and-forget)
    if (pre && (cancelSource === 'patient' || cancelSource === 'no_show')) {
      this.applyCancellationFee(pre as unknown as IAppointment, cancelSource, cancelledBy).catch(
        (err) =>
          logger.warn({ err, appointmentId: id }, 'Failed to apply cancellation fee invoice'),
      );
    }

    // Phase 6.4 — auto-fill the freed slot from the waitlist (fire-and-forget).
    if (pre && cancelSource !== 'no_show') {
      this.notifyWaitlistForFreedSlot({
        branchId: pre.branchId.toString(),
        doctorId: pre.doctorId.toString(),
        date: pre.date,
        startTime: pre.startTime,
        endTime: pre.endTime,
      }).catch((err) =>
        logger.warn({ err, appointmentId: id }, 'Waitlist back-fill failed (non-fatal)'),
      );
    }

    return result;
  }

  /**
   * Phase 6.4 — Notify the top waitlist match for a slot that just freed up.
   * Dynamically imported to avoid circular dependency.
   */
  private async notifyWaitlistForFreedSlot(slot: {
    branchId: string;
    doctorId: string;
    date: Date | string;
    startTime: string;
    endTime: string;
  }): Promise<void> {
    const { WaitlistService } = await import('./waitlist.service.js');
    const wls = new WaitlistService(this.tenantDb);
    await wls.notifyTopMatchForSlot({
      branchId: slot.branchId,
      doctorId: slot.doctorId,
      date: new Date(slot.date),
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  }

  /**
   * Phase 3.5 — Auto-create a draft invoice for a late-cancellation or no-show
   * fee, per branch policy. No-op when policy disabled, amount is 0, or the
   * cancellation happens outside the policy window.
   */
  private async applyCancellationFee(
    appointment: IAppointment,
    cancelSource: 'patient' | 'no_show',
    userId: string,
  ): Promise<void> {
    const Branch = getBranchModel(this.tenantDb);
    const branch = await Branch.findById(appointment.branchId)
      .select('cancellationFeePolicy')
      .lean();
    const policy = branch?.cancellationFeePolicy;
    if (!policy?.enabled || !policy.amount || policy.amount <= 0) return;
    if (cancelSource === 'no_show' && !policy.applyOnNoShow) return;

    // Compute hours-until-appointment using {date, startTime}
    const apptDate = new Date(appointment.date);
    const [hh, mm] = (appointment.startTime || '00:00').split(':').map((s) => parseInt(s, 10) || 0);
    apptDate.setHours(hh, mm, 0, 0);
    const hoursUntil = (apptDate.getTime() - Date.now()) / (1000 * 60 * 60);

    // For patient-initiated cancellations the policy only applies INSIDE the
    // window. No-show is always considered "inside the window" since the slot
    // has already passed.
    if (cancelSource === 'patient' && hoursUntil >= policy.windowHours) return;

    const Invoice = getInvoiceModel(this.tenantDb);

    // Idempotency — don't double-bill if a fee invoice already exists for this
    // appointment.
    const existing = await Invoice.findOne({
      appointmentId: appointment._id,
      'items.description': { $in: ['Late cancellation fee', 'No-show fee'] },
    })
      .select('_id')
      .lean();
    if (existing) return;

    const description = cancelSource === 'no_show' ? 'No-show fee' : 'Late cancellation fee';
    await Invoice.create({
      patientId: appointment.patientId,
      branchId: appointment.branchId,
      appointmentId: appointment._id,
      items: [
        {
          description,
          quantity: 1,
          unitPrice: policy.amount,
          discount: 0,
          total: policy.amount,
        },
      ],
      subtotal: policy.amount,
      discountAmount: 0,
      discountPercentage: 0,
      taxAmount: 0,
      taxPercentage: 0,
      totalAmount: policy.amount,
      amountPaid: 0,
      balanceDue: policy.amount,
      status: 'draft',
      insuredAmount: 0,
      patientResponsibility: policy.amount,
      createdBy: userId,
    });

    logger.info(
      {
        appointmentId: appointment._id.toString(),
        cancelSource,
        amount: policy.amount,
      },
      'Auto-generated cancellation/no-show fee invoice',
    );
  }

  /**
   * Phase 3.2 — Move an existing appointment to a new slot.
   *
   * - Re-validates the new slot via 3-tier `scheduleValidator` (excluding `id`).
   * - Catches E11000 on the partial unique index and surfaces a 409.
   * - Writes a medium-sensitivity audit entry capturing the move.
   * - Fires `appointment.rescheduled` to patient + doctor with both slots.
   * - Leaves a TODO for waitlist back-fill (Phase 6).
   */
  async rescheduleAppointment(
    id: string,
    newSlot: {
      date: string;
      startTime: string;
      endTime: string;
      branchId?: string;
      doctorId?: string;
      durationMinutes?: number;
    },
    reason: string,
    userId: string,
  ) {
    const existing = await this.Appointment.findById(id);
    if (!existing) throw ApiError.notFound('Appointment');

    const targetBranchId = newSlot.branchId ?? existing.branchId.toString();
    const targetDoctorId = newSlot.doctorId ?? existing.doctorId.toString();

    // 3-tier validation excluding the current appointment so we don't
    // self-conflict.
    await this.scheduleValidator.validate(
      targetBranchId,
      targetDoctorId,
      newSlot.date,
      newSlot.startTime,
      newSlot.endTime,
      id,
    );

    const oldSnapshot = {
      date: existing.date,
      startTime: existing.startTime,
      endTime: existing.endTime,
      branchId: existing.branchId.toString(),
      doctorId: existing.doctorId.toString(),
    };

    existing.date = new Date(newSlot.date);
    existing.startTime = newSlot.startTime;
    existing.endTime = newSlot.endTime;
    if (newSlot.branchId) {
      existing.branchId = new Types.ObjectId(
        newSlot.branchId,
      ) as unknown as typeof existing.branchId;
    }
    if (newSlot.doctorId) {
      existing.doctorId = new Types.ObjectId(
        newSlot.doctorId,
      ) as unknown as typeof existing.doctorId;
    }
    if (newSlot.durationMinutes) existing.durationMinutes = newSlot.durationMinutes;
    existing.updatedBy = new Types.ObjectId(userId) as unknown as typeof existing.updatedBy;

    try {
      await existing.save();
    } catch (err: unknown) {
      if (isSlotTakenError(err)) {
        throw ApiError.conflict(
          'This time slot was just booked. Please refresh and choose a different time.',
        );
      }
      throw err;
    }

    const updated = existing.toObject();

    // Audit (fire-and-forget — don't fail the operation if audit write fails)
    (async () => {
      try {
        const { AuditLogService } = await import('./audit-log.service.js');
        const audit = new AuditLogService(this.tenantDb);
        await audit.create({
          actorId: userId,
          actorRole: 'staff',
          tenantSlug: this.tenantSlug,
          resourceType: 'appointment',
          resourceId: id,
          action: 'update',
          description: `Appointment rescheduled. Reason: ${reason || 'n/a'}`,
          oldValues: oldSnapshot,
          newValues: {
            date: newSlot.date,
            startTime: newSlot.startTime,
            endTime: newSlot.endTime,
            branchId: targetBranchId,
            doctorId: targetDoctorId,
          },
          ipAddress: '0.0.0.0',
          sensitivityLevel: 'medium',
          status: 'success',
        });
      } catch (err) {
        logger.warn({ err }, 'Failed to write reschedule audit');
      }
    })();

    // Socket emit
    try {
      socketEmitter.queueUpdate(targetBranchId, {
        type: 'appointment_rescheduled',
        data: {
          id,
          branchId: targetBranchId,
          oldDate: oldSnapshot.date.toISOString(),
          oldStartTime: oldSnapshot.startTime,
          newDate: newSlot.date,
          newStartTime: newSlot.startTime,
          timestamp: new Date().toISOString(),
        },
      });
    } catch {
      /* socket not initialized in tests */
    }

    // Notification — patient + doctor
    this.sendNotification('appointment.rescheduled', {
      recipients: [{ patientId: existing.patientId.toString() }, { userId: targetDoctorId }],
      variables: {
        oldDate: oldSnapshot.date.toISOString().slice(0, 10),
        oldStartTime: oldSnapshot.startTime,
        newDate: newSlot.date,
        newStartTime: newSlot.startTime,
        newEndTime: newSlot.endTime,
        reason: reason || '',
      },
      relatedEntity: { type: 'appointment' as const, id },
    });

    // TODO (Phase 6 — waitlist):
    // Notify WaitlistService that {oldSnapshot.branchId, oldSnapshot.doctorId,
    // oldSnapshot.date, oldSnapshot.startTime} just opened up so it can
    // offer the slot to the next eligible patient.
    this.notifyWaitlistForFreedSlot({
      branchId: oldSnapshot.branchId,
      doctorId: oldSnapshot.doctorId,
      date: oldSnapshot.date,
      startTime: oldSnapshot.startTime,
      endTime: oldSnapshot.endTime,
    }).catch((err) =>
      logger.warn({ err, appointmentId: id }, 'Waitlist back-fill (reschedule) failed'),
    );

    return updated;
  }

  // ── Doctor Handoff (Phase 9.2) ────────────────────────────
  /**
   * Re-assigns an appointment to a different doctor.
   * - Refuses to handoff cancelled / completed appointments.
   * - Re-validates new doctor slot via scheduleValidator (excluding `id`).
   * - Writes high-sensitivity audit entry.
   * - Notifies incoming + outgoing doctor + patient.
   */
  async handoffAppointment(
    id: string,
    newDoctorId: string,
    reason: string,
    note: string | undefined,
    userId: string,
  ) {
    const existing = await this.Appointment.findById(id);
    if (!existing) throw ApiError.notFound('Appointment');

    if (['cancelled', 'completed', 'no_show'].includes(existing.status as string)) {
      throw ApiError.badRequest(`Cannot handoff appointment in status "${existing.status}"`);
    }

    const oldDoctorId = existing.doctorId.toString();
    if (oldDoctorId === newDoctorId) {
      throw ApiError.badRequest('Appointment is already assigned to this doctor');
    }

    // Re-validate the new slot for the new doctor
    const dateStr =
      existing.date instanceof Date
        ? existing.date.toISOString().slice(0, 10)
        : String(existing.date).slice(0, 10);
    try {
      await this.scheduleValidator.validate(
        existing.branchId.toString(),
        newDoctorId,
        dateStr,
        existing.startTime,
        existing.endTime,
        id,
      );
    } catch (err) {
      throw ApiError.conflict(
        err instanceof Error ? err.message : 'New doctor is not available for this slot',
      );
    }

    existing.doctorId = newDoctorId as unknown as typeof existing.doctorId;
    if (note) {
      existing.notes =
        `${existing.notes ?? ''}\n[handoff ${new Date().toISOString()}]: ${note}`.trim();
    }
    await existing.save();

    const updated = existing.toObject();

    // Audit (fire-and-forget)
    (async () => {
      try {
        const { AuditLogService } = await import('./audit-log.service.js');
        const audit = new AuditLogService(this.tenantDb);
        await audit.create({
          actorId: userId,
          actorRole: 'staff',
          tenantSlug: this.tenantSlug,
          resourceType: 'appointment',
          resourceId: id,
          action: 'update',
          description: `Doctor handoff: ${oldDoctorId} → ${newDoctorId}. Reason: ${reason}`,
          oldValues: { doctorId: oldDoctorId },
          newValues: { doctorId: newDoctorId, note: note ?? null },
          ipAddress: '0.0.0.0',
          sensitivityLevel: 'high',
          status: 'success',
        });
      } catch (err) {
        logger.warn({ err }, 'Failed to write handoff audit');
      }
    })();

    // Socket emit
    try {
      socketEmitter.queueUpdate(existing.branchId.toString(), {
        type: 'appointment_handoff',
        data: {
          id,
          branchId: existing.branchId.toString(),
          oldDoctorId,
          newDoctorId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch {
      /* socket not initialized in tests */
    }

    // Notify outgoing doctor, incoming doctor, and patient
    this.sendNotification('appointment.updated', {
      recipients: [
        { userId: oldDoctorId },
        { userId: newDoctorId },
        { patientId: existing.patientId.toString() },
      ],
      variables: {
        date: dateStr,
        startTime: existing.startTime,
        endTime: existing.endTime,
        oldDoctorId,
        newDoctorId,
        reason,
        note: note ?? '',
      },
      relatedEntity: { type: 'appointment' as const, id },
    });

    return updated;
  }

  // ══════════════════════════════════════════════════════════
  // ── Appointment Types ─────────────────────────────────────
  // ══════════════════════════════════════════════════════════

  // ── Default appointment types seed data ────────────────────
  private static readonly DEFAULT_TYPES = [
    {
      code: 'consultation',
      name: { en: 'Consultation', ar: 'استشارة' },
      color: '#4CAF50',
      defaultDuration: 30,
      isDoctorRequired: true,
      isOnlineBookingAllowed: true,
      sortOrder: 0,
    },
    {
      code: 'follow_up',
      name: { en: 'Follow Up', ar: 'متابعة' },
      color: '#2196F3',
      defaultDuration: 20,
      isDoctorRequired: true,
      isOnlineBookingAllowed: true,
      sortOrder: 1,
    },
    {
      code: 'treatment',
      name: { en: 'Treatment', ar: 'علاج' },
      color: '#FF9800',
      defaultDuration: 60,
      isDoctorRequired: true,
      isOnlineBookingAllowed: false,
      sortOrder: 2,
    },
    {
      code: 'emergency',
      name: { en: 'Emergency', ar: 'طوارئ' },
      color: '#F44336',
      defaultDuration: 45,
      isDoctorRequired: true,
      isOnlineBookingAllowed: false,
      sortOrder: 3,
    },
    {
      code: 'checkup',
      name: { en: 'Checkup', ar: 'فحص' },
      color: '#9C27B0',
      defaultDuration: 30,
      isDoctorRequired: true,
      isOnlineBookingAllowed: true,
      sortOrder: 4,
    },
  ];

  /**
   * Ensure the 5 default appointment types exist in the tenant DB.
   * Called automatically when listing types.
   */
  private async seedDefaultTypes() {
    const count = await this.AppointmentType.countDocuments({ isDefault: true });
    if (count >= AppointmentService.DEFAULT_TYPES.length) return;

    for (const def of AppointmentService.DEFAULT_TYPES) {
      await this.AppointmentType.findOneAndUpdate(
        { code: def.code },
        {
          $setOnInsert: {
            ...def,
            isDefault: true,
            isActive: true,
            createdBy: new Types.ObjectId('000000000000000000000000'),
          },
        },
        { upsert: true },
      );
    }
  }

  async listAppointmentTypes(activeOnly = true) {
    await this.seedDefaultTypes();
    const filter = activeOnly ? { isActive: true } : {};
    return this.AppointmentType.find(filter).sort({ sortOrder: 1 }).lean();
  }

  async getAppointmentTypeById(id: string) {
    const type = await this.AppointmentType.findById(id).lean();
    if (!type) throw ApiError.notFound('Appointment Type');
    return type;
  }

  async createAppointmentType(data: CreateAppointmentTypeInput, createdBy: string) {
    // Check code uniqueness
    const existing = await this.AppointmentType.findOne({ code: data.code }).lean();
    if (existing) {
      throw ApiError.conflict(`Appointment type with code '${data.code}' already exists`);
    }
    const type = await this.AppointmentType.create({ ...data, createdBy });
    return type.toObject();
  }

  async updateAppointmentType(id: string, data: UpdateAppointmentTypeInput, updatedBy: string) {
    if (data.code) {
      const existing = await this.AppointmentType.findOne({
        code: data.code,
        _id: { $ne: id },
      }).lean();
      if (existing) {
        throw ApiError.conflict(`Appointment type with code '${data.code}' already exists`);
      }
    }

    const type = await this.AppointmentType.findByIdAndUpdate(
      id,
      { $set: { ...data, updatedBy } },
      { new: true, runValidators: true },
    ).lean();

    if (!type) throw ApiError.notFound('Appointment Type');
    return type;
  }

  async deleteAppointmentType(id: string, deletedBy: string) {
    // Prevent deletion of default types
    const existing = await this.AppointmentType.findById(id).lean();
    if (!existing) throw ApiError.notFound('Appointment Type');
    if (existing.isDefault) {
      throw ApiError.badRequest('Default appointment types cannot be deleted');
    }
    // Soft delete — just deactivate
    const type = await this.AppointmentType.findByIdAndUpdate(
      id,
      { $set: { isActive: false, updatedBy: deletedBy } },
      { new: true },
    ).lean();
    if (!type) throw ApiError.notFound('Appointment Type');
    return { message: 'Appointment type deactivated' };
  }

  /** Fire-and-forget webhook dispatch */
  private fireWebhook(event: TenantWebhookEvent, data: Record<string, unknown>): void {
    const tenantSlug = this.tenantDb.name?.replace('tenant_', '') || '';
    dispatchWebhook(this.tenantDb, {
      tenantId: tenantSlug,
      tenantSlug,
      event,
      data,
    }).catch((err) => {
      logger.warn(
        { event, error: err instanceof Error ? err.message : 'unknown' },
        'Webhook dispatch failed (non-fatal)',
      );
    });
  }

  /** Fire-and-forget notification via NotificationService */
  private sendNotification(
    templateKey: string,
    opts: {
      recipients: { userId?: string; patientId?: string; email?: string; phone?: string }[];
      variables: Record<string, string>;
      relatedEntity?: {
        type: 'appointment' | 'patient' | 'invoice' | 'walk_in' | 'treatment_plan' | 'stock_item';
        id: string;
      };
    },
  ): void {
    const svc = new NotificationService(this.tenantDb, this.tenantSlug);
    svc
      .send({
        templateKey,
        tenantId: this.tenantSlug,
        recipients: opts.recipients,
        variables: opts.variables,
        relatedEntity: opts.relatedEntity,
      })
      .catch((err) => {
        logger.warn(
          { templateKey, error: err instanceof Error ? err.message : 'unknown' },
          'Notification dispatch failed (non-fatal)',
        );
      });
  }
}
