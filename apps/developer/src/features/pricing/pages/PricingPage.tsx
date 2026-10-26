import { lazy, Suspense, useState } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  Tag,
  Percent,
  Calculator,
  CheckCircle2,
  XCircle,
  Gift,
  TrendingUp,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { Button, ConfirmDialog, toast } from '@dento/ui';
import {
  useModulePricing,
  useCoupons,
  useGlobalDiscounts,
  usePricingStats,
  useDeleteCoupon,
  useDeleteDiscount,
} from '../hooks/usePricing.js';
import type { ModulePricingItem, Coupon, GlobalDiscount } from '../hooks/usePricing.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';
import { formatDateShort as formatDate } from '../../../lib/date.js';

const EditModulePriceDialog = lazy(() =>
  import('../components/EditModulePriceDialog.js').then((m) => ({
    default: m.EditModulePriceDialog,
  })),
);
const CreateCouponDialog = lazy(() =>
  import('../components/CreateCouponDialog.js').then((m) => ({ default: m.CreateCouponDialog })),
);
const EditCouponDialog = lazy(() =>
  import('../components/EditCouponDialog.js').then((m) => ({ default: m.EditCouponDialog })),
);
const CreateDiscountDialog = lazy(() =>
  import('../components/CreateDiscountDialog.js').then((m) => ({
    default: m.CreateDiscountDialog,
  })),
);
const EditDiscountDialog = lazy(() =>
  import('../components/EditDiscountDialog.js').then((m) => ({ default: m.EditDiscountDialog })),
);
const PriceCalculatorDialog = lazy(() =>
  import('../components/PriceCalculatorDialog.js').then((m) => ({
    default: m.PriceCalculatorDialog,
  })),
);

// -- Types (alias for display config) -----------------------------------
type BillingCycle = 'monthly' | 'yearly';

// -- Component ----------------------------------------------------------

