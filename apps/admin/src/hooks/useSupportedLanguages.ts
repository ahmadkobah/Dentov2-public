import { useSettingsByKey } from '../features/settings/hooks/useTenantSettings.js';
import { useSubscriptionPlan } from '../features/subscription/hooks/useSubscription.js';

/**
 * Returns the tenant's supported languages and default language
 * from the clinic settings (injected from platform Tenant record).
 * `isMultiLang` is true only when the tenant has > 1 language AND
 * the `language_pack` module is enabled (or no modules are set — free tier).
 */
export function useSupportedLanguages() {
  const { data: clinic, isLoading: clinicLoading } = useSettingsByKey('clinic');
  const { data: sub, isLoading: subLoading } = useSubscriptionPlan();

  const supportedLanguages = (clinic?.supportedLanguages as string[] | undefined) ?? ['en'];
  const enabledModules = sub?.plan?.enabledModules ?? [];
  const hasLanguagePack = enabledModules.length === 0 || enabledModules.includes('language_pack');

  return {
    supportedLanguages,
    defaultLanguage: clinic?.defaultLanguage ?? 'en',
    isMultiLang: supportedLanguages.length > 1 && hasLanguagePack,
    isLoading: clinicLoading || subLoading,
  };
}
