import mongoose, { Schema, type Document } from 'mongoose';

/**
 * SaaS Payment Model — Platform Database (dento_platform)
 *
 * Per MASTER_PLAN §29 — Payment Gateways (Paymob + Stripe)
 *
 * Tracks all SaaS subscription payments from tenants.
 * Supports multiple providers (Paymob for Egypt, Stripe for international).
 * Stores provider-specific details (Fawry reference, wallet phone, ValU months).
 */

// ── Types ───────────────────────────────────────────────────

export interface IMethodDetails {
  cardBrand?: string | null;
  last4?: string | null;
  fawryReference?: string | null;
  fawryExpiresAt?: Date | null;
  walletPhone?: string | null;
  walletProvider?: string | null;
  valuMonths?: number | null;
  monthlyAmount?: number | null;
}

export interface ISaaSPayment extends Document {
  invoiceId: string;
  tenantId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  amountUSD: number;

  // Provider
  provider: 'paymob' | 'stripe';
  providerPaymentId: string;
  providerTransactionId: string;

  // Method
  method: string;
  methodDetails: IMethodDetails;

  // Status
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'expired';
  paidAt: Date | null;
  failureReason: string | null;

  // Fees
  providerFee: number;
  netAmount: number;

  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | null;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Sub-Schemas ─────────────────────────────────────────────

const methodDetailsSchema = new Schema<IMethodDetails>(
  {
    cardBrand: { type: String, default: null },
    last4: { type: String, default: null },
    fawryReference: { type: String, default: null },
    fawryExpiresAt: { type: Date, default: null },
    walletPhone: { type: String, default: null },
    walletProvider: { type: String, default: null },
    valuMonths: { type: Number, default: null },
    monthlyAmount: { type: Number, default: null },
  },
  { _id: false },
);

// ── Payment Schema ──────────────────────────────────────────

const saasPaymentSchema = new Schema<ISaaSPayment>(
  {
    invoiceId: {
      type: String,
      required: true,
      index: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'EGP',
    },
    amountUSD: {
      type: Number,
      default: 0,
    },

    // ── Provider ─────────────────────────────────────────
    provider: {
      type: String,
      enum: ['paymob', 'stripe'],
      required: true,
      index: true,
    },
    providerPaymentId: {
      type: String,
      default: '',
    },
    providerTransactionId: {
      type: String,
      default: '',
    },

    // ── Method ───────────────────────────────────────────
    method: {
      type: String,
      enum: [
        'card',
        'fawry',
        'wallet',
        'instapay',
        'valu',
        'meeza_digital',
        'sepa',
        'bank_transfer',
      ],
      required: true,
    },
    methodDetails: {
      type: methodDetailsSchema,
      default: () => ({}),
    },

    // ── Status ───────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'expired'],
      default: 'pending',
      index: true,
    },
    paidAt: { type: Date, default: null },
    failureReason: { type: String, default: null },

    // ── Fees ─────────────────────────────────────────────
    providerFee: {
      type: Number,
      default: 0,
    },
    netAmount: {
      type: Number,
      default: 0,
    },

    // ── Standard Fields ─────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'saas_payments',
  },
);

// ── Indexes ─────────────────────────────────────────────────
saasPaymentSchema.index({ tenantId: 1, createdAt: -1 });
saasPaymentSchema.index({ provider: 1, status: 1 });
saasPaymentSchema.index({ invoiceId: 1, tenantId: 1 });
saasPaymentSchema.index({ providerPaymentId: 1 }, { sparse: true });

// ── Model ───────────────────────────────────────────────────
export const SaaSPayment = mongoose.model<ISaaSPayment>('SaaSPayment', saasPaymentSchema);
