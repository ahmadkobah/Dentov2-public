import type { Connection } from 'mongoose';
import { getBranchModel, type IBranch } from '../models/branch.model.js';
import { getDoctorScheduleModel } from '../models/doctor-schedule.model.js';
import { getScheduleExceptionModel } from '../models/schedule-exception.model.js';
import { getAppointmentModel, type IAppointment } from '../models/appointment.model.js';
import { ApiError } from '../../utils/api-response.js';
import type { QueryFilter } from 'mongoose';

/**
 * Slot Engine Service — 8-step slot generation algorithm
 *
 * Per IMPLEMENTATION_ROADMAP.md §Phase 3, Week 9:
 * Step 1: Branch check — Is branch active & open on requested date?
 * Step 2: Holiday check — Is this date a branch holiday?
 * Step 3: Doctor schedule — Find recurring/override schedule for date
 * Step 4: Exception check — Is doctor blocked by approved exception?
 * Step 5: Special hours — Narrow window if exception type = special_hours
 * Step 6: Compute window — Combine branch hours + doctor schedule → effective window
 * Step 7: Load appointments — Get existing bookings for doctor+date
 * Step 8: Generate slots — Walk the window in slotDuration increments, skip conflicts
 *
 * Also validates:
 *  - Booking lead time (min minutes before appointment)
 *  - Booking window (max days ahead)
 *
 * Per BUILD_RULES §5.2 — Service layer pattern (constructor receives Connection)
 */

export interface ISlot {
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isAvailable: boolean;
}

export interface ISlotEngineResult {
  date: string;
  branchId: string;
  doctorId: string;
  slots: ISlot[];
  meta: {
    branchName: string;
    effectiveStart: string;
    effectiveEnd: string;
    slotDuration: number;
    bufferBetween: number;
    totalSlots: number;
    availableSlots: number;
  };
}

export class SlotEngineService {
  private Branch;
  private DoctorSchedule;
  private ScheduleException;
  private Appointment;

  constructor(tenantDb: Connection) {
    this.Branch = getBranchModel(tenantDb);
    this.DoctorSchedule = getDoctorScheduleModel(tenantDb);
    this.ScheduleException = getScheduleExceptionModel(tenantDb);
    this.Appointment = getAppointmentModel(tenantDb);
  }

