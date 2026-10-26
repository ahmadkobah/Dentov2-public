import { useState } from 'react';
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
  Separator,
} from '@dento/ui';
import { Calculator, ArrowRight } from 'lucide-react';
import { useCalculatePrice } from '../hooks/usePricing.js';
import type { ModulePricingItem, PriceCalculation } from '../hooks/usePricing.js';

interface PriceCalculatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modules: ModulePricingItem[];
}

export function PriceCalculatorDialog({ open, onOpenChange, modules }: PriceCalculatorDialogProps) {
  const [tenantId, setTenantId] = useState('');
  const [moduleSlug, setModuleSlug] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [result, setResult] = useState<PriceCalculation | null>(null);

  const calculate = useCalculatePrice();

  const handleCalculate = () => {
    if (!tenantId || !moduleSlug) return;
    calculate.mutate(
      {
        tenantId,
        moduleSlug,
        couponCode: couponCode || undefined,
      },
      {
        onSuccess: (res) => {
          setResult(res.data.calculation);
        },
        onError: () => {
          setResult(null);
        },
      },
    );
  };

  const discountSourceLabels: Record<string, string> = {
    none: 'Standard Price',
    price_override: 'Tenant Price Override',
    coupon: 'Coupon Applied',
    tenant_discount: 'Tenant Discount',
    global_discount: 'Global Discount',
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setResult(null);
          setTenantId('');
          setModuleSlug('');
          setCouponCode('');
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Price Calculator
          </DialogTitle>
          <DialogDescription>
            Calculate the effective price for a specific tenant + module combination, including all
            applicable discounts (overrides, coupons, tenant discounts, global discounts).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="calc-tenant">Tenant ID *</Label>
            <Input
              id="calc-tenant"
              placeholder="Paste a tenant ObjectId..."
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="calc-module">Module *</Label>
            <select
              id="calc-module"
              value={moduleSlug}
              onChange={(e) => setModuleSlug(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              <option value="">Select a module...</option>
              {modules
                .filter((m) => m.isActive)
                .map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name} ({m.slug}) — ${m.monthlyPrice}/mo
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="calc-coupon">Coupon Code (optional)</Label>
            <Input
              id="calc-coupon"
              placeholder="e.g. WELCOME50"
              className="font-mono uppercase"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
            />
          </div>

          <Button
            className="w-full gap-2"
            disabled={!tenantId || !moduleSlug || calculate.isPending}
            onClick={handleCalculate}
          >
            {calculate.isPending ? 'Calculating…' : 'Calculate Price'}
          </Button>

          {/* Result */}
          {result && (
            <>
              <Separator />
              <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                {result.isFree ? (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">FREE</p>
                    <p className="text-sm text-gray-500">This is a core module — no charge</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Original</p>
                        <p
                          className={`text-lg font-mono font-semibold ${result.discount > 0 ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}
                        >
                          ${result.originalPrice.toFixed(2)}
                        </p>
                      </div>
                      {result.discount > 0 && (
                        <>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Final</p>
                            <p className="text-lg font-mono font-bold text-green-600 dark:text-green-400">
                              ${result.finalPrice.toFixed(2)}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {result.discount > 0 && (
                      <div className="space-y-1 text-center">
                        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                          -{result.discountPercent}% (${result.discount.toFixed(2)} off)
                        </p>
                        <p className="text-xs text-gray-500">
                          Source:{' '}
                          {discountSourceLabels[result.discountSource] ?? result.discountSource}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
