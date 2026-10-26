import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Branch Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §11.4 — branches collection
 * Per DENTO_V2_MASTER_PLAN.md §13 — Multi-Branch Support
 *
 * Embeds: chairs[], workingHours[]
 * v1 equivalent: branches + chairs (2 tables → 1 collection)
 */

// ── Embedded Types ──────────────────────────────────────────

export interface IChair {
  number: number;
  name?: string;
  isActive: boolean;
  equipmentType?: 'standard' | 'surgical' | 'pediatric';
}

export interface IWorkingHours {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  openTime: string; // HH:mm
  closeTime: string; // HH:mm
  isClosed: boolean;
}

export interface ICoordinates {
  lat: number;
  lng: number;
}

export interface IBranchHoliday {
  date: string; // YYYY-MM-DD
  name: { en: string; ar?: string };
}

export interface ISlotConfig {
  defaultDuration: number; // minutes
  minDuration: number;
  maxDuration: number;
  bufferBetween: number; // minutes between appointments
  bookingLeadTime: number; // min minutes before appointment
  bookingWindowDays: number; // max days ahead
}

export interface IOnlineBookingConfig {
  isEnabled: boolean;
  isAutoConfirm: boolean;
  autoConfirmLeadTimeHours: number;
  isPatientPhoneRequired: boolean;
  isPatientEmailRequired: boolean;
  isDoctorSelectionAllowed: boolean;
  enabledServices: string[]; // ObjectId strings — empty = all
  confirmationMessage: { en: string; ar?: string };
}

/**
 * Phase 3.5 — Late-cancel / no-show fee policy.
 * When `enabled`, cancelling within `windowHours` of the appointment
 * (cancelSource = 'patient') OR marking as no-show (when `applyOnNoShow`)
 * triggers an auto-generated draft invoice line.
 */
export interface ICancellationFeePolicy {
  enabled: boolean;
  windowHours: number;
  amount: number;
  applyOnNoShow: boolean;
}

// ── Main Interface ──────────────────────────────────────────

export interface IBranch extends Document {
  name: { en: string; ar?: string };
  code: string;
  address: { en: string; ar?: string };
  city?: string;
  phone?: string;
  email?: string;

  chairs: IChair[];
  workingHours: IWorkingHours[];

  // Ramadan hours (§22)
  ramadanHours: IWorkingHours[];
  isRamadanMode: boolean;

  // Holidays (§22)
  holidays: IBranchHoliday[];

  // Slot configuration (§22)
  slotConfig: ISlotConfig;

  // Online booking (§22)
  onlineBookingConfig: IOnlineBookingConfig;

  // Phase 3.5 — Late-cancel / no-show fee policy
  cancellationFeePolicy: ICancellationFeePolicy;

  // Phase 5.5/5.8 — Walk-in queue settings
  avgConsultationTime: number; // minutes; used to estimate queue wait
  walkInTimeoutMinutes: number; // auto-mark as no-show after waiting this long

  coordinates?: ICoordinates;
  isPrimary: boolean;
  isActive: boolean;

  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

// ── Embedded Schemas ────────────────────────────────────────

const chairSchema = new Schema<IChair>(
  {
    number: { type: Number, required: true },
    name: String,
    isActive: { type: Boolean, default: true },
    equipmentType: {
      type: String,
      enum: ['standard', 'surgical', 'pediatric'],
      default: 'standard',
    },
  },
  { _id: true },
);

const workingHoursSchema = new Schema<IWorkingHours>(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    openTime: { type: String, required: true },
    closeTime: { type: String, required: true },
    isClosed: { type: Boolean, default: false },
  },
  { _id: false },
);

const coordinatesSchema = new Schema<ICoordinates>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false },
);

const branchHolidaySchema = new Schema<IBranchHoliday>(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    name: {
      type: new Schema(
        { en: { type: String, required: true }, ar: { type: String, default: '' } },
        { _id: false },
      ),
      required: true,
    },
  },
  { _id: true },
);

