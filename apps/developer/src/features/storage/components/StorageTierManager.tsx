/**
 * StorageTierManager — CRUD interface for platform storage tiers
 *
 * Allows creating, editing, and deactivating storage tiers + region prices.
 */

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Skeleton,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Switch,
  cn,
} from '@dento/ui';
import { HardDrive, Plus, Pencil, Trash2, Globe } from 'lucide-react';
import type { IStorageTier, IRegionPrice } from '@dento/shared';
import {
  useStorageTiers,
  useCreateStorageTier,
  useUpdateStorageTier,
  useUpdateRegionPrices,
  type CreateStorageTierInput,
} from '../hooks/useStorageTiers.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import { storageTierKeys } from '../hooks/useStorageTiers.js';
import { toast } from '@dento/ui';
import { useRegionOptions, useCurrencyOptions } from '../../../hooks/useCountryConfigs.js';

/* ------------------------------------------------------------------ */
/*  Tier Form                                                          */
/* ------------------------------------------------------------------ */

interface TierFormData {
  name: string;
  storageLimitGB: string;
  pricePerMonth: string;
  currency: string;
  isCustom: boolean;
  sortOrder: string;
}

const emptyForm: TierFormData = {
  name: '',
  storageLimitGB: '',
  pricePerMonth: '0',
  currency: 'EUR',
  isCustom: false,
  sortOrder: '0',
};

function tierToForm(tier: IStorageTier): TierFormData {
  return {
    name: tier.name,
    storageLimitGB: String(tier.storageLimitGB),
    pricePerMonth: String(tier.pricePerMonth),
    currency: tier.currency,
    isCustom: tier.isCustom,
    sortOrder: String(tier.sortOrder),
  };
}

/* ------------------------------------------------------------------ */
/*  Region Price Editor                                                */
/* ------------------------------------------------------------------ */

