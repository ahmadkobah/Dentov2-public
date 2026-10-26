import type { Connection, QueryFilter } from 'mongoose';
import { getBranchModel } from '../models/branch.model.js';
import { getDoctorModel } from '../models/doctor.model.js';
import { getAppointmentModel, type IAppointment } from '../models/appointment.model.js';
import { getPatientModel } from '../models/patient.model.js';
import { SlotEngineService } from './slot-engine.service.js';
import { ApiError } from '../../utils/api-response.js';
import { NotificationService } from '../../services/notification.service.js';
import { logger } from '../../utils/logger.js';
import { searchHash } from '../../utils/encryption.js';

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

/**
 * Booking Service — Online booking business logic
 *
 * Per BUILD_RULES §5.2 — Service layer pattern (constructor receives Connection)
 * Handles both public booking widget and admin management operations.
 */
export class BookingService {
  private readonly Branch;
  private readonly Doctor;
  private readonly Appointment;
  private readonly Patient;
  private readonly slotEngine: SlotEngineService;
  private readonly tenantDb: Connection;
  private readonly tenantSlug: string;

  constructor(tenantDb: Connection) {
    this.tenantDb = tenantDb;
    this.tenantSlug = tenantDb.name?.replace('tenant_', '') || '';
    this.Branch = getBranchModel(tenantDb);
    this.Doctor = getDoctorModel(tenantDb);
    this.Appointment = getAppointmentModel(tenantDb);
    this.Patient = getPatientModel(tenantDb);
    this.slotEngine = new SlotEngineService(tenantDb);
  }

  // ═══════════════════════════════════════════════════════════
  // PUBLIC ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  /** List branches that have online booking enabled */
  async listPublicBranches() {
    return this.Branch.find({
      isActive: true,
      'onlineBookingConfig.isEnabled': true,
    })
      .select('name address city phone workingHours ramadanHours isRamadanMode slotConfig')
      .lean();
  }

  /** List active doctors with access to a given branch */
  async listPublicDoctors(branchId: string) {
    return this.Doctor.find({
      isActive: true,
      'branchAccess.branchId': branchId,
    })
      .select('firstName lastName specialty avatar')
      .lean();
  }

  /**
   * Phase 11.1 — List active, online-bookable services so the public widget
   * can let the patient pick a service before choosing a slot.
   */
  async listPublicServices() {
    const Service = (await import('../models/service.model.js')).getServiceModel(this.tenantDb);
    return Service.find({ isActive: true })
      .select('name description code defaultPrice defaultDuration')
      .sort({ sortOrder: 1, 'name.en': 1 })
      .lean();
  }

  /**
   * Phase 11.2 — Validate that the supplied insurance provider is one the
   * tenant accepts. Returns `{ accepted: true }` when accepted, otherwise
   * `{ accepted: false, reason }`. Never throws — widget displays a soft
   * warning and still allows the booking to proceed.
   */
  async checkInsuranceAcceptance(
    provider: string,
  ): Promise<{ accepted: boolean; reason?: string }> {
    if (!provider) return { accepted: false, reason: 'No provider supplied' };
    const { getInsuranceCompanyModel } = await import('../models/insurance-company.model.js');
    const InsuranceCompany = getInsuranceCompanyModel(this.tenantDb);
    const match = await InsuranceCompany.findOne({
      isActive: true,
      $or: [{ 'name.en': provider }, { 'name.ar': provider }, { code: provider }],
    })
      .select('_id name')
      .lean();
    if (!match) {
      return { accepted: false, reason: 'Provider not in accepted list' };
    }
    return { accepted: true };
  }

  /**
   * Phase 4.5 — Returning-patient lookup for the public booking widget.
   * Returns a small projection so the widget can pre-fill name fields.
   * Returns `null` when no active patient matches the phone.
   */
  async lookupReturningPatient(phone: string): Promise<{
    patientId: string;
    patientCode: string;
    firstName: { en?: string; ar?: string };
    lastName: { en?: string; ar?: string };
  } | null> {
    if (!phone || phone.length < 5) return null;
    // Patient.phone is AES-256-GCM encrypted (non-deterministic); equality
    // lookup goes through the HMAC-SHA-256 `phoneHash` companion field.
    const phoneHash = searchHash(phone);
    if (!phoneHash) return null;
    const match = await this.Patient.findOne({ phoneHash, isActive: true })
      .select('firstName lastName patientCode')
      .lean();
    if (!match) return null;
    return {
      patientId: match._id.toString(),
      patientCode: match.patientCode,
      firstName: match.firstName as { en?: string; ar?: string },
      lastName: match.lastName as { en?: string; ar?: string },
    };
  }