  /**
   * Generate available slots for a doctor at a branch on a specific date.
   *
   * @param branchId        - Branch ID
   * @param doctorId        - Doctor ID
   * @param date            - Date string (YYYY-MM-DD)
   * @param durationMinutes - Requested slot duration (defaults to branch config)
   * @param isPublicBooking - If true, enforce bookingLeadTime + bookingWindowDays
   */
  async generateSlots(
    branchId: string,
    doctorId: string,
    date: string,
    durationMinutes?: number,
    isPublicBooking = false,
  ): Promise<ISlotEngineResult> {
    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.getDay();

    // ── Step 1: Branch check ──────────────────────────────────

    const branch = (await this.Branch.findById(branchId).lean()) as IBranch | null;
    if (!branch) throw ApiError.notFound('Branch');
    if (!branch.isActive) throw ApiError.badRequest('Branch is not active');

    // ── Step 1b: Booking window + lead time (public only) ─────

    if (isPublicBooking) {
      this.validateBookingWindow(branch, date);
    }

    // ── Step 2: Holiday check ─────────────────────────────────

    this.checkBranchHoliday(branch, date);

    // ── Branch working hours ──────────────────────────────────

    const branchHours = this.getBranchHours(branch, dayOfWeek);
    if (!branchHours) {
      return this.emptyResult(date, branchId, doctorId, branch.name.en);
    }

    // ── Step 3: Doctor schedule ───────────────────────────────

    const doctorSchedule = await this.findDoctorSchedule(
      doctorId,
      branchId,
      date,
      dayOfWeek,
      branch.isRamadanMode,
    );

    if (!doctorSchedule || !doctorSchedule.isAvailable) {
      return this.emptyResult(date, branchId, doctorId, branch.name.en);
    }

    // ── Step 4: Exception check ───────────────────────────────

    const exception = await this.checkDoctorException(doctorId, date, branchId);

    if (exception && exception.isFullDay) {
      return this.emptyResult(date, branchId, doctorId, branch.name.en);
    }

    // ── Step 5: Special hours (narrow window) ─────────────────

    let effectiveStart = this.maxTime(branchHours.openTime, doctorSchedule.startTime);
    let effectiveEnd = this.minTime(branchHours.closeTime, doctorSchedule.endTime);

    if (exception && exception.exceptionType === 'special_hours') {
      if (exception.specialStartTime && exception.specialEndTime) {
        effectiveStart = this.maxTime(effectiveStart, exception.specialStartTime);
        effectiveEnd = this.minTime(effectiveEnd, exception.specialEndTime);
      }
    }

    // ── Step 6: Compute final window ──────────────────────────

    const slotDuration =
      durationMinutes ?? doctorSchedule.slotDuration ?? branch.slotConfig?.defaultDuration ?? 30;
    const bufferBetween = branch.slotConfig?.bufferBetween ?? 0;

    if (this.timeToMinutes(effectiveStart) >= this.timeToMinutes(effectiveEnd)) {
      return this.emptyResult(date, branchId, doctorId, branch.name.en);
    }

    // ── Step 7: Load existing appointments ────────────────────

    const appointments = await this.loadAppointments(doctorId, date);

    // ── Step 8: Generate slots ────────────────────────────────

    const slots = this.buildSlots(
      effectiveStart,
      effectiveEnd,
      slotDuration,
      bufferBetween,
      appointments,
      doctorSchedule.breakStart ?? undefined,
      doctorSchedule.breakEnd ?? undefined,
      isPublicBooking ? (branch.slotConfig?.bookingLeadTime ?? 0) : 0,
      date,
    );

    const availableSlots = slots.filter((s) => s.isAvailable).length;

    return {
      date,
      branchId,
      doctorId,
      slots,
      meta: {
        branchName: branch.name.en,
        effectiveStart,
        effectiveEnd,
        slotDuration,
        bufferBetween,
        totalSlots: slots.length,
        availableSlots,
      },
    };
  }

  // ── Private Helpers ───────────────────────────────────────

  private validateBookingWindow(branch: IBranch, date: string): void {
    const config = branch.slotConfig;
    if (!config) return;

    const now = new Date();
    const appointmentDate = new Date(date);

    // Booking window: max N days ahead
    if (config.bookingWindowDays) {
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + config.bookingWindowDays);
      if (appointmentDate > maxDate) {
        throw ApiError.badRequest(
          `Cannot book more than ${config.bookingWindowDays} days in advance`,
        );
      }
    }

