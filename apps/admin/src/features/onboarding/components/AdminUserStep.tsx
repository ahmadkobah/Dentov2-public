import { useState } from 'react';
import { Button } from '@dento/ui';
import { useOnboardingStore } from '@/stores/onboarding.store';
import { PhoneInput } from '@dento/ui';
import { useTranslation } from '../../../stores/locale.store.js';

/**
 * Step 3: Admin User
 * TailAdmin styling with green primary color theme
 *
 * Creates the first admin user for the clinic:
 * - First name, last name
 * - Email, phone
 * - Password (with confirmation)
 */

export function AdminUserStep() {
  const { adminUser, updateAdminUser } = useOnboardingStore();
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useTranslation();

  const handleChange = (field: string, value: string) => {
    updateAdminUser({ [field]: value });
  };

  // Password validation
  const password = adminUser.password || '';
  const confirmPassword = adminUser.confirmPassword || '';

  const passwordChecks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    matches: password === confirmPassword && password.length > 0,
  };

  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;

  const inputClasses =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-500';

  const labelClasses = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('onboarding.admin.title')}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('onboarding.admin.subtitle')}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* First Name */}
          <div>
            <label htmlFor="firstName" className={labelClasses}>
              {t('onboarding.admin.firstName')} <span className="text-error-500">*</span>
            </label>
            <input
              id="firstName"
              type="text"
              className={inputClasses}
              value={adminUser.firstName || ''}
              onChange={(e) => handleChange('firstName', e.target.value)}
              placeholder="Ahmad"
            />
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="lastName" className={labelClasses}>
              {t('onboarding.admin.lastName')} <span className="text-error-500">*</span>
            </label>
            <input
              id="lastName"
              type="text"
              className={inputClasses}
              value={adminUser.lastName || ''}
              onChange={(e) => handleChange('lastName', e.target.value)}
              placeholder="Mohamed"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="adminEmail" className={labelClasses}>
              {t('onboarding.admin.email')} <span className="text-error-500">*</span>
            </label>
            <input
              id="adminEmail"
              type="email"
              className={inputClasses}
              value={adminUser.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="admin@smiledental.com"
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              {t('onboarding.admin.signInNote')}
            </p>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="adminPhone" className={labelClasses}>
              {t('onboarding.admin.phone')} <span className="text-error-500">*</span>
            </label>
            <PhoneInput
              value={adminUser.phone || ''}
              onChange={(v) => handleChange('phone', v)}
              defaultCountry="SA"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className={labelClasses}>
              {t('onboarding.admin.password')} <span className="text-error-500">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={inputClasses}
                value={adminUser.password || ''}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-1/2 h-auto w-auto -translate-y-1/2 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </Button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className={labelClasses}>
              {t('onboarding.admin.confirmPassword')} <span className="text-error-500">*</span>
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              className={inputClasses}
              value={adminUser.confirmPassword || ''}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
            />
          </div>
        </div>

        {/* Password Requirements */}
        {password && (
          <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {t('onboarding.admin.passwordStrength')}
              </span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className={`h-2 w-6 rounded-full ${
                      i <= passwordStrength
                        ? passwordStrength <= 2
                          ? 'bg-error-500'
                          : passwordStrength <= 4
                            ? 'bg-warning-500'
                            : 'bg-success-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            <ul className="grid grid-cols-2 gap-2 text-xs">
              <li
                className={`flex items-center gap-1 ${
                  passwordChecks.minLength
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {passwordChecks.minLength ? 'âœ“' : 'â—‹'} {t('onboarding.admin.minLength')}
              </li>
              <li
                className={`flex items-center gap-1 ${
                  passwordChecks.hasUppercase
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {passwordChecks.hasUppercase ? 'âœ“' : 'â—‹'} {t('onboarding.admin.uppercase')}
              </li>
              <li
                className={`flex items-center gap-1 ${
                  passwordChecks.hasLowercase
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {passwordChecks.hasLowercase ? 'âœ“' : 'â—‹'} {t('onboarding.admin.lowercase')}
              </li>
              <li
                className={`flex items-center gap-1 ${
                  passwordChecks.hasNumber
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {passwordChecks.hasNumber ? 'âœ“' : 'â—‹'} {t('onboarding.admin.number')}
              </li>
              <li
                className={`flex items-center gap-1 ${
                  passwordChecks.hasSpecial
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {passwordChecks.hasSpecial ? 'âœ“' : 'â—‹'} {t('onboarding.admin.special')}
              </li>
              <li
                className={`flex items-center gap-1 ${
                  passwordChecks.matches
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {passwordChecks.matches ? 'âœ“' : 'â—‹'} {t('onboarding.admin.passwordMatch')}
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
