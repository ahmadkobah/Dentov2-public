/**
 * Booking Widget Tab — Embed code & widget customization
 *
 * Shows the tenant's embed snippet and lets admins customize:
 *   - Primary color
 *   - Button position (bottom-right / bottom-left)
 *   - Language (en / ar)
 *   - Button text
 *   - Show branding toggle
 *
 * Saves to tenant settings key: bookingWidget
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '@/stores/locale.store.js';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Label,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  toast,
} from '@dento/ui';
import { Loader2, Save, Copy, Check, Code, Eye } from 'lucide-react';
import { useSettingsByKey, useUpdateSettings } from '../hooks/useTenantSettings.js';
import { useAuthStore } from '@/stores/auth.store.js';

// ── Types ──────────────────────────────────────────────────

interface WidgetConfig {
  primaryColor: string;
  buttonPosition: 'bottom-right' | 'bottom-left';
  language: 'en' | 'ar';
  buttonText: string;
  showBranding: boolean;
}

const DEFAULTS: WidgetConfig = {
  primaryColor: '#16a085',
  buttonPosition: 'bottom-right',
  language: 'en',
  buttonText: 'Book Now',
  showBranding: true,
};

// ── Component ──────────────────────────────────────────────

export function BookingWidgetTab() {
  const { data: saved, isLoading } = useSettingsByKey('bookingWidget');
  const updateSettings = useUpdateSettings('bookingWidget');
  const tenantSlug = useAuthStore((s) => s.tenantSlug);
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  const [form, setForm] = useState<WidgetConfig>(DEFAULTS);

  useEffect(() => {
    if (saved) {
      setForm({
        primaryColor: (saved as unknown as WidgetConfig).primaryColor ?? DEFAULTS.primaryColor,
        buttonPosition:
          (saved as unknown as WidgetConfig).buttonPosition ?? DEFAULTS.buttonPosition,
        language: (saved as unknown as WidgetConfig).language ?? DEFAULTS.language,
        buttonText: (saved as unknown as WidgetConfig).buttonText ?? DEFAULTS.buttonText,
        showBranding: (saved as unknown as WidgetConfig).showBranding ?? DEFAULTS.showBranding,
      });
    }
  }, [saved]);

  const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;

  const embedCode = useMemo(
    () =>
      `<script src="${apiUrl}/api/bookings/widget.js" data-api="${apiUrl}" data-tenant="${tenantSlug || 'YOUR_TENANT_SLUG'}"></script>`,
    [apiUrl, tenantSlug],
  );

  const handleSave = () => {
    updateSettings.mutate(form as unknown as Record<string, unknown>);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toast.success(t('settings.bookingWidget.toast.embedCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('settings.bookingWidget.toast.copyFailed'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Embed Code Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            {t('settings.bookingWidget.embedCode.title')}
          </CardTitle>
          <CardDescription>{t('settings.bookingWidget.embedCode.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <pre className="rounded-lg border bg-gray-50 p-4 text-sm font-mono overflow-x-auto dark:bg-gray-900 dark:border-gray-800">
              <code>{embedCode}</code>
            </pre>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 end-2 gap-1.5"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  {t('settings.bookingWidget.embedCode.copied')}
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  {t('settings.bookingWidget.embedCode.copy')}
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('settings.bookingWidget.embedCode.hint')}
          </p>
        </CardContent>
      </Card>

      {/* Customization Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {t('settings.bookingWidget.customization.title')}
          </CardTitle>
          <CardDescription>{t('settings.bookingWidget.customization.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary Color */}
          <div className="flex items-center gap-4">
            <div className="space-y-1.5 flex-1">
              <Label htmlFor="widget-color">
                {t('settings.bookingWidget.customization.primaryColor')}
              </Label>
              <div className="flex items-center gap-3">
                <input
                  id="widget-color"
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="h-10 w-16 cursor-pointer rounded border"
                />
                <Input
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  placeholder="#16a085"
                  className="w-32 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Button Position */}
          <div className="space-y-1.5">
            <Label>{t('settings.bookingWidget.customization.buttonPosition')}</Label>
            <Select
              value={form.buttonPosition}
              onValueChange={(v: 'bottom-right' | 'bottom-left') =>
                setForm({ ...form, buttonPosition: v })
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom-right">
                  {t('settings.bookingWidget.customization.bottomRight')}
                </SelectItem>
                <SelectItem value="bottom-left">
                  {t('settings.bookingWidget.customization.bottomLeft')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Language */}
          <div className="space-y-1.5">
            <Label>{t('settings.bookingWidget.customization.widgetLanguage')}</Label>
            <Select
              value={form.language}
              onValueChange={(v: 'en' | 'ar') => setForm({ ...form, language: v })}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">
                  {t('settings.bookingWidget.customization.english')}
                </SelectItem>
                <SelectItem value="ar">
                  {t('settings.bookingWidget.customization.arabic')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Button Text */}
          <div className="space-y-1.5">
            <Label htmlFor="widget-btn-text">
              {t('settings.bookingWidget.customization.buttonText')}
            </Label>
            <Input
              id="widget-btn-text"
              value={form.buttonText}
              onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
              placeholder={t('settings.bookingWidget.customization.buttonTextPlaceholder')}
              className="w-[200px]"
              maxLength={30}
            />
          </div>

          {/* Show Branding */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>{t('settings.bookingWidget.customization.showPoweredBy')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('settings.bookingWidget.customization.showPoweredByDescription')}
              </p>
            </div>
            <Switch
              checked={form.showBranding}
              onCheckedChange={(v) => setForm({ ...form, showBranding: v })}
            />
          </div>

          {/* Save */}
          <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2">
            {updateSettings.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t('settings.bookingWidget.saveWidgetSettings')}
          </Button>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {t('settings.bookingWidget.preview.title')}
          </CardTitle>
          <CardDescription>{t('settings.bookingWidget.preview.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Floating Button Preview */}
            <div>
              <p className="text-sm font-medium mb-2">
                {t('settings.bookingWidget.preview.floatingButton')}
              </p>
              <div className="relative rounded-lg border bg-gray-50 dark:bg-gray-900 dark:border-gray-800 h-48 overflow-hidden">
                {/* Mock website background */}
                <div className="p-6">
                  <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700 mb-3" />
                  <div className="h-3 w-72 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
                  <div className="h-3 w-64 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
                  <div className="h-3 w-56 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
                {/* Mock FAB */}
                <button
                  className="absolute bottom-4 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg cursor-default"
                  style={{
                    backgroundColor: form.primaryColor,
                    ...(form.buttonPosition === 'bottom-left' ? { left: 16 } : { right: 16 }),
                    direction: form.language === 'ar' ? 'rtl' : 'ltr',
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="h-5 w-5"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {form.buttonText}
                </button>
              </div>
            </div>

            {/* Booking Panel Preview */}
            <div>
              <p className="text-sm font-medium mb-2">
                {t('settings.bookingWidget.preview.bookingPanel')}
              </p>
              <div
                className="rounded-lg border overflow-hidden shadow-sm"
                style={{ direction: form.language === 'ar' ? 'rtl' : 'ltr' }}
              >
                {/* Panel Header */}
                <div
                  className="px-4 py-3 flex items-center justify-between"
                  style={{ backgroundColor: form.primaryColor }}
                >
                  <span className="text-white font-semibold text-sm">
                    {form.language === 'ar'
                      ? 'حجز موعد'
                      : t('settings.bookingWidget.preview.bookAppointment')}
                  </span>
                  <span className="text-white/70 text-lg leading-none cursor-default">×</span>
                </div>
                {/* Panel Body Mock */}
                <div className="bg-white dark:bg-gray-950 px-4 py-3 space-y-3">
                  {/* Step 1 */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      {form.language === 'ar'
                        ? 'اختر الفرع'
                        : t('settings.bookingWidget.preview.chooseBranch')}
                    </p>
                    <div className="h-8 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-2 flex items-center">
                      <span className="text-xs text-gray-400">
                        {form.language === 'ar'
                          ? 'اختر فرع...'
                          : t('settings.bookingWidget.preview.selectBranch')}
                      </span>
                    </div>
                  </div>
                  {/* Step 2 */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      {form.language === 'ar'
                        ? 'اختر الطبيب'
                        : t('settings.bookingWidget.preview.chooseDoctor')}
                    </p>
                    <div className="h-8 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-2 flex items-center">
                      <span className="text-xs text-gray-400">
                        {form.language === 'ar'
                          ? 'اختر طبيب...'
                          : t('settings.bookingWidget.preview.selectDoctor')}
                      </span>
                    </div>
                  </div>
                  {/* Step 3 */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      {form.language === 'ar'
                        ? 'اختر التاريخ'
                        : t('settings.bookingWidget.preview.chooseDate')}
                    </p>
                    <div className="h-8 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-2 flex items-center">
                      <span className="text-xs text-gray-400">yyyy-mm-dd</span>
                    </div>
                  </div>
                  {/* Step 4 - Slots */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      {form.language === 'ar'
                        ? 'اختر الوقت'
                        : t('settings.bookingWidget.preview.chooseTime')}
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      {['09:00', '09:30', '10:00', '10:30'].map((time) => (
                        <span
                          key={time}
                          className="text-xs px-2 py-1 rounded border-2 font-semibold"
                          style={{
                            borderColor: form.primaryColor,
                            color: time === '09:30' ? '#fff' : form.primaryColor,
                            backgroundColor: time === '09:30' ? form.primaryColor : 'transparent',
                          }}
                        >
                          {time}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Submit Button */}
                  <button
                    className="w-full py-2 rounded text-white text-xs font-semibold cursor-default"
                    style={{ backgroundColor: form.primaryColor }}
                  >
                    {form.language === 'ar'
                      ? 'حجز موعد'
                      : t('settings.bookingWidget.preview.bookAppointmentBtn')}
                  </button>
                </div>
                {/* Footer */}
                {form.showBranding && (
                  <div className="text-center py-1.5 text-[10px] text-gray-400 border-t dark:border-gray-800">
                    {form.language === 'ar'
                      ? 'مدعوم من Dento'
                      : t('settings.bookingWidget.preview.poweredByDento')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
