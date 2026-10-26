/**
 * Outgoing Referral Model — Phase 9.3
 *
 * Tracks patients referred out to external specialists (oral surgeon,
 * orthodontist, periodontist, ENT, etc.). One referral per patient per
 * specialist event. State machine:
 *   draft → sent → acknowledged → completed
 *   draft|sent|acknowledged → cancelled
 */

import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';
import { fieldEncryptionPlugin } from '../../utils/mongoose-field-encryption.plugin.js';

export type ReferralStatus = 'draft' | 'sent' | 'acknowledged' | 'completed' | 'cancelled';

export type ReferralUrgency = 'routine' | 'urgent' | 'emergency';

export interface IReferral extends Document {
  patientId: Types.ObjectId;
  branchId: Types.ObjectId;
  referringDoctorId: Types.ObjectId;
  appointmentId?: Types.ObjectId;
  treatmentPlanId?: Types.ObjectId;

  specialty: string; // e.g. 'oral_surgery', 'orthodontics', 'periodontics'
  specialistName?: string;
  specialistClinic?: string;
  specialistPhone?: string;
  specialistEmail?: string;

  reason: string;
  clinicalNotes?: string;
  attachmentUrls: string[]; // x-rays, lab reports etc.
  urgency: ReferralUrgency;

  status: ReferralStatus;
  sentAt?: Date;
  acknowledgedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;

  followUpAt?: Date;
  outcomeNotes?: string;

  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const referralSchema = new Schema<IReferral>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    referringDoctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    treatmentPlanId: { type: Schema.Types.ObjectId, ref: 'TreatmentPlan' },

    specialty: { type: String, required: true },
    specialistName: String,
    specialistClinic: String,
    specialistPhone: String,
    specialistEmail: String,

    reason: { type: String, required: true, minlength: 1, maxlength: 2000 },
    clinicalNotes: { type: String, maxlength: 5000 },
    attachmentUrls: { type: [String], default: [] },
    urgency: {
      type: String,
      enum: ['routine', 'urgent', 'emergency'],
      default: 'routine',
    },

    status: {
      type: String,
      enum: ['draft', 'sent', 'acknowledged', 'completed', 'cancelled'],
      default: 'draft',
    },
    sentAt: Date,
    acknowledgedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancelReason: String,

    followUpAt: Date,
    outcomeNotes: { type: String, maxlength: 5000 },

    createdBy: { type: Schema.Types.ObjectId, required: true },
    updatedBy: { type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

referralSchema.index({ patientId: 1, createdAt: -1 });
referralSchema.index({ branchId: 1, status: 1, createdAt: -1 });
referralSchema.index({ referringDoctorId: 1, status: 1 });
referralSchema.index({ status: 1, followUpAt: 1 });

// ── Field-Level Encryption (HIPAA/GDPR — C-1) ──────────────────
referralSchema.plugin(fieldEncryptionPlugin, {
  fields: ['reason', 'clinicalNotes', 'outcomeNotes'],
});

export function getReferralModel(connection: Connection): Model<IReferral> {
  return (connection.models.Referral ||
    connection.model('Referral', referralSchema)) as Model<IReferral>;
}

export type ReferralModel = ReturnType<typeof getReferralModel>;
