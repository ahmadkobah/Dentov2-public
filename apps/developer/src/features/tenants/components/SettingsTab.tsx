import { useState, useEffect } from 'react';
import {
  ToggleLeft,
  ToggleRight,
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  Lock,
  Shield,
  Clock,
  KeyRound,
  Ban,
} from 'lucide-react';
import { Button } from '@dento/ui';
import type { TenantDetail } from '../types/tenant-detail.types.js';
import {
  useUpdateTenant,
  useUpdateTenantStatus,
  useDeleteTenant,
  useTenantSecuritySettings,
  useUpdateTenantSecuritySettings,
} from '../hooks/useTenants.js';
import {
  useCountryConfigs,
  useCurrencyOptions,
  useTimezoneOptions,
} from '../../../hooks/useCountryConfigs.js';

export function SettingsTab({ tenant, tenantId }: { tenant: TenantDetail; tenantId: string }) {
  const updateTenant = useUpdateTenant(tenantId);
  const updateStatus = useUpdateTenantStatus(tenantId);
  const deleteTenant = useDeleteTenant();
  const { data: securityData } = useTenantSecuritySettings(tenantId);
  const updateSecurity = useUpdateTenantSecuritySettings(tenantId);
  const { data: countries = [] } = useCountryConfigs();
  const currencyOptions = useCurrencyOptions();
  const timezoneOptions = useTimezoneOptions();

  const [name, setName] = useState(tenant.name.en);
  const [timezone, setTimezone] = useState(tenant.timezone || 'Africa/Cairo');
  const [currency, setCurrency] = useState(tenant.currency || 'EGP');
  const [email, setEmail] = useState(tenant.email);
  const [phone, setPhone] = useState(tenant.phone);
  const [street, setStreet] = useState(tenant.address.street);
  const [city, setCity] = useState(tenant.address.city);
  const [country, setCountry] = useState(tenant.address.country || tenant.country);
  const [maxUsers, setMaxUsers] = useState(tenant.maxUsers);
  const [maxDesktop, setMaxDesktop] = useState(tenant.sessionLimits?.maxDesktop ?? 1);
  const [maxMobile, setMaxMobile] = useState(tenant.sessionLimits?.maxMobile ?? 1);
  const [maxTablet, setMaxTablet] = useState(tenant.sessionLimits?.maxTablet ?? 1);
  const [platformEnforce2FA, setPlatformEnforce2FA] = useState(tenant.platformEnforce2FA ?? false);

  // Security settings (from per-tenant DB)
  const securityValues = (securityData as any)?.data?.security ?? {};
  const [sessionTimeout, setSessionTimeout] = useState(60);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5);
  const [lockoutDuration, setLockoutDuration] = useState(15);
  const [require2FAForRoles, setRequire2FAForRoles] = useState<string[]>([]);

  useEffect(() => {
    if (securityValues.sessionTimeoutMinutes != null)
      setSessionTimeout(securityValues.sessionTimeoutMinutes);
    if (securityValues.maxLoginAttempts != null)
      setMaxLoginAttempts(securityValues.maxLoginAttempts);
    if (securityValues.lockoutDurationMinutes != null)
      setLockoutDuration(securityValues.lockoutDurationMinutes);
    if (securityValues.require2FAForRoles != null)
      setRequire2FAForRoles(securityValues.require2FAForRoles);
  }, [securityData]);

  const handleSave = () => {
    updateTenant.mutate({
      name: { en: name },
      contact: { email, phone, address: { street, city, country } },
      settings: {
        timezone,
        currency,
        sessionLimits: { maxDesktop, maxMobile, maxTablet },
        platformEnforce2FA,
      },
      maxUsers,
    });
  };

  const ROLE_OPTIONS = ['owner', 'dentist', 'assistant', 'receptionist'] as const;

  const toggleRole = (role: string) => {
    setRequire2FAForRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleSaveSecurity = () => {
    updateSecurity.mutate({
      sessionTimeoutMinutes: sessionTimeout,
      maxLoginAttempts,
      lockoutDurationMinutes: lockoutDuration,
      require2FAForRoles,
    });
  };
  return (
    <div className="space-y-6">
      {/* General Settings */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          General Settings
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Clinic Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                {timezoneOptions.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                {currencyOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Languages
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage languages in the{' '}
                <span className="font-medium text-brand-600 dark:text-brand-400">Languages</span>{' '}
                tab.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Contact Information
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Primary Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Address
            </label>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Country
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Technical Settings */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Technical Settings
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Advanced configuration options
            </p>
          </div>
          <span className="rounded-full bg-blue-light-50 px-2.5 py-1 text-xs font-medium text-blue-light-700 dark:bg-blue-light-500/10 dark:text-blue-light-400">
            Developer Only
          </span>
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Database Name
              </label>
              <input
                type="text"
                value={`tenant_${tenant.slug}`}
                readOnly
                className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 font-mono text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Max Users Allowed
              </label>
              <input
                type="number"
                value={maxUsers}
                onChange={(e) => setMaxUsers(Number(e.target.value))}
                className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Rate Limit (requests/min)
              </label>
              <input
                type="number"
                defaultValue={100}
                disabled
                className="h-10 w-full rounded-lg border border-gray-200 bg-gray-100 px-4 text-sm text-gray-400 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500"
              />
              <span className="absolute end-3 top-9 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                Coming Soon
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-brand-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Platform Enforce 2FA</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Force this tenant to require two-factor authentication for all users, overriding
                  their own settings
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPlatformEnforce2FA(!platformEnforce2FA)}
              className="flex-shrink-0"
              aria-label="Toggle platform 2FA enforcement"
            >
              {platformEnforce2FA ? (
                <ToggleRight className="h-8 w-8 text-brand-500" />
              ) : (
                <ToggleLeft className="h-8 w-8 text-gray-300 dark:text-gray-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Security & Lockout */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Security &amp; Lockout
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Authentication policies and lockout rules for this tenant
            </p>
          </div>
          <span className="rounded-full bg-blue-light-50 px-2.5 py-1 text-xs font-medium text-blue-light-700 dark:bg-blue-light-500/10 dark:text-blue-light-400">
            Developer Only
          </span>
        </div>
        <div className="space-y-4">
          {/* Require 2FA for Roles */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Shield className="h-4 w-4" />
              Require 2FA for Roles
            </label>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              Selected roles must set up two-factor authentication before accessing the app
            </p>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                    require2FAForRoles.includes(role)
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Clock className="h-4 w-4" />
                Session Timeout (min)
              </label>
              <input
                type="number"
                min={5}
                max={1440}
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(Number(e.target.value))}
                className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-400">5–1440 minutes</p>
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <KeyRound className="h-4 w-4" />
                Max Login Attempts
              </label>
              <input
                type="number"
                min={3}
                max={20}
                value={maxLoginAttempts}
                onChange={(e) => setMaxLoginAttempts(Number(e.target.value))}
                className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-400">3–20 attempts</p>
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Ban className="h-4 w-4" />
                Lockout Duration (min)
              </label>
              <input
                type="number"
                min={1}
                max={1440}
                value={lockoutDuration}
                onChange={(e) => setLockoutDuration(Number(e.target.value))}
                className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-400">1–1440 minutes</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="default"
              onClick={handleSaveSecurity}
              disabled={updateSecurity.isPending}
            >
              {updateSecurity.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Security'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Session Limits */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Session Limits</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Maximum concurrent sessions per user per device type. When a user exceeds the limit,
            they'll be prompted to end an existing session.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Monitor className="h-4 w-4" />
              Desktop (Web)
            </label>
            <input
              type="number"
              min={1}
              max={5}
              value={maxDesktop}
              onChange={(e) => setMaxDesktop(Number(e.target.value))}
              className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Smartphone className="h-4 w-4" />
              Mobile
            </label>
            <input
              type="number"
              min={1}
              max={5}
              value={maxMobile}
              onChange={(e) => setMaxMobile(Number(e.target.value))}
              className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Tablet className="h-4 w-4" />
              Tablet
            </label>
            <input
              type="number"
              min={1}
              max={5}
              value={maxTablet}
              onChange={(e) => setMaxTablet(Number(e.target.value))}
              className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button variant="default" onClick={handleSave} disabled={updateTenant.isPending}>
          {updateTenant.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-error-200 bg-error-50 p-6 dark:border-error-500/20 dark:bg-error-500/10">
        <h3 className="mb-2 text-lg font-semibold text-error-800 dark:text-error-400">
          Danger Zone
        </h3>
        <p className="mb-4 text-sm text-error-700 dark:text-error-300">
          These actions affect the tenant immediately. Please be certain.
        </p>
        <div className="space-y-3">
          {/* Reactivate — only shown when suspended or cancelled */}
          {(tenant.status === 'suspended' || tenant.status === 'cancelled') && (
            <div className="flex items-center justify-between rounded-xl border border-error-200 bg-white p-4 dark:border-error-500/20 dark:bg-gray-900">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Reactivate Tenant</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Set tenant status back to active
                </p>
              </div>
              <Button
                variant="outline"
                disabled={updateStatus.isPending}
                onClick={() => {
                  if (window.confirm(`Reactivate tenant "${tenant.name.en}"?`)) {
                    updateStatus.mutate({ status: 'active', reason: 'Reactivated by developer' });
                  }
                }}
              >
                {updateStatus.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Reactivate
              </Button>
            </div>
          )}

          {/* Suspend */}
          {tenant.status !== 'suspended' && tenant.status !== 'cancelled' && (
            <div className="flex items-center justify-between rounded-xl border border-error-200 bg-white p-4 dark:border-error-500/20 dark:bg-gray-900">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Suspend Tenant</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Temporarily disable access for all tenant users
                </p>
              </div>
              <Button
                variant="outline"
                className="border-error-300 text-error-700 hover:bg-error-50 dark:border-error-500/30 dark:text-error-400"
                disabled={updateStatus.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Suspend tenant "${tenant.name.en}"? All users will lose access.`,
                    )
                  ) {
                    updateStatus.mutate({ status: 'suspended', reason: 'Suspended by developer' });
                  }
                }}
              >
                {updateStatus.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Suspend Tenant
              </Button>
            </div>
          )}

          {/* Delete (soft-delete → cancelled) */}
          {tenant.status !== 'cancelled' && (
            <div className="flex items-center justify-between rounded-xl border border-error-200 bg-white p-4 dark:border-error-500/20 dark:bg-gray-900">
              <div>
                <p className="font-medium text-error-700 dark:text-error-400">Delete Tenant</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Permanently cancel this tenant — this cannot be undone
                </p>
              </div>
              <Button
                variant="destructive"
                disabled={deleteTenant.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      `DELETE tenant "${tenant.name.en}"? This action is irreversible.`,
                    )
                  ) {
                    deleteTenant.mutate(tenantId);
                  }
                }}
              >
                {deleteTenant.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete Tenant
              </Button>
            </div>
          )}

          {tenant.status === 'cancelled' && (
            <p className="text-sm font-medium text-error-700 dark:text-error-400">
              This tenant has been cancelled.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