    // Lead time: appointment must be at least N minutes from now
    if (config.bookingLeadTime) {
      // If appointment is today and we're past the lead time window
      if (appointmentDate.toDateString() === now.toDateString()) {
        // Will be further validated at slot level
      } else if (appointmentDate < now) {
        throw ApiError.badRequest('Cannot book appointments in the past');
      }
    }
  }

  private checkBranchHoliday(branch: IBranch, date: string): void {
    if (!branch.holidays || branch.holidays.length === 0) return;

    const holiday = branch.holidays.find((h) => h.date === date);
    if (holiday) {
      const name = holiday.name.en || 'Holiday';
      throw ApiError.badRequest(`Branch is closed on ${date} (${name})`);
    }
  }

  private getBranchHours(
    branch: IBranch,
    dayOfWeek: number,
  ): { openTime: string; closeTime: string } | null {
    const hours =
      branch.isRamadanMode && branch.ramadanHours.length > 0
        ? branch.ramadanHours
        : branch.workingHours;

    const dayHours = hours.find((h) => h.dayOfWeek === dayOfWeek);
    if (!dayHours || dayHours.isClosed) return null;

    return { openTime: dayHours.openTime, closeTime: dayHours.closeTime };
  }

  /**
   * Step 3: Find the effective doctor schedule.
   * Override schedule for specific date takes priority over recurring.
   */
  private async findDoctorSchedule(
    doctorId: string,
    branchId: string,
    date: string,
    dayOfWeek: number,
    isRamadanMode: boolean,
  ) {
    // First check for override schedule for this specific date
    const override = await this.DoctorSchedule.findOne({
      doctorId,
      branchId,
      scheduleType: 'override',
      specificDate: date,
      isActive: true,
    }).lean();

    if (override) return override;

    // Fall back to recurring schedule for this day of week
    const ramadanFilter = isRamadanMode ? { isRamadanSchedule: true } : {};

    const recurring = await this.DoctorSchedule.findOne({
      doctorId,
      branchId,
      scheduleType: 'recurring',
      dayOfWeek,
      isActive: true,
      ...ramadanFilter,
    }).lean();

    // If Ramadan mode but no Ramadan schedule, fall back to regular
    if (!recurring && isRamadanMode) {
      return this.DoctorSchedule.findOne({
        doctorId,
        branchId,
        scheduleType: 'recurring',
        dayOfWeek,
        isActive: true,
        isRamadanSchedule: false,
      }).lean();
    }

    return recurring;
  }

  /**
   * Step 4: Check if an approved exception covers this date.
   */
  private async checkDoctorException(doctorId: string, date: string, branchId: string) {
    return this.ScheduleException.findOne({
      doctorId,
      status: 'approved',
      isActive: true,
      startDate: { $lte: date },
      endDate: { $gte: date },
      $or: [
        { branchId: null }, // All branches
        { branchId }, // This specific branch
      ],
    }).lean();
  }

  /**
   * Step 7: Load all non-cancelled appointments for doctor on date.
   */
  private async loadAppointments(doctorId: string, date: string) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const filter: QueryFilter<IAppointment> = {
      doctorId,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $nin: ['cancelled', 'no_show', 'rescheduled'] },
    };

    return this.Appointment.find(filter).select('startTime endTime').lean();
  }

  /**
   * Step 8: Generate slot array by walking the time window.
   */
  private buildSlots(
    effectiveStart: string,
    effectiveEnd: string,
    slotDuration: number,
    bufferBetween: number,
    appointments: Array<{ startTime: string; endTime: string }>,
    breakStart?: string,
    breakEnd?: string,
    bookingLeadTime?: number,
    date?: string,
  ): ISlot[] {
    const slots: ISlot[] = [];
    let currentMinutes = this.timeToMinutes(effectiveStart);
    const endMinutes = this.timeToMinutes(effectiveEnd);

    // Lead time: compute the minimum slot start time for today
    let minStartMinutes = 0;
    if (bookingLeadTime && date) {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      if (date === today) {
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        minStartMinutes = nowMinutes + bookingLeadTime;
      }
    }

    while (currentMinutes + slotDuration <= endMinutes) {
      const slotStart = this.minutesToTime(currentMinutes);
      const slotEnd = this.minutesToTime(currentMinutes + slotDuration);

      // Check if slot overlaps with break
      const isDuringBreak =
        breakStart &&
        breakEnd &&
        currentMinutes < this.timeToMinutes(breakEnd) &&
        currentMinutes + slotDuration > this.timeToMinutes(breakStart);

      // Check if slot overlaps with existing appointment
      const hasConflict = appointments.some((apt) => {
        return slotStart < apt.endTime && slotEnd > apt.startTime;
      });

      // Check lead time
      const isTooSoon = currentMinutes < minStartMinutes;

      const isAvailable = !isDuringBreak && !hasConflict && !isTooSoon;

      slots.push({ startTime: slotStart, endTime: slotEnd, isAvailable });

      currentMinutes += slotDuration + bufferBetween;
    }

    return slots;
  }

  // ── Time Utilities ────────────────────────────────────────

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60)
      .toString()
      .padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  private maxTime(a: string, b: string): string {
    return this.timeToMinutes(a) >= this.timeToMinutes(b) ? a : b;
  }

  private minTime(a: string, b: string): string {
    return this.timeToMinutes(a) <= this.timeToMinutes(b) ? a : b;
  }

  private emptyResult(
    date: string,
    branchId: string,
    doctorId: string,
    branchName: string,
  ): ISlotEngineResult {
    return {
      date,
      branchId,
      doctorId,
      slots: [],
      meta: {
        branchName,
        effectiveStart: '',
        effectiveEnd: '',
        slotDuration: 0,
        bufferBetween: 0,
        totalSlots: 0,
        availableSlots: 0,
      },
    };
  }
}
