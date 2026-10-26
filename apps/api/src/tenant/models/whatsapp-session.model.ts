/**
 * WhatsApp Bot Session Model
 *
 * Tracks the state of a WhatsApp booking conversation per phone number.
 * Sessions expire after 30 minutes of inactivity (TTL index).
 *
 * Per BUILD_RULES §5.1 — Tenant-scoped Mongoose model pattern
 */

import { Schema, type Connection, type Model, type Document } from 'mongoose';

// ── Bot Conversation Steps ──────────────────────────────────

export type BotStep =
  | 'greeting'
  | 'select_branch'
  | 'select_doctor'
  | 'select_date'
  | 'select_time'
  | 'collect_name'
  | 'collect_phone'
  | 'confirm'
  | 'completed'
  | 'cancelled';

// ── Session Interface ───────────────────────────────────────

export interface IWhatsAppSession extends Document {
  phone: string;
  step: BotStep;
  language: 'en' | 'ar';
  data: {
    branchId?: string;
    branchName?: string;
    doctorId?: string;
    doctorName?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    durationMinutes?: number;
    firstName?: string;
    lastName?: string;
    contactPhone?: string;
    // Cached lists for numbered selection
    branches?: Array<{ id: string; name: string }>;
    doctors?: Array<{ id: string; name: string }>;
    slots?: Array<{ startTime: string; endTime: string }>;
  };
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const whatsAppSessionSchema = new Schema<IWhatsAppSession>(
  {
    // Indexed below as a unique index — keep a single definition to avoid
    // Mongoose's "Duplicate schema index" warning.
    phone: { type: String, required: true },
    step: {
      type: String,
      required: true,
      enum: [
        'greeting',
        'select_branch',
        'select_doctor',
        'select_date',
        'select_time',
        'collect_name',
        'collect_phone',
        'confirm',
        'completed',
        'cancelled',
      ],
      default: 'greeting',
    },
    language: { type: String, enum: ['en', 'ar'], default: 'en' },
    data: { type: Schema.Types.Mixed, default: {} },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  {
    timestamps: true,
  },
);

// Unique session per phone number
whatsAppSessionSchema.index({ phone: 1 }, { unique: true });

// ── Model Factory ───────────────────────────────────────────

const modelCache = new Map<string, Model<IWhatsAppSession>>();

export function getWhatsAppSessionModel(connection: Connection): Model<IWhatsAppSession> {
  const key = connection.name;
  if (!modelCache.has(key)) {
    modelCache.set(
      key,
      connection.model<IWhatsAppSession>('WhatsAppSession', whatsAppSessionSchema),
    );
  }
  return modelCache.get(key)!;
}
