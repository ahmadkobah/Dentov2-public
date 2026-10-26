import mongoose, { Schema, type Document } from 'mongoose';

/**
 * User Session Model — Platform Database (dento_platform)
 *
 * Tracks active login sessions for:
 * - Multi-device management
 * - Remote logout
 * - Session security (revocation)
 */

// ── Types ───────────────────────────────────────────────────

export interface IUserSession extends Document {
  userId: mongoose.Types.ObjectId;
  sessionId: string; // From JWT
  refreshTokenJti: string; // JWT ID for refresh token revocation

  // Device info
  userAgent: string;
  ipAddress: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser?: string;
  os?: string;

  // Status
  isActive: boolean;
  lastActivityAt: Date;
  expiresAt: Date;

  // Standard Fields
  createdBy: mongoose.Types.ObjectId | null;
  updatedBy: mongoose.Types.ObjectId | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const userSessionSchema = new Schema<IUserSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    refreshTokenJti: {
      type: String,
      required: true,
      unique: true,
    },

    // Device info
    userAgent: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown',
    },
    browser: { type: String },
    os: { type: String },

    // Status
    isActive: { type: Boolean, default: true, index: true },
    lastActivityAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },

    // Standard Fields
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    collection: 'user_sessions',
  },
);

// ── Indexes ─────────────────────────────────────────────────

userSessionSchema.index({ userId: 1, isActive: 1 });
userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index - auto-delete expired sessions

// ── Model Export ────────────────────────────────────────────

export const UserSession = mongoose.model<IUserSession>('UserSession', userSessionSchema);
