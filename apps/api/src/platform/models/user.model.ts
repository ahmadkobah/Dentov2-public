import mongoose, { Schema, type Document } from 'mongoose';

/**
 * User Model — Platform Database (dento_platform)
 *
 * This is the central user table for auth across all tenants.
 * Users are linked to specific tenants via tenantSlug.
 */

// ── Types ───────────────────────────────────────────────────

export interface IUserProfile {
  firstName: { en: string; ar?: string };
  lastName: { en: string; ar?: string };
  displayName?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  bio?: { en?: string; ar?: string };
  avatarUrl?: string;
  languagePreference?: string;
}

export interface IUser extends Document {
  email: string;
  password: string;
  role:
    | 'platform_admin'
    | 'tenant_admin'
    | 'dentist'
    | 'receptionist'
    | 'assistant'
    | 'accountant'
    | 'lab_tech'
    | 'hygienist';
  tenantSlug: string | null; // null for platform_admin

  profile: IUserProfile;
  status: 'invited' | 'pending_activation' | 'active' | 'suspended' | 'deactivated' | 'locked';
  isProfileComplete: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;

  // M-7: Permanent lockout — counts ALL-TIME failed logins (never resets on
  // window expiry). Cleared only on successful login or admin unlock.
  failedLoginCount: number;
  lockedAt: Date | null;
  lockedReason: string | null;

  // Password management
  tokenVersion: number; // Incremented on password change / logout-all
  lastPasswordChangedAt: Date | null;
  passwordHistory: string[]; // Last 5 password hashes

  // Activation
  activationToken: string | null;
  activationTokenExpiresAt: Date | null;
  activatedAt: Date | null;

  // Password Reset
  resetToken: string | null;
  resetTokenExpiresAt: Date | null;

  // Tracking
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  createdBy: mongoose.Types.ObjectId | null;
  isActive: boolean;
  updatedBy: mongoose.Types.ObjectId | null;

  // 2FA / TOTP (Week 13)
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  twoFactorPendingSecret: string | null;
  twoFactorRecoveryCodes: string[];
  // Anti-replay: the last accepted TOTP time-step. A code is rejected if its
  // computed step is <= this value, so a code cannot be reused within its
  // validity window (#68).
  lastTotpStep: number | null;

  // Platform-Level RBAC (PLATFORM_RBAC.md §6)
  platformRole: 'platform_owner' | 'platform_admin' | 'platform_viewer' | null;
  platformPermissionOverrides: Array<{
    module: string;
    actions: string[];
  }>;

  // Platform Invite
  invitedBy: mongoose.Types.ObjectId | null;
  invitedAt: Date | null;
  inviteToken: string | null; // SHA-256 hashed
  inviteTokenExpiresAt: Date | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const userProfileSchema = new Schema<IUserProfile>(
  {
    firstName: {
      en: { type: String, required: true },
      ar: { type: String },
    },
    lastName: {
      en: { type: String, required: true },
      ar: { type: String },
    },
    displayName: { type: String },
    phone: { type: String },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    bio: {
      en: { type: String },
      ar: { type: String },
    },
    avatarUrl: { type: String },
    languagePreference: { type: String },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      required: true,
      enum: [
        'platform_admin',
        'tenant_admin',
        'dentist',
        'receptionist',
        'assistant',
        'accountant',
        'lab_tech',
        'hygienist',
      ],
      index: true,
    },
    tenantSlug: {
      type: String,
      default: null,
      index: true,
    },
    profile: {
      type: userProfileSchema,
      default: () => ({ firstName: { en: '' }, lastName: { en: '' } }),
    },
    status: {
      type: String,
      enum: ['invited', 'pending_activation', 'active', 'suspended', 'deactivated', 'locked'],
      default: 'invited',
      index: true,
    },
    isProfileComplete: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },

    // M-7: Permanent lockout fields
    failedLoginCount: { type: Number, default: 0 },
    lockedAt: { type: Date, default: null },
    lockedReason: { type: String, default: null },

    // Auth security
    tokenVersion: { type: Number, default: 0 },
    lastPasswordChangedAt: { type: Date, default: null },
    passwordHistory: { type: [String], default: [], select: false },

    // Activation
    activationToken: { type: String, default: null, select: false },
    activationTokenExpiresAt: { type: Date, default: null },
    activatedAt: { type: Date, default: null },

    // Password Reset
    resetToken: { type: String, default: null, select: false },
    resetTokenExpiresAt: { type: Date, default: null },

    // Tracking
    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    // 2FA / TOTP (Week 13)
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, default: null, select: false },
    twoFactorPendingSecret: { type: String, default: null, select: false },
    twoFactorRecoveryCodes: { type: [String], default: [], select: false },
    // Anti-replay: last accepted TOTP time-step (#68).
    lastTotpStep: { type: Number, default: null },

    // Platform-Level RBAC (PLATFORM_RBAC.md §6)
    platformRole: {
      type: String,
      enum: ['platform_owner', 'platform_admin', 'platform_viewer'],
      default: null,
    },
    platformPermissionOverrides: {
      type: [
        {
          module: { type: String, required: true },
          actions: { type: [String], default: [] },
          _id: false,
        },
      ],
      default: [],
    },

    // Platform Invite
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    invitedAt: { type: Date, default: null },
    inviteToken: { type: String, default: null, select: false },
    inviteTokenExpiresAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'users',
  },
);

// ── Indexes ─────────────────────────────────────────────────

userSchema.index({ tenantSlug: 1, email: 1 });
userSchema.index({ tenantSlug: 1, role: 1 });
userSchema.index({ status: 1, tenantSlug: 1 });
userSchema.index({ activationToken: 1 }, { sparse: true });
userSchema.index({ resetToken: 1 }, { sparse: true });
userSchema.index({ platformRole: 1, status: 1 });
userSchema.index({ inviteToken: 1 }, { sparse: true });

// ── Methods ─────────────────────────────────────────────────

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.passwordHistory;
  delete obj.activationToken;
  delete obj.resetToken;
  delete obj.twoFactorSecret;
  delete obj.twoFactorPendingSecret;
  delete obj.twoFactorRecoveryCodes;
  delete obj.inviteToken;
  delete obj.__v;
  return obj;
};

// ── Model Export ────────────────────────────────────────────

export const User = mongoose.model<IUser>('User', userSchema);