function RegionPriceEditor({
  tierId,
  regionPrices,
}: {
  tierId: string;
  regionPrices: IRegionPrice[];
}) {
  const COMMON_REGIONS = useRegionOptions();
  const currencyOpts = useCurrencyOptions();
  const SUPPORTED_CURRENCIES = currencyOpts.map((c) => c.code);
  const [prices, setPrices] = useState<IRegionPrice[]>(regionPrices);
  const [newCountry, setNewCountry] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCurrency, setNewCurrency] = useState('');
  const updateMutation = useUpdateRegionPrices(tierId);

  // Auto-fill currency when country is selected
  function handleCountryChange(code: string) {
    setNewCountry(code);
    const region = COMMON_REGIONS.find((r) => r.code === code);
    if (region) setNewCurrency(region.currency);
  }

  function handleAdd() {
    if (!newCountry || !newPrice || !newCurrency) return;
    setPrices((prev) => [
      ...prev,
      { countryCode: newCountry.toUpperCase(), price: Number(newPrice), currency: newCurrency },
    ]);
    setNewCountry('');
    setNewPrice('');
    setNewCurrency('');
  }

  function handleRemove(idx: number) {
    setPrices((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSave() {
    updateMutation.mutate(prices);
  }

  // Countries already added — disable in the dropdown
  const usedCountries = prices.map((p) => p.countryCode);

  return (
    <div className="space-y-3">
      <div className="text-muted-foreground text-xs font-medium uppercase">Region Prices</div>

      {prices.map((rp, idx) => (
        <div key={`${rp.countryCode}-${idx}`} className="flex items-center gap-2">
          <Badge variant="outline">{rp.countryCode}</Badge>
          <span className="text-sm tabular-nums">
            {rp.price} {rp.currency}
          </span>
          <Button variant="ghost" size="sm" onClick={() => handleRemove(idx)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}

      <div className="flex items-end gap-2">
        <div>
          <Label className="text-xs">Country</Label>
          <select
            value={newCountry}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="h-8 w-40 rounded-md border border-gray-200 bg-transparent px-2 text-sm dark:border-gray-700 dark:text-gray-200"
          >
            <option value="">Select...</option>
            {COMMON_REGIONS.map((cr) => (
              <option key={cr.code} value={cr.code} disabled={usedCountries.includes(cr.code)}>
                {cr.label} ({cr.code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Price</Label>
          <Input
            type="number"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            placeholder="0"
            className="h-8 w-20"
          />
        </div>
        <div>
          <Label className="text-xs">Currency</Label>
          <select
            value={newCurrency}
            onChange={(e) => setNewCurrency(e.target.value)}
            className="h-8 w-24 rounded-md border border-gray-200 bg-transparent px-2 text-sm dark:border-gray-700 dark:text-gray-200"
          >
            <option value="">Select...</option>
            {SUPPORTED_CURRENCIES.map((cur) => (
              <option key={cur} value={cur}>
                {cur}
              </option>
            ))}
          </select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={!newCountry || !newPrice || !newCurrency}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? 'Saving...' : 'Save Region Prices'}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function StorageTierManager() {
  const { data: tiers, isLoading } = useStorageTiers();
  const currencyOpts = useCurrencyOptions();
  const SUPPORTED_CURRENCIES = currencyOpts.map((c) => c.code);
  const [showForm, setShowForm] = useState(false);
  const [editingTier, setEditingTier] = useState<IStorageTier | null>(null);
  const [expandedTier, setExpandedTier] = useState<string | null>(null);
  const [form, setForm] = useState<TierFormData>(emptyForm);

  const createMutation = useCreateStorageTier();
  const updateMutation = useUpdateStorageTier(editingTier?._id ?? '');
  const qc = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: async (tierId: string) => {
      await apiClient.delete(`/api/platform/storage-tiers/${tierId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: storageTierKeys.all });
      toast.success('Storage tier deactivated');
    },
    onError: () => {
      toast.error('Failed to deactivate storage tier');
    },
  });

  function openCreate() {
    setEditingTier(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(tier: IStorageTier) {
    setEditingTier(tier);
    setForm(tierToForm(tier));
    setShowForm(true);
  }

  function handleSubmit() {
    const input: CreateStorageTierInput = {
      name: form.name,
      storageLimitGB: Number(form.storageLimitGB),
      pricePerMonth: Number(form.pricePerMonth),
      currency: form.currency,
      isCustom: form.isCustom,
      sortOrder: Number(form.sortOrder),
    };

    if (editingTier) {
      updateMutation.mutate(input, { onSuccess: () => setShowForm(false) });
    } else {
      createMutation.mutate(input, { onSuccess: () => setShowForm(false) });
    }
  }

  function handleDelete(tierId: string) {
    if (!confirm('Deactivate this storage tier?')) return;
    deleteMutation.mutate(tierId);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Tiers
          </CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="me-1 h-4 w-4" />
            Add Tier
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={`tier-sk-${i}`} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : !tiers?.length ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No storage tiers configured. Create one to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {tiers.map((tier) => (
              <div
                key={tier._id}
                className={cn(
                  'rounded-lg border p-4 transition-colors',
                  tier.isDefault && 'border-primary/30 bg-primary/5',
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tier.name}</span>
                        {tier.isDefault && (
                          <Badge variant="default" className="text-xs">
                            Default
                          </Badge>
                        )}
                        {tier.isCustom && (
                          <Badge variant="secondary" className="text-xs">
                            Custom
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {tier.storageLimitGB} GB —{' '}
                        {tier.pricePerMonth === 0
                          ? 'Free'
                          : `${tier.pricePerMonth} ${tier.currency}/mo`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedTier(expandedTier === tier._id ? null : tier._id)}
                    >
                      <Globe className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(tier)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!tier.isDefault && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(tier._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Region Prices Expansion */}
                {expandedTier === tier._id && (
                  <div className="mt-4 border-t pt-4">
                    <RegionPriceEditor tierId={tier._id} regionPrices={tier.regionPrices ?? []} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTier ? 'Edit Storage Tier' : 'Create Storage Tier'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Basic, Professional"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Storage Limit (GB)</Label>
                <Input
                  type="number"
                  value={form.storageLimitGB}
                  onChange={(e) => setForm((f) => ({ ...f, storageLimitGB: e.target.value }))}
                />
              </div>
              <div>
                <Label>Price / Month</Label>
                <Input
                  type="number"
                  value={form.pricePerMonth}
                  onChange={(e) => setForm((f) => ({ ...f, pricePerMonth: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Currency</Label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm dark:border-gray-700 dark:text-gray-200"
                >
                  {SUPPORTED_CURRENCIES.map((cur) => (
                    <option key={cur} value={cur}>
                      {cur}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isCustom}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, isCustom: checked }))}
              />
              <Label>Custom Tier (developer sets size per tenant)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
