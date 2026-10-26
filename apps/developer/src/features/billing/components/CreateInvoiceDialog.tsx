import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Label,
  Textarea,
} from '@dento/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { SaaSInvoiceItemType } from '@dento/shared';
import { getCountryDefaultTaxRate } from '@dento/shared';
import { useCreateInvoice } from '../hooks/useBilling.js';
import { useTenants } from '../../tenants/hooks/useTenants.js';
import { useTenantDetail } from '../../tenants/hooks/useTenants.js';
import { useModules } from '../../modules/hooks/useModules.js';
import { useCurrencyOptions } from '../../../hooks/useCountryConfigs.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LineItem {
  type: SaaSInvoiceItemType;
  description: string;
  moduleSlug: string;
  quantity: number;
  unitPrice: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ITEM_TYPES: { value: SaaSInvoiceItemType; label: string }[] = [
  { value: 'module', label: 'Module' },
  { value: 'extra_storage', label: 'Extra Storage' },
  { value: 'extra_users', label: 'Extra Users' },
  { value: 'extra_branches', label: 'Extra Branches' },
  { value: 'custom', label: 'Custom' },
  { value: 'discount', label: 'Discount' },
];

const emptyItem = (): LineItem => ({
  type: 'module',
  description: '',
  moduleSlug: '',
  quantity: 1,
  unitPrice: 0,
});

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CreateInvoiceDialog({ open, onOpenChange }: Props) {
  const createInvoice = useCreateInvoice();

  // ── Lookups ───────────────────────────────────────────────
  const [tenantSearch, setTenantSearch] = useState('');
  const { data: tenantData } = useTenants({ search: tenantSearch, page: 1, limit: 20 });
  const tenants = tenantData?.items ?? [];

  const { data: moduleData } = useModules({});
  const modules = moduleData?.items ?? [];

  const currencyOptions = useCurrencyOptions();

  // ── Form State ────────────────────────────────────────────
  const [tenantId, setTenantId] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState(0);

  // Auto-fill currency and tax rate from tenant
  const { data: tenantDetail } = useTenantDetail(tenantId || undefined);
  useEffect(() => {
    if (tenantDetail?.currency) {
      setCurrency(tenantDetail.currency);
    }
    if (tenantDetail?.country) {
      setTaxRate(getCountryDefaultTaxRate(tenantDetail.country));
    }
  }, [tenantDetail]);

  // Default period to current month
  useEffect(() => {
    if (open) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setPeriodStart(start.toISOString().slice(0, 10));
      setPeriodEnd(end.toISOString().slice(0, 10));
    }
  }, [open]);

  // Reset form when closed
  useEffect(() => {
    if (!open) {
      setTenantId('');
      setTenantSearch('');
      setCurrency('USD');
      setPeriodStart('');
      setPeriodEnd('');
      setDueDate('');
      setTaxRate(0);
      setNotes('');
      setItems([emptyItem()]);
      setDiscountType('none');
      setDiscountValue(0);
    }
  }, [open]);

  // ── Derived ───────────────────────────────────────────────
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
    [items],
  );
  const discountAmount = useMemo(() => {
    if (discountType === 'percent' && discountValue > 0) {
      return Math.round(subtotal * (discountValue / 100) * 100) / 100;
    }
    if (discountType === 'fixed' && discountValue > 0) {
      return Math.min(discountValue, subtotal);
    }
    return 0;
  }, [discountType, discountValue, subtotal]);
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const taxAmount = afterDiscount * (taxRate / 100);
  const total = Math.round((afterDiscount + taxAmount) * 100) / 100;

  const canSubmit =
    tenantId &&
    periodStart &&
    periodEnd &&
    items.length > 0 &&
    items.every((i) => i.description && i.quantity > 0) &&
    !createInvoice.isPending;

  // ── Handlers ──────────────────────────────────────────────
  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function handleModuleSelect(index: number, slug: string) {
    const mod = modules.find((m) => m.slug === slug);
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              moduleSlug: slug,
              description: mod ? (mod.name.en ?? slug) : slug,
              unitPrice: mod?.pricing?.basePrice ?? item.unitPrice,
            }
          : item,
      ),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    createInvoice.mutate(
      {
        tenantId,
        periodStart: new Date(periodStart).toISOString(),
        periodEnd: new Date(periodEnd).toISOString(),
        items: [
          ...items.map((i) => ({
            type: i.type,
            description: i.description,
            moduleSlug: i.type === 'module' ? i.moduleSlug : undefined,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          ...(discountAmount > 0
            ? [
                {
                  type: 'discount' as const,
                  description:
                    discountType === 'percent'
                      ? `Discount (${discountValue}%)`
                      : `Discount (${currency} ${discountValue.toFixed(2)})`,
                  quantity: 1,
                  unitPrice: -discountAmount,
                },
              ]
            : []),
        ],
        currency,
        ...(dueDate && { dueDate: new Date(dueDate).toISOString() }),
        taxRate: taxRate || undefined,
        notes: notes || undefined,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ── Tenant ─────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Tenant *</Label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger>
                <SelectValue placeholder="Select tenant…" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    placeholder="Search tenants…"
                    value={tenantSearch}
                    onChange={(e) => setTenantSearch(e.target.value)}
                    className="mb-2"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                {tenants.map((t) => (
                  <SelectItem key={t._id} value={t._id}>
                    {t.name.en} ({t.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Period + Currency Row ─────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Period Start *</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Period End *</Label>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} ({c.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Line Items ───────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line Items *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="me-1 h-3.5 w-3.5" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[140px_1fr_70px_90px_32px] items-end gap-2 rounded-lg border p-3"
                >
                  {/* Type */}
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Type</span>
                    <Select value={item.type} onValueChange={(v) => updateItem(idx, 'type', v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ITEM_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description / Module */}
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">
                      {item.type === 'module' ? 'Module' : 'Description'}
                    </span>
                    {item.type === 'module' ? (
                      <Select
                        value={item.moduleSlug}
                        onValueChange={(v) => handleModuleSelect(idx, v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select module…" />
                        </SelectTrigger>
                        <SelectContent>
                          {modules.map((m) => (
                            <SelectItem key={m.slug} value={m.slug}>
                              {m.name.en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="h-9"
                        value={item.description}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                        placeholder="Description…"
                      />
                    )}
                  </div>

                  {/* Qty */}
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Qty</span>
                    <Input
                      className="h-9"
                      type="number"
                      min={0}
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Unit Price</span>
                    <Input
                      className="h-9"
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))}
                    />
                  </div>

                  {/* Remove */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-destructive"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Discount ─────────────────────────────── */}
          <div className="grid grid-cols-[140px_1fr] gap-3">
            <div className="space-y-1.5">
              <Label>Discount</Label>
              <Select
                value={discountType}
                onValueChange={(v) => {
                  setDiscountType(v as 'none' | 'percent' | 'fixed');
                  if (v === 'none') setDiscountValue(0);
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="percent">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {discountType !== 'none' && (
              <div className="space-y-1.5">
                <Label>
                  {discountType === 'percent' ? 'Discount (%)' : `Amount (${currency})`}
                </Label>
                <Input
                  className="h-9"
                  type="number"
                  min={0}
                  max={discountType === 'percent' ? 100 : undefined}
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                />
              </div>
            )}
          </div>

          {/* ── Tax + Due Date ────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          {/* ── Notes ─────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes…"
              rows={2}
            />
          </div>

          {/* ── Totals Summary ────────────────────────── */}
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-medium">
                {currency} {subtotal.toFixed(2)}
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>
                  Discount{' '}
                  {discountType === 'percent'
                    ? `(${discountValue}%)`
                    : `(${currency} ${discountValue.toFixed(2)})`}
                </span>
                <span>
                  -{currency} {discountAmount.toFixed(2)}
                </span>
              </div>
            )}
            {taxRate > 0 && (
              <div className="flex justify-between">
                <span>Tax ({taxRate}%)</span>
                <span>
                  {currency} {taxAmount.toFixed(2)}
                </span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t pt-1 font-semibold">
              <span>Total</span>
              <span>
                {currency} {total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* ── Actions ───────────────────────────────── */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {createInvoice.isPending ? 'Creating…' : 'Create Draft Invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
