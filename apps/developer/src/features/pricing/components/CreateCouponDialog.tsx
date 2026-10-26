import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  MultiSelectCombobox,
  COUNTRIES,
  getFlagEmoji,
} from '@dento/ui';
import { Tag } from 'lucide-react';
import { useCreateCoupon, type RegionalAmount } from '../hooks/usePricing.js';
import { COUNTRY_TO_CURRENCY } from '../../countries/data/country-metadata.js';

const schema = z.object({
  code: z
    .string()
    .min(3, 'At least 3 characters')
    .max(30)
    .regex(/^[A-Z0-9_-]+$/i, 'Alphanumeric, hyphens, underscores only'),
  discountType: z.enum(['percent', 'fixed_amount']),
  discountPercent: z.number().min(0).max(100),
  discountAmount: z.number().min(0),
  maxUses: z.number().min(0, 'Min 0 (unlimited)'),
  expiresAt: z.string().min(1, 'Required'),
});

type FormValues = z.infer<typeof schema>;

const countryOptions = COUNTRIES.map((c) => ({
  value: c.iso,
  label: `${getFlagEmoji(c.iso)} ${c.name}`,
  description: `${c.iso} — ${COUNTRY_TO_CURRENCY[c.iso] ?? 'N/A'}`,
}));

interface CreateCouponDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCouponDialog({ open, onOpenChange }: CreateCouponDialogProps) {
  const createCoupon = useCreateCoupon();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodFormResolver(schema),
    mode: 'onChange',
  });

  const discountType = watch('discountType');

  // Country scope state (managed outside react-hook-form for simplicity)
  const [countryScope, setCountryScope] = useState<'all' | 'specific'>('all');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [regionalAmounts, setRegionalAmounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      reset({
        code: '',
        discountType: 'percent',
        discountPercent: 10,
        discountAmount: 0,
        maxUses: 0,
        expiresAt: d.toISOString().slice(0, 16),
      });
      setCountryScope('all');
      setSelectedCountries([]);
      setRegionalAmounts({});
    }
  }, [open, reset]);

  // When switching to fixed_amount, force specific countries
  useEffect(() => {
    if (discountType === 'fixed_amount' && countryScope === 'all') {
      setCountryScope('specific');
    }
  }, [discountType, countryScope]);

  const handleCountriesChange = useCallback((countries: string[]) => {
    setSelectedCountries(countries);
    // Remove amounts for deselected countries
    setRegionalAmounts((prev) => {
      const next: Record<string, number> = {};
      for (const c of countries) {
        next[c] = prev[c] ?? 0;
      }
      return next;
    });
  }, []);

  const onSubmit = (values: FormValues) => {
    const allowedCountries = countryScope === 'specific' ? selectedCountries : [];
    const allowedCurrencies =
      countryScope === 'specific'
        ? [...new Set(selectedCountries.map((c) => COUNTRY_TO_CURRENCY[c]).filter(Boolean))]
        : [];

    let regional: RegionalAmount[] = [];
    if (values.discountType === 'fixed_amount' && countryScope === 'specific') {
      regional = selectedCountries.map((cc) => ({
        countryCode: cc,
        currency: COUNTRY_TO_CURRENCY[cc] ?? 'USD',
        amount: regionalAmounts[cc] ?? 0,
      }));
    }

    createCoupon.mutate(
      {
        code: values.code.toUpperCase(),
        discountType: values.discountType,
        discountPercent: values.discountType === 'percent' ? values.discountPercent : 0,
        discountAmount: values.discountType === 'fixed_amount' ? values.discountAmount : 0,
        maxUses: values.maxUses,
        appliesTo: 'all',
        expiresAt: new Date(values.expiresAt).toISOString(),
        allowedCountries,
        allowedCurrencies,
        regionalAmounts: regional,
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  };

  const canSubmit =
    isValid &&
    !createCoupon.isPending &&
    (countryScope === 'all' ||
      (selectedCountries.length > 0 &&
        (discountType !== 'fixed_amount' ||
          selectedCountries.every((c) => (regionalAmounts[c] ?? 0) > 0))));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Create Coupon
          </DialogTitle>
          <DialogDescription>
            Create a discount coupon that can be applied during checkout.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="coupon-code">Coupon Code *</Label>
            <Input
              id="coupon-code"
              placeholder="SUMMER2026"
              className="font-mono uppercase"
              {...register('code')}
            />
            {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Discount Type</Label>
            <Select
              value={discountType}
              onValueChange={(v) =>
                setValue('discountType', v as 'percent' | 'fixed_amount', { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percentage (%)</SelectItem>
                <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ── Country Scope ─────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Country Scope</Label>
            <Select
              value={countryScope}
              onValueChange={(v) => setCountryScope(v as 'all' | 'specific')}
              disabled={discountType === 'fixed_amount'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="specific">Specific Countries</SelectItem>
              </SelectContent>
            </Select>
            {discountType === 'fixed_amount' && (
              <p className="text-xs text-amber-600">
                Fixed amount requires specific countries (different currencies per region).
              </p>
            )}
          </div>

          {countryScope === 'specific' && (
            <div className="space-y-1.5">
              <Label>Select Countries</Label>
              <MultiSelectCombobox
                options={countryOptions}
                values={selectedCountries}
                onValuesChange={handleCountriesChange}
                placeholder="Choose countries…"
                searchPlaceholder="Search countries…"
              />
            </div>
          )}

          {/* ── Discount Value ────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2">
            {discountType === 'percent' ? (
              <div className="space-y-1.5">
                <Label htmlFor="coupon-discount">Discount (%) *</Label>
                <Input
                  id="coupon-discount"
                  type="number"
                  min="1"
                  max="100"
                  {...register('discountPercent', { valueAsNumber: true })}
                />
                {errors.discountPercent && (
                  <p className="text-xs text-red-500">{errors.discountPercent.message}</p>
                )}
              </div>
            ) : countryScope === 'all' ? (
              <div className="space-y-1.5">
                <Label htmlFor="coupon-amount">Default Amount *</Label>
                <Input
                  id="coupon-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('discountAmount', { valueAsNumber: true })}
                />
                {errors.discountAmount && (
                  <p className="text-xs text-red-500">{errors.discountAmount.message}</p>
                )}
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="coupon-maxUses">Max Uses (0 = unlimited)</Label>
              <Input
                id="coupon-maxUses"
                type="number"
                min="0"
                {...register('maxUses', { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* ── Per-Country Amounts (fixed_amount + specific) ── */}
          {discountType === 'fixed_amount' &&
            countryScope === 'specific' &&
            selectedCountries.length > 0 && (
              <div className="space-y-2">
                <Label>Amount per Country</Label>
                <div className="rounded-md border p-3 space-y-2 max-h-48 overflow-y-auto">
                  {selectedCountries.map((cc) => {
                    const cur = COUNTRY_TO_CURRENCY[cc] ?? 'USD';
                    const country = COUNTRIES.find((c) => c.iso === cc);
                    return (
                      <div key={cc} className="flex items-center gap-2">
                        <span className="w-32 text-sm truncate" title={country?.name}>
                          {getFlagEmoji(cc)} {cc}
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="flex-1"
                          value={regionalAmounts[cc] ?? ''}
                          onChange={(e) =>
                            setRegionalAmounts((prev) => ({
                              ...prev,
                              [cc]: parseFloat(e.target.value) || 0,
                            }))
                          }
                        />
                        <span className="text-xs text-muted-foreground w-10">{cur}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          <div className="space-y-1.5">
            <Label htmlFor="coupon-expires">Expires At *</Label>
            <Input id="coupon-expires" type="datetime-local" {...register('expiresAt')} />
            {errors.expiresAt && <p className="text-xs text-red-500">{errors.expiresAt.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {createCoupon.isPending ? 'Creating…' : 'Create Coupon'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