export default function PricingPage() {
  const [tab, setTab] = useState<'modules' | 'coupons' | 'discounts'>('modules');
  const [search, setSearch] = useState('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  // Dialog state
  const [editModule, setEditModule] = useState<ModulePricingItem | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [createCouponOpen, setCreateCouponOpen] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [deleteCouponTarget, setDeleteCouponTarget] = useState<Coupon | null>(null);
  const [createDiscountOpen, setCreateDiscountOpen] = useState(false);
  const [editDiscount, setEditDiscount] = useState<GlobalDiscount | null>(null);
  const [deleteDiscountTarget, setDeleteDiscountTarget] = useState<GlobalDiscount | null>(null);

  const {
    data: modulesData,
    isLoading: modulesLoading,
    isError: modulesError,
    refetch: refetchModules,
  } = useModulePricing();
  const { data: couponsData } = useCoupons();
  const { data: discountsData } = useGlobalDiscounts();
  const { data: statsData } = usePricingStats();
  const deleteCoupon = useDeleteCoupon();
  const deleteDiscount = useDeleteDiscount();

  const modules = modulesData ?? [];
  const coupons = couponsData ?? [];
  const discounts = discountsData ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Pricing</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage module pricing, coupons, and volume discounts — §32
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={() => refetchModules()}
          >
            <RefreshCw className={`h-4 w-4 ${modulesLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="default" className="gap-2 py-2.5" onClick={() => setCalcOpen(true)}>
            <Calculator className="h-4 w-4" />
            Price Calculator
          </Button>
        </div>
      </div>

      {modulesError && <QueryErrorBanner onRetry={() => refetchModules()} />}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Avg Revenue/Tenant',
            value: statsData?.avgRevenuePerTenant ?? '—',
            icon: TrendingUp,
            color: 'text-green-500',
          },
          {
            label: 'Active Modules',
            value: statsData?.activeModules ?? '—',
            icon: Package,
            color: 'text-brand-500',
          },
          {
            label: 'Active Coupons',
            value: statsData?.activeCoupons ?? '—',
            icon: Gift,
            color: 'text-purple-500',
          },
          {
            label: 'Projected MRR',
            value: statsData?.monthlyProjectedRevenue ?? '—',
            icon: DollarSign,
            color: 'text-amber-500',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-6">
          {(
            [
              { key: 'modules', label: 'Module Pricing', icon: Package },
              { key: 'coupons', label: 'Coupons', icon: Tag },
              { key: 'discounts', label: 'Global Discounts', icon: Percent },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant="ghost"
              onClick={() => {
                setTab(key);
                setSearch('');
              }}
              className={`h-auto rounded-none px-1 py-0 pb-3 gap-2 border-b-2 hover:bg-transparent ${
                tab === key
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Search + Billing Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={
              tab === 'modules'
                ? 'Search modules...'
                : tab === 'coupons'
                  ? 'Search coupon codes...'
                  : 'Search discounts...'
            }
            aria-label="Search pricing"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 ps-10 pe-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
        </div>
        {tab === 'modules' && (
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
            {(['monthly', 'yearly'] as const).map((cycle) => (
              <Button
                key={cycle}
                variant="ghost"
                onClick={() => setBillingCycle(cycle)}
                className={`h-auto rounded-md py-1.5 hover:bg-transparent ${
                  billingCycle === cycle
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {cycle === 'monthly' ? 'Monthly' : 'Yearly (save ~17%)'}
              </Button>
            ))}
          </div>
        )}
        {tab === 'coupons' && (
          <Button
            variant="outline"
            className="gap-2 py-2.5 border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={() => setCreateCouponOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Coupon
          </Button>
        )}
        {tab === 'discounts' && (
          <Button
            variant="outline"
            className="gap-2 py-2.5 border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={() => setCreateDiscountOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Discount
          </Button>
        )}
      </div>

      {/* Modules Tab */}
      {tab === 'modules' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {modules
            .filter(
              (m) =>
                !search ||
                m.name.toLowerCase().includes(search.toLowerCase()) ||
                m.slug.includes(search.toLowerCase()),
            )
            .map((mod) => (
              <div
                key={mod.id}
                className={`rounded-xl border bg-white p-5 dark:bg-gray-900 ${mod.isActive ? 'border-gray-200 dark:border-gray-700' : 'border-dashed border-gray-300 opacity-60 dark:border-gray-600'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/30">
                      <Package className="h-5 w-5 text-brand-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{mod.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{mod.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {mod.isActive ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        Inactive
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-auto w-auto p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                      aria-label="Edit module"
                      onClick={() => setEditModule(mod)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{mod.description}</p>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      ${billingCycle === 'monthly' ? mod.monthlyPrice : mod.yearlyPrice}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {mod.regionPrices?.length > 0 && (
                      <span className="rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                        {mod.regionPrices.length} region{mod.regionPrices.length > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      Up to {mod.usageLimitValue.toLocaleString()} {mod.usageLimitLabel}
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Coupons Tab */}
      {tab === 'coupons' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <tr>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Code</th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Discount
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Usage</th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Expires
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {coupons
                  .filter((c) => !search || c.code.toLowerCase().includes(search.toLowerCase()))
                  .map((coupon) => (
                    <tr key={coupon._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-brand-50 px-2 py-0.5 text-sm font-bold font-mono text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                            {coupon.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-auto w-auto p-0 text-gray-400 hover:text-gray-600 hover:bg-transparent dark:hover:text-gray-300"
                            title="Copy"
                            aria-label="Copy coupon code"
                            onClick={() => {
                              navigator.clipboard.writeText(coupon.code);
                              toast.success('Copied to clipboard');
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                        {coupon.discountPercent}%
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 dark:text-white">{coupon.usedCount}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {coupon.maxUses === 0 ? '∞' : coupon.maxUses}
                          </span>
                          {coupon.maxUses > 0 && (
                            <div className="h-1.5 w-16 rounded-full bg-gray-200 dark:bg-gray-700">
                              <div
                                className="h-1.5 rounded-full bg-brand-500"
                                style={{
                                  width: `${Math.min((coupon.usedCount / coupon.maxUses) * 100, 100)}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                        {formatDate(coupon.expiresAt)}
                      </td>
                      <td className="px-5 py-3">
                        {coupon.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                            <XCircle className="h-3 w-3" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-auto w-auto p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                            aria-label="Edit coupon"
                            onClick={() => setEditCoupon(coupon)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-auto w-auto p-1.5 rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                            aria-label="Delete coupon"
                            onClick={() => setDeleteCouponTarget(coupon)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {coupons.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500">
                      No coupons yet. Click "Add Coupon" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Global Discounts Tab */}
      {tab === 'discounts' && (
        <div className="space-y-4">
          {discounts
            .filter((d) => !search || d.name.toLowerCase().includes(search.toLowerCase()))
            .map((disc) => (
              <div
                key={disc._id}
                className={`rounded-xl border bg-white p-5 dark:bg-gray-900 ${disc.isActive ? 'border-gray-200 dark:border-gray-700' : 'border-dashed border-gray-300 opacity-60 dark:border-gray-600'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                      <Percent className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{disc.name}</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                      -{disc.discountPercent}%
                    </span>
                    {disc.isActive ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        Inactive
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-auto w-auto p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                      aria-label="Edit discount"
                      onClick={() => setEditDiscount(disc)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-auto w-auto p-1 rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      aria-label="Delete discount"
                      onClick={() => setDeleteDiscountTarget(disc)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>
                    {formatDate(disc.startsAt)} — {formatDate(disc.expiresAt)}
                  </span>
                </div>
              </div>
            ))}
          {discounts.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center dark:border-gray-600">
              <p className="text-sm text-gray-500">
                No global discounts yet. Click "Add Discount" to create one.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── Dialogs ─────────────────────────────────────── */}
      <Suspense fallback={null}>
        <EditModulePriceDialog module={editModule} onClose={() => setEditModule(null)} />
        <PriceCalculatorDialog open={calcOpen} onOpenChange={setCalcOpen} modules={modules} />
        <CreateCouponDialog open={createCouponOpen} onOpenChange={setCreateCouponOpen} />
        <EditCouponDialog coupon={editCoupon} onClose={() => setEditCoupon(null)} />
        <CreateDiscountDialog open={createDiscountOpen} onOpenChange={setCreateDiscountOpen} />
        <EditDiscountDialog discount={editDiscount} onClose={() => setEditDiscount(null)} />
      </Suspense>

      <ConfirmDialog
        open={!!deleteCouponTarget}
        onOpenChange={(open) => !open && setDeleteCouponTarget(null)}
        title={`Delete coupon "${deleteCouponTarget?.code ?? ''}"?`}
        description="This will permanently remove this coupon. Any tenant using it will lose the discount on their next billing cycle."
        variant="destructive"
        confirmLabel="Delete Coupon"
        onConfirm={() => {
          if (deleteCouponTarget) {
            deleteCoupon.mutate(deleteCouponTarget._id, {
              onSuccess: () => setDeleteCouponTarget(null),
            });
          }
        }}
      />

      <ConfirmDialog
        open={!!deleteDiscountTarget}
        onOpenChange={(open) => !open && setDeleteDiscountTarget(null)}
        title={`Delete discount "${deleteDiscountTarget?.name ?? ''}"?`}
        description="This will permanently remove this global discount."
        variant="destructive"
        confirmLabel="Delete Discount"
        onConfirm={() => {
          if (deleteDiscountTarget) {
            deleteDiscount.mutate(deleteDiscountTarget._id, {
              onSuccess: () => setDeleteDiscountTarget(null),
            });
          }
        }}
      />
    </div>
  );
}
