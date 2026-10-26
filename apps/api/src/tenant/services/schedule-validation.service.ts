import type { Connection } from 'mongoose';
import { getBranchModel } from '../models/branch.model.js';
import { getDoctorModel } from '../models/doctor.model.js';
import { getDoctorScheduleModel } from '../models/doctor-schedule.model.js';
import { getScheduleExceptionModel } from '../models/schedule-exception.model.js';
import { getAppointmentModel, type IAppointment } from '../models/appointment.model.js';
import { ApiError } from '../../utils/api-response.js';
import type { QueryFilter } from 'mongoose';

/**
 * Schedule Validation Service — 3-tier appointment validation
 *
 * Per IMPLEMENTATION_ROADMAP.md §Phase 3, Week 8:
 * Level 1: Branch Working Hours — Is the branch open?
 * Level 2: Doctor Schedule — Is the doctor working at this branch/time?
 * Level 3: Conflict Detection — Is the doctor already booked?
 *
 * Per BUILD_RULES §5.2 — Service layer pattern (constructor receives Connection)
 */

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export class ScheduleValidationService {
  private Branch;
  private Doctor;
  private DoctorSchedule;
  private ScheduleException;
  private Appointment;

  constructor(tenantDb: Connection) {
    this.Branch = getBranchModel(tenantDb);
    this.Doctor = getDoctorModel(tenantDb);
    this.DoctorSchedule = getDoctorScheduleModel(tenantDb);
    this.ScheduleException = getScheduleExceptionModel(tenantDb);
    this.Appointment = getAppointmentModel(tenantDb);
  }

  /**
   * Full 3-tier schedule validation.
   * Throws ApiError with a descriptive message if any level fails.
   *
   * @param branchId   - The branch where the appointment takes place
   * @param doctorId   - The doctor performing the appointment
   * @param date       - Appointment date (YYYY-MM-DD string)
   * @param startTime  - Start time (HH:mm)
   * @param endTime    - End time (HH:mm)
   * @param excludeId  - Appointment ID to exclude (for updates/reschedules)
   */
  async validate(
    branchId: string,
    doctorId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<void> {
    // Run Level 1 and Level 2 in parallel (independent checks)
    await Promise.all([
      this.validateBranchHours(branchId, date, startTime, endTime),
      this.validateDoctorSchedule(doctorId, date, startTime, endTime),
    ]);

    // Level 3 depends on the above passing first
    await this.checkDoctorConflict(doctorId, date, startTime, endTime, excludeId);
  }

  // ── Level 1: Branch Working Hours ─────────────────────────

  /**
   * Validates that the branch is open during the requested appointment time.
   * Supports Ramadan mode (alternate working hours).
   * Also checks branch holidays.
   */
  async validateBranchHours(
    branchId: string,
    date: string,
    startTime: string,
    endTime: string,
  ): Promise<void> {
    const branch = await this.Branch.findById(branchId).lean();
    if (!branch) {
      throw ApiError.notFound('Branch');
    }

    if (!branch.isActive) {
      throw ApiError.badRequest('Branch is not active');
    }

    // Holiday check (Week 9)
    if (branch.holidays && branch.holidays.length > 0) {
      const holiday = branch.holidays.find((h) => h.date === date);
      if (holiday) {
        const name = holiday.name?.en || 'Holiday';
        throw ApiError.badRequest(`Branch is closed on ${date} (${name})`);
      }
    }

    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.getDay();
    const dayName = DAY_NAMES[dayOfWeek];

    // Pick Ramadan hours if enabled, otherwise normal hours
    const hours =
      branch.isRamadanMode && branch.ramadanHours.length > 0
        ? branch.ramadanHours
        : branch.workingHours;

    const dayHours = hours.find((h) => h.dayOfWeek === dayOfWeek);

    if (!dayHours || dayHours.isClosed) {
      throw ApiError.badRequest(`Branch "${branch.name.en}" is closed on ${dayName}`);
    }

    // Validate appointment falls within branch operating hours
    if (startTime < dayHours.openTime || endTime > dayHours.closeTime) {
      throw ApiError.badRequest(
        `Appointment time (${startTime}–${endTime}) is outside branch hours (${dayHours.openTime}–${dayHours.closeTime}) on ${dayName}`,
      );
    }
  }

  // ── Level 2: Doctor Schedule ──────────────────────────────

  /**
   * Validates that the doctor has a schedule entry for the given day/time.
   * Uses standalone DoctorSchedule collection (Week 9) with fallback to embedded schedules.
   * Also checks ScheduleException collection for approved blocks.
   */
  async validateDoctorSchedule(
    doctorId: string,
    date: string,
    startTime: string,
    endTime: string,
  ): Promise<void> {
    const doctor = await this.Doctor.findById(doctorId).lean();
    if (!doctor) {
      throw ApiError.notFound('Doctor');
    }

    if (!doctor.isActive) {
      throw ApiError.badRequest('Doctor is not active');
    }

    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.getDay();
    const dayName = DAY_NAMES[dayOfWeek];

    // Try standalone DoctorSchedule first (Week 9), then fallback to embedded
    const overrideSchedule = await this.DoctorSchedule.findOne({
      doctorId,
      scheduleType: 'override',
      specificDate: date,
      isActive: true,
    }).lean();

    const standaloneSchedule =
      overrideSchedule ??
      (await this.DoctorSchedule.findOne({
        doctorId,
        scheduleType: 'recurring',
        dayOfWeek,
        isActive: true,
      }).lean());

    // Fallback to embedded schedules for backward compatibility
    const embeddedSchedule = doctor.schedules?.find((s) => s.dayOfWeek === dayOfWeek && s.isActive);

    const schedule = standaloneSchedule ?? embeddedSchedule;

    if (!schedule) {
      throw ApiError.badRequest(
        `Doctor ${doctor.firstName} ${doctor.lastName} is not scheduled to work on ${dayName}`,
      );
    }

    // Verify appointment time falls within doctor's working hours
    if (startTime < schedule.startTime || endTime > schedule.endTime) {
      throw ApiError.badRequest(
        `Appointment time (${startTime}–${endTime}) is outside doctor's working hours (${schedule.startTime}–${schedule.endTime}) on ${dayName}`,
      );
    }

    // Check standalone ScheduleException collection (Week 9)
    const standaloneException = await this.ScheduleException.findOne({
      doctorId,
      status: 'approved',
      isActive: true,
      startDate: { $lte: date },
      endDate: { $gte: date },
    }).lean();

    if (standaloneException) {
      if (standaloneException.isFullDay) {
        const reason = standaloneException.reason ? `: ${standaloneException.reason}` : '';
        throw ApiError.badRequest(
          `Doctor is unavailable on this date (${standaloneException.exceptionType}${reason})`,
        );
      }
      // Partial-day: check if appointment overlaps the special hours
      if (
        standaloneException.exceptionType !== 'special_hours' &&
        standaloneException.specialStartTime &&
        standaloneException.specialEndTime
      ) {
        if (
          startTime < standaloneException.specialEndTime &&
          endTime > standaloneException.specialStartTime
        ) {
          throw ApiError.badRequest(
            `Doctor is partially unavailable (${standaloneException.specialStartTime}–${standaloneException.specialEndTime})`,
          );
        }
      }
      return; // No conflict with standalone exception
    }

    // Fallback: check embedded exceptions (backward compatibility)
    if (doctor.exceptions && doctor.exceptions.length > 0) {
      const embeddedException = doctor.exceptions.find((e) => {
        const exDate = new Date(e.date);
        if (exDate.toDateString() !== appointmentDate.toDateString()) return false;
        if (e.isFullDay) return true;
        if (e.startTime && e.endTime) {
          return startTime < e.endTime && endTime > e.startTime;
        }
        return false;
      });

      if (embeddedException) {
        const reason = embeddedException.reason ? `: ${embeddedException.reason}` : '';
        throw ApiError.badRequest(
          `Doctor is unavailable on this date (${embeddedException.type}${reason})`,
        );
      }
    }
  }

  // ── Level 3: Conflict Detection ───────────────────────────

  /**
   * Checks if the doctor already has a non-cancelled appointment
   * that overlaps with the requested time slot.
   */
  async checkDoctorConflict(
    doctorId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<void> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const filter: QueryFilter<IAppointment> = {
      doctorId,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $nin: ['cancelled', 'no_show', 'rescheduled'] },
      // Overlap detection: new start < existing end AND new end > existing start
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    };

    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    const conflict = await this.Appointment.findOne(filter).select('startTime endTime').lean();

    if (conflict) {
      throw ApiError.conflict(
        `Doctor has a conflicting appointment at ${conflict.startTime}–${conflict.endTime} on this date`,
      );
    }
  }
}
