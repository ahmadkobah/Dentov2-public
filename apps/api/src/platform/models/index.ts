// Platform Models — dento_platform database
export { User, type IUser, type IUserProfile } from './user.model.js';
export {
  Tenant,
  type ITenant,
  type ITenantBranding,
  type ITenantContact,
  type ITenantSettings,
} from './tenant.model.js';
export { UserSession, type IUserSession } from './user-session.model.js';
export { TranslationPack, type ITranslationPack } from './translation-pack.model.js';
export { CountryConfig, type ICountryConfig } from './country-config.model.js';
export {
  Module,
  type IModule,
  type IChangelogEntry,
  type IMigrationEntry,
} from './module.model.js';
export {
  TenantModule,
  type ITenantModule,
  type IUpdateHistoryEntry,
} from './tenant-module.model.js';
export { RolloutPlan, type IRolloutPlan, type IRolloutStageEntry } from './rollout-plan.model.js';
export {
  PlatformWebhookEndpoint,
  PlatformWebhookDelivery,
  type IPlatformWebhookEndpoint,
  type IPlatformWebhookDelivery,
} from './webhook.model.js';
export { PricingConfig, type IPricingConfig } from './pricing.model.js';
export { SaaSPayment, type ISaaSPayment, type IMethodDetails } from './payment.model.js';
export { Backup, type IBackup } from './backup.model.js';
export { ApiKey, type IApiKeyDoc, ApiKeyUsage, type IApiKeyUsageDoc } from './api-key.model.js';
export { SupportTicket, type ISupportTicket } from './support-ticket.model.js';
export {
  SupportSession,
  type ISupportSessionDoc,
  type ISessionAction,
} from './support-session.model.js';

// Phase 6 — New models
export { ErrorLog, type IErrorLog, type ErrorLevel, type ErrorSource } from './error-log.model.js';
export { LoginAttempt, type ILoginAttempt, type LoginFailReason } from './login-attempt.model.js';
export { BackupConfig, type IBackupConfig, getBackupConfig } from './backup-config.model.js';
export { Domain, type IDomain, type IDNSRecord, type SSLStatus } from './domain.model.js';

// Phase 7 — Platform Settings singletons
export {
  SystemSettings,
  type ISystemSettings,
  getSystemSettings,
} from './system-settings.model.js';
export { PlatformBranding, type IPlatformBranding, getPlatformBranding } from './branding.model.js';
export {
  Currencies,
  type ICurrencies,
  type IExchangeRate,
  getCurrencies,
} from './currencies.model.js';
export {
  PlatformChannels,
  type IPlatformChannels,
  type IPlatformChannelConfig,
  getPlatformChannels,
} from './platform-channels.model.js';

// Phase 7 — Feature Flags
export { FeatureFlag, type IFeatureFlag } from './feature-flag.model.js';

// Sprint 2 — P1 #9 Missing Platform Models
export { WebhookEventType, type IWebhookEventType } from './webhook-event-type.model.js';
export {
  DunningLog,
  type IDunningLog,
  type DunningChannel,
  type DunningStatus,
  type EscalationLevel,
} from './dunning-log.model.js';
export { Language, type ILanguage } from './language.model.js';
export { TenantLanguage, type ITenantLanguage } from './tenant-language.model.js';

// Platform Documentation
export { PlatformDoc, type IPlatformDoc } from './platform-doc.model.js';

// Tenant Notes — bi-directional activity between platform & tenant
export { TenantNote, type ITenantNote, type NoteSource } from './tenant-note.model.js';
