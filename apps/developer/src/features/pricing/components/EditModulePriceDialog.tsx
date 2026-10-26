import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
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
  Separator,
} from '@dento/ui';
import { useUpdateModulePricing } from '../hooks/usePricing.js';
import type { ModulePricingItem, RegionPrice, LanguagePrice } from '../hooks/usePricing.js';
import { useRegionOptions } from '../../../hooks/useCountryConfigs.js';

const schema = z.object({
  basePrice: z.number().min(0, 'Price must be ≥ 0'),
  yearlyDiscount: z.number().min(0).max(100, 'Max 100%'),
  trialDays: z.number().min(0).max(365),
  isActive: z.boolean(),
  isFree: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface EditModulePriceDialogProps {
  module: ModulePricingItem | null;
  onClose: () => void;
}

const COMMON_LANGUAGES: { code: string; label: string }[] = [
  { code: 'ar', label: 'Arabic' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'es', label: 'Spanish' },
  { code: 'tr', label: 'Turkish' },
  { code: 'ur', label: 'Urdu' },
  { code: 'fa', label: 'Persian' },
  { code: 'ku', label: 'Kurdish' },
  { code: 'he', label: 'Hebrew' },
];

export function EditModulePriceDialog({ module, onClose }: EditModulePriceDialogProps) {
  const updatePricing = useUpdateModulePricing();
  const COMMON_REGIONS = useRegionOptions();
  const [regionPrices, setRegionPrices] = useState<RegionPrice[]>([]);
  const [languagePrices, setLanguagePrices] = useState<LanguagePrice[]>([]);
  const [dirty, setDirty] = useState(false);

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

  useEffect(() => {
    if (module) {
      const yearlyDiscount =
        module.monthlyPrice > 0 && module.yearlyPrice > 0
          ? Math.round((1 - module.yearlyPrice / (module.monthlyPrice * 12)) * 100)
          : 20;
      reset({
        basePrice: module.monthlyPrice,
        yearlyDiscount,
        trialDays: 14,
        isActive: module.isActive,
        isFree: module.monthlyPrice === 0,
      });
      setRegionPrices(module.regionPrices ?? []);
      setLanguagePrices(module.languagePrices ?? []);
      setDirty(false);
    }
  }, [module, reset]);

  const isFree = watch('isFree');
  const isActive = watch('isActive');
  const basePrice = watch('basePrice');
  const yearlyDiscount = watch('yearlyDiscount');

  const yearlyPrice =
    isFree || !basePrice
      ? 0
      : Math.round(basePrice * 12 * (1 - (yearlyDiscount ?? 20) / 100) * 100) / 100;

  const addRegionPrice = () => {
    // Find a country not yet added
    const used = new Set(regionPrices.map((r) => r.countryCode));
    const available = COMMON_REGIONS.find((r) => !used.has(r.code));
    setRegionPrices((prev) => [
      ...prev,
      {
        countryCode: available?.code ?? '',
        price: basePrice ?? 0,
        currency: available?.currency ?? 'USD',
      },
    ]);
    setDirty(true);
  };

  const removeRegionPrice = (index: number) => {
    setRegionPrices((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const updateRegionPrice = (index: number, field: keyof RegionPrice, value: string | number) => {
    setRegionPrices((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        const updated = { ...r, [field]: value };
        // Auto-set currency when selecting from COMMON_REGIONS
        if (field === 'countryCode') {
          const region = COMMON_REGIONS.find((cr) => cr.code === value);
          if (region) updated.currency = region.currency;
        }
        return updated;
      }),
    );
    setDirty(true);
  };

  const addLanguagePrice = () => {
    const used = new Set(languagePrices.map((lp) => lp.languageCode));
    const available = COMMON_LANGUAGES.find((l) => !used.has(l.code));
    setLanguagePrices((prev) => [
      ...prev,
      {
        languageCode: available?.code ?? '',
        price: basePrice ?? 0,
        isActive: true,
        regionPrices: [],
      },
    ]);
    setDirty(true);
  };

  const removeLanguagePrice = (index: number) => {
    setLanguagePrices((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const updateLanguagePrice = (
    index: number,
    field: keyof LanguagePrice,
    value: string | number | boolean,
  ) => {
    setLanguagePrices((prev) =>
      prev.map((lp, i) => (i === index ? { ...lp, [field]: value } : lp)),
    );
    setDirty(true);
  };

  const addLangRegionPrice = (langIdx: number) => {
    setLanguagePrices((prev) =>
      prev.map((lp, i) => {
        if (i !== langIdx) return lp;
        const used = new Set((lp.regionPrices ?? []).map((r) => r.countryCode));
        const available = COMMON_REGIONS.find((r) => !used.has(r.code));
        return {
          ...lp,
          regionPrices: [
            ...(lp.regionPrices ?? []),
            {
              countryCode: available?.code ?? '',
              price: lp.price,
              currency: available?.currency ?? 'USD',
            },
          ],
        };
      }),
    );
    setDirty(true);
  };

  const removeLangRegionPrice = (langIdx: number, regionIdx: number) => {
    setLanguagePrices((prev) =>
      prev.map((lp, i) =>
        i === langIdx
          ? { ...lp, regionPrices: (lp.regionPrices ?? []).filter((_, ri) => ri !== regionIdx) }
          : lp,
      ),
    );
    setDirty(true);
  };

  const updateLangRegionPrice = (
    langIdx: number,
    regionIdx: number,
    field: keyof RegionPrice,
    value: string | number,
  ) => {
    setLanguagePrices((prev) =>
      prev.map((lp, i) => {
        if (i !== langIdx) return lp;
        const regions = (lp.regionPrices ?? []).map((r, ri) => {
          if (ri !== regionIdx) return r;
          const updated = { ...r, [field]: value };
          if (field === 'countryCode') {
            const region = COMMON_REGIONS.find((cr) => cr.code === value);
            if (region) updated.currency = region.currency;
          }
          return updated;
        });
        return { ...lp, regionPrices: regions };
      }),
    );
    setDirty(true);
  };

  const onSubmit = (values: FormValues) => {
    if (!module) return;
    updatePricing.mutate(
      {
        slug: module.slug,
        basePrice: values.isFree ? 0 : values.basePrice,
        yearlyDiscount: values.yearlyDiscount,
        isActive: values.isActive,
        isFree: values.isFree,
        trialDays: values.trialDays,
        regionPrices:
          values.isFree || module.slug === 'language_pack'
            ? []
            : regionPrices.filter((r) => r.countryCode && r.price >= 0),
        ...(module.slug === 'language_pack' && {
          languagePrices: languagePrices.filter((lp) => lp.languageCode),
        }),
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Dialog open={!!module} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Pricing — {module?.name}</DialogTitle>
          <DialogDescription>{module?.slug}</DialogDescription>
        </DialogHeader>

        {module && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Free toggle */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700">
              <div>
                <Label>Free Module</Label>
                <p className="text-xs text-gray-500">Core modules should be free</p>
              </div>
              <Switch
                checked={isFree}
                onCheckedChange={(v) => setValue('isFree', v, { shouldDirty: true })}
              />
            </div>

            {!isFree && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-basePrice">Global Monthly Price (USD) *</Label>
                  <Input
                    id="edit-basePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('basePrice', { valueAsNumber: true })}
                  />
                  {errors.basePrice && (
                    <p className="text-xs text-red-500">{errors.basePrice.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-yearlyDiscount">Yearly Discount (%) *</Label>
                  <Input
                    id="edit-yearlyDiscount"
                    type="number"
                    min="0"
                    max="100"
                    {...register('yearlyDiscount', { valueAsNumber: true })}
                  />
                  {errors.yearlyDiscount && (
                    <p className="text-xs text-red-500">{errors.yearlyDiscount.message}</p>
                  )}
                </div>

                {/* Live preview */}
                <div className="rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Preview</p>
                  <div className="mt-1 flex items-baseline gap-4">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      ${basePrice ?? 0}/mo
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ${yearlyPrice}/yr ({yearlyDiscount ?? 20}% off)
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-trialDays">Trial Days</Label>
                  <Input
                    id="edit-trialDays"
                    type="number"
                    min="0"
                    max="365"
                    {...register('trialDays', { valueAsNumber: true })}
                  />
                </div>

                {/* Region Prices — hidden for language_pack (uses per-language region overrides instead) */}
                {module.slug !== 'language_pack' && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Region Pricing</Label>
                          <p className="text-xs text-gray-500">
                            Set different prices per country. Overrides the global price.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={addRegionPrice}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add
                        </Button>
                      </div>

                      {regionPrices.length === 0 && (
                        <p className="py-2 text-center text-xs text-gray-400">
                          No region overrides — all countries use the global price above.
                        </p>
                      )}

                      {regionPrices.map((rp, idx) => (
                        <div
                          key={idx}
                          className="flex items-end gap-2 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-gray-700"
                        >
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Country</Label>
                            <select
                              className="h-9 w-full rounded-md border border-gray-200 bg-transparent px-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:text-white dark:bg-gray-800"
                              value={rp.countryCode}
                              onChange={(e) =>
                                updateRegionPrice(idx, 'countryCode', e.target.value)
                              }
                            >
                              <option value="">Select...</option>
                              {COMMON_REGIONS.map((cr) => (
                                <option
                                  key={cr.code}
                                  value={cr.code}
                                  disabled={regionPrices.some(
                                    (r, i) => i !== idx && r.countryCode === cr.code,
                                  )}
                                >
                                  {cr.label} ({cr.code})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="w-24 space-y-1">
                            <Label className="text-xs">Price</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={rp.price}
                              onChange={(e) =>
                                updateRegionPrice(idx, 'price', Number(e.target.value))
                              }
                            />
                          </div>
                          <div className="w-20 space-y-1">
                            <Label className="text-xs">Currency</Label>
                            <Input
                              value={rp.currency}
                              maxLength={3}
                              onChange={(e) =>
                                updateRegionPrice(idx, 'currency', e.target.value.toUpperCase())
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 text-gray-400 hover:text-red-500"
                            onClick={() => removeRegionPrice(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Language Pricing — only for language_pack module */}
            {module.slug === 'language_pack' && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Language Pricing</Label>
                      <p className="text-xs text-gray-500">
                        Set individual prices per language add-on.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={addLanguagePrice}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </div>

                  {languagePrices.length === 0 && (
                    <p className="py-2 text-center text-xs text-gray-400">
                      No per-language prices configured.
                    </p>
                  )}

                  {languagePrices.map((lp, idx) => (
                    <div
                      key={idx}
                      className="space-y-2 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-gray-700"
                    >
                      <div className="flex items-end gap-2">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Language</Label>
                          <select
                            className="h-9 w-full rounded-md border border-gray-200 bg-transparent px-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:text-white dark:bg-gray-800"
                            value={lp.languageCode}
                            onChange={(e) =>
                              updateLanguagePrice(idx, 'languageCode', e.target.value)
                            }
                          >
                            <option value="">Select...</option>
                            {COMMON_LANGUAGES.map((cl) => (
                              <option
                                key={cl.code}
                                value={cl.code}
                                disabled={languagePrices.some(
                                  (l, i) => i !== idx && l.languageCode === cl.code,
                                )}
                              >
                                {cl.label} ({cl.code})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24 space-y-1">
                          <Label className="text-xs">Base Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={lp.price}
                            onChange={(e) =>
                              updateLanguagePrice(idx, 'price', Number(e.target.value))
                            }
                          />
                        </div>
                        <div className="flex h-9 items-center">
                          <Switch
                            checked={lp.isActive}
                            onCheckedChange={(v) => updateLanguagePrice(idx, 'isActive', v)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 text-gray-400 hover:text-red-500"
                          onClick={() => removeLanguagePrice(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {/* Per-language region overrides */}
                      <div className="ml-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-gray-500">
                            Region overrides
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 px-1.5 text-[11px]"
                            onClick={() => addLangRegionPrice(idx)}
                          >
                            <Plus className="h-3 w-3" />
                            Add region
                          </Button>
                        </div>
                        {(lp.regionPrices ?? []).map((rp, ri) => (
                          <div key={ri} className="flex items-end gap-1.5">
                            <select
                              className="h-8 flex-1 rounded border border-gray-200 bg-transparent px-1.5 text-xs dark:border-gray-700 dark:text-white dark:bg-gray-800"
                              value={rp.countryCode}
                              onChange={(e) =>
                                updateLangRegionPrice(idx, ri, 'countryCode', e.target.value)
                              }
                            >
                              <option value="">...</option>
                              {COMMON_REGIONS.map((cr) => (
                                <option
                                  key={cr.code}
                                  value={cr.code}
                                  disabled={(lp.regionPrices ?? []).some(
                                    (r, i) => i !== ri && r.countryCode === cr.code,
                                  )}
                                >
                                  {cr.label}
                                </option>
                              ))}
                            </select>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="h-8 w-20 text-xs"
                              value={rp.price}
                              onChange={(e) =>
                                updateLangRegionPrice(idx, ri, 'price', Number(e.target.value))
                              }
                            />
                            <Input
                              className="h-8 w-14 text-xs"
                              value={rp.currency}
                              maxLength={3}
                              onChange={(e) =>
                                updateLangRegionPrice(
                                  idx,
                                  ri,
                                  'currency',
                                  e.target.value.toUpperCase(),
                                )
                              }
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                              onClick={() => removeLangRegionPrice(idx, ri)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-gray-500">Inactive modules won't appear for tenants</p>
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
              <Button type="submit" disabled={(!isDirty && !dirty) || updatePricing.isPending}>
                {updatePricing.isPending ? 'Saving…' : 'Save Pricing'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
