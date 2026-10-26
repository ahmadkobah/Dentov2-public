/**
 * InvoiceCombobox — Searchable invoice selector powered by SearchCombobox.
 * Fetches invoices from API and maps to combobox options.
 */

import { useMemo, useEffect, useRef } from 'react';
import { SearchCombobox, type SearchComboboxOption } from '@dento/ui';
import { useInvoiceList } from '@/features/invoices/hooks/useInvoices.js';
import { formatCurrency } from '@/lib/currency.js';

export interface InvoiceComboboxInvoice {
  _id: string;
  invoiceNumber: string;
  patientId: string;
  totalAmount: number;
  balanceDue: number;
  status: string;
  currency?: string;
}

interface InvoiceComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  onInvoiceSelect?: (invoice: InvoiceComboboxInvoice | null) => void;
  disabled?: boolean;
  className?: string;
}

export function InvoiceCombobox({
  value,
  onValueChange,
  onInvoiceSelect,
  disabled,
  className,
}: InvoiceComboboxProps) {
  const { data } = useInvoiceList({ page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' });
  const didAutoFire = useRef(false);

  // Auto-fire onInvoiceSelect when data loads and value is already pre-set
  useEffect(() => {
    if (data?.items && value && onInvoiceSelect && !didAutoFire.current) {
      const inv = data.items.find((i) => i._id === value);
      if (inv) {
        didAutoFire.current = true;
        onInvoiceSelect({
          _id: inv._id,
          invoiceNumber: inv.invoiceNumber,
          patientId: typeof inv.patientId === 'object' ? inv.patientId._id : inv.patientId,
          totalAmount: inv.totalAmount,
          balanceDue: inv.balanceDue,
          status: inv.status,
          currency: inv.currency,
        });
      }
    }
  }, [data?.items, value, onInvoiceSelect]);

  const options: SearchComboboxOption[] = useMemo(() => {
    if (!data?.items) return [];
    return data.items.map((inv) => ({
      value: inv._id,
      label: inv.invoiceNumber || inv._id,
      description: `${inv.status} — Balance: ${formatCurrency(inv.balanceDue)} / Total: ${formatCurrency(inv.totalAmount)}`,
    }));
  }, [data?.items]);

  const handleChange = (id: string) => {
    onValueChange(id);
    if (onInvoiceSelect) {
      const inv = data?.items?.find((i) => i._id === id);
      onInvoiceSelect(
        inv
          ? {
              _id: inv._id,
              invoiceNumber: inv.invoiceNumber,
              patientId: typeof inv.patientId === 'object' ? inv.patientId._id : inv.patientId,
              totalAmount: inv.totalAmount,
              balanceDue: inv.balanceDue,
              status: inv.status,
              currency: inv.currency,
            }
          : null,
      );
    }
  };

  return (
    <SearchCombobox
      options={options}
      value={value}
      onValueChange={handleChange}
      placeholder="Select invoice..."
      searchPlaceholder="Search by invoice number..."
      emptyMessage="No invoices found."
      disabled={disabled}
      className={className}
    />
  );
}
