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
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  MultiSelectCombobox,
  COUNTRIES,
  getFlagEmoji,
} from '@dento/ui';
import { useUpdateDiscount } from '../hooks/usePricing.js';
import type { GlobalDiscount, RegionalAmount } from '../hooks/usePricing.js';
import { COUNTRY_TO_CURRENCY } from '../../countries/data/country-metadata.js';

const schema = z.object({
  name: z.string().min(1, 'Required').max(200),
  discountType: z.enum(['percent', 'fixed_amount']),
  discountPercent: z.number().min(0).max(100),
  discountAmount: z.number().min(0),
  startsAt: z.string().min(1, 'Required'),
  expiresAt: z.string().min(1, 'Required'),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const countryOptions = COUNTRIES.map((c) => ({
  value: c.iso,
  label: `${getFlagEmoji(c.iso)} ${c.name}`,
  description: `${c.iso} — ${COUNTRY_TO_CURRENCY[c.iso] ?? 'N/A'}`,
}));

interface EditDiscountDialogProps {
  discount: GlobalDiscount | null;
  onClose: () => void;
}

export function EditDiscountDialog({ discount, onClose }: EditDiscountDialogProps) {
  const updateDiscount = useUpdateDiscount();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodFormResolver(schema),
    mode: 'onChange',
  });

  const [countryScope, setCountryScope] = useState<'all' | 'specific'>('all');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [regionalAmounts, setRegionalAmounts] = useState<Record<string, number>>({});
  const [countriesDirty, setCountriesDirty] = useState(false);

  useEffect(() => {
    if (discount) {
      reset({
        name: discount.name,
        discountType: discount.discountType ?? 'percent',
        discountPercent: discount.discountPercent ?? 0,
        discountAmount: discount.discountAmount ?? 0,
        startsAt: discount.startsAt ? new Date(discount.startsAt).toISOString().slice(0, 16) : '',
        expiresAt: discount.expiresAt
          ? new Date(discount.expiresAt).toISOString().slice(0, 16)
          : '',
        isActive: discount.isActive,
      });

      const countries = discount.allowedCountries ?? [];
      setCountryScope(countries.length > 0 ? 'specific' : 'all');
      setSelectedCountries(countries);

      const amts: Record<string, number> = {};
      for (const r of discount.regionalAmounts ?? []) {
        amts[r.countryCode] = r.amount;
      }
      setRegionalAmounts(amts);
      setCountriesDirty(false);
    }
  }, [discount, reset]);

  const isActive = watch('isActive');
  const discountType = watch('discountType');

  useEffect(() => {
    if (discountType === 'fixed_amount' && countryScope === 'all') {
      setCountryScope('specific');
      setCountriesDirty(true);
    }
  }, [discountType, countryScope]);

  const handleCountriesChange = useCallback((countries: string[]) => {
    setSelectedCountries(countries);
    setCountriesDirty(true);
    setRegionalAmounts((prev) => {
      const next: Record<string, number> = {};
      for (const c of countries) {
        next[c] = prev[c] ?? 0;
      }
      return next;
    });
  }, []);

  const onSubmit = (values: FormValues) => {
    if (!discount) return;

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

    updateDiscount.mutate(
      {
        id: discount._id,
        name: values.name,
        discountType: values.discountType,
        discountPercent: values.discountType === 'percent' ? values.discountPercent : 0,
        discountAmount: values.discountType === 'fixed_amount' ? values.discountAmount : 0,
        startsAt: new Date(values.startsAt).toISOString(),
        expiresAt: new Date(values.expiresAt).toISOString(),
        isActive: values.isActive,
        allowedCountries,
        allowedCurrencies,
        regionalAmounts: regional,
      },
      { onSuccess: () => onClose() },
    );
  };

  const formDirty = isDirty || countriesDirty;

  return (
    <Dialog open={!!discount} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Discount</DialogTitle>
          <DialogDescription>{discount?.name}</DialogDescription>
        </DialogHeader>

        {discount && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-discount-name">Discount Name *</Label>
              <Input id="edit-discount-name" {...register('name')} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Discount Type</Label>
              <Select
                value={discountType}
                onValueChange={(v) =>
                  setValue('discountType', v as 'percent' | 'fixed_amount', {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
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
                onValueChange={(v) => {
                  setCountryScope(v as 'all' | 'specific');
                  setCountriesDirty(true);
                }}
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
                <Label htmlFor="edit-discount-percent">Discount (%) *</Label>
                <Input
                  id="edit-discount-percent"
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
                <Label htmlFor="edit-discount-amount">Default Amount *</Label>
                <Input
                  id="edit-discount-amount"
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

            {/* ── Per-Country Amounts ─────────────────────── */}
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
                            onChange={(e) => {
                              setRegionalAmounts((prev) => ({
                                ...prev,
                                [cc]: parseFloat(e.target.value) || 0,
                              }));
                              setCountriesDirty(true);
                            }}
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
                <Label htmlFor="edit-discount-starts">Starts At *</Label>
                <Input id="edit-discount-starts" type="datetime-local" {...register('startsAt')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-discount-expires">Expires At *</Label>
                <Input
                  id="edit-discount-expires"
                  type="datetime-local"
                  {...register('expiresAt')}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-gray-500">Inactive discounts won't be applied</p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={(v) => setValue('isActive', v, { shouldDirty: true })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!formDirty || updateDiscount.isPending}>
                {updateDiscount.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
