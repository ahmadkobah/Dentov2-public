/**
 * PlatformChannelsTab — Configure platform-default notification channels
 *
 * These credentials are used by tenants that have "Platform Default" selected
 * (useCustom: false) for each channel.
 */

import { useState, useEffect } from 'react';
import { Mail, MessageSquare, Phone, Bell, Loader2, AlertCircle, Save } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Switch,
  Skeleton,
} from '@dento/ui';
import { usePlatformChannels, useUpdatePlatformChannel } from '../hooks/usePlatformChannels.js';

// ── Shared styles ──────────────────────────────────────────

const inputCls =
  'h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white';
const labelCls = 'mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300';

// ── Field helper ───────────────────────────────────────────

function Field({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </div>
  );
}

// ── Channel Card ───────────────────────────────────────────

function ChannelCard({
  icon,
  iconBg,
  title,
  description,
  enabled,
  onToggle,
  children,
  onSave,
  isSaving,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
            {icon}
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              enabled
                ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {enabled ? 'Enabled' : 'Disabled'}
          </span>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
      </CardHeader>
      {enabled && (
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">{children}</div>
          <Button variant="default" disabled={isSaving} onClick={onSave}>
            {isSaving ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="me-2 h-4 w-4" />
            )}
            Save Configuration
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

// ── Main Component ─────────────────────────────────────────

export function PlatformChannelsTab() {
  const { data: channels, isLoading, isError } = usePlatformChannels();
  const updateMutation = useUpdatePlatformChannel();

  // Local state per channel
  const [email, setEmail] = useState<Record<string, unknown>>({ enabled: false });
  const [sms, setSms] = useState<Record<string, unknown>>({ enabled: false });
  const [whatsapp, setWhatsapp] = useState<Record<string, unknown>>({ enabled: false });
  const [push, setPush] = useState<Record<string, unknown>>({ enabled: false });

  // Sync API → local
  useEffect(() => {
    if (!channels) return;
    if (channels.email) setEmail(channels.email as Record<string, unknown>);
    if (channels.sms) setSms(channels.sms as Record<string, unknown>);
    if (channels.whatsapp) setWhatsapp(channels.whatsapp as Record<string, unknown>);
    if (channels.push) setPush(channels.push as Record<string, unknown>);
  }, [channels]);

  const str = (obj: Record<string, unknown>, key: string) => String(obj[key] ?? '');
  const set = (
    setter: React.Dispatch<React.SetStateAction<Record<string, unknown>>>,
    key: string,
    value: unknown,
  ) => setter((prev) => ({ ...prev, [key]: value }));

  const handleSave = (channel: string, config: Record<string, unknown>) => {
    updateMutation.mutate({ channel, config });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-60" />
                </div>
              </div>
              <Skeleton className="h-24 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-error-500">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm font-medium">Failed to load platform channel configurations.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          These are the <strong>platform-default</strong> credentials used by all tenants that have
          not configured their own provider. Enable a channel and enter credentials to make it
          available as a default.
        </p>
      </div>

      {/* ── Email ───────────────────────────────────────── */}
      <ChannelCard
        icon={<Mail className="h-5 w-5 text-blue-light-500" />}
        iconBg="bg-blue-light-50 dark:bg-blue-light-500/10"
        title="Email"
        description="Platform default email provider (Resend or SMTP)"
        enabled={!!email.enabled}
        onToggle={(v) => set(setEmail, 'enabled', v)}
        onSave={() => handleSave('email', email)}
        isSaving={updateMutation.isPending && updateMutation.variables?.channel === 'email'}
      >
        <div className="sm:col-span-2">
          <label className={labelCls}>Provider</label>
          <select
            value={str(email, 'provider') || 'resend'}
            onChange={(e) => set(setEmail, 'provider', e.target.value)}
            className={inputCls}
          >
            <option value="resend">Resend</option>
            <option value="smtp">SMTP</option>
          </select>
        </div>
        {str(email, 'provider') === 'smtp' ? (
          <>
            <Field
              label="SMTP Host"
              placeholder="smtp.example.com"
              value={str(email, 'smtpHost')}
              onChange={(v) => set(setEmail, 'smtpHost', v)}
            />
            <Field
              label="SMTP Port"
              placeholder="587"
              value={str(email, 'smtpPort')}
              onChange={(v) => set(setEmail, 'smtpPort', v)}
            />
            <Field
              label="SMTP User"
              placeholder="user@example.com"
              value={str(email, 'smtpUser')}
              onChange={(v) => set(setEmail, 'smtpUser', v)}
            />
            <Field
              label="SMTP Password"
              type="password"
              placeholder="••••••••"
              value={str(email, 'smtpPass')}
              onChange={(v) => set(setEmail, 'smtpPass', v)}
            />
          </>
        ) : (
          <Field
            label="Resend API Key"
            type="password"
            placeholder="re_xxxx"
            value={str(email, 'resendApiKey')}
            onChange={(v) => set(setEmail, 'resendApiKey', v)}
          />
        )}
        <Field
          label="From Email"
          type="email"
          placeholder="noreply@dento.app"
          value={str(email, 'fromEmail')}
          onChange={(v) => set(setEmail, 'fromEmail', v)}
        />
        <Field
          label="From Name"
          placeholder="Dento"
          value={str(email, 'fromName')}
          onChange={(v) => set(setEmail, 'fromName', v)}
        />
      </ChannelCard>

      {/* ── SMS ─────────────────────────────────────────── */}
      <ChannelCard
        icon={<Phone className="h-5 w-5 text-purple-500" />}
        iconBg="bg-purple-50 dark:bg-purple-500/10"
        title="SMS"
        description="Platform default SMS provider (Twilio)"
        enabled={!!sms.enabled}
        onToggle={(v) => set(setSms, 'enabled', v)}
        onSave={() => handleSave('sms', sms)}
        isSaving={updateMutation.isPending && updateMutation.variables?.channel === 'sms'}
      >
        <Field
          label="Twilio Account SID"
          placeholder="ACxxxx"
          value={str(sms, 'twilioAccountSid')}
          onChange={(v) => set(setSms, 'twilioAccountSid', v)}
        />
        <Field
          label="Twilio Auth Token"
          type="password"
          placeholder="••••••••"
          value={str(sms, 'twilioAuthToken')}
          onChange={(v) => set(setSms, 'twilioAuthToken', v)}
        />
        <Field
          label="Phone Number"
          placeholder="+1234567890"
          value={str(sms, 'twilioPhoneNumber')}
          onChange={(v) => set(setSms, 'twilioPhoneNumber', v)}
        />
      </ChannelCard>

      {/* ── WhatsApp ────────────────────────────────────── */}
      <ChannelCard
        icon={<MessageSquare className="h-5 w-5 text-success-500" />}
        iconBg="bg-success-50 dark:bg-success-500/10"
        title="WhatsApp Business"
        description="Platform default WhatsApp API (Meta)"
        enabled={!!whatsapp.enabled}
        onToggle={(v) => set(setWhatsapp, 'enabled', v)}
        onSave={() => handleSave('whatsapp', whatsapp)}
        isSaving={updateMutation.isPending && updateMutation.variables?.channel === 'whatsapp'}
      >
        <Field
          label="Phone Number ID"
          placeholder="1234567890"
          value={str(whatsapp, 'metaPhoneNumberId')}
          onChange={(v) => set(setWhatsapp, 'metaPhoneNumberId', v)}
        />
        <Field
          label="Access Token"
          type="password"
          placeholder="••••••••"
          value={str(whatsapp, 'metaAccessToken')}
          onChange={(v) => set(setWhatsapp, 'metaAccessToken', v)}
        />
      </ChannelCard>

      {/* ── Push ────────────────────────────────────────── */}
      <ChannelCard
        icon={<Bell className="h-5 w-5 text-warning-500" />}
        iconBg="bg-warning-50 dark:bg-warning-500/10"
        title="Push Notifications"
        description="Platform default Web Push via VAPID keys"
        enabled={!!push.enabled}
        onToggle={(v) => set(setPush, 'enabled', v)}
        onSave={() => handleSave('push', push)}
        isSaving={updateMutation.isPending && updateMutation.variables?.channel === 'push'}
      >
        <Field
          label="VAPID Subject"
          placeholder="mailto:admin@dento.app"
          value={str(push, 'vapidSubject')}
          onChange={(v) => set(setPush, 'vapidSubject', v)}
        />
        <Field
          label="VAPID Public Key"
          placeholder="BPxxx..."
          value={str(push, 'vapidPublicKey')}
          onChange={(v) => set(setPush, 'vapidPublicKey', v)}
        />
        <Field
          label="VAPID Private Key"
          type="password"
          placeholder="••••••••"
          value={str(push, 'vapidPrivateKey')}
          onChange={(v) => set(setPush, 'vapidPrivateKey', v)}
        />
      </ChannelCard>
    </div>
  );
}
