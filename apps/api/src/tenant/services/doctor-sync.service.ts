import type { Connection } from 'mongoose';
import { User, type IUser } from '../../platform/models/index.js';
import { getDoctorModel, type IDoctor } from '../models/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Doctor-User Sync Service — §5.2 compliant class pattern
 *
 * Per MASTER_PLAN §13 - Doctor Management
 *
 * Bidirectional sync between:
 * - Platform User (auth, profile)
 * - Tenant Doctor (schedules, specialization)
 *
 * Synced fields:
 * - firstName, lastName, email, phone, gender, avatarUrl
 */

// Fields that sync from Doctor → User
const DOCTOR_TO_USER_FIELDS = ['phone', 'gender', 'avatarUrl'] as const;

export class DoctorSyncService {
  private Doctor;

  constructor(_connection: Connection) {
    this.Doctor = getDoctorModel(_connection);
  }

  // ── Create Doctor from User ─────────────────────────────────

  /**
   * Create Doctor record when a User with dentist role is created.
   * Called after user registration/creation.
   */
  async createDoctorFromUser(
    user: IUser,
    createdBy: string,
    options?: {
      specialization?: string;
      title?: string;
      licenseNumber?: string;
      branchIds?: string[];
    },
  ): Promise<IDoctor> {
    const doctor = await this.Doctor.create({
      userId: user._id.toString(),
      firstName: user.profile.firstName.en,
      lastName: user.profile.lastName.en,
      email: user.email,
      phone: user.profile.phone,
      // User.gender allows 'other'; the Doctor model only allows 'male' | 'female' (matches syncUserToDoctor).
      gender: user.profile.gender as 'male' | 'female' | undefined,
      avatarUrl: user.profile.avatarUrl,
      specialization: options?.specialization || 'General Dentist',
      title: options?.title || 'Dr.',
      licenseNumber: options?.licenseNumber,
      branches: options?.branchIds || [],
      isActive: true,
      createdBy,
    });

    logger.info({ userId: user._id, doctorId: doctor._id }, 'Doctor record created from User');

    return doctor;
  }

  // ── Sync User → Doctor ──────────────────────────────────────

  /**
   * Sync User changes to Doctor record.
   * Called when User profile is updated.
   */
  async syncUserToDoctor(user: IUser, updatedBy: string): Promise<IDoctor | null> {
    // Extract values from User for Doctor sync
    // Note: User names are multilingual {en, ar}, Doctor uses string
    const updateData: Partial<IDoctor> & { updatedBy: string } = {
      firstName: user.profile.firstName.en,
      lastName: user.profile.lastName.en,
      email: user.email,
      phone: user.profile.phone,
      gender: user.profile.gender as 'male' | 'female' | undefined,
      avatarUrl: user.profile.avatarUrl,
      updatedBy: updatedBy as any,
    };

    const doctor = await this.Doctor.findOneAndUpdate(
      { userId: user._id.toString() },
      { $set: updateData },
      { new: true },
    );

    if (doctor) {
      logger.info(
        { userId: user._id, doctorId: doctor._id },
        'Doctor record synced from User update',
      );
    }

    return doctor;
  }

  // ── Sync Doctor → User ──────────────────────────────────────

  /**
   * Sync Doctor changes to User record.
   * Called when Doctor profile (phone, gender, avatar) is updated in tenant portal.
   * §5.2 — userId param for audit trail (updatedBy).
   */
  async syncDoctorToUser(doctor: IDoctor, updatedBy: string): Promise<IUser | null> {
    const updateData: Record<string, unknown> = {};

    for (const field of DOCTOR_TO_USER_FIELDS) {
      if (doctor[field] !== undefined) {
        updateData[`profile.${field}`] = doctor[field];
      }
    }
    updateData.updatedBy = updatedBy;

    const user = await User.findByIdAndUpdate(doctor.userId, { $set: updateData }, { new: true });

    if (user) {
      logger.info(
        { userId: user._id, doctorId: doctor._id },
        'User record synced from Doctor update',
      );
    }

    return user;
  }

  // ── Deactivate Doctor ───────────────────────────────────────

  /**
   * Soft-delete Doctor record when User is deactivated/deleted.
   */
  async deactivateDoctor(userId: string, deactivatedBy: string): Promise<IDoctor | null> {
    const doctor = await this.Doctor.findOneAndUpdate(
      { userId },
      {
        $set: {
          isActive: false,
          terminatedAt: new Date(),
          updatedBy: deactivatedBy,
        },
      },
      { new: true },
    );

    if (doctor) {
      logger.info({ userId, doctorId: doctor._id }, 'Doctor record deactivated');
    }

    return doctor;
  }

  // ── Reactivate Doctor ───────────────────────────────────────

  /**
   * Reactivate Doctor record.
   */
  async reactivateDoctor(userId: string, reactivatedBy: string): Promise<IDoctor | null> {
    const doctor = await this.Doctor.findOneAndUpdate(
      { userId },
      {
        $set: {
          isActive: true,
          terminatedAt: undefined,
          updatedBy: reactivatedBy,
        },
      },
      { new: true },
    );

    if (doctor) {
      logger.info({ userId, doctorId: doctor._id }, 'Doctor record reactivated');
    }

    return doctor;
  }

  // ── Read Helpers ────────────────────────────────────────────

  /**
   * Get Doctor by User ID.
   */
  async getDoctorByUserId(userId: string): Promise<IDoctor | null> {
    return this.Doctor.findOne({ userId });
  }

  /**
   * Check if User has an associated Doctor record.
   */
  async hasDoctorRecord(userId: string): Promise<boolean> {
    return this.Doctor.exists({ userId }).then(Boolean);
  }
}
