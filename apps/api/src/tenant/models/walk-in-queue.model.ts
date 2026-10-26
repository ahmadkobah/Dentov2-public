import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Walk-in Queue Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §6.4 — walk_in_queue collection
 * Per DENTO_V2_MASTER_PLAN.md §18 — Walk-in Queue & Daily Ops
 *
 * Day-based queue numbering (resets daily).
 * Replaces v1 walk_in_queue + queue_counters (2 tables → 1 collection).
 */

// ── Types ───────────────────────────────────────────────────

export interface IWalkInQueue extends Document {
  branchId: Types.ObjectId;
  queueNumber: number; // Day-based: 1, 2, 3...

  patientId?: Types.ObjectId; // null = unregistered walk-in
  patientName: string; // Always filled, even for registered patients
  phone?: string;

  reason?: string;
  priority: 'normal' | 'urgent' | 'emergency';

  status: 'waiting' | 'called' | 'in_progress' | 'completed' | 'no_show' | 'cancelled';
  assignedDoctorId?: Types.ObjectId;
  chairId?: string;

  // Timing
  checkedInAt: Date;
  calledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedWaitMinutes?: number;

  // Standard Fields
  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;

  createdAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const walkInQueueSchema = new Schema<IWalkInQueue>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    queueNumber: { type: Number, required: true },

    patientId: { type: Schema.Types.ObjectId, ref: 'Patient' },
    patientName: { type: String, required: true },
    phone: String,

    reason: String,
    priority: {
      type: String,
      enum: ['normal', 'urgent', 'emergency'],
      default: 'normal',
    },

    status: {
      type: String,
      enum: ['waiting', 'called', 'in_progress', 'completed', 'no_show', 'cancelled'],
      default: 'waiting',
    },
    assignedDoctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
    chairId: String,

    // Timing
    checkedInAt: { type: Date, required: true, default: Date.now },
    calledAt: Date,
    startedAt: Date,
    completedAt: Date,
    estimatedWaitMinutes: Number,

    // Standard Fields
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ─────────────────────────────────────────────────

walkInQueueSchema.index({ branchId: 1, status: 1, checkedInAt: 1 });
walkInQueueSchema.index({ branchId: 1, createdAt: -1 });

// ── Auto-generate queueNumber (daily reset) ─────────────────

walkInQueueSchema.pre('validate', async function () {
  if (this.isNew && !this.queueNumber) {
    const model = this.constructor as ReturnType<typeof getWalkInQueueModel>;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const lastEntry = await model
      .findOne(
        {
          branchId: this.branchId,
          createdAt: { $gte: today, $lt: tomorrow },
        },
        { queueNumber: 1 },
      )
      .sort({ queueNumber: -1 })
      .lean();

    this.queueNumber = (lastEntry?.queueNumber ?? 0) + 1;
  }
});

// ── Model Factory ───────────────────────────────────────────

export function getWalkInQueueModel(connection: Connection): Model<IWalkInQueue> {
  return (connection.models.WalkInQueue ||
    connection.model('WalkInQueue', walkInQueueSchema)) as Model<IWalkInQueue>;
}

export type WalkInQueueModel = ReturnType<typeof getWalkInQueueModel>;
