/**
 * Settings Page — §14 Branding + General Settings
 *
 * Tabs per ADMIN_PORTAL_SCREENS.md §13:
 * [General] [Branding] [Notifications] [Sessions] [Billing]
 *
 * Phase 2: General + Branding tabs are functional.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Label,
  Badge,
  PhoneInput,
  cn,
} from '@dento/ui';
import {
  Settings,
  Paintbrush,
  Bell,
  Monitor,
  CreditCard,
  Upload,
  RotateCcw,
  Check,
  Globe,
  Radio,
  Clock,
  Palette,
  Image,
  Type,
  MapPin,
  Phone,
  Mail,
  Link2,
  Eye,
  ListFilter,
  Loader2,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import {
  useBrandingStore,
  type LogoSize,
  type LogoAlignment,
  type LogoLayout,
} from '../../../stores/branding.store.js';
import { apiClient } from '../../../lib/api-client.js';
import { useBrandingUpload } from '../hooks/useBrandingUpload.js';
import { SessionsTab } from '../components/SessionsTab.js';
import { CustomFieldsManager } from '../components/CustomFieldsManager.js';
import { NotificationSettingsTab } from '../components/NotificationSettingsTab.js';
import { OnlineBookingSettingsTab } from '../components/OnlineBookingSettingsTab.js';
import { ChannelsCard } from '../components/ChannelsCard.js';
import { BookingWidgetTab } from '../components/BookingWidgetTab.js';
import { WhatsAppBotTab } from '../components/WhatsAppBotTab.js';
import { useSettingsByKey, useUpdateSettings } from '../hooks/useTenantSettings.js';
import { useTenantCountry } from '@/hooks/useTenantCountry.js';
import { getDefaultCurrency } from '@/lib/currency.js';
import { useSupportedLanguages } from '@/hooks/useSupportedLanguages.js';
import { useTranslation } from '@/stores/locale.store.js';
import { useCurrencyOptions, useTimezoneOptions } from '@/hooks/useCountryConfigs.js';

// ── Tab Configuration ───────────────────────────────────────

type SettingsTab =
  | 'general'
  | 'branding'
  | 'notifications'
  | 'sessions'
  | 'billing'
  | 'custom-fields'
  | 'online-booking'
  | 'channels'
  | 'booking-widget'
  | 'whatsapp-bot';

const TABS: { key: SettingsTab; label: string; icon: typeof Settings; ready: boolean }[] = [
  { key: 'general', label: 'settings.tabs.general', icon: Settings, ready: true },
  { key: 'branding', label: 'settings.tabs.branding', icon: Paintbrush, ready: true },
  { key: 'notifications', label: 'settings.tabs.notifications', icon: Bell, ready: true },
  { key: 'sessions', label: 'settings.tabs.sessions', icon: Monitor, ready: true },
  { key: 'online-booking', label: 'settings.tabs.onlineBooking', icon: Globe, ready: true },
  { key: 'booking-widget', label: 'settings.tabs.bookingWidget', icon: Eye, ready: true },
  { key: 'whatsapp-bot', label: 'settings.tabs.whatsappBot', icon: MessageSquare, ready: true },
  { key: 'channels', label: 'settings.tabs.channels', icon: Radio, ready: true },
  { key: 'billing', label: 'settings.tabs.billing', icon: CreditCard, ready: true },
  { key: 'custom-fields', label: 'settings.tabs.customFields', icon: ListFilter, ready: true },
];

// ── Main Settings Page ──────────────────────────────────────

export function SettingsPage({ initialTab }: { initialTab?: SettingsTab }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab ?? 'general');
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Billing tab redirects to the dedicated Subscription page
  useEffect(() => {
    if (activeTab === 'billing') {
      navigate('/subscription', { replace: true });
    }
  }, [activeTab, navigate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('settings.page.title')}</h1>
        <p className="text-muted-foreground">{t('settings.page.description')}</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <Button
            key={tab.key}
            variant="ghost"
            onClick={() => setActiveTab(tab.key)}
            className={`gap-2 rounded-none border-b-2 px-4 py-2.5 text-sm font-medium ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {t(tab.label)}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && <GeneralTab />}
      {activeTab === 'branding' && <BrandingTab />}
      {activeTab === 'notifications' && <NotificationSettingsTab />}
      {activeTab === 'sessions' && <SessionsTab />}
      {activeTab === 'online-booking' && <OnlineBookingSettingsTab />}
      {activeTab === 'booking-widget' && <BookingWidgetTab />}
      {activeTab === 'whatsapp-bot' && <WhatsAppBotTab />}
      {activeTab === 'channels' && <ChannelsCard />}
      {activeTab === 'billing' && null /* redirects to /subscription */}
      {activeTab === 'custom-fields' && <CustomFieldsManager />}
    </div>
  );
}

