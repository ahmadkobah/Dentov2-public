import { useOnboardingStore } from '@/stores/onboarding.store';
import { PhoneInput } from '@dento/ui';
import { useTranslation } from '../../../stores/locale.store.js';

/**
 * Step 1: Clinic Info
 * TailAdmin styling with green primary color theme
 *
 * Collects basic clinic information:
 * - Clinic name, phone, email, website
 * - Address (street, city, country)
 */

export function ClinicInfoStep() {
  const { clinicInfo, updateClinicInfo } = useOnboardingStore();
  const { t } = useTranslation();

  const handleChange = (field: string, value: string) => {
    if (field.startsWith('address.')) {
      const addressField = field.replace('address.', '');
      updateClinicInfo({
        address: {
          ...clinicInfo.address,
          [addressField]: value,
        } as typeof clinicInfo.address,
      });
    } else {
      updateClinicInfo({ [field]: value });
    }
  };

  const inputClasses =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-500';

  const labelClasses = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('onboarding.clinicInfo.title')}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('onboarding.clinicInfo.subtitle')}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Clinic Name */}
          <div className="md:col-span-2">
            <label htmlFor="name" className={labelClasses}>
              {t('onboarding.clinicInfo.clinicName')} <span className="text-error-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              className={inputClasses}
              value={clinicInfo.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Smile Dental Clinic"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className={labelClasses}>
              {t('onboarding.clinicInfo.phone')} <span className="text-error-500">*</span>
            </label>
            <PhoneInput
              value={clinicInfo.phone || ''}
              onChange={(v) => handleChange('phone', v)}
              defaultCountry="SA"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className={labelClasses}>
              {t('onboarding.clinicInfo.email')} <span className="text-error-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              className={inputClasses}
              value={clinicInfo.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="info@smiledental.com"
            />
          </div>

          {/* Website */}
          <div className="md:col-span-2">
            <label htmlFor="website" className={labelClasses}>
              {t('onboarding.clinicInfo.website')} <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="website"
              type="url"
              className={inputClasses}
              value={clinicInfo.website || ''}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://www.smiledental.com"
            />
          </div>
        </div>

        {/* Address Section */}
        <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
          <h3 className="mb-4 font-medium text-gray-900 dark:text-white">
            {t('onboarding.clinicInfo.addressSection')}
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Street */}
            <div className="md:col-span-2">
              <label htmlFor="street" className={labelClasses}>
                {t('onboarding.clinicInfo.streetAddress')} <span className="text-error-500">*</span>
              </label>
              <input
                id="street"
                type="text"
                className={inputClasses}
                value={clinicInfo.address?.street || ''}
                onChange={(e) => handleChange('address.street', e.target.value)}
                placeholder="123 Dental Street, Building A"
              />
            </div>

            {/* City */}
            <div>
              <label htmlFor="city" className={labelClasses}>
                {t('onboarding.clinicInfo.city')} <span className="text-error-500">*</span>
              </label>
              <input
                id="city"
                type="text"
                className={inputClasses}
                value={clinicInfo.address?.city || ''}
                onChange={(e) => handleChange('address.city', e.target.value)}
                placeholder="Cairo"
              />
            </div>

            {/* State */}
            <div>
              <label htmlFor="state" className={labelClasses}>
                {t('onboarding.clinicInfo.state')}
              </label>
              <input
                id="state"
                type="text"
                className={inputClasses}
                value={clinicInfo.address?.state || ''}
                onChange={(e) => handleChange('address.state', e.target.value)}
                placeholder="Cairo Governorate"
              />
            </div>

            {/* Country */}
            <div>
              <label htmlFor="country" className={labelClasses}>
                {t('onboarding.clinicInfo.country')} <span className="text-error-500">*</span>
              </label>
              <input
                id="country"
                type="text"
                className={inputClasses}
                value={clinicInfo.address?.country || ''}
                onChange={(e) => handleChange('address.country', e.target.value)}
                placeholder="Egypt"
              />
            </div>

            {/* Postal Code */}
            <div>
              <label htmlFor="postalCode" className={labelClasses}>
                {t('onboarding.clinicInfo.postalCode')}
              </label>
              <input
                id="postalCode"
                type="text"
                className={inputClasses}
                value={clinicInfo.address?.postalCode || ''}
                onChange={(e) => handleChange('address.postalCode', e.target.value)}
                placeholder="12345"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