  /**
   * Phase 4.6 — Find an existing patient by phone, or create a minimal one
   * tagged `source: 'website'`. Used by online-booking confirm flow so every
   * booking ends up linked to a real Patient record.
   */
  private async findOrCreatePatientByPhone(input: {
    phone: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    preferredLanguage?: string;
  }): Promise<string | null> {
    if (!input.phone) return null;
    const phoneHash = searchHash(input.phone);

    const existing = phoneHash
      ? await this.Patient.findOne({ phoneHash, isActive: true }).select('_id').lean()
      : null;
    if (existing) return existing._id.toString();

    // Insert new — minimal fields, source = website. Names default to empty
    // bilingual objects so the schema validates. Plugin encrypts phone/email
    // and populates phoneHash/emailHash automatically on save.
    const created = await this.Patient.create({
      firstName: { en: input.firstName ?? 'Unknown', ar: '' },
      lastName: { en: input.lastName ?? '', ar: '' },
      phone: input.phone,
      email: input.email ?? undefined,
      gender: 'other',
      dateOfBirth: new Date('1970-01-01'),
      source: 'website',
      preferredLanguage: input.preferredLanguage === 'ar' ? 'ar' : 'en',
      isActive: true,
    });
    return created._id.toString();
  }

  /** Get available slots for a specific doctor or all doctors at a branch */
  async getAvailableSlots(query: {
    branchId: string;
    doctorId?: string;
    date: string;
    durationMinutes: number;
  }) {
    if (query.doctorId) {
      // Single doctor
      return this.slotEngine.generateSlots(
        query.branchId,
        query.doctorId,
        query.date,
        query.durationMinutes,
        true,
      );
    }

    // All doctors at branch
    const doctors = await this.Doctor.find({
      isActive: true,
      'branchAccess.branchId': query.branchId,
    })
      .select('_id firstName lastName')
      .lean();

    const results = await Promise.all(
      doctors.map(async (doc) => {
        try {
          const slots = await this.slotEngine.generateSlots(
            query.branchId,
            doc._id.toString(),
            query.date,
            query.durationMinutes,
            true,
          );
          return {
            ...slots,
            doctorId: doc._id.toString(),
            doctorName: `${doc.firstName} ${doc.lastName}`,
          };
        } catch {
          return null;
        }
      }),
    );

    return { doctorSlots: results.filter(Boolean) };
  }

  /** Create an online booking appointment */
  async createBooking(data: {
    branchId: string;
    doctorId: string;
    date: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    patientId?: string;
    serviceId?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    preferredLanguage?: string;
    reason?: string;
    notes?: string;
    insuranceProvider?: string;
    insurancePolicyNumber?: string;
  }) {
    // Validate slot availability
    const slotResult = await this.slotEngine.generateSlots(
      data.branchId,
      data.doctorId,
      data.date,
      data.durationMinutes,
      true,
    );

    const requestedSlot = slotResult.slots.find(
      (s) => s.startTime === data.startTime && s.endTime === data.endTime,
    );

    if (!requestedSlot || !requestedSlot.isAvailable) {
      throw ApiError.conflict('Selected time slot is no longer available');
    }

    // Check branch auto-confirm config
    const branch = await this.Branch.findById(data.branchId).lean();
    const isAutoConfirm = branch?.onlineBookingConfig?.isAutoConfirm ?? false;

    // Phase 4.6 — link booking to a real Patient record (find-or-create by
    // phone). Falls back to the explicitly-supplied patientId when present.
    let resolvedPatientId = data.patientId || undefined;
    if (!resolvedPatientId && data.phone) {
      try {
        const id = await this.findOrCreatePatientByPhone({
          phone: data.phone,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          preferredLanguage: data.preferredLanguage,
        });
        if (id) resolvedPatientId = id;
      } catch (err) {
        logger.warn(
          { err, phone: data.phone },
          'findOrCreatePatientByPhone failed; continuing without patientId',
        );
      }
    }

    // Create appointment — race-safe via partial unique index
    // `doctor_slot_unique_active` (Phase 0.3). On E11000 we re-throw a 409
    // so the widget can re-fetch slots and present a fresh choice.
    let appointment;
    try {
      // `onlineBookingData` is captured alongside the booking but is not part of
      // the typed IAppointment schema; spread it so it travels with the create
      // payload without tripping excess-property checks on the literal.
      const onlineBookingData: Record<string, unknown> = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email,
        preferredLanguage: data.preferredLanguage,
        isOnlineBooking: true,
        isConfirmed: isAutoConfirm,
        insuranceProvider: data.insuranceProvider,
        insurancePolicyNumber: data.insurancePolicyNumber,
      };
      appointment = await this.Appointment.create({
        ...{ onlineBookingData },
        patientId: resolvedPatientId,
        doctorId: data.doctorId,
        branchId: data.branchId,
        serviceId: data.serviceId || undefined,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        durationMinutes: data.durationMinutes,
        type: 'consultation',
        source: 'website',
        status: isAutoConfirm ? 'confirmed' : 'booked',
        reason: data.reason,
        notes: data.notes,
        createdBy: 'online_booking',
        updatedBy: 'online_booking',
      });
    } catch (err: unknown) {
      if (isSlotTakenError(err)) {
        throw ApiError.conflict(
          'This time slot was just booked by another patient. Please choose a different time.',
        );
      }
      throw err;
    }

