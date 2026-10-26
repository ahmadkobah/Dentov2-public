/**
 * Bulk Notification Modal — Day 13 Phase 4
 *
 * Allows admins to send bulk notifications to patient groups or staff.
 * Uses the /api/notifications/bulk endpoint.
 */

import { useState } from 'react';
import { Send, Users, UserCheck, Megaphone, X } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Button,
  Input,
  Label,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@dento/ui';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse } from '@/lib/types.js';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Types ──────────────────────────────────────────────────

interface NotificationTemplate {
  _id: string;
  key: string;
  name: { en: string; ar: string };
  category: string;
  channels: {
    email?: { isEnabled: boolean };
    sms?: { isEnabled: boolean };
    whatsapp?: { isEnabled: boolean };
    push?: { isEnabled: boolean };
    inApp?: { isEnabled: boolean };
  };
}

type AudienceType = 'all_patients' | 'all_staff' | 'patient_group' | 'custom';
type Channel = 'email' | 'sms' | 'whatsapp' | 'push' | 'inApp';

interface BulkResult {
  recipientCount: number;
  stats: {
    inApp: number;
    email: number;
    sms: number;
    whatsapp: number;
    push: number;
  };
  message: { en: string; ar: string };
}

const AUDIENCE_OPTIONS: { value: AudienceType; label: string; icon: typeof Users; desc: string }[] =
  [
    {
      value: 'all_patients',
      label: 'All Patients',
      icon: Users,
      desc: 'Send to all active patients',
    },
    {
      value: 'all_staff',
      label: 'All Staff',
      icon: UserCheck,
      desc: 'Send to all active staff members',
    },
    {
      value: 'patient_group',
      label: 'Patient Group',
      icon: Users,
      desc: 'Filter patients by tags or visit date',
    },
  ];

const CHANNEL_OPTIONS: { value: Channel; label: string }[] = [
  { value: 'inApp', label: 'In-App' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'push', label: 'Push' },
];

// ── Component ──────────────────────────────────────────────

interface BulkNotificationModalProps {
  open: boolean;
  onClose: () => void;
}

export default function BulkNotificationModal({ open, onClose }: BulkNotificationModalProps) {
  const { t } = useTranslation();
  const [audienceType, setAudienceType] = useState<AudienceType>('all_patients');
  const [templateKey, setTemplateKey] = useState('');
  const [channels, setChannels] = useState<Channel[]>(['inApp', 'email']);
  const [variables, setVariables] = useState<Record<string, string>>({
    clinicName: '',
    message: '',
  });

  // Fetch templates
  const templatesQuery = useQuery({
    queryKey: ['notification-templates'],
    queryFn: () =>
      apiClient.get<ApiSuccessResponse<{ templates: NotificationTemplate[]; total: number }>>(
        '/api/notifications/templates',
      ),
    select: (res) => res.data?.templates ?? [],
    enabled: open,
  });

  // Bulk send mutation
  const bulkSend = useMutation({
    mutationFn: (data: {
      templateKey: string;
      audienceType: AudienceType;
      variables: Record<string, string>;
      channels: Channel[];
    }) => apiClient.post<ApiSuccessResponse<BulkResult>>('/api/notifications/bulk', data),
    onSuccess: (res) => {
      const data = res.data;
      toast.success(t('notifications.bulk.toast.sent', { count: data?.recipientCount ?? 0 }));
      onClose();
      resetForm();
    },
    onError: () => toast.error(t('notifications.bulk.toast.sendFailed')),
  });

  const resetForm = () => {
    setAudienceType('all_patients');
    setTemplateKey('');
    setChannels(['inApp', 'email']);
    setVariables({ clinicName: '', message: '' });
  };

  const toggleChannel = (ch: Channel) => {
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));
  };

  const handleSend = () => {
    if (!templateKey) {
      toast.error(t('notifications.bulk.toast.selectTemplate'));
      return;
    }
    if (channels.length === 0) {
      toast.error(t('notifications.bulk.toast.selectChannel'));
      return;
    }
    bulkSend.mutate({
      templateKey,
      audienceType,
      variables,
      channels,
    });
  };

  if (!open) return null;

  const templates = templatesQuery.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{t('notifications.bulk.title')}</h2>
              <p className="text-sm text-muted-foreground">{t('notifications.bulk.description')}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-5">
          {/* Audience */}
          <div>
            <Label className="mb-2 block">{t('notifications.bulk.audience.label')}</Label>
            <div className="grid grid-cols-3 gap-2">
              {AUDIENCE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`rounded-lg border p-3 text-start transition-colors ${
                      audienceType === opt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted'
                    }`}
                    onClick={() => setAudienceType(opt.value)}
                  >
                    <Icon className="mb-1 h-4 w-4" />
                    <p className="text-sm font-medium">
                      {t(
                        opt.value === 'all_patients'
                          ? 'notifications.bulk.audience.allPatients'
                          : opt.value === 'all_staff'
                            ? 'notifications.bulk.audience.allStaff'
                            : 'notifications.bulk.audience.patientGroup',
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        opt.value === 'all_patients'
                          ? 'notifications.bulk.audience.allPatientsDesc'
                          : opt.value === 'all_staff'
                            ? 'notifications.bulk.audience.allStaffDesc'
                            : 'notifications.bulk.audience.patientGroupDesc',
                      )}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template */}
          <div>
            <Label className="mb-2 block">{t('notifications.bulk.template.label')}</Label>
            <Select value={templateKey} onValueChange={setTemplateKey}>
              <SelectTrigger>
                <SelectValue placeholder={t('notifications.bulk.template.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.name.en} ({t.category})
                  </SelectItem>
                ))}
                {templates.length === 0 && (
                  <SelectItem value="__none" disabled>
                    {t('notifications.bulk.template.noTemplates')}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Channels */}
          <div>
            <Label className="mb-2 block">{t('notifications.bulk.channels.label')}</Label>
            <div className="flex flex-wrap gap-2">
              {CHANNEL_OPTIONS.map((ch) => (
                <Badge
                  key={ch.value}
                  variant={channels.includes(ch.value) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleChannel(ch.value)}
                >
                  {t(`notifications.bulk.channels.${ch.value}`)}
                </Badge>
              ))}
            </div>
          </div>

          {/* Variables */}
          <div>
            <Label className="mb-2 block">{t('notifications.bulk.variables.label')}</Label>
            <div className="space-y-2">
              <Input
                placeholder={t('notifications.bulk.variables.clinicName')}
                value={variables.clinicName ?? ''}
                onChange={(e) => setVariables((prev) => ({ ...prev, clinicName: e.target.value }))}
              />
              <Input
                placeholder={t('notifications.bulk.variables.customMessage')}
                value={variables.message ?? ''}
                onChange={(e) => setVariables((prev) => ({ ...prev, message: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            {t('notifications.bulk.actions.cancel')}
          </Button>
          <Button onClick={handleSend} disabled={bulkSend.isPending}>
            <Send className="me-2 h-4 w-4" />
            {bulkSend.isPending
              ? t('notifications.bulk.actions.sending')
              : t('notifications.bulk.actions.send')}
          </Button>
        </div>
      </div>
    </div>
  );
}
