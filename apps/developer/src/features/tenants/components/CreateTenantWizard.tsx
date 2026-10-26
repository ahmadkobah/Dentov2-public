/**
 * CreateTenantWizard — Multi-step tenant creation wizard.
 *
 * Steps:
 *  1. Clinic Information (name, phone, email, address)
 *  2. Branch Setup (optional — name, phone, working hours)
 *  3. Admin Account (firstName, lastName, email, password)
 *  4. Settings (locale, timezone, currency)
 *  5. Modules & Limits (enabledModules, maxUsers, maxBranches)
 *  6. Review & Create
 */

import { useState } from 'react';
import { Button } from '@dento/ui';
import {
  Building2,
  MapPin,
  UserCog,
  Settings2,
  Puzzle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';
import { useCreateTenant } from '../hooks/useTenants.js';
import { useLanguages } from '../../languages/hooks/useLanguages.js';
import { useStorageTiers } from '../../storage/hooks/useStorageTiers.js';
import {
  useCountryConfigs,
  useCurrencyOptions,
  useTimezoneOptions,
} from '../../../hooks/useCountryConfigs.js';

// ── Types ───────────────────────────────────────────────────

interface WizardData {
  clinic: {
    name: string;
    nameAr: string;
    phone: string;
    email: string;
    website: string;
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  };
  branch: {
    enabled: boolean;
    name: string;
    phone: string;
    email: string;
  };
  admin: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
  };
  settings: {
    defaultLanguage: string;
    supportedLanguages: string[];
    country: string;
    currency: string;
    timezone: string;
    dateFormat: string;
    appointmentDuration: number;
  };
  modules: {
    enabledModules: string[];
    maxUsers: number;
    maxBranches: number;
    storageTierId: string;
    customStorageGB: number;
    customStoragePrice: number;
    customStorageCurrency: string;
  };
}

