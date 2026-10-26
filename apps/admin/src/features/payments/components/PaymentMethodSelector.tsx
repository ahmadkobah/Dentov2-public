/**
 * PaymentMethodSelector — Dedicated reusable component for selecting a payment method.
 * Extracts the PAYMENT_METHODS constant & Select UI from PaymentForm.
 * Per DENTO_V2_MASTER_PLAN.md §12 (Billing & Invoicing).
 */

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@dento/ui';
import { useTranslation } from '../../../stores/locale.store.js';
import {
  Banknote,
  CreditCard,
  Building2,
  FileText,
  Shield,
  Globe,
  Smartphone,
  Wallet,
} from 'lucide-react';

// ── Payment methods ────────────────────────────────────

export type PaymentMethodValue =
  | 'cash'
  | 'card'
  | 'bank_transfer'
  | 'cheque'
  | 'insurance'
  | 'online'
  | 'fawry'
  | 'meeza';

interface PaymentMethodOption {
  value: PaymentMethodValue;
  icon: React.ComponentType<{ className?: string }>;
}

const METHOD_KEY_MAP: Record<PaymentMethodValue, string> = {
  cash: 'payments.method.cash',
  card: 'payments.method.card',
  bank_transfer: 'payments.method.bankTransfer',
  cheque: 'payments.method.cheque',
  insurance: 'payments.method.insurance',
  online: 'payments.method.online',
  fawry: 'payments.method.fawry',
  meeza: 'payments.method.meeza',
};

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { value: 'cash', icon: Banknote },
  { value: 'card', icon: CreditCard },
  { value: 'bank_transfer', icon: Building2 },
  { value: 'cheque', icon: FileText },
  { value: 'insurance', icon: Shield },
  { value: 'online', icon: Globe },
  { value: 'fawry', icon: Smartphone },
  { value: 'meeza', icon: Wallet },
];

// ── Component ──────────────────────────────────────────

interface PaymentMethodSelectorProps {
  value: PaymentMethodValue;
  onChange: (value: PaymentMethodValue) => void;
  /** Restrict which methods are shown */
  methods?: PaymentMethodValue[];
  disabled?: boolean;
  className?: string;
}

export function PaymentMethodSelector({
  value,
  onChange,
  methods,
  disabled = false,
  className,
}: PaymentMethodSelectorProps) {
  const { t } = useTranslation();
  const options = methods
    ? PAYMENT_METHODS.filter((m) => methods.includes(m.value))
    : PAYMENT_METHODS;

  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as PaymentMethodValue)}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={t('payments.methodSelector.placeholder')} />
      </SelectTrigger>
      <SelectContent>
        {options.map((method) => {
          const Icon = method.icon;
          return (
            <SelectItem key={method.value} value={method.value}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{t(METHOD_KEY_MAP[method.value])}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
