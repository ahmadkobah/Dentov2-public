/**
 * WhatsApp Bot Settings Tab — Phase 6
 *
 * Admin UI for configuring the WhatsApp booking bot.
 * Displays webhook URLs, enable/disable toggle, provider selection,
 * and default language configuration.
 */

import { useState, useEffect } from 'react';
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
  Switch,
  toast,
} from '@dento/ui';
import { Copy, Check, MessageSquare, Globe, Clock, Loader2 } from 'lucide-react';
import { useSettingsByKey, useUpdateSettings } from '../hooks/useTenantSettings.js';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Types ───────────────────────────────────────────────────

interface WhatsAppBotConfig {
  isEnabled: boolean;
  provider: 'twilio' | 'meta';
  defaultLanguage: 'en' | 'ar';
  welcomeMessage: string;
  sessionTimeoutMinutes: number;
}

const DEFAULT_CONFIG: WhatsAppBotConfig = {
  isEnabled: false,
  provider: 'twilio',
  defaultLanguage: 'en',
  welcomeMessage: '',
  sessionTimeoutMinutes: 30,
};

// ── Component ───────────────────────────────────────────────

export function WhatsAppBotTab() {
  const { t } = useTranslation();
  const { data: settings, isLoading } = useSettingsByKey('whatsappBot');
  const { mutate: updateSettings, isPending: isSaving } = useUpdateSettings('whatsappBot');

  const [config, setConfig] = useState<WhatsAppBotConfig>(DEFAULT_CONFIG);
  const [copied, setCopied] = useState<'twilio' | 'meta' | null>(null);

  // Sync API data → local state
  useEffect(() => {
    if (settings) {
      setConfig({ ...DEFAULT_CONFIG, ...(settings as unknown as WhatsAppBotConfig) });
    }
  }, [settings]);

  // Derive tenant slug from current URL for webhook URLs
  const apiBase = window.location.origin.replace(/:\d+$/, ':3001');
  const tenantSlug = 'srouji'; // TODO: derive from auth context
  const twilioWebhookUrl = `${apiBase}/api/whatsapp-bot/${tenantSlug}/twilio`;
  const metaWebhookUrl = `${apiBase}/api/whatsapp-bot/${tenantSlug}/meta`;

  function handleSave() {
    updateSettings(config as unknown as Record<string, unknown>);
  }

  function handleCopy(url: string, type: 'twilio' | 'meta') {
    navigator.clipboard.writeText(url);
    setCopied(type);
    toast.success(t('settings.whatsappBot.toast.webhookCopied'));
    setTimeout(() => setCopied(null), 2000);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Enable / Disable ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-green-600" />
              <div>
                <CardTitle className="text-lg">{t('settings.whatsappBot.title')}</CardTitle>
                <CardDescription>{t('settings.whatsappBot.description')}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={config.isEnabled ? 'default' : 'secondary'}>
                {config.isEnabled
                  ? t('settings.whatsappBot.statusActive')
                  : t('settings.whatsappBot.statusDisabled')}
              </Badge>
              <Switch
                checked={config.isEnabled}
                onCheckedChange={(checked) => setConfig((c) => ({ ...c, isEnabled: checked }))}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ── Webhook URLs ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('settings.whatsappBot.webhookUrls.title')}</CardTitle>
          <CardDescription>{t('settings.whatsappBot.webhookUrls.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Twilio URL */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {t('settings.whatsappBot.webhookUrls.twilioLabel')}
            </Label>
            <div className="flex gap-2">
              <Input readOnly value={twilioWebhookUrl} className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(twilioWebhookUrl, 'twilio')}
              >
                {copied === 'twilio' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('settings.whatsappBot.webhookUrls.twilioHint')}
            </p>
          </div>

          {/* Meta URL */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {t('settings.whatsappBot.webhookUrls.metaLabel')}
            </Label>
            <div className="flex gap-2">
              <Input readOnly value={metaWebhookUrl} className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(metaWebhookUrl, 'meta')}
              >
                {copied === 'meta' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('settings.whatsappBot.webhookUrls.metaHint')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Configuration ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('settings.whatsappBot.config.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {t('settings.whatsappBot.config.provider')}
            </Label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={config.provider}
              onChange={(e) =>
                setConfig((c) => ({ ...c, provider: e.target.value as 'twilio' | 'meta' }))
              }
            >
              <option value="twilio">{t('settings.whatsappBot.config.providerTwilio')}</option>
              <option value="meta">{t('settings.whatsappBot.config.providerMeta')}</option>
            </select>
          </div>

          {/* Default Language */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Globe className="h-4 w-4" /> {t('settings.whatsappBot.config.defaultLanguage')}
            </Label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={config.defaultLanguage}
              onChange={(e) =>
                setConfig((c) => ({ ...c, defaultLanguage: e.target.value as 'en' | 'ar' }))
              }
            >
              <option value="en">{t('settings.whatsappBot.config.languageEnglish')}</option>
              <option value="ar">{t('settings.whatsappBot.config.languageArabic')}</option>
            </select>
          </div>

          {/* Session Timeout */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" /> {t('settings.whatsappBot.config.sessionTimeout')}
            </Label>
            <Input
              type="number"
              min={5}
              max={120}
              value={config.sessionTimeoutMinutes}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  sessionTimeoutMinutes: parseInt(e.target.value, 10) || 30,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              {t('settings.whatsappBot.config.sessionTimeoutHint')}
            </p>
          </div>

          {/* Custom Welcome Message */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {t('settings.whatsappBot.config.welcomeMessage')}
            </Label>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm"
              rows={3}
              maxLength={500}
              placeholder={t('settings.whatsappBot.config.welcomeMessageHint')}
              value={config.welcomeMessage}
              onChange={(e) => setConfig((c) => ({ ...c, welcomeMessage: e.target.value }))}
            />
          </div>

          {/* Save */}
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('settings.whatsappBot.saveSettings')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── How It Works ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('settings.whatsappBot.howItWorks.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Patient sends &quot;Hi&quot; to your clinic&apos;s WhatsApp number</li>
            <li>Bot greets and asks for language preference (English / Arabic)</li>
            <li>Patient selects a branch from the numbered list</li>
            <li>Patient selects a doctor from the numbered list</li>
            <li>Patient enters their preferred date (YYYY-MM-DD)</li>
            <li>Bot shows available time slots — patient picks one</li>
            <li>Patient enters their full name</li>
            <li>Bot shows a summary — patient confirms with &quot;Yes&quot;</li>
            <li>Appointment is created and patient receives confirmation</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