    // Get doctor name for notification
    const doctor = await this.Doctor.findById(data.doctorId).select('firstName lastName').lean();
    const doctorName = doctor ? `${doctor.firstName} ${doctor.lastName}` : 'Doctor';
    const patientName = data.firstName
      ? `${data.firstName}${data.lastName ? ' ' + data.lastName : ''}`
      : 'Online Patient';

    // Notify staff about new online booking (fire-and-forget)
    this.sendNotification('booking.created', {
      recipients: [], // inApp goes to admin users via template
      variables: {
        patientName,
        doctorName,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        branchName: branch?.name?.en ?? 'Branch',
      },
      relatedEntity: { type: 'appointment' as const, id: appointment._id.toString() },
    });

    // Phase 11.4 — sign a 30-day self-service management token. The widget /
    // confirmation email surfaces it as a manage URL so the patient can
    // download .ics, reschedule, or cancel without an account.
    const { signBookingManageToken } = await import('../routes/booking/booking-manage.route.js');
    const manageToken = signBookingManageToken(appointment._id.toString(), this.tenantSlug);

    // If auto-confirmed, also notify the patient
    if (isAutoConfirm && (data.email || data.phone)) {
      this.sendNotification('booking.confirmed', {
        recipients: [
          {
            ...(data.email ? { email: data.email } : {}),
            ...(data.phone ? { phone: data.phone } : {}),
          },
        ],
        variables: {
          patientName,
          doctorName,
          date: data.date,
          startTime: data.startTime,
          endTime: data.endTime,
          branchName: branch?.name?.en ?? 'Branch',
          confirmationMessage: branch?.onlineBookingConfig?.confirmationMessage?.en ?? '',
          manageToken,
        },
        relatedEntity: { type: 'appointment' as const, id: appointment._id.toString() },
      });
    }

