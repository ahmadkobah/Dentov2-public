/**
 * Settings Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §11.1 — Tenant-Konfiguration
 * Per V2_DECISION_LOG.md §9 — Security settings for 2FA
 *
 * Key-value pattern — each `key` maps to a typed `value` subdocument.
 * Keys: clinic, appointment, billing, notifications, security, inventory
 */

import { Schema, type Document, type Connection, type Model } from 'mongoose';

// ── Types ───────────────────────────────────────────────────

export type SettingsKey =
  | 'clinic'
  | 'appointment'
  | 'billing'
  | 'notifications'
  | 'security'
  | 'inventory'
  | 'providers'
  | 'bookingWidget'
  | 'whatsappBot';

export interface ISettings extends Document {
  key: SettingsKey;
  value: Record<string, unknown>;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SettingsModel = Model<ISettings>;

// ── Schema ──────────────────────────────────────────────────

const settingsSchema = new Schema<ISettings>(
  {
    key: {
      type: String,
      required: true,
      enum: [
        'clinic',
        'appointment',
        'billing',
        'notifications',
        'security',
        'inventory',
        'providers',
        'bookingWidget',
        'whatsappBot',
      ],
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'settings',
  },
);

// ── Indexes ─────────────────────────────────────────────────

settingsSchema.index({ key: 1 }, { unique: true });

// ── Default Values ──────────────────────────────────────────

export const DEFAULT_SETTINGS: Record<SettingsKey, Record<string, unknown>> = {
  clinic: {
    name: { en: 'My Dental Clinic', ar: '' },
    phone: '',
    email: '',
    website: null,
    logo: null,
    address: { en: '', ar: '' },
    timezone: 'Africa/Cairo',
    defaultLanguage: 'en',
    supportedLanguages: ['en'],
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    currency: 'EGP',
    taxEnabled: false,
    taxPercentage: null,
    fiscalYearStart: 1,
  },
  appointment: {
    slotDuration: 30,
    bufferTime: 0,
    maxAdvanceBookingDays: 90,
    minCancellationHours: 24,
    autoConfirm: false,
    walkInEnabled: true,
    onlineBookingEnabled: false,
    reminderHoursBefore: [24, 2],
    autoNoShowMinutes: 30,
    workingDays: [0, 1, 2, 3, 4],
    workingHoursStart: '09:00',
    workingHoursEnd: '17:00',
    ramadanScheduleActive: false,
    ramadanStart: '',
    ramadanEnd: '',
  },
  billing: {
    invoicePrefix: 'INV',
    invoiceStartNumber: 1,
    paymentMethods: ['cash'],
    defaultPaymentTermDays: 0,
    enableInstallments: false,
    enableInsurance: false,
    enableCommissions: false,
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: false,
    whatsappEnabled: false,
    pushEnabled: true,
    quietHoursStart: '',
    quietHoursEnd: '',
    defaultLanguage: 'en',
  },
  security: {
    require2FA: false,
    require2FAForRoles: [],
    allow2FAMethods: ['totp'],
    sessionTimeoutMinutes: 60,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
  },
  inventory: {
    lowStockThreshold: 10,
    expiryAlertDays: 30,
    autoReorderEnabled: false,
  },
  providers: {
    email: { useCustom: false },
    sms: { useCustom: false },
    whatsapp: { useCustom: false },
    push: { useCustom: false },
  },
  bookingWidget: {
    primaryColor: '#16a085',
    buttonPosition: 'bottom-right',
    language: 'en',
    buttonText: 'Book Now',
    showBranding: true,
  },
  whatsappBot: {
    isEnabled: false,
    provider: 'twilio',
    defaultLanguage: 'en',
    welcomeMessage: '',
    sessionTimeoutMinutes: 30,
  },
};

// ── WeakMap Cache ───────────────────────────────────────────

const cache = new WeakMap<Connection, SettingsModel>();

export function getSettingsModel(conn: Connection): SettingsModel {
  if (cache.has(conn)) return cache.get(conn)!;
  const model = conn.model<ISettings>('Settings', settingsSchema);
  cache.set(conn, model);
  return model;
}
