import { Package, DollarSign, Clock, Tag } from 'lucide-react';
import { Button } from '@dento/ui';
import { useModules } from '../../modules/hooks/useModules.js';

export function ModulesTab({
  enabledModules,
  onToggle,
  isSaving,
  tenantCountry,
  tenantCurrency,
}: {
  enabledModules: string[];
  onToggle: (moduleId: string) => void;
  isSaving?: boolean;
  tenantCountry?: string;
  tenantCurrency?: string;
}) {
  const { data } = useModules({});
  const allModules = data?.items ?? [];

  /** Resolve the effective price for a module given the tenant's country */
  function resolvePrice(mod: (typeof allModules)[number]): { price: number; currency: string } {
    const regionPrices = (mod.pricing as unknown as Record<string, unknown>)?.regionPrices as
      | { countryCode: string; price: number; currency: string }[]
      | undefined;
    if (tenantCountry && regionPrices?.length) {
      const match = regionPrices.find(
        (r) => r.countryCode.toUpperCase() === tenantCountry.toUpperCase(),
      );
      if (match) return { price: match.price, currency: match.currency };
    }
    return { price: mod.pricing?.basePrice ?? 0, currency: tenantCurrency || 'USD' };
  }

  const activeCount = enabledModules.length;
  const moduleMrr = allModules
    .filter((m) => enabledModules.includes(m.slug))
    .reduce((sum, m) => sum + resolvePrice(m).price, 0);
  const onTrial = 0; // Trial tracking is per-tenant via TenantModule, not available here
  const overrides = 0; // Price overrides are per-tenant via TenantModule

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
              <Package className="h-5 w-5 text-brand-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Modules</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-50 dark:bg-success-500/10">
              <DollarSign className="h-5 w-5 text-success-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Module MRR</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {moduleMrr} {tenantCurrency || 'USD'}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-50 dark:bg-warning-500/10">
              <Clock className="h-5 w-5 text-warning-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">On Trial</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{onTrial}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-light-50 dark:bg-blue-light-500/10">
              <Tag className="h-5 w-5 text-blue-light-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Price Overrides</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{overrides}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Module Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {allModules.map((mod) => {
          const isEnabled = enabledModules.includes(mod.slug);
          const isFree = mod.pricing?.isFree || mod.type === 'core';
          const resolved = resolvePrice(mod);
          return (
            <div
              key={mod.slug}
              className={`rounded-2xl border p-4 shadow-theme-xs transition-colors dark:bg-gray-900 ${
                isEnabled
                  ? 'border-brand-200 bg-brand-50/30 dark:border-brand-500/30'
                  : 'border-gray-200 bg-white dark:border-gray-800'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{mod.name.en}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{mod.description.en}</p>
                </div>
                <Button
                  variant={isEnabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onToggle(mod.slug)}
                  disabled={mod.type === 'core' || isSaving}
                  className={mod.type === 'core' ? 'opacity-50' : ''}
                >
                  {mod.type === 'core' ? 'Core' : isEnabled ? 'Enabled' : 'Enable'}
                </Button>
              </div>
              <div className="flex items-center gap-3 text-sm">
                {isFree ? (
                  <span className="font-medium text-success-600 dark:text-success-400">Free</span>
                ) : (
                  <span className="text-gray-700 dark:text-gray-300">
                    {resolved.price} {resolved.currency}/mo
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
