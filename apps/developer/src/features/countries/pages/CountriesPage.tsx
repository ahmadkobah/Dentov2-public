/**
 * CountriesPage — Developer Portal
 *
 * Manage platform country configs (locale, currency, timezone, phone, direction).
 * Countries added here automatically appear in all dropdowns across both apps.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  Separator,
  COUNTRIES,
} from '@dento/ui';
import {
  Plus,
  Loader2,
  Globe,
  Edit2,
  Trash2,
  Search,
  Save,
  Clock,
  DollarSign,
  ChevronsUpDown,
  Check,
  MapPin,
} from 'lucide-react';
import { autoFillFromCountry, DATE_FORMAT_OPTIONS } from '../data/country-metadata.js';
import {
  usePlatformCountryConfigs,
  useCreateCountryConfig,
  useUpdateCountryConfig,
  useDeleteCountryConfig,
} from '../../../hooks/useCountryConfigs.js';
import type { CountryConfig } from '@dento/shared';

// ── Helpers ─────────────────────────────────────────────────

const EMPTY_FORM: CountryFormData = {
  code: '',
  name: '',
  nameArabic: '',
  defaultLocale: 'en',
  supportedLocales: ['en', 'ar'],
  currency: { code: '', symbol: '', symbolPosition: 'before', decimalPlaces: 2 },
  timezone: '',
  dateFormat: 'dd/MM/yyyy',
  timeFormat: '12h',
  weekStart: 0,
  phoneCode: '',
  direction: 'ltr',
  isActive: true,
};

interface CountryFormData {
  code: string;
  name: string;
  nameArabic: string;
  defaultLocale: 'en' | 'ar';
  supportedLocales: ('en' | 'ar')[];
  currency: {
    code: string;
    symbol: string;
    symbolPosition: 'before' | 'after';
    decimalPlaces: number;
  };
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  weekStart: 0 | 1 | 5 | 6;
  phoneCode: string;
  direction: 'ltr' | 'rtl';
  isActive: boolean;
}

function getFlagEmoji(code: string): string {
  if (!code || code.length !== 2) return '🏳️';
  const codePoints = [...code.toUpperCase()].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// ── Country Search Picker ───────────────────────────────────

function CountrySearchPicker({
  onSelect,
}: {
  onSelect: (country: (typeof COUNTRIES)[number]) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <Label>Quick Fill from Country</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Search a country to auto-fill all fields…
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[460px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search by name, code, or phone…" />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {COUNTRIES.map((c) => (
                  <CommandItem
                    key={c.iso}
                    value={`${c.iso} ${c.name} ${c.dial}`}
                    onSelect={() => {
                      onSelect(c);
                      setOpen(false);
                    }}
                  >
                    <span className="mr-2 text-lg">{getFlagEmoji(c.iso)}</span>
                    <span className="flex-1">
                      {c.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {c.iso} · {c.dial}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground">
        Select a country to auto-fill code, name, currency, timezone, phone code, and locale
        settings.
      </p>
    </div>
  );
}

// ── Date Format Picker ──────────────────────────────────────

function DateFormatPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {DATE_FORMAT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label} ({opt.example})
        </option>
      ))}
    </select>
  );
}

// ── Timezone Picker Data ────────────────────────────────────

interface TimezoneEntry {
  iana: string;
  label: string; // "Africa/Cairo"
  city: string; // "Cairo"
  offset: string; // "UTC+02:00"
  offsetMinutes: number;
}

function buildTimezones(): TimezoneEntry[] {
  const zones: string[] = Intl.supportedValuesOf('timeZone');
  const now = Date.now();
  return zones
    .map((iana) => {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: iana,
        timeZoneName: 'shortOffset',
      });
      const parts = formatter.formatToParts(now);
      const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
      // Parse "GMT+2" or "GMT-5:30" or "GMT" into offset minutes
      const match = tzPart.match(/GMT([+-])?(\d{1,2})?(?::(\d{2}))?/);
      let offsetMinutes = 0;
      if (match) {
        const sign = match[1] === '-' ? -1 : 1;
        const hours = parseInt(match[2] ?? '0', 10);
        const mins = parseInt(match[3] ?? '0', 10);
        offsetMinutes = sign * (hours * 60 + mins);
      }
      const h = Math.floor(Math.abs(offsetMinutes) / 60);
      const m = Math.abs(offsetMinutes) % 60;
      const offset = `UTC${offsetMinutes >= 0 ? '+' : '-'}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const city = iana.split('/').pop()?.replace(/_/g, ' ') ?? iana;
      return { iana, label: iana, city, offset, offsetMinutes };
    })
    .sort((a, b) => a.offsetMinutes - b.offsetMinutes || a.iana.localeCompare(b.iana));
}

const ALL_TIMEZONES = buildTimezones();

// Group timezones by UTC offset
function groupByOffset(tzs: TimezoneEntry[]): Map<string, TimezoneEntry[]> {
  const map = new Map<string, TimezoneEntry[]>();
  for (const tz of tzs) {
    const group = map.get(tz.offset) ?? [];
    group.push(tz);
    map.set(tz.offset, group);
  }
  return map;
}

// ── TimezonePicker Component ────────────────────────────────

function TimezonePicker({ value, onChange }: { value: string; onChange: (tz: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return ALL_TIMEZONES;
    const q = query.toLowerCase();
    return ALL_TIMEZONES.filter(
      (tz) =>
        tz.iana.toLowerCase().includes(q) ||
        tz.city.toLowerCase().includes(q) ||
        tz.offset.toLowerCase().includes(q),
    );
  }, [query]);

  const groups = useMemo(() => groupByOffset(filtered), [filtered]);

  const selectedEntry = ALL_TIMEZONES.find((tz) => tz.iana === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedEntry ? (
            <span className="truncate">
              <span className="text-muted-foreground">{selectedEntry.offset}</span>{' '}
              {selectedEntry.city}
            </span>
          ) : (
            <span className="text-muted-foreground">Select timezone...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search timezone or city..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-[280px]">
            <CommandEmpty>No timezone found.</CommandEmpty>
            {[...groups.entries()].map(([offset, tzs]) => (
              <CommandGroup key={offset} heading={offset}>
                {tzs.map((tz) => (
                  <CommandItem
                    key={tz.iana}
                    value={tz.iana}
                    onSelect={() => {
                      onChange(tz.iana);
                      setOpen(false);
                      setQuery('');
                    }}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${value === tz.iana ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <span className="truncate">{tz.iana}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── Page Component ──────────────────────────────────────────

export default function CountriesPage() {
  const { data: countries, isLoading } = usePlatformCountryConfigs();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState<CountryFormData>({ ...EMPTY_FORM });
  const [deleteCode, setDeleteCode] = useState<string | null>(null);

  const createMutation = useCreateCountryConfig();
  const updateMutation = useUpdateCountryConfig(editingCode ?? '');
  const deleteMutation = useDeleteCountryConfig(deleteCode ?? '');

  const filtered = useMemo(() => {
    if (!countries) return [];
    if (!search) return countries;
    const s = search.toLowerCase();
    return countries.filter(
      (c) =>
        c.code.toLowerCase().includes(s) ||
        c.name.toLowerCase().includes(s) ||
        (c.nameArabic ?? '').includes(s) ||
        c.currency.code.toLowerCase().includes(s),
    );
  }, [countries, search]);

  const activeCount = countries?.filter((c) => c.isActive).length ?? 0;
  const inactiveCount = (countries?.length ?? 0) - activeCount;

  const handleCountryAutoFill = useCallback((country: (typeof COUNTRIES)[number]) => {
    const filled = autoFillFromCountry(country);
    setForm(filled);
  }, []);

  function openCreate() {
    setEditingCode(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }

  function openEdit(c: CountryConfig) {
    setEditingCode(c.code);
    setForm({
      code: c.code,
      name: c.name,
      nameArabic: c.nameArabic ?? '',
      defaultLocale: c.defaultLocale,
      supportedLocales: [...c.supportedLocales],
      currency: { ...c.currency },
      timezone: c.timezone,
      dateFormat: c.dateFormat,
      timeFormat: c.timeFormat,
      weekStart: c.weekStart,
      phoneCode: c.phoneCode,
      direction: c.direction,
      isActive: c.isActive,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (editingCode) {
      const { code: _code, ...updateData } = form;
      await updateMutation.mutateAsync(updateData);
    } else {
      await createMutation.mutateAsync(form);
    }
    setDialogOpen(false);
  }

  async function handleDelete() {
    if (!deleteCode) return;
    await deleteMutation.mutateAsync();
    setDeleteCode(null);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Countries</h1>
          <p className="text-sm text-muted-foreground">
            Manage country configurations. Changes propagate to all dropdowns across the platform.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Country
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{countries?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Countries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {new Set(countries?.map((c) => c.currency.code) ?? []).size}
                </p>
                <p className="text-xs text-muted-foreground">Unique Currencies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">
                  {new Set(countries?.map((c) => c.timezone) ?? []).size}
                </p>
                <p className="text-xs text-muted-foreground">Unique Timezones</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search countries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Country Table */}
      <Card>
        <CardHeader>
          <CardTitle>Country Configurations</CardTitle>
          <CardDescription>
            {activeCount} active, {inactiveCount} inactive
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Country</th>
                  <th className="pb-3 pr-4 font-medium">Currency</th>
                  <th className="pb-3 pr-4 font-medium">Timezone</th>
                  <th className="pb-3 pr-4 font-medium">Phone</th>
                  <th className="pb-3 pr-4 font-medium">Direction</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((c) => (
                  <tr key={c.code} className="hover:bg-muted/50">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getFlagEmoji(c.code)}</span>
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.code}
                            {c.nameArabic ? ` · ${c.nameArabic}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div>
                        <span className="font-mono">{c.currency.code}</span>
                        <span className="ml-1 text-muted-foreground">{c.currency.symbol}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {c.currency.decimalPlaces}dp, {c.currency.symbolPosition}
                      </p>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">{c.timezone}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{c.phoneCode}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={c.direction === 'rtl' ? 'secondary' : 'outline'}>
                        {c.direction.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={c.isActive ? 'default' : 'destructive'}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteCode(c.code)}
                          disabled={!c.isActive}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No countries found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Create/Edit Dialog ──────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCode ? `Edit Country — ${editingCode}` : 'Add Country'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Country Search — only when creating */}
            {!editingCode && (
              <>
                <CountrySearchPicker onSelect={handleCountryAutoFill} />
                <Separator />
              </>
            )}

            {/* Row: Code + Name */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Country Code *</Label>
                <Input
                  placeholder="EG"
                  maxLength={2}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  disabled={!!editingCode}
                />
                <p className="text-xs text-muted-foreground">ISO 3166-1 alpha-2</p>
              </div>
              <div className="space-y-2">
                <Label>Name (English) *</Label>
                <Input
                  placeholder="Egypt"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Name (Arabic)</Label>
                <Input
                  placeholder="مصر"
                  dir="rtl"
                  value={form.nameArabic}
                  onChange={(e) => setForm({ ...form, nameArabic: e.target.value })}
                />
              </div>
            </div>

            <Separator />

            {/* Currency Section */}
            <p className="text-sm font-medium">Currency</p>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input
                  placeholder="EGP"
                  maxLength={3}
                  value={form.currency.code}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      currency: { ...form.currency, code: e.target.value.toUpperCase() },
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">ISO 4217</p>
              </div>
              <div className="space-y-2">
                <Label>Symbol *</Label>
                <Input
                  placeholder="ج.م"
                  value={form.currency.symbol}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      currency: { ...form.currency, symbol: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <select
                  className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm"
                  value={form.currency.symbolPosition}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      currency: {
                        ...form.currency,
                        symbolPosition: e.target.value as 'before' | 'after',
                      },
                    })
                  }
                >
                  <option value="before">Before</option>
                  <option value="after">After</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Decimals</Label>
                <Input
                  type="number"
                  min={0}
                  max={4}
                  value={form.currency.decimalPlaces}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      currency: {
                        ...form.currency,
                        decimalPlaces: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
            </div>

            <Separator />

            {/* Locale & Time */}
            <p className="text-sm font-medium">Locale & Time</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Timezone *</Label>
                <TimezonePicker
                  value={form.timezone}
                  onChange={(tz) => setForm({ ...form, timezone: tz })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Code *</Label>
                <Input
                  placeholder="+20"
                  value={form.phoneCode}
                  onChange={(e) => setForm({ ...form, phoneCode: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Date Format</Label>
                <DateFormatPicker
                  value={form.dateFormat}
                  onChange={(v) => setForm({ ...form, dateFormat: v })}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Time Format</Label>
                <select
                  className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm"
                  value={form.timeFormat}
                  onChange={(e) =>
                    setForm({ ...form, timeFormat: e.target.value as '12h' | '24h' })
                  }
                >
                  <option value="12h">12h</option>
                  <option value="24h">24h</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Week Start</Label>
                <select
                  className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm"
                  value={form.weekStart}
                  onChange={(e) =>
                    setForm({ ...form, weekStart: parseInt(e.target.value) as 0 | 1 | 5 | 6 })
                  }
                >
                  <option value={0}>Sunday</option>
                  <option value={1}>Monday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Default Locale</Label>
                <select
                  className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm"
                  value={form.defaultLocale}
                  onChange={(e) =>
                    setForm({ ...form, defaultLocale: e.target.value as 'en' | 'ar' })
                  }
                >
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <select
                  className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm"
                  value={form.direction}
                  onChange={(e) => setForm({ ...form, direction: e.target.value as 'ltr' | 'rtl' })}
                >
                  <option value="ltr">LTR</option>
                  <option value="rtl">RTL</option>
                </select>
              </div>
            </div>

            {/* Active toggle (edit only) */}
            {editingCode && (
              <>
                <Separator />
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="isActive">Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive countries won't appear in dropdowns
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {editingCode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ─────────────────────────────── */}
      <Dialog open={!!deleteCode} onOpenChange={() => setDeleteCode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Country</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to deactivate <strong>{deleteCode}</strong>? It will be hidden
            from all dropdowns but can be reactivated later.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCode(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
