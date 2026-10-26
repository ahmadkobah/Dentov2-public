import { useOnboardingStore } from '@/stores/onboarding.store';
import { Button } from '@dento/ui';
import { useTranslation } from '../../../stores/locale.store.js';
import { useCountryConfigs } from '../../../hooks/useCountryConfigs.js';

/**
 * Step 4: Settings
 * TailAdmin styling with green primary color theme
 *
 * Configure clinic preferences:
 * - Language (EN/AR)
 * - Country & Currency
 * - Timezone
 * - Date format
 * - Default appointment duration
 */

const dateFormats = [
  { value: 'DD/MM/YYYY', label: '31/12/2024 (Day/Month/Year)' },
  { value: 'MM/DD/YYYY', label: '12/31/2024 (Month/Day/Year)' },
  { value: 'YYYY-MM-DD', label: '2024-12-31 (Year-Month-Day)' },
];

const appointmentDurations = [15, 20, 30, 45, 60];

export function SettingsStep() {
  const { settings, updateSettings } = useOnboardingStore();
  const { t } = useTranslation();
  const { data: countries = [] } = useCountryConfigs();

  const handleCountryChange = (countryCode: string) => {
    const country = countries.find((c) => c.code === countryCode);
    if (country) {
      updateSettings({
        country: country.code,
        currency: country.currency.code,
        timezone: country.timezone,
      });
    }
  };

  const selectClasses =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500';

  const labelClasses = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('onboarding.settings.title')}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('onboarding.settings.subtitle')}
          </p>
        </div>

        {/* Language Selection */}
        <div>
          <label className={labelClasses}>
            {t('onboarding.settings.displayLanguage')} <span className="text-error-500">*</span>
          </label>
          <div className="mt-2 grid grid-cols-2 gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => updateSettings({ locale: 'en' })}
              className={`h-auto rounded-xl border-2 p-4 text-start ${
                settings.locale === 'en'
                  ? 'border-brand-500 bg-brand-50 shadow-sm dark:border-brand-500 dark:bg-brand-900/20'
                  : 'border-gray-200 hover:border-brand-300 dark:border-gray-700 dark:hover:border-brand-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🇬🇧</span>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {t('onboarding.settings.english')}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t('onboarding.settings.ltr')}
                  </div>
                </div>
              </div>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => updateSettings({ locale: 'ar' })}
              className={`h-auto rounded-xl border-2 p-4 text-start ${
                settings.locale === 'ar'
                  ? 'border-brand-500 bg-brand-50 shadow-sm dark:border-brand-500 dark:bg-brand-900/20'
                  : 'border-gray-200 hover:border-brand-300 dark:border-gray-700 dark:hover:border-brand-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🇸🇦</span>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {t('onboarding.settings.arabic')}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t('onboarding.settings.rtl')}
                  </div>
                </div>
              </div>
            </Button>
          </div>
        </div>

        {/* Country Selection */}
        <div>
          <label htmlFor="country" className={labelClasses}>
            {t('onboarding.settings.country')} <span className="text-error-500">*</span>
          </label>
          <select
            id="country"
            value={settings.country || 'EG'}
            onChange={(e) => handleCountryChange(e.target.value)}
            className={selectClasses}
          >
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            {t('onboarding.settings.currencyNote')}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Currency (auto-selected based on country) */}
          <div>
            <label htmlFor="currency" className={labelClasses}>
              {t('onboarding.settings.currency')}
            </label>
            <select
              id="currency"
              value={settings.currency || 'EGP'}
              onChange={(e) => updateSettings({ currency: e.target.value })}
              className={selectClasses}
            >
              {[...new Set(countries.map((c) => c.currency.code))].map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          {/* Date Format */}
          <div>
            <label htmlFor="dateFormat" className={labelClasses}>
              {t('onboarding.settings.dateFormat')}
            </label>
            <select
              id="dateFormat"
              value={settings.dateFormat || 'DD/MM/YYYY'}
              onChange={(e) => updateSettings({ dateFormat: e.target.value })}
              className={selectClasses}
            >
              {dateFormats.map((format) => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Appointment Duration */}
        <div>
          <label className={labelClasses}>{t('onboarding.settings.defaultDuration')}</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {appointmentDurations.map((duration) => (
              <Button
                key={duration}
                type="button"
                variant={settings.appointmentDuration === duration ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSettings({ appointmentDuration: duration })}
                className={`px-4 py-2 ${
                  settings.appointmentDuration === duration
                    ? 'border-brand-500 bg-brand-500 text-white shadow-sm'
                    : 'border-gray-200 text-gray-700 hover:border-brand-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-700'
                }`}
              >
                {duration} min
              </Button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            {t('onboarding.settings.durationNote')}
          </p>
        </div>

        {/* Summary */}
        <div className="mt-4 border-t border-gray-200 pt-6 dark:border-gray-700">
          <h3 className="mb-3 font-medium text-gray-900 dark:text-white">
            {t('onboarding.settings.summary')}
          </h3>
          <div className="space-y-2 rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-800/50">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Language:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {settings.locale === 'ar' ? 'Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© (Arabic)' : 'English'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Country:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {countries.find((c) => c.code === settings.country)?.name || 'Egypt'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Currency:</span>
              <span className="font-medium text-gray-900 dark:text-white">{settings.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Timezone:</span>
              <span className="font-medium text-gray-900 dark:text-white">{settings.timezone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Date Format:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {settings.dateFormat}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Appointment Duration:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {settings.appointmentDuration} minutes
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
