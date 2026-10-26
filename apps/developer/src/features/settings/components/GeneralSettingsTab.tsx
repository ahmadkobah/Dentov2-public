/**
 * GeneralSettingsTab — Timezone, Currency, Language, Registration, Limits
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 2.9
 */

import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Label,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@dento/ui';
import { Save, RotateCcw } from 'lucide-react';
import type { SystemSettings, UpdateSystemSettingsInput } from '@dento/shared';
import { useUpdateSystemSettings } from '../hooks/useSystemSettings.js';
import { useCurrencyOptions, useTimezoneOptions } from '../../../hooks/useCountryConfigs.js';

interface Props {
  settings: SystemSettings;
}

export function GeneralSettingsTab({ settings }: Props) {
  const updateMutation = useUpdateSystemSettings();
  const currencyOptions = useCurrencyOptions();
  const timezoneOptions = useTimezoneOptions();

  const [form, setForm] = useState<UpdateSystemSettingsInput>({
    defaultTimezone: settings.defaultTimezone,
    defaultCurrency: settings.defaultCurrency,
    defaultLanguage: settings.defaultLanguage as 'en' | 'ar',
    registrationEnabled: settings.registrationEnabled,
    maxTenantsPerCluster: settings.maxTenantsPerCluster,
    supportEmail: settings.supportEmail,
    platformVersion: settings.platformVersion,
  });

  const isDirty =
    form.defaultTimezone !== settings.defaultTimezone ||
    form.defaultCurrency !== settings.defaultCurrency ||
    form.defaultLanguage !== settings.defaultLanguage ||
    form.registrationEnabled !== settings.registrationEnabled ||
    form.maxTenantsPerCluster !== settings.maxTenantsPerCluster ||
    form.supportEmail !== settings.supportEmail ||
    form.platformVersion !== settings.platformVersion;

  const handleReset = () => {
    setForm({
      defaultTimezone: settings.defaultTimezone,
      defaultCurrency: settings.defaultCurrency,
      defaultLanguage: settings.defaultLanguage as 'en' | 'ar',
      registrationEnabled: settings.registrationEnabled,
      maxTenantsPerCluster: settings.maxTenantsPerCluster,
      supportEmail: settings.supportEmail,
      platformVersion: settings.platformVersion,
    });
  };

  const handleSave = () => {
    // Only send changed fields
    const updates: UpdateSystemSettingsInput = {};
    if (form.defaultTimezone !== settings.defaultTimezone)
      updates.defaultTimezone = form.defaultTimezone;
    if (form.defaultCurrency !== settings.defaultCurrency)
      updates.defaultCurrency = form.defaultCurrency;
    if (form.defaultLanguage !== settings.defaultLanguage)
      updates.defaultLanguage = form.defaultLanguage;
    if (form.registrationEnabled !== settings.registrationEnabled)
      updates.registrationEnabled = form.registrationEnabled;
    if (form.maxTenantsPerCluster !== settings.maxTenantsPerCluster)
      updates.maxTenantsPerCluster = form.maxTenantsPerCluster;
    if (form.supportEmail !== settings.supportEmail) updates.supportEmail = form.supportEmail;
    if (form.platformVersion !== settings.platformVersion)
      updates.platformVersion = form.platformVersion;
    if (Object.keys(updates).length > 0) updateMutation.mutate(updates);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>
          Configure default timezone, currency, language, and registration limits for the platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Row 1: Timezone + Currency */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gs-timezone">Default Timezone</Label>
            <Select
              value={form.defaultTimezone}
              onValueChange={(v) => setForm((p) => ({ ...p, defaultTimezone: v }))}
            >
              <SelectTrigger id="gs-timezone">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezoneOptions.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gs-currency">Default Currency</Label>
            <Select
              value={form.defaultCurrency}
              onValueChange={(v) => setForm((p) => ({ ...p, defaultCurrency: v }))}
            >
              <SelectTrigger id="gs-currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Language + Support Email */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gs-language">Default Language</Label>
            <Select
              value={form.defaultLanguage}
              onValueChange={(v) => setForm((p) => ({ ...p, defaultLanguage: v as 'en' | 'ar' }))}
            >
              <SelectTrigger id="gs-language">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">العربية (Arabic)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gs-email">Support Email</Label>
            <Input
              id="gs-email"
              type="email"
              value={form.supportEmail ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, supportEmail: e.target.value }))}
            />
          </div>
        </div>

        {/* Row 3: Version + Max Tenants */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gs-version">Platform Version</Label>
            <Input
              id="gs-version"
              value={form.platformVersion ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, platformVersion: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gs-max-tenants">Max Tenants Per Cluster</Label>
            <Input
              id="gs-max-tenants"
              type="number"
              min={1}
              max={10000}
              value={form.maxTenantsPerCluster ?? 500}
              onChange={(e) =>
                setForm((p) => ({ ...p, maxTenantsPerCluster: Number(e.target.value) }))
              }
            />
          </div>
        </div>

        {/* Registration toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4 dark:border-gray-800">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Tenant Registration</p>
            <p className="text-sm text-gray-500">Allow new tenants to register on the platform</p>
          </div>
          <Switch
            checked={form.registrationEnabled ?? true}
            onCheckedChange={(checked) => setForm((p) => ({ ...p, registrationEnabled: checked }))}
          />
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
  );
}
