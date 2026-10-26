import { useOnboardingStore } from '@/stores/onboarding.store';
import { PhoneInput } from '@dento/ui';
import { useTranslation } from '../../../stores/locale.store.js';

/**
 * Step 2: Branch Setup
 * TailAdmin styling with green primary color theme
 *
 * Collects main branch information:
 * - Branch name, phone, email
 * - Address (street, city, country)
 * - Working hours
 */

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function BranchSetupStep() {
  const { branchInfo, updateBranchInfo } = useOnboardingStore();
  const { t } = useTranslation();

  const handleChange = (field: string, value: string | boolean) => {
    if (field.startsWith('address.')) {
      const addressField = field.replace('address.', '');
      updateBranchInfo({
        address: {
          ...branchInfo.address,
          [addressField]: value,
        } as typeof branchInfo.address,
      });
    } else {
      updateBranchInfo({ [field]: value });
    }
  };

  const handleWorkingHoursChange = (
    dayIndex: number,
    field: 'startTime' | 'endTime' | 'isOpen',
    value: string | boolean,
  ) => {
    const updatedHours = [...(branchInfo.workingHours || [])];
    const dayData = updatedHours.find((h) => h.day === dayIndex);
    if (dayData) {
      (dayData as Record<string, unknown>)[field] = value;
      updateBranchInfo({ workingHours: updatedHours });
    }
  };

  const inputClasses =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-500';

  const timeInputClasses =
    'w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500';

  const labelClasses = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('onboarding.branch.title')}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('onboarding.branch.subtitle')}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Branch Name */}
          <div className="md:col-span-2">
            <label htmlFor="branchName" className={labelClasses}>
              {t('onboarding.branch.branchName')} <span className="text-error-500">*</span>
            </label>
            <input
              id="branchName"
              type="text"
              className={inputClasses}
              value={branchInfo.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Main Branch or Downtown Branch"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="branchPhone" className={labelClasses}>
              {t('onboarding.branch.branchPhone')} <span className="text-error-500">*</span>
            </label>
            <PhoneInput
              value={branchInfo.phone || ''}
              onChange={(v) => handleChange('phone', v)}
              defaultCountry="SA"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="branchEmail" className={labelClasses}>
              {t('onboarding.branch.branchEmail')} <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="branchEmail"
              type="email"
              className={inputClasses}
              value={branchInfo.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="main@smiledental.com"
            />
          </div>
        </div>

        {/* Address Section */}
        <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
          <h3 className="mb-4 font-medium text-gray-900 dark:text-white">
            {t('onboarding.branch.addressSection')}
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="branchStreet" className={labelClasses}>
                {t('onboarding.clinicInfo.streetAddress')} <span className="text-error-500">*</span>
              </label>
              <input
                id="branchStreet"
                type="text"
                className={inputClasses}
                value={branchInfo.address?.street || ''}
                onChange={(e) => handleChange('address.street', e.target.value)}
                placeholder="123 Dental Street, Building A"
              />
            </div>

            <div>
              <label htmlFor="branchCity" className={labelClasses}>
                {t('onboarding.clinicInfo.city')} <span className="text-error-500">*</span>
              </label>
              <input
                id="branchCity"
                type="text"
                className={inputClasses}
                value={branchInfo.address?.city || ''}
                onChange={(e) => handleChange('address.city', e.target.value)}
                placeholder="Cairo"
              />
            </div>

            <div>
              <label htmlFor="branchState" className={labelClasses}>
                {t('onboarding.clinicInfo.state')}
              </label>
              <input
                id="branchState"
                type="text"
                className={inputClasses}
                value={branchInfo.address?.state || ''}
                onChange={(e) => handleChange('address.state', e.target.value)}
                placeholder="Cairo Governorate"
              />
            </div>

            <div>
              <label htmlFor="branchCountry" className={labelClasses}>
                {t('onboarding.clinicInfo.country')} <span className="text-error-500">*</span>
              </label>
              <input
                id="branchCountry"
                type="text"
                className={inputClasses}
                value={branchInfo.address?.country || ''}
                onChange={(e) => handleChange('address.country', e.target.value)}
                placeholder="Egypt"
              />
            </div>

            <div>
              <label htmlFor="branchPostal" className={labelClasses}>
                {t('onboarding.clinicInfo.postalCode')}
              </label>
              <input
                id="branchPostal"
                type="text"
                className={inputClasses}
                value={branchInfo.address?.postalCode || ''}
                onChange={(e) => handleChange('address.postalCode', e.target.value)}
                placeholder="12345"
              />
            </div>
          </div>
        </div>

        {/* Working Hours Section */}
        <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
          <h3 className="mb-4 font-medium text-gray-900 dark:text-white">
            {t('onboarding.branch.workingHours')}
          </h3>

          <div className="space-y-3">
            {branchInfo.workingHours?.map((hours) => (
              <div
                key={hours.day}
                className="flex items-center gap-4 border-b border-gray-100 py-3 last:border-0 dark:border-gray-800"
              >
                <label className="flex w-32 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hours.isOpen}
                    onChange={(e) =>
                      handleWorkingHoursChange(hours.day, 'isOpen', e.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {dayNames[hours.day]}
                  </span>
                </label>

                {hours.isOpen && (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={hours.startTime}
                      onChange={(e) =>
                        handleWorkingHoursChange(hours.day, 'startTime', e.target.value)
                      }
                      className={timeInputClasses}
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">to</span>
                    <input
                      type="time"
                      value={hours.endTime}
                      onChange={(e) =>
                        handleWorkingHoursChange(hours.day, 'endTime', e.target.value)
                      }
                      className={timeInputClasses}
                    />
                  </div>
                )}

                {!hours.isOpen && (
                  <span className="text-sm text-gray-400 dark:text-gray-500">Closed</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
