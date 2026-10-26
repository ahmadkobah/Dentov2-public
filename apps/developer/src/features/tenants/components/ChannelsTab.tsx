import { useState, useEffect } from 'react';
import {
  Globe,
  Link2,
  CheckCircle2,
  Mail,
  MessageSquare,
  Phone,
  Bell,
  Loader2,
  AlertCircle,
  FlaskConical,
} from 'lucide-react';
import { Button, Switch, Skeleton } from '@dento/ui';
import type { TenantDetail } from '../types/tenant-detail.types.js';
import {
  useTenantProviders,
  useUpdateTenantProvider,
  useTestTenantProvider,
} from '../hooks/useTenantProviders.js';

// ── Shared styles ──────────────────────────────────────────

const inputCls =
  'h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white';
const labelCls = 'mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300';
const cardCls =
  'rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900';

// ── Channel Card Wrapper ───────────────────────────────────

function ChannelCard({
  icon,
  iconBg,
  title,
  description,
  useCustom,
  onToggleCustom,
  children,
  onSave,
  onTest,
  isSaving,
  isTesting,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  useCustom: boolean;
  onToggleCustom: (v: boolean) => void;
  children: React.ReactNode;
  onSave: () => void;
  onTest: () => void;
  isSaving: boolean;
  isTesting: boolean;
}) {
  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {useCustom ? (
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
              Custom
            </span>
          ) : (
            <span className="rounded-full bg-warning-50 px-2.5 py-1 text-xs font-medium text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
              Platform Default
            </span>
          )}
          <Switch checked={useCustom} onCheckedChange={onToggleCustom} />
        </div>
      </div>

      {useCustom && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">{children}</div>
          <div className="mt-4 flex gap-2">
            <Button variant="default" disabled={isSaving} onClick={onSave}>
              {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Save Configuration
            </Button>
            <Button
              variant="outline"
              disabled={isTesting}
              onClick={onTest}
              className="dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {isTesting ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <FlaskConical className="me-2 h-4 w-4" />
              )}
              Test
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

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

// ── Main component ─────────────────────────────────────────

export function ChannelsTab({ tenant }: { tenant: TenantDetail }) {
  const { data: providers, isLoading, isError } = useTenantProviders(tenant.slug);
  const updateMutation = useUpdateTenantProvider(tenant.slug);
  const testMutation = useTestTenantProvider(tenant.slug);

  // Local state for each channel form
  const [email, setEmail] = useState<Record<string, unknown>>({ useCustom: false });
  const [sms, setSms] = useState<Record<string, unknown>>({ useCustom: false });
  const [whatsapp, setWhatsapp] = useState<Record<string, unknown>>({ useCustom: false });
  const [push, setPush] = useState<Record<string, unknown>>({ useCustom: false });

  // Sync API data → local form state
  useEffect(() => {
    if (!providers) return;
    if (providers.email) setEmail(providers.email as Record<string, unknown>);
    if (providers.sms) setSms(providers.sms as Record<string, unknown>);
    if (providers.whatsapp) setWhatsapp(providers.whatsapp as Record<string, unknown>);
    if (providers.push) setPush(providers.push as Record<string, unknown>);
  }, [providers]);

  // Helpers
  const str = (obj: Record<string, unknown>, key: string) => String(obj[key] ?? '');
  const set = (
    setter: React.Dispatch<React.SetStateAction<Record<string, unknown>>>,
    key: string,
    value: unknown,
  ) => setter((prev) => ({ ...prev, [key]: value }));

  const handleSave = (channel: string, config: Record<string, unknown>) => {
    updateMutation.mutate({ channel, config });
  };

  const handleTest = (channel: string) => {
    testMutation.mutate({ channel });
  };

  // ── Loading / Error states ─────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={cardCls}>
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-60" />
              </div>
            </div>
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className={cardCls}>
        <div className="flex items-center gap-3 text-error-500">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-medium">Failed to load provider configurations.</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Custom Domain (presentational) */}
      <div className={cardCls}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
              <Globe className="h-5 w-5 text-brand-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Custom Domain</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure a custom domain for this tenant
              </p>
            </div>
          </div>
          <span className="rounded-full bg-success-50 px-2.5 py-1 text-xs font-medium text-success-700 dark:bg-success-500/10 dark:text-success-400">
            Active
          </span>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Link2 className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{tenant.slug}.dento.app</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Default subdomain</p>
              </div>
            </div>
            <CheckCircle2 className="h-5 w-5 text-success-500" />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-600">
            <div className="flex items-center gap-3">
              <Link2 className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-gray-500 dark:text-gray-400">Add custom domain...</p>
              </div>
            </div>
            <Button variant="default" size="sm">
              Configure
            </Button>
          </div>
        </div>
      </div>

      {/* ── Email Channel ─────────────────────────────────── */}
      <ChannelCard
        icon={<Mail className="h-5 w-5 text-blue-light-500" />}
        iconBg="bg-blue-light-50 dark:bg-blue-light-500/10"
        title="Email"
        description="Transactional & notification emails"
        useCustom={!!email.useCustom}
        onToggleCustom={(v) => set(setEmail, 'useCustom', v)}
        onSave={() => handleSave('email', email)}
        onTest={() => handleTest('email')}
        isSaving={updateMutation.isPending && updateMutation.variables?.channel === 'email'}
        isTesting={testMutation.isPending && testMutation.variables?.channel === 'email'}
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
          placeholder="noreply@clinic.com"
          value={str(email, 'fromEmail')}
          onChange={(v) => set(setEmail, 'fromEmail', v)}
        />
        <Field
          label="From Name"
          placeholder={tenant.name.en}
          value={str(email, 'fromName')}
          onChange={(v) => set(setEmail, 'fromName', v)}
        />
      </ChannelCard>

      {/* ── SMS Channel ───────────────────────────────────── */}
      <ChannelCard
        icon={<Phone className="h-5 w-5 text-purple-500" />}
        iconBg="bg-purple-50 dark:bg-purple-500/10"
        title="SMS"
        description="Text messages via Twilio"
        useCustom={!!sms.useCustom}
        onToggleCustom={(v) => set(setSms, 'useCustom', v)}
        onSave={() => handleSave('sms', sms)}
        onTest={() => handleTest('sms')}
        isSaving={updateMutation.isPending && updateMutation.variables?.channel === 'sms'}
        isTesting={testMutation.isPending && testMutation.variables?.channel === 'sms'}
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

      {/* ── WhatsApp Channel ──────────────────────────────── */}
      <ChannelCard
        icon={<MessageSquare className="h-5 w-5 text-success-500" />}
        iconBg="bg-success-50 dark:bg-success-500/10"
        title="WhatsApp Business"
        description="WhatsApp Business API (Meta)"
        useCustom={!!whatsapp.useCustom}
        onToggleCustom={(v) => set(setWhatsapp, 'useCustom', v)}
        onSave={() => handleSave('whatsapp', whatsapp)}
        onTest={() => handleTest('whatsapp')}
        isSaving={updateMutation.isPending && updateMutation.variables?.channel === 'whatsapp'}
        isTesting={testMutation.isPending && testMutation.variables?.channel === 'whatsapp'}
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

      {/* ── Push Notifications Channel ────────────────────── */}
      <ChannelCard
        icon={<Bell className="h-5 w-5 text-warning-500" />}
        iconBg="bg-warning-50 dark:bg-warning-500/10"
        title="Push Notifications"
        description="Web push via VAPID keys"
        useCustom={!!push.useCustom}
        onToggleCustom={(v) => set(setPush, 'useCustom', v)}
        onSave={() => handleSave('push', push)}
        onTest={() => handleTest('push')}
        isSaving={updateMutation.isPending && updateMutation.variables?.channel === 'push'}
        isTesting={testMutation.isPending && testMutation.variables?.channel === 'push'}
      >
        <Field
          label="VAPID Subject"
          placeholder="mailto:admin@clinic.com"
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