    return {
      bookingId: appointment._id,
      status: appointment.status,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      isAutoConfirmed: isAutoConfirm,
      manageToken,
      message: isAutoConfirm
        ? 'Booking confirmed automatically'
        : 'Booking received — awaiting confirmation',
    };
  }

  // ═══════════════════════════════════════════════════════════
  // ADMIN MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  /** List online bookings with filtering and pagination */
  async listBookings(query: {
    page: number;
    limit: number;
    status?: string;
    branchId?: string;
    doctorId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const { page, limit, ...filters } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IAppointment> = {
      'onlineBookingData.isOnlineBooking': true,
    };

    // The booking-widget status filter ('pending' | 'confirmed' | 'rejected' |
    // 'cancelled') is matched directly against the stored appointment status;
    // narrow it to the appointment status union for the typed query filter.
    if (filters.status) filter.status = filters.status as IAppointment['status'];
    if (filters.branchId) filter.branchId = filters.branchId;
    if (filters.doctorId) filter.doctorId = filters.doctorId;
    if (filters.dateFrom || filters.dateTo) {
      filter.date = {} as Record<string, unknown>;
      if (filters.dateFrom)
        (filter.date as Record<string, unknown>).$gte = new Date(filters.dateFrom);
      if (filters.dateTo) (filter.date as Record<string, unknown>).$lte = new Date(filters.dateTo);
    }

    const [bookings, total] = await Promise.all([
      this.Appointment.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      this.Appointment.countDocuments(filter),
    ]);

    return {
      bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Confirm, modify, or reject an online booking */
  async processBooking(
    id: string,
    data: {
      action: 'confirm' | 'confirm_with_changes' | 'reject';
      rejectionReason?: string;
      newDate?: string;
      newStartTime?: string;
      newEndTime?: string;
      newDoctorId?: string;
    },
    userId: string,
  ) {
    const appointment = await this.Appointment.findById(id);
    if (!appointment) throw ApiError.notFound('Booking');

    if (data.action === 'confirm') {
      appointment.status = 'confirmed';
      (appointment as unknown as Record<string, unknown>).onlineBookingData = {
        ...((appointment.toObject() as unknown as Record<string, unknown>)
          .onlineBookingData as Record<string, unknown>),
        isConfirmed: true,
        confirmedBy: userId,
        confirmedAt: new Date(),
      };
    } else if (data.action === 'confirm_with_changes') {
      if (data.newDate) appointment.date = new Date(data.newDate);
      if (data.newStartTime) appointment.startTime = data.newStartTime;
      if (data.newEndTime) appointment.endTime = data.newEndTime;
      if (data.newDoctorId)
        appointment.doctorId = data.newDoctorId as unknown as typeof appointment.doctorId;
      appointment.status = 'confirmed';
      (appointment as unknown as Record<string, unknown>).onlineBookingData = {
        ...((appointment.toObject() as unknown as Record<string, unknown>)
          .onlineBookingData as Record<string, unknown>),
        isConfirmed: true,
        confirmedBy: userId,
        confirmedAt: new Date(),
        hasChanges: true,
      };
    } else if (data.action === 'reject') {
      appointment.status = 'cancelled';
      appointment.cancellationReason = data.rejectionReason ?? 'Booking rejected';
    }

    appointment.updatedBy = userId as unknown as typeof appointment.updatedBy;
    await appointment.save();

    // Send notifications to patient (fire-and-forget)
    const bookingData = (appointment.toObject() as unknown as Record<string, unknown>)
      .onlineBookingData as Record<string, unknown> | undefined;
    const patientEmail = bookingData?.email as string | undefined;
    const patientPhone = bookingData?.phone as string | undefined;
    const patientFirstName = bookingData?.firstName as string | undefined;
    const patientLastName = bookingData?.lastName as string | undefined;
    const patientName = patientFirstName
      ? `${patientFirstName}${patientLastName ? ' ' + patientLastName : ''}`
      : 'Patient';

    if (patientEmail || patientPhone) {
      const recipient = {
        ...(patientEmail ? { email: patientEmail } : {}),
        ...(patientPhone ? { phone: patientPhone } : {}),
      };

      const doctor = await this.Doctor.findById(appointment.doctorId)
        .select('firstName lastName')
        .lean();
      const doctorName = doctor ? `${doctor.firstName} ${doctor.lastName}` : 'Doctor';
      const branch = await this.Branch.findById(appointment.branchId).select('name').lean();
      const branchName = branch?.name?.en ?? 'Branch';

      if (data.action === 'confirm') {
        this.sendNotification('booking.confirmed', {
          recipients: [recipient],
          variables: {
            patientName,
            doctorName,
            date: appointment.date.toISOString().split('T')[0],
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            branchName,
          },
          relatedEntity: { type: 'appointment' as const, id: appointment._id.toString() },
        });
      } else if (data.action === 'confirm_with_changes') {
        this.sendNotification('booking.confirmed_with_changes', {
          recipients: [recipient],
          variables: {
            patientName,
            doctorName,
            date: appointment.date.toISOString().split('T')[0],
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            branchName,
          },
          relatedEntity: { type: 'appointment' as const, id: appointment._id.toString() },
        });
      } else if (data.action === 'reject') {
        this.sendNotification('booking.rejected', {
          recipients: [recipient],
          variables: {
            patientName,
            doctorName,
            date: appointment.date.toISOString().split('T')[0],
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            branchName,
            rejectionReason: data.rejectionReason ?? 'No reason provided',
          },
          relatedEntity: { type: 'appointment' as const, id: appointment._id.toString() },
        });
      }
    }

    return {
      booking: appointment.toObject(),
      actionLabel: data.action === 'reject' ? 'rejected' : 'confirmed',
    };
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
          'Booking notification dispatch failed (non-fatal)',
        );
      });
  }
}
