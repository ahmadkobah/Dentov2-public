import { useOnboardingStep, useOnboardingProgress } from '@/stores/onboarding.store';
import { Button } from '@dento/ui';
import { useTranslation } from '../../../stores/locale.store.js';

/**
 * Per MASTER_PLAN Â§25 - Tenant Onboarding Wizard
 * TailAdmin styling with green primary color theme
 *
 * 4-step wizard progress indicator
 */

const steps = [
  { number: 1, titleKey: 'onboarding.step.clinicInfo', descKey: 'onboarding.step.clinicInfoDesc' },
  {
    number: 2,
    titleKey: 'onboarding.step.branchSetup',
    descKey: 'onboarding.step.branchSetupDesc',
  },
  { number: 3, titleKey: 'onboarding.step.adminUser', descKey: 'onboarding.step.adminUserDesc' },
  { number: 4, titleKey: 'onboarding.step.settings', descKey: 'onboarding.step.settingsDesc' },
];

export function OnboardingProgress() {
  const { step: currentStep, goTo } = useOnboardingStep();
  const { completed } = useOnboardingProgress();
  const { t } = useTranslation();

  return (
    <nav aria-label="Onboarding progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {steps.map((stepItem, index) => {
          const isCompleted = completed.includes(stepItem.number);
          const isCurrent = currentStep === stepItem.number;
          const isClickable = isCompleted || stepItem.number <= currentStep;

          return (
            <li key={stepItem.number} className="relative flex-1">
              {/* Connector line */}
              {index > 0 && (
                <div
                  className={`absolute start-0 top-4 -translate-x-1/2 h-0.5 w-full transition-colors ${
                    completed.includes(stepItem.number) || completed.includes(stepItem.number - 1)
                      ? 'bg-brand-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  style={{ width: 'calc(100% - 2rem)', left: '-50%', marginLeft: '1rem' }}
                />
              )}

              {/* Step indicator */}
              <Button
                variant="ghost"
                onClick={() => isClickable && goTo(stepItem.number)}
                disabled={!isClickable}
                className={`relative flex h-auto flex-col items-center p-0 hover:bg-transparent ${
                  isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-all ${
                    isCurrent
                      ? 'border-brand-500 bg-brand-500 text-white shadow-md'
                      : isCompleted
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-gray-300 bg-white text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    stepItem.number
                  )}
                </span>

                <span
                  className={`mt-2 text-xs font-medium transition-colors ${
                    isCurrent
                      ? 'text-brand-600 dark:text-brand-400'
                      : isCompleted
                        ? 'text-brand-600 dark:text-brand-400'
                        : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {t(stepItem.titleKey)}
                </span>

                <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:block">
                  {t(stepItem.descKey)}
                </span>
              </Button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