// ── Color Swatch (ref-based to avoid inline style lint) ─────

function ColorSwatch({ color }: { color: string }) {
  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) el.style.backgroundColor = color;
    },
    [color],
  );
  return <div ref={ref} className="h-10 w-24 rounded border" />;
}

// ── General Tab ─────────────────────────────────────────────

const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  ar: 'Arabic (العربية)',
  he: 'Hebrew (עברית)',
  fa: 'Persian (فارسی)',
  fr: 'French (Français)',
  es: 'Spanish (Español)',
  tr: 'Turkish (Türkçe)',
};

function GeneralTab() {
  const tenantCountry = useTenantCountry();
  const { t } = useTranslation();
  const { supportedLanguages } = useSupportedLanguages();
  const currencyOptions = useCurrencyOptions();
  const timezoneOptions = useTimezoneOptions();
  // ── API data ──────────────────────────────────────────────
  const {
    data: clinic,
    isLoading: clinicLoading,
    isError: clinicError,
  } = useSettingsByKey('clinic');
  const {
    data: apptSettings,
    isLoading: apptLoading,
    isError: apptError,
  } = useSettingsByKey('appointment');
  const updateClinic = useUpdateSettings('clinic');
  const updateAppointment = useUpdateSettings('appointment');

  // ── Local form state ──────────────────────────────────────
  const [settings, setSettings] = useState({
    clinicName: '',
    phone: '',
    email: '',
    address: '',
    language: 'en',
    currency: getDefaultCurrency(),
    timezone: 'Africa/Cairo',
    dateFormat: 'DD/MM/YYYY',
  });

  const [workingDays, setWorkingDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [workingHoursStart, setWorkingHoursStart] = useState('09:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('17:00');

  // ── Sync API → local state ────────────────────────────────
  useEffect(() => {
    if (clinic) {
      setSettings({
        clinicName: clinic.name?.en ?? '',
        phone: clinic.phone ?? '',
        email: clinic.email ?? '',
        address: clinic.address?.en ?? '',
        language: clinic.defaultLanguage ?? 'en',
        currency: clinic.currency ?? getDefaultCurrency(),
        timezone: clinic.timezone ?? 'Africa/Cairo',
        dateFormat: clinic.dateFormat ?? 'DD/MM/YYYY',
      });
    }
  }, [clinic]);

  useEffect(() => {
    if (apptSettings) {
      setWorkingDays(apptSettings.workingDays ?? [0, 1, 2, 3, 4]);
      setWorkingHoursStart(apptSettings.workingHoursStart ?? '09:00');
      setWorkingHoursEnd(apptSettings.workingHoursEnd ?? '17:00');
    }
  }, [apptSettings]);

  // ── Save handler ──────────────────────────────────────────
  const handleSave = useCallback(() => {
    updateClinic.mutate({
      name: { en: settings.clinicName },
      phone: settings.phone,
      email: settings.email,
      address: { en: settings.address },
      defaultLanguage: settings.language as 'en' | 'ar',
      currency: settings.currency,
      timezone: settings.timezone,
      dateFormat: settings.dateFormat,
    });
    updateAppointment.mutate({
      workingDays,
      workingHoursStart,
      workingHoursEnd,
    });
  }, [settings, workingDays, workingHoursStart, workingHoursEnd, updateClinic, updateAppointment]);

  const toggleDay = useCallback((dayIndex: number) => {
    setWorkingDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex].sort(),
    );
  }, []);

  const isSaving = updateClinic.isPending || updateAppointment.isPending;

  if (clinicLoading || apptLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (clinicError || apptError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-lg font-medium text-destructive">{t('settings.general.errorTitle')}</p>
        <p className="text-sm text-muted-foreground">{t('settings.general.errorMessage')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Clinic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Clinic Information
          </CardTitle>
          <CardDescription>{t('settings.general.clinicInfo.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clinicName">{t('settings.general.clinicInfo.clinicName')}</Label>
              <Input
                id="clinicName"
                value={settings.clinicName}
                onChange={(e) => setSettings({ ...settings, clinicName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t('settings.general.clinicInfo.phone')}</Label>
              <PhoneInput
                value={settings.phone}
                onChange={(v) => setSettings({ ...settings, phone: v })}
                defaultCountry={tenantCountry}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('settings.general.clinicInfo.email')}</Label>
              <Input
                id="email"
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">{t('settings.general.clinicInfo.address')}</Label>
              <Input
                id="address"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Locale */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Locale Settings
          </CardTitle>
          <CardDescription>{t('settings.general.locale.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('settings.general.locale.language')}</Label>
              <select
                aria-label="Language"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={settings.language}
                onChange={(e) => setSettings({ ...settings, language: e.target.value })}
              >
                {supportedLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {LANGUAGE_LABELS[lang] ?? lang.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('settings.general.locale.currency')}</Label>
              <select
                aria-label="Currency"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              >
                {currencyOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('settings.general.locale.timezone')}</Label>
              <select
                aria-label="Timezone"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              >
                {timezoneOptions.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('settings.general.locale.dateFormat')}</Label>
              <select
                aria-label="Date format"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={settings.dateFormat}
                onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Working Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Working Hours
          </CardTitle>
          <CardDescription>{t('settings.general.workingHours.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
            <div className="space-y-1">
              <Label htmlFor="hoursStart">{t('settings.general.workingHours.start')}</Label>
              <Input
                id="hoursStart"
                type="time"
                value={workingHoursStart}
                onChange={(e) => setWorkingHoursStart(e.target.value)}
                className="w-32 h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hoursEnd">{t('settings.general.workingHours.end')}</Label>
              <Input
                id="hoursEnd"
                type="time"
                value={workingHoursEnd}
                onChange={(e) => setWorkingHoursEnd(e.target.value)}
                className="w-32 h-8 text-sm"
              />
            </div>
          </div>
          <div className="space-y-3">
            {DAY_KEYS.map((dayKey, idx) => {
              const active = workingDays.includes(idx);
              return (
                <div key={dayKey} className="flex items-center gap-4 rounded-lg border p-3">
                  <div className="w-28 font-medium">{t(`settings.general.days.${dayKey}`)}</div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleDay(idx)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm">
                      {active
                        ? t('settings.general.workingHours.active')
                        : t('settings.general.workingHours.closed')}
                    </span>
                  </label>
                  {active ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {workingHoursStart} — {workingHoursEnd}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">
                      {t('settings.general.workingHours.off')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="gap-2" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {t('settings.general.saveChanges')}
        </Button>
      </div>
    </div>
  );
}

// ── Branding Tab ────────────────────────────────────────────

function BrandingTab() {
  const { isMultiLang } = useSupportedLanguages();
  const tenantCountry = useTenantCountry();
  const { t } = useTranslation();
  const branding = useBrandingStore();
  const [isSaving, setIsSaving] = useState(false);
  const { upload, isUploading } = useBrandingUpload();

  // File input refs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoDarkInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Preview URLs (presigned URLs for immediate display after upload)
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoDarkPreview, setLogoDarkPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  // S3 keys stored locally until save
  const [logoKey, setLogoKey] = useState<string | null>(null);
  const [logoDarkKey, setLogoDarkKey] = useState<string | null>(null);
  const [faviconKey, setFaviconKey] = useState<string | null>(null);

  // Local state for form editing
  const [form, setForm] = useState({
    clinicNameEn: branding.clinicName.en || 'My Dental Clinic',
    clinicNameAr: branding.clinicName.ar || '',
    phone: branding.phone || '',
    email: branding.email || '',
    website: branding.website || '',
    addressEn: branding.address.main.en || '',
    addressAr: branding.address.main.ar || '',
    primaryColor: branding.primaryColor || '#4f46e5',
    accentColor: branding.accentColor || '#10b981',
    logoSize: branding.logoSize || ('medium' as LogoSize),
    logoAlignment: branding.logoAlignment || ('left' as LogoAlignment),
    logoLayout: branding.logoLayout || ('logo-left' as LogoLayout),
  });

  const handleUpload = async (
    file: File,
    setKey: (k: string) => void,
    setPreview: (u: string) => void,
  ) => {
    try {
      const result = await upload(file);
      setKey(result.key);
      setPreview(result.url);
    } catch {
      // useBrandingUpload throws with message
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setKey: (k: string) => void,
    setPreview: (u: string) => void,
  ) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file, setKey, setPreview);
    e.target.value = '';
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        clinicName: { en: form.clinicNameEn, ar: form.clinicNameAr || undefined },
        phone: form.phone || undefined,
        email: form.email || undefined,
        website: form.website || undefined,
        primaryColor: form.primaryColor,
        accentColor: form.accentColor,
        logoSize: form.logoSize,
        logoAlignment: form.logoAlignment,
        logoLayout: form.logoLayout,
      };
      if (form.addressEn) {
        payload.address = { main: { en: form.addressEn, ar: form.addressAr || undefined } };
      }
      if (logoKey !== null) payload.logoUrl = logoKey;
      if (logoDarkKey !== null) payload.logoDarkUrl = logoDarkKey;
      if (faviconKey !== null) payload.faviconUrl = faviconKey;

      await apiClient.patch('/api/branding', payload);
      // Update local store so UI reflects changes immediately
      branding.setBranding({
        clinicName: { en: form.clinicNameEn, ar: form.clinicNameAr },
        phone: form.phone,
        email: form.email,
        website: form.website,
        address: { main: { en: form.addressEn, ar: form.addressAr } },
        primaryColor: form.primaryColor,
        accentColor: form.accentColor,
        logoSize: form.logoSize,
        logoAlignment: form.logoAlignment,
        logoLayout: form.logoLayout,
        ...(logoPreview && { logoUrl: logoPreview }),
        ...(logoDarkPreview && { logoDarkUrl: logoDarkPreview }),
        ...(faviconPreview && { faviconUrl: faviconPreview }),
      });
    } catch {
      // apiClient already shows errors via interceptor
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      await apiClient.delete('/api/branding');
      branding.resetBranding();
      setForm({
        clinicNameEn: 'My Dental Clinic',
        clinicNameAr: '',
        phone: '',
        email: '',
        website: '',
        addressEn: '',
        addressAr: '',
        primaryColor: '#4f46e5',
        accentColor: '#10b981',
        logoSize: 'medium',
        logoAlignment: 'left',
        logoLayout: 'logo-left',
      });
    } catch {
      // apiClient already shows errors via interceptor
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Logo Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            {t('settings.branding.logo.title')}
          </CardTitle>
          <CardDescription>{t('settings.branding.logo.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            {/* Light Logo */}
            <div className="space-y-3">
              <Label className="flex items-center gap-1.5">
                {t('settings.branding.logo.lightLogo')}
                <Badge variant="secondary" className="text-[10px]">
                  {t('settings.branding.logo.sidebar')}
                </Badge>
              </Label>
              <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed bg-white dark:bg-gray-50">
                {logoPreview || branding.logoUrl ? (
                  <img
                    src={logoPreview || branding.logoUrl!}
                    alt="Light logo"
                    className="max-h-24 max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center text-sm text-muted-foreground">
                    <Upload className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    {t('settings.branding.logo.noLogoUploaded')}
                  </div>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, setLogoKey, setLogoPreview)}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                disabled={isUploading}
                onClick={() => logoInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" />
                {isUploading
                  ? t('settings.branding.uploading')
                  : t('settings.branding.logo.uploadLightLogo')}
              </Button>
            </div>

            {/* Dark Logo */}
            <div className="space-y-3">
              <Label className="flex items-center gap-1.5">
                {t('settings.branding.logo.darkLogo')}
                <Badge variant="secondary" className="text-[10px]">
                  {t('settings.branding.logo.darkMode')}
                </Badge>
              </Label>
              <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed bg-gray-900">
                {logoDarkPreview || branding.logoDarkUrl ? (
                  <img
                    src={logoDarkPreview || branding.logoDarkUrl!}
                    alt="Dark logo"
                    className="max-h-24 max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center text-sm text-gray-400">
                    <Upload className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    {t('settings.branding.logo.noDarkLogo')}
                  </div>
                )}
              </div>
              <input
                ref={logoDarkInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, setLogoDarkKey, setLogoDarkPreview)}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                disabled={isUploading}
                onClick={() => logoDarkInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" />
                {isUploading
                  ? t('settings.branding.uploading')
                  : t('settings.branding.logo.uploadDarkLogo')}
              </Button>
            </div>

            {/* Favicon */}
            <div className="space-y-3">
              <Label className="flex items-center gap-1.5">
                {t('settings.branding.logo.favicon')}
                <Badge variant="secondary" className="text-[10px]">
                  {t('settings.branding.logo.browserTab')}
                </Badge>
              </Label>
              <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed">
                {faviconPreview || branding.faviconUrl ? (
                  <img
                    src={faviconPreview || branding.faviconUrl!}
                    alt="Favicon"
                    className="h-16 w-16 object-contain"
                  />
                ) : (
                  <div className="text-center text-sm text-muted-foreground">
                    <Upload className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    {t('settings.branding.logo.noFavicon')}
                  </div>
                )}
              </div>
              <input
                ref={faviconInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, setFaviconKey, setFaviconPreview)}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                disabled={isUploading}
                onClick={() => faviconInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" />
                {isUploading
                  ? t('settings.branding.uploading')
                  : t('settings.branding.logo.uploadFavicon')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('settings.branding.logoDisplay.title')}
          </CardTitle>
          <CardDescription>{t('settings.branding.logoDisplay.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            {/* Size */}
            <div className="space-y-2">
              <Label>{t('settings.branding.logoDisplay.size')}</Label>
              <div className="flex gap-2">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setForm((f) => ({ ...f, logoSize: size }))}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition-colors',
                      form.logoSize === size
                        ? 'border-primary bg-primary/10 font-medium text-primary'
                        : 'hover:bg-muted',
                    )}
                  >
                    {t(
                      `settings.branding.logoDisplay.size${size.charAt(0).toUpperCase() + size.slice(1)}`,
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Alignment */}
            <div className="space-y-2">
              <Label>{t('settings.branding.logoDisplay.alignment')}</Label>
              <div className="flex gap-2">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => setForm((f) => ({ ...f, logoAlignment: align }))}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition-colors',
                      form.logoAlignment === align
                        ? 'border-primary bg-primary/10 font-medium text-primary'
                        : 'hover:bg-muted',
                    )}
                  >
                    {t(
                      `settings.branding.logoDisplay.align${align.charAt(0).toUpperCase() + align.slice(1)}`,
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Layout */}
            <div className="space-y-2">
              <Label>{t('settings.branding.logoDisplay.layout')}</Label>
              <div className="flex gap-2">
                {(
                  [
                    { value: 'logo-left', label: 'settings.branding.logoDisplay.layoutSide' },
                    { value: 'logo-top', label: 'settings.branding.logoDisplay.layoutStacked' },
                    { value: 'logo-only', label: 'settings.branding.logoDisplay.layoutLogoOnly' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setForm((f) => ({ ...f, logoLayout: opt.value }))}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-sm transition-colors',
                      form.logoLayout === opt.value
                        ? 'border-primary bg-primary/10 font-medium text-primary'
                        : 'hover:bg-muted',
                    )}
                  >
                    {t(opt.label)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview — shows how logos appear in sidebar + browser tab */}
      {(logoPreview ||
        branding.logoUrl ||
        logoDarkPreview ||
        branding.logoDarkUrl ||
        faviconPreview ||
        branding.faviconUrl) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Live Preview
            </CardTitle>
            <CardDescription>
              How your branding looks in the sidebar and browser tab
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const sizeClass = { small: 'h-6 w-6', medium: 'h-8 w-8', large: 'h-12 w-12' }[
                form.logoSize
              ];
              const alignClass = {
                left: 'justify-start',
                center: 'justify-center',
                right: 'justify-end',
              }[form.logoAlignment];
              const isStacked = form.logoLayout === 'logo-top';
              const isLogoOnly = form.logoLayout === 'logo-only';
              const wrapperDir = isStacked ? 'flex-col items-center' : 'items-center';

              const renderLogoBlock = (
                imgSrc: string | null,
                alt: string,
                textClass: string,
                fallbackEmoji: string,
              ) => (
                <div className={cn('flex gap-2', wrapperDir, alignClass)}>
                  {imgSrc ? (
                    <img src={imgSrc} alt={alt} className={cn(sizeClass, 'object-contain')} />
                  ) : (
                    <span className="text-2xl">{fallbackEmoji}</span>
                  )}
                  {!isLogoOnly && (
                    <span
                      className={cn('text-sm font-bold truncate', textClass, isStacked && 'mt-1')}
                    >
                      {form.clinicNameEn || 'Dento'}
                    </span>
                  )}
                </div>
              );

              return (
                <div className="grid gap-6 sm:grid-cols-3">
                  {/* Light sidebar preview */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      {t('settings.branding.livePreview.sidebarLight')}
                    </Label>
                    <div className="rounded-lg border bg-white p-4 dark:bg-white">
                      <div className="border-b pb-3">
                        {renderLogoBlock(
                          logoPreview || branding.logoUrl,
                          'Light logo',
                          'text-gray-900',
                          '🦷',
                        )}
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="h-2 w-3/4 rounded bg-gray-200" />
                        <div className="h-2 w-1/2 rounded bg-gray-200" />
                        <div className="h-2 w-2/3 rounded bg-gray-200" />
                      </div>
                    </div>
                  </div>

                  {/* Dark sidebar preview */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      {t('settings.branding.livePreview.sidebarDark')}
                    </Label>
                    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                      <div className="border-b border-gray-700 pb-3">
                        {renderLogoBlock(
                          logoDarkPreview ||
                            branding.logoDarkUrl ||
                            logoPreview ||
                            branding.logoUrl,
                          'Dark logo',
                          'text-white',
                          '🦷',
                        )}
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="h-2 w-3/4 rounded bg-gray-600" />
                        <div className="h-2 w-1/2 rounded bg-gray-600" />
                        <div className="h-2 w-2/3 rounded bg-gray-600" />
                      </div>
                    </div>
                  </div>

                  {/* Browser tab preview */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      {t('settings.branding.livePreview.browserTab')}
                    </Label>
                    <div className="rounded-lg border bg-gray-100 p-4 dark:bg-gray-900">
                      <div className="flex items-center gap-2 rounded-t-md bg-white px-3 py-2 shadow-sm dark:bg-gray-800">
                        {faviconPreview || branding.faviconUrl ? (
                          <img
                            src={faviconPreview || branding.faviconUrl!}
                            alt="Favicon"
                            className="h-4 w-4 object-contain"
                          />
                        ) : (
                          <span className="text-xs">🦷</span>
                        )}
                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                          {form.clinicNameEn || 'Dento'} — Admin Portal
                        </span>
                        <span className="ms-auto text-[10px] text-gray-400">×</span>
                      </div>
                      <div className="mt-2 rounded bg-white p-3 dark:bg-gray-800">
                        <div className="space-y-2">
                          <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-600" />
                          <div className="h-2 w-3/4 rounded bg-gray-200 dark:bg-gray-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Clinic Name (Bilingual) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            {t('settings.branding.clinicName.title')}
          </CardTitle>
          <CardDescription>{t('settings.branding.clinicName.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nameEn">{t('settings.branding.clinicName.englishName')}</Label>
              <Input
                id="nameEn"
                value={form.clinicNameEn}
                onChange={(e) => setForm({ ...form, clinicNameEn: e.target.value })}
                placeholder="Cairo Dental Center"
              />
            </div>
            {isMultiLang && (
              <div className="space-y-2">
                <Label htmlFor="nameAr">{t('settings.branding.clinicName.arabicName')}</Label>
                <Input
                  id="nameAr"
                  dir="rtl"
                  value={form.clinicNameAr}
                  onChange={(e) => setForm({ ...form, clinicNameAr: e.target.value })}
                  placeholder="مركز القاهرة لطب الأسنان"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contact & Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t('settings.branding.contactAddress.title')}
          </CardTitle>
          <CardDescription>{t('settings.branding.contactAddress.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="addressEn" className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {t('settings.branding.contactAddress.addressEnglish')}
              </Label>
              <Input
                id="addressEn"
                value={form.addressEn}
                onChange={(e) => setForm({ ...form, addressEn: e.target.value })}
                placeholder="15 Tahrir St, Downtown Cairo"
              />
            </div>
            {isMultiLang && (
              <div className="space-y-2">
                <Label htmlFor="addressAr" className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {t('settings.branding.contactAddress.addressArabic')}
                </Label>
                <Input
                  id="addressAr"
                  dir="rtl"
                  value={form.addressAr}
                  onChange={(e) => setForm({ ...form, addressAr: e.target.value })}
                  placeholder="15 شارع التحرير، وسط القاهرة"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="brandingPhone" className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                {t('settings.branding.contactAddress.phone')}
              </Label>
              <PhoneInput
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
                defaultCountry={tenantCountry}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandingEmail" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {t('settings.branding.contactAddress.email')}
              </Label>
              <Input
                id="brandingEmail"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="info@cairodentalcenter.com"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="brandingWebsite" className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" />
                {t('settings.branding.contactAddress.website')}
              </Label>
              <Input
                id="brandingWebsite"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="www.cairodentalcenter.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {t('settings.branding.colors.title')}
          </CardTitle>
          <CardDescription>{t('settings.branding.colors.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <Label>{t('settings.branding.colors.primaryColor')}</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  aria-label="Primary color picker"
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="h-10 w-16 cursor-pointer rounded border"
                />
                <Input
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="flex-1 font-mono text-sm"
                  placeholder="#4f46e5"
                />
                <ColorSwatch color={form.primaryColor} />
              </div>
            </div>
            <div className="space-y-3">
              <Label>{t('settings.branding.colors.accentColor')}</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  aria-label="Accent color picker"
                  value={form.accentColor}
                  onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                  className="h-10 w-16 cursor-pointer rounded border"
                />
                <Input
                  value={form.accentColor}
                  onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                  className="flex-1 font-mono text-sm"
                  placeholder="#10b981"
                />
                <ColorSwatch color={form.accentColor} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Propagation Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {t('settings.branding.propagation.title')}
          </CardTitle>
          <CardDescription>{t('settings.branding.propagation.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                label: 'settings.branding.propagation.sidebarLogo',
                active: !!branding.logoUrl,
                desc: 'settings.branding.propagation.dynamicLightDarkLogo',
              },
              {
                label: 'settings.branding.propagation.loginPage',
                active: !!branding.logoUrl,
                desc: 'settings.branding.propagation.logoClinicName',
              },
              {
                label: 'settings.branding.propagation.invoicePdfs',
                active: !!(branding.logoUrl && form.clinicNameEn),
                desc: 'settings.branding.propagation.logoNameAddress',
              },
              {
                label: 'settings.branding.propagation.prescriptionPdfs',
                active: !!(branding.logoUrl && form.clinicNameEn),
                desc: 'settings.branding.propagation.logoNameDoctor',
              },
              {
                label: 'settings.branding.propagation.treatmentPlans',
                active: !!(branding.logoUrl && form.clinicNameEn),
                desc: 'settings.branding.propagation.logoNameDoctor',
              },
              {
                label: 'settings.branding.propagation.consentForms',
                active: !!form.clinicNameEn,
                desc: 'settings.branding.propagation.nameAddress',
              },
              {
                label: 'settings.branding.propagation.emailTemplates',
                active: !!branding.logoUrl,
                desc: 'settings.branding.propagation.logoInEmailHeader',
              },
              {
                label: 'settings.branding.propagation.browserTabLabel',
                active: !!branding.faviconUrl,
                desc: 'settings.branding.propagation.faviconClinicName',
              },
              {
                label: 'settings.branding.propagation.notificationEmails',
                active: !!branding.logoUrl,
                desc: 'settings.branding.propagation.logoInNotifications',
              },
            ].map((target) => (
              <div
                key={target.label}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{t(target.label)}</p>
                  <p className="text-xs text-muted-foreground">{t(target.desc)}</p>
                </div>
                <Badge variant={target.active ? 'default' : 'secondary'}>
                  {target.active
                    ? t('settings.branding.propagation.active')
                    : t('settings.branding.propagation.notSet')}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleReset} disabled={isSaving} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          {t('settings.branding.resetToDefaults')}
        </Button>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {t('settings.branding.saveBranding')}
        </Button>
      </div>
    </div>
  );
}
