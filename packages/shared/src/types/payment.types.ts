/**
 * Payment Types — §29 Payment Gateways (Paymob + Stripe)
 *
 * Strategy: Payment Provider by Country
 *   - Egypt (EG): Paymob — Cards (Visa/MC/Meeza), Fawry, Mobile Wallets, InstaPay, ValU
 *   - All others: Stripe — Cards (Visa/MC/Amex), SEPA, Bank Transfer
 *
 * SaaS subscription payments for modules.
 * saas_payments collection in dento_platform DB.
 */

// ── Payment Provider ────────────────────────────────────────

export type PaymentProvider = 'paymob' | 'stripe';

// ── Payment Methods ─────────────────────────────────────────

export type PaymobMethod = 'card' | 'fawry' | 'wallet' | 'instapay' | 'valu' | 'meeza_digital';
export type StripeMethod = 'card' | 'sepa' | 'bank_transfer';
export type PaymentMethod = PaymobMethod | StripeMethod;

export const PAYMOB_METHODS: PaymobMethod[] = [
  'card',
  'fawry',
  'wallet',
  'instapay',
  'valu',
  'meeza_digital',
];

export const STRIPE_METHODS: StripeMethod[] = ['card', 'sepa', 'bank_transfer'];

// ── Payment Method Details ──────────────────────────────────

export interface CardDetails {
  cardBrand: 'visa' | 'mastercard' | 'meeza' | 'amex' | null;
  last4: string | null;
}

export interface FawryDetails {
  fawryReference: string; // 10-digit reference
  expiresAt: string; // 48h validity
}

export interface WalletDetails {
  walletPhone: string; // Vodafone Cash, Orange, Etisalat, etc.
  walletProvider: string;
}

export interface ValuDetails {
  valuMonths: number; // Installment months
  monthlyAmount: number;
}

export type MethodDetails =
  | CardDetails
  | FawryDetails
  | WalletDetails
  | ValuDetails
  | Record<string, never>;

// ── Payment Status ──────────────────────────────────────────

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'expired';

// ── SaaS Payment (Invoice Payment) ─────────────────────────

export interface ISaaSPayment {
  _id: string;
  invoiceId: string; // e.g. "inv_2026_03"
  tenantId: string;
  amount: number;
  currency: string; // EGP, USD, EUR
  amountUSD: number; // Converted for reporting

  // Payment Provider
  provider: PaymentProvider;
  providerPaymentId: string; // Paymob Order ID or Stripe PaymentIntent
  providerTransactionId: string;

  // Method
  method: PaymentMethod;
  methodDetails: MethodDetails;

  // Status
  status: PaymentStatus;
  paidAt: string | null;
  failureReason: string | null;

  // Fees
  providerFee: number;
  netAmount: number; // After fees

  createdAt: string;
  updatedAt: string;
}

// ── Paymob Fee Structure ────────────────────────────────────

export const PAYMOB_FEES: Record<
  PaymobMethod,
  { percent: number; flat: number; settlement: string }
> = {
  card: { percent: 2.5, flat: 1, settlement: 'T+2' },
  meeza_digital: { percent: 1.0, flat: 0, settlement: 'T+1' },
  fawry: { percent: 2.0, flat: 2, settlement: 'T+2' },
  wallet: { percent: 1.5, flat: 0, settlement: 'T+1' },
  instapay: { percent: 0, flat: 3, settlement: 'Instant' },
  valu: { percent: 0, flat: 0, settlement: 'T+7' },
};

// ── Paymob Config ───────────────────────────────────────────

export interface PaymobConfig {
  apiKey: string;
  integrationIds: {
    card: string;
    fawry: string;
    wallet: string;
    valu: string;
  };
  iframeId: string;
  hmacSecret: string; // For webhook verification
}

// ── Stripe Config ───────────────────────────────────────────

export interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
}

// ── API Request/Response Types ──────────────────────────────

export interface CreatePaymentInput {
  tenantId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
}

export interface PaymobPaymentKeyResponse {
  paymentKey: string;
  orderId: string;
  iframeUrl: string;
}

export interface FawryReferenceResponse {
  reference: string;
  amount: number;
  currency: string;
  expiresAt: string; // 48h validity per §29
}

export interface PaymentWebhookPayload {
  provider: PaymentProvider;
  providerPaymentId: string;
  providerTransactionId: string;
  status: 'success' | 'failed';
  amount: number;
  currency: string;
  method: PaymentMethod;
  methodDetails?: MethodDetails;
}

// ── Country → Provider Mapping ──────────────────────────────

export const COUNTRY_PAYMENT_PROVIDER: Record<string, PaymentProvider> = {
  EG: 'paymob',
  // Default for all others: 'stripe'
};

export function getPaymentProvider(countryCode: string): PaymentProvider {
  return COUNTRY_PAYMENT_PROVIDER[countryCode] || 'stripe';
}
