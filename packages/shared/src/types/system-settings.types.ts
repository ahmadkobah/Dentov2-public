/**
 * Platform System Settings Types — Phase 7
 *
 * Per V2_DATABASE §4.17 — system_settings, branding, currencies singletons
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 2.1
 *
 * These types describe the platform-level configuration managed
 * via the Developer Portal Settings page.
 */

// ── System Settings (singleton) ─────────────────────────────

export interface SystemSettings {
  _id: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  defaultTimezone: string;
  defaultCurrency: string;
  defaultLanguage: string;
  registrationEnabled: boolean;
  maxTenantsPerCluster: number;
  supportEmail: string;
  platformVersion: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UpdateSystemSettingsInput = Partial<
  Pick<
    SystemSettings,
    | 'maintenanceMode'
    | 'maintenanceMessage'
    | 'defaultTimezone'
    | 'defaultCurrency'
    | 'defaultLanguage'
    | 'registrationEnabled'
    | 'maxTenantsPerCluster'
    | 'supportEmail'
    | 'platformVersion'
  >
>;

// ── Docs Config ─────────────────────────────────────────────

export interface DocsConfig {
  headerLogo: string;
  headerTitle: string;
  footerSupportEmail: string;
  footerSupportPhone: string;
  footerCopyrightText: string;
  footerPlatformVersion: string;
}

// ── Branding (singleton) ────────────────────────────────────

export interface Branding {
  _id: string;
  platformName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  landingPageUrl: string;
  docsConfig: DocsConfig;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UpdateBrandingInput = Partial<
  Pick<Branding, 'platformName' | 'logoUrl' | 'faviconUrl' | 'primaryColor' | 'landingPageUrl'> & {
    docsConfig: Partial<DocsConfig>;
  }
>;

// ── Currencies (singleton) ──────────────────────────────────

export interface ExchangeRate {
  currency: string;
  rate: number;
}

export interface Currencies {
  _id: string;
  baseCurrency: string;
  exchangeRates: ExchangeRate[];
  lastUpdatedAt: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UpdateCurrenciesInput = Partial<
  Pick<Currencies, 'baseCurrency'> & { exchangeRates: ExchangeRate[] }
>;

// ── API Response Shapes ─────────────────────────────────────

export interface PlatformSettingsResponse {
  systemSettings: SystemSettings;
  branding: Branding;
  currencies: Currencies;
}
