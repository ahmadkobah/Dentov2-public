/**
 * Channels Card — Read-only communication channel status
 *
 * Fetches platform channel config from /api/tenant-settings/channels
 * and displays enabled/disabled status for Email, SMS, WhatsApp, Push.
 *
 * Configuration is managed from the Developer Portal.
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@dento/ui';
import { Mail, MessageSquare, Phone, Bell, Loader2, AlertCircle, Radio } from 'lucide-react';
import { apiClient } from '@/lib/api-client.js';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Types ───────────────────────────────────────────────────

interface ChannelStatus {
  enabled: boolean;
  provider: string | null;
}

interface ChannelsResponse {
  success: true;
  data: {
    channels: {
      email: ChannelStatus;
      sms: ChannelStatus;
      whatsapp: ChannelStatus;
      push: ChannelStatus;
    };
  };
}

// ── Hook ────────────────────────────────────────────────────

function useChannelStatus() {
  return useQuery({
    queryKey: ['channels'],
    queryFn: () => apiClient.get<ChannelsResponse>('/api/tenant-settings/channels'),
    select: (res) => res.data.channels,
    staleTime: 60_000,
  });
}

// ── Channel Row ─────────────────────────────────────────────

const CHANNEL_META: Record<string, { label: string; icon: typeof Mail; description: string }> = {
  email: {
    label: 'Email',
    icon: Mail,
    description: 'Appointment confirmations, reminders, and receipts',
  },
  sms: {
    label: 'SMS',
    icon: Phone,
    description: 'Text message reminders and booking confirmations',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageSquare,
    description: 'WhatsApp messages for booking and follow-ups',
  },
  push: {
    label: 'Push Notifications',
    icon: Bell,
    description: 'Browser and mobile push notifications',
  },
};

// ── Main Component ──────────────────────────────────────────

export function ChannelsCard() {
  const { t } = useTranslation();
  const { data: channels, isLoading, isError } = useChannelStatus();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-lg font-medium text-destructive">
            {t('settings.channels.errorLoading')}
          </p>
          <p className="text-sm text-muted-foreground">{t('settings.channels.errorMessage')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            {t('settings.channels.title')}
          </CardTitle>
          <CardDescription>{t('settings.channels.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {channels &&
              (Object.entries(channels) as [string, ChannelStatus][]).map(([key, status]) => {
                const meta = CHANNEL_META[key];
                if (!meta) return null;
                const Icon = meta.icon;
                return (
                  <div key={key} className="flex items-start gap-4 rounded-lg border p-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        status.enabled
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{meta.label}</p>
                        <Badge variant={status.enabled ? 'default' : 'outline'}>
                          {status.enabled
                            ? t('settings.channels.statusActive')
                            : t('settings.channels.statusNotConfigured')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{meta.description}</p>
                      {status.provider && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('settings.channels.provider')}{' '}
                          <span className="font-medium">{status.provider}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
          <p className="mt-4 text-xs text-muted-foreground text-center">
            {t('settings.channels.configHint')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
