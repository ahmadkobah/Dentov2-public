/**
 * CurrenciesTab — Base currency + exchange rates management
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 2.9
 * Enhanced with live exchange rate fetching via exchangerate-api.com
 */

import { useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Label,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@dento/ui';
import {
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Coins,
  RefreshCw,
  Loader2,
  Globe,
  Search,
  Check,
  ArrowUpDown,
} from 'lucide-react';
import type { Currencies, ExchangeRate, UpdateCurrenciesInput } from '@dento/shared';
import {
  useUpdateCurrencies,
  useRefreshExchangeRates,
  useAvailableRates,
} from '../hooks/useSystemSettings.js';

interface Props {
  currencies: Currencies;
}

export function CurrenciesTab({ currencies }: Props) {
  const updateMutation = useUpdateCurrencies();
  const refreshMutation = useRefreshExchangeRates();

  const [baseCurrency, setBaseCurrency] = useState(currencies.baseCurrency);
  const [rates, setRates] = useState<ExchangeRate[]>([...(currencies.exchangeRates ?? [])]);

  // Browse all currencies panel
  const [showBrowser, setShowBrowser] = useState(false);
  const [browserSearch, setBrowserSearch] = useState('');

  // Fetch all available rates when browser is open
  const { data: availableData, isLoading: isLoadingAvailable } = useAvailableRates(
    baseCurrency,
    showBrowser,
  );

  const isDirty =
    baseCurrency !== currencies.baseCurrency ||
    JSON.stringify(rates) !== JSON.stringify(currencies.exchangeRates);

  const handleReset = () => {
    setBaseCurrency(currencies.baseCurrency);
    setRates([...(currencies.exchangeRates ?? [])]);
  };

  const handleRemoveRate = (currency: string) => {
    setRates((prev) => prev.filter((r) => r.currency !== currency));
  };

  const handleRateChange = (currency: string, rate: string) => {
    const num = parseFloat(rate);
    if (isNaN(num)) return;
    setRates((prev) => prev.map((r) => (r.currency === currency ? { ...r, rate: num } : r)));
  };

  const handleAddFromBrowser = (code: string, rate: number) => {
    if (rates.some((r) => r.currency === code)) return;
    setRates((prev) => [...prev, { currency: code, rate }]);
  };

  const handleSave = () => {
    const updates: UpdateCurrenciesInput = {};
    if (baseCurrency !== currencies.baseCurrency) updates.baseCurrency = baseCurrency;
    if (JSON.stringify(rates) !== JSON.stringify(currencies.exchangeRates)) {
      updates.exchangeRates = rates;
    }
    if (Object.keys(updates).length > 0) updateMutation.mutate(updates);
  };

  const handleRefreshRates = () => {
    refreshMutation.mutate();
  };

  // Filter available currencies for the browser
  const trackedCodes = useMemo(() => new Set(rates.map((r) => r.currency)), [rates]);
  const filteredAvailable = useMemo(() => {
    if (!availableData?.rates) return [];
    return Object.entries(availableData.rates)
      .filter(([code]) => code !== baseCurrency)
      .filter(
        ([code]) => !browserSearch || code.toLowerCase().includes(browserSearch.toLowerCase()),
      )
      .sort(([a], [b]) => a.localeCompare(b));
  }, [availableData, baseCurrency, browserSearch]);

  // Format relative time for last update
  const lastUpdateLabel = currencies.lastUpdatedAt
    ? formatTimeAgo(new Date(currencies.lastUpdatedAt))
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Currencies &amp; Exchange Rates
              </CardTitle>
              <CardDescription>
                Set the base currency and manage exchange rates. Rates auto-refresh daily at 06:00
                UTC or can be refreshed manually.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={handleRefreshRates}
              disabled={refreshMutation.isPending}
              className="gap-2"
            >
              {refreshMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh Live Rates
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Base Currency + Status Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <Label htmlFor="cur-base">Base Currency</Label>
              <Input
                id="cur-base"
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value.toUpperCase())}
                className="w-24"
                maxLength={3}
                placeholder="SAR"
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Badge variant="secondary">
                {rates.length} rate{rates.length !== 1 ? 's' : ''}
              </Badge>
              {lastUpdateLabel && (
                <Badge variant="outline" className="gap-1 text-xs font-normal">
                  <Globe className="h-3 w-3" />
                  Updated {lastUpdateLabel}
                </Badge>
              )}
            </div>
          </div>

          {/* Exchange Rates Table */}
          {rates.length > 0 && (
            <div className="rounded-lg border dark:border-gray-800">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Currency</TableHead>
                    <TableHead>
                      <span className="flex items-center gap-1">
                        <ArrowUpDown className="h-3 w-3" />
                        Rate (1 {baseCurrency} =)
                      </span>
                    </TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rates.map((rate) => (
                    <TableRow key={rate.currency}>
                      <TableCell>
                        <Badge variant="outline">{rate.currency}</Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.0001"
                          min={0}
                          value={rate.rate}
                          onChange={(e) => handleRateChange(rate.currency, e.target.value)}
                          className="max-w-40"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRate(rate.currency)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Empty state */}
          {rates.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center dark:border-gray-700">
              <Coins className="mb-3 h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 mb-2">No exchange rates configured.</p>
              <p className="text-xs text-gray-400 mb-4">
                Click "Refresh Live Rates" to auto-populate common currencies, or browse all
                available currencies below.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshRates}
                disabled={refreshMutation.isPending}
              >
                {refreshMutation.isPending ? (
                  <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="me-1.5 h-4 w-4" />
                )}
                Auto-populate Rates
              </Button>
            </div>
          )}

          {/* Browse All Currencies */}
          <div className="border-t pt-4 dark:border-gray-800">
            <Button variant="outline" onClick={() => setShowBrowser((v) => !v)} className="gap-2">
              <Globe className="h-4 w-4" />
              {showBrowser ? 'Hide Currency Browser' : 'Browse All Currencies'}
            </Button>

            {showBrowser && (
              <div className="mt-4 rounded-lg border p-4 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={browserSearch}
                      onChange={(e) => setBrowserSearch(e.target.value.toUpperCase())}
                      placeholder="Search currency code..."
                      className="ps-9"
                      maxLength={10}
                    />
                  </div>
                  <span className="text-xs text-gray-500">
                    {filteredAvailable.length} currencies available
                  </span>
                </div>

                {isLoadingAvailable ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ms-2 text-sm text-gray-500">
                      Fetching rates for {baseCurrency}...
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 max-h-64 overflow-y-auto">
                    {filteredAvailable.map(([code, rate]) => {
                      const isTracked = trackedCodes.has(code);
                      return (
                        <button
                          key={code}
                          disabled={isTracked}
                          onClick={() => handleAddFromBrowser(code, rate)}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 text-start text-sm transition-colors ${
                            isTracked
                              ? 'border-green-200 bg-green-50/50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-700 dark:hover:border-blue-800 dark:hover:bg-blue-950/30'
                          }`}
                        >
                          <div>
                            <span className="font-medium">{code}</span>
                            <span className="ms-2 text-xs text-gray-400">{rate.toFixed(4)}</span>
                          </div>
                          {isTracked ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Plus className="h-3.5 w-3.5 text-gray-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t pt-4 dark:border-gray-800">
            <Button variant="outline" disabled={!isDirty} onClick={handleReset}>
              <RotateCcw className="me-1.5 h-4 w-4" />
              Reset
            </Button>
            <Button disabled={!isDirty || updateMutation.isPending} onClick={handleSave}>
              <Save className="me-1.5 h-4 w-4" />
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