const INITIAL_DATA: WizardData = {
  clinic: {
    name: '',
    nameAr: '',
    phone: '',
    email: '',
    website: '',
    address: { street: '', city: '', state: '', country: 'EG', postalCode: '' },
  },
  branch: { enabled: true, name: '', phone: '', email: '' },
  admin: { firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' },
  settings: {
    defaultLanguage: 'en',
    supportedLanguages: ['en'],
    country: 'EG',
    currency: 'EGP',
    timezone: 'Africa/Cairo',
    dateFormat: 'DD/MM/YYYY',
    appointmentDuration: 30,
  },
  modules: {
    enabledModules: [
      'dashboard',
      'patients',
      'appointments',
      'doctors',
      'users',
      'settings',
      'notifications',
      'prescriptions',
      'subscription',
    ],
    maxUsers: 10,
    maxBranches: 1,
    storageTierId: '',
    customStorageGB: 0,
    customStoragePrice: 0,
    customStorageCurrency: 'EUR',
  },
};

const AVAILABLE_MODULES = [
  // Core (always enabled, required)
  { id: 'dashboard', label: 'Dashboard', required: true },
  { id: 'patients', label: 'Patient Records', required: true },
  { id: 'appointments', label: 'Appointments', required: true },
  { id: 'doctors', label: 'Doctors', required: true },
  { id: 'users', label: 'User Management', required: true },
  { id: 'settings', label: 'Settings', required: true },
  { id: 'notifications', label: 'Notifications', required: true },
  { id: 'prescriptions', label: 'Prescriptions', required: true },
  { id: 'subscription', label: 'Subscription', required: true },
  // Paid (optional)
  { id: 'dental_charts', label: 'Dental Charting', required: false },
  { id: 'treatment_plans', label: 'Treatment Plans', required: false },
  { id: 'procedure_notes', label: 'Procedure Notes', required: false },
  { id: 'invoices', label: 'Billing & Invoicing', required: false },
  { id: 'payments', label: 'Payments', required: false },
  { id: 'xrays', label: 'X-Rays', required: false },
  { id: 'cbct', label: 'CBCT Imaging', required: false },
  { id: 'lab_orders', label: 'Lab Management', required: false },
  { id: 'insurance', label: 'Insurance Claims', required: false },
  { id: 'inventory', label: 'Inventory Management', required: false },
  { id: 'services_catalog', label: 'Services Catalog', required: false },
  { id: 'branches', label: 'Multi-Branch', required: false },
  { id: 'schedules', label: 'Schedules', required: false },
  { id: 'leave', label: 'Leave Management', required: false },
  { id: 'attendance', label: 'Attendance', required: false },
  { id: 'commissions', label: 'Commissions', required: false },
  { id: 'installments', label: 'Installments', required: false },
  { id: 'consent', label: 'Consent Forms', required: false },
  { id: 'reports', label: 'Advanced Analytics', required: false },
  { id: 'language_pack', label: 'Language Pack', required: false },
];

const STEPS = [
  { id: 'clinic', label: 'Clinic Info', icon: Building2 },
  { id: 'branch', label: 'Branch Setup', icon: MapPin },
  { id: 'admin', label: 'Admin Account', icon: UserCog },
  { id: 'settings', label: 'Settings', icon: Settings2 },
  { id: 'modules', label: 'Modules', icon: Puzzle },
  { id: 'review', label: 'Review', icon: CheckCircle2 },
] as const;

interface CreateTenantWizardProps {
  onClose: () => void;
  onCreated?: () => void;
}

// ── Helper ──────────────────────────────────────────────────

const inputClass =
  'h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white dark:bg-gray-800';

const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

// ── Component ───────────────────────────────────────────────

export default function CreateTenantWizard({ onClose, onCreated }: CreateTenantWizardProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(INITIAL_DATA);
  const createTenant = useCreateTenant();
  const { data: platformLanguages } = useLanguages();
  const { data: storageTiers } = useStorageTiers();
  const { data: countries = [] } = useCountryConfigs();
  const currencyOptions = useCurrencyOptions();
  const timezoneOptions = useTimezoneOptions();

  const selectedTier = storageTiers?.find((t) => t._id === data.modules.storageTierId);

  const updateClinic = (field: string, value: string) =>
    setData((d) => ({ ...d, clinic: { ...d.clinic, [field]: value } }));
  const updateClinicAddress = (field: string, value: string) =>
    setData((d) => ({
      ...d,
      clinic: { ...d.clinic, address: { ...d.clinic.address, [field]: value } },
    }));
  const updateBranch = (field: string, value: string | boolean) =>
    setData((d) => ({ ...d, branch: { ...d.branch, [field]: value } }));
  const updateAdmin = (field: string, value: string) =>
    setData((d) => ({ ...d, admin: { ...d.admin, [field]: value } }));
  const updateSettings = (field: string, value: string | number) =>
    setData((d) => ({ ...d, settings: { ...d.settings, [field]: value } }));
  const updateModules = (field: string, value: unknown) =>
    setData((d) => ({ ...d, modules: { ...d.modules, [field]: value } }));

  const canNext = (): boolean => {
    if (step === 0)
      return !!(
        data.clinic.name &&
        data.clinic.phone &&
        data.clinic.email &&
        data.clinic.address.country
      );
    if (step === 1) return !data.branch.enabled || !!(data.branch.name && data.branch.phone);
    if (step === 2)
      return !!(
        data.admin.firstName &&
        data.admin.lastName &&
        data.admin.email &&
        data.admin.password &&
        data.admin.password.length >= 8 &&
        data.admin.password === data.admin.confirmPassword
      );
    return true;
  };

  const handleSubmit = () => {
    const payload = {
      clinic: {
        name: data.clinic.name,
        ...(data.clinic.nameAr && { nameAr: data.clinic.nameAr }),
        phone: data.clinic.phone,
        email: data.clinic.email,
        ...(data.clinic.website && { website: data.clinic.website }),
        address: {
          country: data.clinic.address.country,
          ...(data.clinic.address.street && { street: data.clinic.address.street }),
          ...(data.clinic.address.city && { city: data.clinic.address.city }),
          ...(data.clinic.address.state && { state: data.clinic.address.state }),
          ...(data.clinic.address.postalCode && { postalCode: data.clinic.address.postalCode }),
        },
      },
      ...(data.branch.enabled && {
        branch: {
          name: data.branch.name,
          phone: data.branch.phone,
          ...(data.branch.email && { email: data.branch.email }),
        },
      }),
      admin: {
        firstName: data.admin.firstName,
        lastName: data.admin.lastName,
        email: data.admin.email,
        phone: data.admin.phone || data.clinic.phone,
        password: data.admin.password,
      },
      settings: { ...data.settings },
      modules: {
        enabledModules: data.modules.enabledModules,
        maxUsers: data.modules.maxUsers,
        maxBranches: data.modules.maxBranches,
        ...(data.modules.storageTierId && { storageTierId: data.modules.storageTierId }),
        ...(selectedTier?.isCustom && {
          customStorageGB: data.modules.customStorageGB,
          customStoragePrice: data.modules.customStoragePrice,
          customStorageCurrency: data.modules.customStorageCurrency,
        }),
      },
    };

    createTenant.mutate(payload, {
      onSuccess: () => {
        onCreated?.();
        onClose();
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create New Tenant</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="border-b border-gray-200 px-6 py-3 dark:border-gray-700">
          <div className="flex gap-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <button
                  key={s.id}
                  onClick={() => i <= step && setStep(i)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                      : isDone
                        ? 'text-success-600 dark:text-success-400'
                        : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Clinic Information
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Clinic Name (English) *</label>
                  <input
                    className={inputClass}
                    placeholder="e.g. Bright Smile Dental"
                    value={data.clinic.name}
                    onChange={(e) => updateClinic('name', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Clinic Name (Arabic)</label>
                  <input
                    className={inputClass}
                    dir="rtl"
                    placeholder="اسم العيادة"
                    value={data.clinic.nameAr}
                    onChange={(e) => updateClinic('nameAr', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone *</label>
                  <input
                    className={inputClass}
                    placeholder="+20 123 456 7890"
                    value={data.clinic.phone}
                    onChange={(e) => updateClinic('phone', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Email *</label>
                  <input
                    className={inputClass}
                    type="email"
                    placeholder="clinic@example.com"
                    value={data.clinic.email}
                    onChange={(e) => updateClinic('email', e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Website</label>
                  <input
                    className={inputClass}
                    placeholder="https://clinic.com"
                    value={data.clinic.website}
                    onChange={(e) => updateClinic('website', e.target.value)}
                  />
                </div>
              </div>

              <h4 className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Address
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Street</label>
                  <input
                    className={inputClass}
                    placeholder="123 Main Street"
                    value={data.clinic.address.street}
                    onChange={(e) => updateClinicAddress('street', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>City</label>
                  <input
                    className={inputClass}
                    placeholder="Cairo"
                    value={data.clinic.address.city}
                    onChange={(e) => updateClinicAddress('city', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>State / Province</label>
                  <input
                    className={inputClass}
                    value={data.clinic.address.state}
                    onChange={(e) => updateClinicAddress('state', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Country *</label>
                  <input
                    className={inputClass}
                    placeholder="EG"
                    maxLength={3}
                    value={data.clinic.address.country}
                    onChange={(e) => updateClinicAddress('country', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Postal Code</label>
                  <input
                    className={inputClass}
                    value={data.clinic.address.postalCode}
                    onChange={(e) => updateClinicAddress('postalCode', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Branch Setup
                </h3>
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={data.branch.enabled}
                    onChange={(e) => updateBranch('enabled', e.target.checked)}
                    className="rounded"
                  />
                  Create initial branch
                </label>
              </div>
              {data.branch.enabled && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Branch Name *</label>
                    <input
                      className={inputClass}
                      placeholder="Main Branch"
                      value={data.branch.name}
                      onChange={(e) => updateBranch('name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Phone *</label>
                    <input
                      className={inputClass}
                      placeholder="+20 123 456 7890"
                      value={data.branch.phone}
                      onChange={(e) => updateBranch('phone', e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Email</label>
                    <input
                      className={inputClass}
                      type="email"
                      placeholder="branch@clinic.com"
                      value={data.branch.email}
                      onChange={(e) => updateBranch('email', e.target.value)}
                    />
                  </div>
                </div>
              )}
              {!data.branch.enabled && (
                <p className="py-8 text-center text-sm text-gray-400">
                  Branch setup will be skipped. A branch can be created later from the admin portal.
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Admin Account
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This user will be the tenant owner with full admin access.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>First Name *</label>
                  <input
                    className={inputClass}
                    value={data.admin.firstName}
                    onChange={(e) => updateAdmin('firstName', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Last Name *</label>
                  <input
                    className={inputClass}
                    value={data.admin.lastName}
                    onChange={(e) => updateAdmin('lastName', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Email *</label>
                  <input
                    className={inputClass}
                    type="email"
                    value={data.admin.email}
                    onChange={(e) => updateAdmin('email', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    className={inputClass}
                    placeholder="Uses clinic phone if empty"
                    value={data.admin.phone}
                    onChange={(e) => updateAdmin('phone', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Password *</label>
                  <input
                    className={inputClass}
                    type="password"
                    value={data.admin.password}
                    onChange={(e) => updateAdmin('password', e.target.value)}
                  />
                  {data.admin.password && data.admin.password.length < 8 && (
                    <p className="mt-1 text-xs text-error-500">Minimum 8 characters</p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Confirm Password *</label>
                  <input
                    className={inputClass}
                    type="password"
                    value={data.admin.confirmPassword}
                    onChange={(e) => updateAdmin('confirmPassword', e.target.value)}
                  />
                  {data.admin.confirmPassword &&
                    data.admin.password !== data.admin.confirmPassword && (
                      <p className="mt-1 text-xs text-error-500">Passwords do not match</p>
                    )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Regional Settings
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Supported Languages *</label>
                  <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                    English is always enabled. Optionally add a secondary language — this will
                    automatically activate the Language Pack module.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {/* EN — always checked, disabled */}
                    <label className="flex cursor-not-allowed items-center gap-2.5 rounded-lg border border-brand-300 bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:border-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                      <input type="checkbox" checked disabled className="rounded" />
                      <span>English (en)</span>
                    </label>
                    {/* Secondary language — optional dropdown */}
                    <div className="flex items-center gap-2">
                      <select
                        className="h-11.5 rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:text-white dark:bg-gray-800"
                        value={data.settings.supportedLanguages.find((l) => l !== 'en') ?? ''}
                        onChange={(e) => {
                          const secondaryCode = e.target.value;
                          setData((d) => {
                            const langs: string[] = secondaryCode ? ['en', secondaryCode] : ['en'];
                            // Auto-toggle language_pack module
                            const modules = { ...d.modules };
                            if (
                              secondaryCode &&
                              !modules.enabledModules.includes('language_pack')
                            ) {
                              modules.enabledModules = [...modules.enabledModules, 'language_pack'];
                            } else if (!secondaryCode) {
                              modules.enabledModules = modules.enabledModules.filter(
                                (m) => m !== 'language_pack',
                              );
                            }
                            return {
                              ...d,
                              settings: {
                                ...d.settings,
                                supportedLanguages: langs,
                                defaultLanguage: 'en',
                              },
                              modules,
                            };
                          });
                        }}
                      >
                        <option value="">No secondary language</option>
                        {(platformLanguages ?? [])
                          .filter((l) => l.isActive && l.code !== 'en')
                          .map((l) => (
                            <option key={l.code} value={l.code}>
                              {l.name.en} ({l.code})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Default Language</label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Always English</p>
                  <input className={inputClass} value="English (en)" disabled />
                </div>
                <div>
                  <label className={labelClass}>Country Code</label>
                  <select
                    className={inputClass}
                    value={data.settings.country}
                    onChange={(e) => {
                      const c = countries.find((cc) => cc.code === e.target.value);
                      if (c) {
                        setData((d) => ({
                          ...d,
                          settings: {
                            ...d.settings,
                            country: c.code,
                            currency: c.currency.code,
                            timezone: c.timezone,
                          },
                        }));
                      }
                    }}
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Currency</label>
                  <select
                    className={inputClass}
                    value={data.settings.currency}
                    onChange={(e) => updateSettings('currency', e.target.value)}
                  >
                    {currencyOptions.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Timezone</label>
                  <select
                    className={inputClass}
                    value={data.settings.timezone}
                    onChange={(e) => updateSettings('timezone', e.target.value)}
                  >
                    {timezoneOptions.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Date Format</label>
                  <select
                    className={inputClass}
                    value={data.settings.dateFormat}
                    onChange={(e) => updateSettings('dateFormat', e.target.value)}
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Appointment Duration (min)</label>
                  <input
                    className={inputClass}
                    type="number"
                    min={5}
                    max={240}
                    value={data.settings.appointmentDuration}
                    onChange={(e) => updateSettings('appointmentDuration', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Modules & Limits
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Max Users</label>
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    max={10000}
                    value={data.modules.maxUsers}
                    onChange={(e) => updateModules('maxUsers', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Max Branches</label>
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    max={500}
                    value={data.modules.maxBranches}
                    onChange={(e) => updateModules('maxBranches', Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Storage Tier Selection */}
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Storage Plan
              </h4>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {storageTiers?.map((tier) => {
                  const isSelected = data.modules.storageTierId === tier._id;
                  return (
                    <label
                      key={tier._id}
                      className={`flex cursor-pointer flex-col gap-1 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                        isSelected
                          ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="storageTier"
                          checked={isSelected}
                          onChange={() => updateModules('storageTierId', tier._id)}
                          className="rounded-full"
                        />
                        <span className="font-medium">{tier.name}</span>
                        {tier.isDefault && (
                          <span className="text-[10px] font-medium uppercase text-gray-400">
                            Default
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {tier.storageLimitGB} GB —{' '}
                        {tier.pricePerMonth === 0
                          ? 'Free'
                          : `${tier.pricePerMonth} ${tier.currency}/mo`}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Custom tier fields */}
              {selectedTier?.isCustom && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className={labelClass}>Custom Storage (GB)</label>
                    <input
                      className={inputClass}
                      type="number"
                      min={1}
                      value={data.modules.customStorageGB || ''}
                      onChange={(e) => updateModules('customStorageGB', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Price / Month</label>
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      value={data.modules.customStoragePrice || ''}
                      onChange={(e) => updateModules('customStoragePrice', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Currency</label>
                    <input
                      className={inputClass}
                      value={data.modules.customStorageCurrency}
                      onChange={(e) => updateModules('customStorageCurrency', e.target.value)}
                    />
                  </div>
                </div>
              )}

              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Enabled Modules
              </h4>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {AVAILABLE_MODULES.map((mod) => {
                  const checked = data.modules.enabledModules.includes(mod.id);
                  return (
                    <label
                      key={mod.id}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                        checked
                          ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                      } ${mod.required ? 'opacity-75' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={mod.required}
                        className="rounded"
                        onChange={() => {
                          if (mod.required) return;
                          setData((d) => ({
                            ...d,
                            modules: {
                              ...d.modules,
                              enabledModules: checked
                                ? d.modules.enabledModules.filter((m) => m !== mod.id)
                                : [...d.modules.enabledModules, mod.id],
                            },
                          }));
                        }}
                      />
                      <span>{mod.label}</span>
                      {mod.required && (
                        <span className="ml-auto text-[10px] font-medium uppercase text-gray-400">
                          Required
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Review & Create
              </h3>

              <div className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <ReviewSection title="Clinic">
                  <ReviewRow label="Name" value={data.clinic.name} />
                  {data.clinic.nameAr && <ReviewRow label="Name (AR)" value={data.clinic.nameAr} />}
                  <ReviewRow label="Email" value={data.clinic.email} />
                  <ReviewRow label="Phone" value={data.clinic.phone} />
                  <ReviewRow label="Country" value={data.clinic.address.country} />
                </ReviewSection>

                {data.branch.enabled && (
                  <ReviewSection title="Branch">
                    <ReviewRow label="Name" value={data.branch.name} />
                    <ReviewRow label="Phone" value={data.branch.phone} />
                  </ReviewSection>
                )}

                <ReviewSection title="Admin">
                  <ReviewRow
                    label="Name"
                    value={`${data.admin.firstName} ${data.admin.lastName}`}
                  />
                  <ReviewRow label="Email" value={data.admin.email} />
                </ReviewSection>

                <ReviewSection title="Settings">
                  <ReviewRow
                    label="Languages"
                    value={data.settings.supportedLanguages.join(', ').toUpperCase()}
                  />
                  <ReviewRow label="Default" value={data.settings.defaultLanguage.toUpperCase()} />
                  <ReviewRow label="Timezone" value={data.settings.timezone} />
                  <ReviewRow label="Currency" value={data.settings.currency} />
                </ReviewSection>

                <ReviewSection title="Modules">
                  <ReviewRow
                    label="Max Users / Branches"
                    value={`${data.modules.maxUsers} / ${data.modules.maxBranches}`}
                  />
                  <ReviewRow
                    label="Storage Plan"
                    value={
                      selectedTier
                        ? `${selectedTier.name} (${selectedTier.storageLimitGB} GB)`
                        : 'Default (100 GB)'
                    }
                  />
                  <ReviewRow
                    label="Enabled"
                    value={`${data.modules.enabledModules.length} modules`}
                  />
                </ReviewSection>
              </div>

              {createTenant.isError && (
                <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-700 dark:bg-error-500/10 dark:text-error-400">
                  {(createTenant.error as Error)?.message || 'Failed to create tenant'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
          <Button
            variant="outline"
            onClick={() => (step > 0 ? setStep(step - 1) : onClose())}
            className="gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" />
            {step > 0 ? 'Back' : 'Cancel'}
          </Button>

          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="gap-1.5">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createTenant.isPending} className="gap-1.5">
              {createTenant.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Tenant'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Review Helpers ──────────────────────────────────────────

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}