const slotConfigSchema = new Schema<ISlotConfig>(
  {
    defaultDuration: { type: Number, default: 30, min: 5 },
    minDuration: { type: Number, default: 15, min: 5 },
    maxDuration: { type: Number, default: 180 },
    bufferBetween: { type: Number, default: 0, min: 0 },
    bookingLeadTime: { type: Number, default: 60, min: 0 },
    bookingWindowDays: { type: Number, default: 60, min: 1 },
  },
  { _id: false },
);

const onlineBookingConfigSchema = new Schema<IOnlineBookingConfig>(
  {
    isEnabled: { type: Boolean, default: false },
    isAutoConfirm: { type: Boolean, default: false },
    autoConfirmLeadTimeHours: { type: Number, default: 24 },
    isPatientPhoneRequired: { type: Boolean, default: true },
    isPatientEmailRequired: { type: Boolean, default: false },
    isDoctorSelectionAllowed: { type: Boolean, default: true },
    enabledServices: { type: [String], default: [] },
    confirmationMessage: {
      type: new Schema(
        { en: { type: String, default: '' }, ar: { type: String, default: '' } },
        { _id: false },
      ),
      default: { en: '', ar: '' },
    },
  },
  { _id: false },
);

const cancellationFeePolicySchema = new Schema<ICancellationFeePolicy>(
  {
    enabled: { type: Boolean, default: false },
    windowHours: { type: Number, default: 24, min: 0 },
    amount: { type: Number, default: 0, min: 0 },
    applyOnNoShow: { type: Boolean, default: true },
  },
  { _id: false },
);

const bilingualSchema = new Schema(
  {
    en: { type: String, required: true },
    ar: { type: String, default: '' },
  },
  { _id: false },
);
const bilingualOptionalSchema = new Schema(
  {
    en: { type: String, default: '' },
    ar: { type: String, default: '' },
  },
  { _id: false },
);
// ── Branch Schema ───────────────────────────────────────────

const branchSchema = new Schema<IBranch>(
  {
    name: { type: bilingualSchema, required: true },
    code: { type: String, required: true },
    address: { type: bilingualOptionalSchema, default: () => ({ en: '', ar: '' }) },
    city: String,
    phone: String,
    email: String,

    chairs: { type: [chairSchema], default: [] },
    workingHours: { type: [workingHoursSchema], default: [] },

    // Ramadan support (§22)
    ramadanHours: { type: [workingHoursSchema], default: [] },
    isRamadanMode: { type: Boolean, default: false },

    // Holidays (§22)
    holidays: { type: [branchHolidaySchema], default: [] },

    // Slot configuration (§22)
    slotConfig: { type: slotConfigSchema, default: () => ({}) },

    // Online booking (§22)
    onlineBookingConfig: { type: onlineBookingConfigSchema, default: () => ({}) },

    // Phase 3.5 — Late-cancel / no-show fee policy
    cancellationFeePolicy: { type: cancellationFeePolicySchema, default: () => ({}) },

    // Phase 5.5/5.8 — Walk-in queue settings
    avgConsultationTime: { type: Number, default: 30, min: 5, max: 240 },
    walkInTimeoutMinutes: { type: Number, default: 120, min: 15, max: 720 },

    coordinates: { type: coordinatesSchema },
    isPrimary: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ─────────────────────────────────────────────────

branchSchema.index({ code: 1 }, { unique: true });
branchSchema.index({ isActive: 1 });

// ── Model Factory ───────────────────────────────────────────

/**
 * Get Branch model for a specific tenant database connection.
 * Usage: const Branch = getBranchModel(tenantDb);
 */
export function getBranchModel(connection: Connection): Model<IBranch> {
  return (connection.models.Branch || connection.model('Branch', branchSchema)) as Model<IBranch>;
}

export type BranchModel = ReturnType<typeof getBranchModel>;
