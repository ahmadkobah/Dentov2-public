/**
 * Waitlist Model — Phase 6.1
 *
 * Patients who want a slot earlier than what was offered. When an appointment
 * is cancelled (or a new slot frees up), the waitlist is queried and the next
 * matching entry is auto-notified.
 *
 * One entry per patient + branch + doctor + window. The `status` machine:
 *   active → notified → booked     (success path)
 *   active → cancelled             (patient withdrew)
 *   active → expired               (preferredTo passed without a match)
 *   notified → expired             (notification window closed without booking)
 */

import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

export type WaitlistStatus = 'active' | 'notified' | 'booked' | 'cancelled' | 'expired';
export type WaitlistPriority = 'normal' | 'high' | 'urgent';

export interface IWaitlist extends Document {
  branchId: Types.ObjectId;
  patientId: Types.ObjectId;
  doctorId?: Types.ObjectId; // optional — empty means "any doctor"
  serviceId?: Types.ObjectId;

  // Slot preference window (inclusive)
  preferredFrom: Date;
  preferredTo: Date;
  preferredDaysOfWeek: number[]; // 0–6, empty = any day
  preferredTimeStart?: string; // HH:mm
  preferredTimeEnd?: string; // HH:mm

  durationMinutes: number;
  reason?: string;
  notes?: string;
  priority: WaitlistPriority;

  status: WaitlistStatus;
  notifiedAt?: Date;
  notificationCount: number;
  lastNotifiedSlot?: { date: Date; startTime: string; endTime: string };
  bookedAppointmentId?: Types.ObjectId;
  bookedAt?: Date;

  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

const waitlistSchema = new Schema<IWaitlist>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service' },

    preferredFrom: { type: Date, required: true },
    preferredTo: { type: Date, required: true },
    preferredDaysOfWeek: { type: [Number], default: [] },
    preferredTimeStart: { type: String },
    preferredTimeEnd: { type: String },

    durationMinutes: { type: Number, required: true, min: 5, max: 480 },
    reason: String,
    notes: String,
    priority: {
      type: String,
      enum: ['normal', 'high', 'urgent'],
      default: 'normal',
    },

    status: {
      type: String,
      enum: ['active', 'notified', 'booked', 'cancelled', 'expired'],
      default: 'active',
    },
    notifiedAt: Date,
    notificationCount: { type: Number, default: 0 },
    lastNotifiedSlot: {
      date: Date,
      startTime: String,
      endTime: String,
    },
    bookedAppointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    bookedAt: Date,

    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

waitlistSchema.index({ branchId: 1, status: 1, priority: 1, createdAt: 1 });
waitlistSchema.index({ patientId: 1, status: 1 });
waitlistSchema.index({ branchId: 1, doctorId: 1, status: 1, preferredFrom: 1 });

export function getWaitlistModel(connection: Connection): Model<IWaitlist> {
  return (connection.models.Waitlist ||
    connection.model('Waitlist', waitlistSchema)) as Model<IWaitlist>;
}

export type WaitlistModel = ReturnType<typeof getWaitlistModel>;
