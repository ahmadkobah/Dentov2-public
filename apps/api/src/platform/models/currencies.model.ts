import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Currencies Model — Platform Database (dento_platform)
 *
 * Per V2_DATABASE §4.17 — currencies singleton
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 2.4
 *
 * Singleton document (_id = 'default') storing platform currency config:
 * - Base currency (e.g. "SAR")
 * - Exchange rates array (currency + rate pairs)
 * - Last updated timestamp
 */

// ── Types ───────────────────────────────────────────────────

export interface IExchangeRate {
  currency: string;
  rate: number;
}

export interface ICurrencies extends Document<string> {
  _id: string;
  baseCurrency: string;
  exchangeRates: IExchangeRate[];
  lastUpdatedAt: Date | null;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const exchangeRateSchema = new Schema<IExchangeRate>(
  {
    currency: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 3,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const currenciesSchema = new Schema<ICurrencies>(
  {
    _id: {
      type: String,
      default: 'default',
    },
    baseCurrency: {
      type: String,
      default: 'SAR',
      minlength: 3,
      maxlength: 3,
    },
    exchangeRates: {
      type: [exchangeRateSchema],
      default: [],
    },
    lastUpdatedAt: {
      type: Date,
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    _id: false,
    timestamps: true,
    collection: 'currencies',
  },
);

// ── Singleton Helper ────────────────────────────────────────

/**
 * Get (or create) the singleton currencies document.
 */
export async function getCurrencies(): Promise<ICurrencies> {
  let currencies = await Currencies.findById('default');
  if (!currencies) {
    currencies = await Currencies.create({ _id: 'default' });
  }
  return currencies;
}

// ── Model Export ────────────────────────────────────────────

export const Currencies = mongoose.model<ICurrencies>('Currencies', currenciesSchema);
