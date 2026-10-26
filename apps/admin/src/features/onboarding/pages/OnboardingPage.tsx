import { useState } from 'react';
import { Button } from '@dento/ui';
import { useOnboardingStore, useOnboardingStep } from '@/stores/onboarding.store';
import {
  OnboardingProgress,
  ClinicInfoStep,
  BranchSetupStep,
  AdminUserStep,
  SettingsStep,
} from '../components';
import { useOnboarding } from '../hooks/useOnboarding.js';
import { useTranslation } from '../../../stores/locale.store.js';

/**
 * Per MASTER_PLAN Â§25 - Tenant Onboarding Wizard
 * TailAdmin styling with green primary color theme
 *
 * 4-step wizard for new tenant setup:
 * 1. Clinic Info
 * 2. Branch Setup
 * 3. Admin User
 * 4. Settings
 */

export function OnboardingPage() {
  const { step, isFirst, isLast, canProceed, goNext, goPrev } = useOnboardingStep();
  const {
    isSubmitting,
    error,
    setSubmitting,
    setError,
    clinicInfo,
    branchInfo,
    adminUser,
    settings,
  } = useOnboardingStore();
  const [submitted, setSubmitted] = useState(false);
  const onboardMutation = useOnboarding();
  const { t } = useTranslation();

  const handleSubmit = async () => {
    try {
      setError(null);
      setSubmitting(true);

      await onboardMutation.mutateAsync({
        clinic: {
          name: clinicInfo.name ?? '',
          phone: clinicInfo.phone ?? '',
          email: clinicInfo.email ?? '',
          website: clinicInfo.website,
          address: {
            street: clinicInfo.address?.street ?? '',
            city: clinicInfo.address?.city ?? '',
            state: clinicInfo.address?.state,
            country: clinicInfo.address?.country ?? 'EG',
            postalCode: clinicInfo.address?.postalCode,
          },
        },
        branch: {
          name: branchInfo.name ?? '',
          phone: branchInfo.phone ?? '',
          email: branchInfo.email,
          isMainBranch: branchInfo.isMainBranch ?? true,
          workingHours: branchInfo.workingHours,
          address: {
            street: branchInfo.address?.street ?? '',
            city: branchInfo.address?.city ?? '',
            state: branchInfo.address?.state,
            country: branchInfo.address?.country ?? 'EG',
            postalCode: branchInfo.address?.postalCode,
          },
        },
        admin: {
          firstName: adminUser.firstName ?? '',
          lastName: adminUser.lastName ?? '',
          email: adminUser.email ?? '',
          phone: adminUser.phone ?? '',
          password: adminUser.password ?? '',
        },
        settings: {
          locale: settings.locale,
          country: settings.country,
          currency: settings.currency,
          timezone: settings.timezone,
          dateFormat: settings.dateFormat,
          appointmentDuration: settings.appointmentDuration,
        },
      });

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('onboarding.failedCreate'));
    } finally {
      setSubmitting(false);
    }
  };

  // Success state
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-theme-md dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30">
            <svg
              className="h-10 w-10 text-brand-600 dark:text-brand-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            {t('onboarding.welcome')}
          </h2>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            {t('onboarding.successMessage', { name: clinicInfo.name ?? '' })}
          </p>

          <a
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            {t('onboarding.signIn')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600">
              <span className="text-xl text-white">ðŸ¦·</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">Dento</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {t('onboarding.stepOf', { current: String(step), total: '4' })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Wizard Title */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
            {t('onboarding.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{t('onboarding.subtitle')}</p>
        </div>

        {/* Progress Indicator */}
        <OnboardingProgress />

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-900/50 dark:bg-error-900/20 dark:text-error-400">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="mb-8">
          {step === 1 && <ClinicInfoStep />}
          {step === 2 && <BranchSetupStep />}
          {step === 3 && <AdminUserStep />}
          {step === 4 && <SettingsStep />}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={isFirst || isSubmitting}
            className="gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {t('onboarding.previous')}
          </Button>

          {isLast ? (
            <Button onClick={handleSubmit} disabled={!canProceed || isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {t('onboarding.completeSetup')}
                </>
              ) : (
                <>
                  {t('onboarding.completeSetup')}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </>
              )}
            </Button>
          ) : (
            <Button onClick={goNext} disabled={!canProceed} className="gap-2">
              {t('onboarding.next')}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Need help?{' '}
            <a
              href="#"
              className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              Contact Support
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
