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
import { Percent } from 'lucide-react';
import { useCreateDiscount, type RegionalAmount } from '../hooks/usePricing.js';
import { COUNTRY_TO_CURRENCY } from '../../countries/data/country-metadata.js';

const schema = z.object({
  name: z.string().min(1, 'Required').max(200),
  discountType: z.enum(['percent', 'fixed_amount']),
  discountPercent: z.number().min(0).max(100),
  discountAmount: z.number().min(0),
  startsAt: z.string().min(1, 'Required'),
  expiresAt: z.string().min(1, 'Required'),
});

type FormValues = z.infer<typeof schema>;

const countryOptions = COUNTRIES.map((c) => ({
  value: c.iso,
  label: `${getFlagEmoji(c.iso)} ${c.name}`,
  description: `${c.iso} — ${COUNTRY_TO_CURRENCY[c.iso] ?? 'N/A'}`,
}));

interface CreateDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateDiscountDialog({ open, onOpenChange }: CreateDiscountDialogProps) {
  const createDiscount = useCreateDiscount();

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

  const [countryScope, setCountryScope] = useState<'all' | 'specific'>('all');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [regionalAmounts, setRegionalAmounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      const now = new Date();
      const future = new Date();
      future.setMonth(future.getMonth() + 3);
      reset({
        name: '',
        discountType: 'percent',
        discountPercent: 10,
        discountAmount: 0,
        startsAt: now.toISOString().slice(0, 16),
        expiresAt: future.toISOString().slice(0, 16),
      });
      setCountryScope('all');
      setSelectedCountries([]);
      setRegionalAmounts({});
    }
  }, [open, reset]);

  useEffect(() => {
    if (discountType === 'fixed_amount' && countryScope === 'all') {
      setCountryScope('specific');
    }
  }, [discountType, countryScope]);

  const handleCountriesChange = useCallback((countries: string[]) => {
    setSelectedCountries(countries);
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

    createDiscount.mutate(
      {
        name: values.name,
        discountType: values.discountType,
        discountPercent: values.discountType === 'percent' ? values.discountPercent : 0,
        discountAmount: values.discountType === 'fixed_amount' ? values.discountAmount : 0,
        appliesTo: 'all',
        startsAt: new Date(values.startsAt).toISOString(),
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
    !createDiscount.isPending &&
    (countryScope === 'all' ||
      (selectedCountries.length > 0 &&
        (discountType !== 'fixed_amount' ||
          selectedCountries.every((c) => (regionalAmounts[c] ?? 0) > 0))));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Create Global Discount
          </DialogTitle>
          <DialogDescription>
            Global discounts apply automatically to all qualifying tenants.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="discount-name">Discount Name *</Label>
            <Input id="discount-name" placeholder="Early Bird 2026" {...register('name')} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
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

          {discountType === 'percent' ? (
            <div className="space-y-1.5">
              <Label htmlFor="discount-percent">Discount (%) *</Label>
              <Input
                id="discount-percent"
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
              <Label htmlFor="discount-amount">Default Amount *</Label>
              <Input
                id="discount-amount"
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="discount-starts">Starts At *</Label>
              <Input id="discount-starts" type="datetime-local" {...register('startsAt')} />
              {errors.startsAt && <p className="text-xs text-red-500">{errors.startsAt.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="discount-expires">Expires At *</Label>
              <Input id="discount-expires" type="datetime-local" {...register('expiresAt')} />
              {errors.expiresAt && (
                <p className="text-xs text-red-500">{errors.expiresAt.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {createDiscount.isPending ? 'Creating…' : 'Create Discount'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
