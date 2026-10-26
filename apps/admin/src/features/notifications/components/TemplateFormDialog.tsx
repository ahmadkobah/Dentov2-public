import { useState, useEffect } from 'react';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent } from '@dento/ui';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import {
  useCreateTemplate,
  useUpdateTemplate,
  type NotificationTemplate,
  type CreateTemplateInput,
} from '../hooks/useNotificationTemplates.js';
import { useSupportedLanguages } from '../../../hooks/useSupportedLanguages.js';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Types ──────────────────────────────────────────────────

interface TemplateFormDialogProps {
  open: boolean;
  onClose: () => void;
  template?: NotificationTemplate | null;
}

interface ChannelState {
  isEnabled: boolean;
  subject?: { en: string; ar: string };
  body?: { en: string; ar: string };
  template?: { en: string; ar: string };
  title?: { en: string; ar: string };
  templateId?: string;
  icon?: string;
  actionUrl?: string;
}

interface VariableItem {
  key: string;
  label: { en: string; ar: string };
  isRequired: boolean;
}

const CATEGORIES = [
  'appointment',
  'payment',
  'clinical',
  'inventory',
  'system',
  'marketing',
  'recall',
  'queue',
] as const;

const TRIGGERS = ['automatic', 'manual', 'scheduled'] as const;

const CHANNEL_KEYS = ['email', 'sms', 'whatsapp', 'push', 'inApp'] as const;

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  push: 'Push Notification',
  inApp: 'In-App',
};

// ── Helpers ────────────────────────────────────────────────

function emptyChannel(): ChannelState {
  return {
    isEnabled: false,
    subject: { en: '', ar: '' },
    body: { en: '', ar: '' },
    template: { en: '', ar: '' },
    title: { en: '', ar: '' },
    templateId: '',
    icon: '',
    actionUrl: '',
  };
}

function defaultChannels(): Record<string, ChannelState> {
  return Object.fromEntries(CHANNEL_KEYS.map((k) => [k, emptyChannel()]));
}

function channelFromTemplate(ch: NotificationTemplate['channels']): Record<string, ChannelState> {
  const result = defaultChannels();
  for (const key of CHANNEL_KEYS) {
    const src = ch[key];
    if (src) {
      result[key] = { ...emptyChannel(), ...src };
    }
  }
  return result;
}

function buildChannelPayload(
  channels: Record<string, ChannelState>,
): NotificationTemplate['channels'] {
  const out: Record<string, unknown> = {};
  for (const key of CHANNEL_KEYS) {
    const ch = channels[key];
    if (!ch.isEnabled) continue;
    if (key === 'email') {
      out.email = { isEnabled: true, subject: ch.subject, body: ch.body };
    } else if (key === 'sms') {
      out.sms = { isEnabled: true, template: ch.template };
    } else if (key === 'whatsapp') {
      out.whatsapp = {
        isEnabled: true,
        template: ch.template,
        ...(ch.templateId ? { templateId: ch.templateId } : {}),
      };
    } else if (key === 'push') {
      out.push = { isEnabled: true, title: ch.title, body: ch.body };
    } else if (key === 'inApp') {
      out.inApp = {
        isEnabled: true,
        title: ch.title,
        body: ch.body,
        ...(ch.icon ? { icon: ch.icon } : {}),
        ...(ch.actionUrl ? { actionUrl: ch.actionUrl } : {}),
      };
    }
  }
  return out as NotificationTemplate['channels'];
}

// ── Component ──────────────────────────────────────────────

export function TemplateFormDialog({ open, onClose, template }: TemplateFormDialogProps) {
  const isEdit = !!template;
  const { t } = useTranslation();
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const { isMultiLang } = useSupportedLanguages();

  const [key, setKey] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('appointment');
  const [trigger, setTrigger] = useState<'automatic' | 'manual' | 'scheduled'>('manual');
  const [channels, setChannels] = useState<Record<string, ChannelState>>(defaultChannels);
  const [variables, setVariables] = useState<VariableItem[]>([]);

  // Reset form when opening
  useEffect(() => {
    if (!open) return;
    if (template) {
      setKey(template.key);
      setNameEn(typeof template.name === 'string' ? template.name : template.name.en);
      setNameAr(typeof template.name === 'string' ? '' : template.name.ar);
      setDescription(template.description ?? '');
      setCategory(template.category);
      setTrigger(template.trigger);
      setChannels(channelFromTemplate(template.channels));
      setVariables(template.variables ?? []);
    } else {
      setKey('');
      setNameEn('');
      setNameAr('');
      setDescription('');
      setCategory('appointment');
      setTrigger('manual');
      setChannels(defaultChannels());
      setVariables([]);
    }
  }, [open, template]);

  function updateChannel(chKey: string, field: string, value: unknown) {
    setChannels((prev) => ({
      ...prev,
      [chKey]: { ...prev[chKey], [field]: value },
    }));
  }

  function updateChannelBilingual(chKey: string, field: string, lang: 'en' | 'ar', value: string) {
    setChannels((prev) => {
      const ch = prev[chKey];
      const existing = (ch as unknown as Record<string, unknown>)[field] as
        | { en: string; ar: string }
        | undefined;
      return {
        ...prev,
        [chKey]: { ...ch, [field]: { ...(existing ?? { en: '', ar: '' }), [lang]: value } },
      };
    });
  }

  function addVariable() {
    setVariables((prev) => [...prev, { key: '', label: { en: '', ar: '' }, isRequired: false }]);
  }

  function removeVariable(idx: number) {
    setVariables((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateVariable(idx: number, field: string, value: unknown) {
    setVariables((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  }

  function updateVariableLabel(idx: number, lang: 'en' | 'ar', value: string) {
    setVariables((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, label: { ...v.label, [lang]: value } } : v)),
    );
  }

  const hasEnabledChannel = Object.values(channels).some((ch) => ch.isEnabled);
  const isValid =
    key.trim() && nameEn.trim() && (!isMultiLang || nameAr.trim()) && hasEnabledChannel;
  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit() {
    if (!isValid) return;
    const payload = {
      key: key.trim(),
      name: { en: nameEn.trim(), ar: nameAr.trim() },
      category,
      trigger,
      channels: buildChannelPayload(channels),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(variables.length > 0 ? { variables: variables.filter((v) => v.key.trim()) } : {}),
    };

    if (isEdit && template) {
      updateMutation.mutate({ id: template._id, data: payload }, { onSuccess: () => onClose() });
    } else {
      createMutation.mutate(payload as CreateTemplateInput, {
        onSuccess: () => onClose(),
      });
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-xl shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEdit
              ? t('notifications.templateForm.editTitle')
              : t('notifications.templateForm.createTitle')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Basic Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t('notifications.templateForm.labels.templateKey')}</Label>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={t('notifications.templateForm.placeholders.templateKey')}
                disabled={isEdit}
              />
            </div>
            <div>
              <Label>{t('notifications.templateForm.labels.category')}</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t('notifications.templateForm.labels.nameEnglish')}</Label>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder={t('notifications.templateForm.placeholders.templateName')}
              />
            </div>
            {isMultiLang && (
              <div>
                <Label>{t('notifications.templateForm.labels.nameArabic')}</Label>
                <Input
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder={t('notifications.templateForm.placeholders.nameArabic')}
                  dir="rtl"
                />
              </div>
            )}
            <div>
              <Label>{t('notifications.templateForm.labels.trigger')}</Label>
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value as 'automatic' | 'manual' | 'scheduled')}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {TRIGGERS.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label>{t('notifications.templateForm.labels.descriptionOptional')}</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('notifications.templateForm.placeholders.description')}
              />
            </div>
          </div>

          {/* Channels */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('notifications.templateForm.channels.title')}
            </h3>
            {!hasEnabledChannel && (
              <p className="text-xs text-red-500">
                {t('notifications.templateForm.channels.enableAtLeastOne')}
              </p>
            )}
            {CHANNEL_KEYS.map((chKey) => {
              const ch = channels[chKey];
              return (
                <Card key={chKey} className={!ch.isEnabled ? 'opacity-60' : ''}>
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ch.isEnabled}
                          onChange={(e) => updateChannel(chKey, 'isEnabled', e.target.checked)}
                          className="rounded"
                        />
                        <CardTitle className="text-sm">{CHANNEL_LABELS[chKey]}</CardTitle>
                      </label>
                    </div>
                  </CardHeader>
                  {ch.isEnabled && (
                    <CardContent className="px-4 pb-4 pt-0 space-y-3">
                      {chKey === 'email' && (
                        <>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                              <Label className="text-xs">
                                {t('notifications.templateForm.channels.subjectEn')}
                              </Label>
                              <Input
                                value={ch.subject?.en ?? ''}
                                onChange={(e) =>
                                  updateChannelBilingual(chKey, 'subject', 'en', e.target.value)
                                }
                              />
                            </div>
                            <div>
                              <Label className="text-xs">
                                {t('notifications.templateForm.channels.subjectAr')}
                              </Label>
                              <Input
                                value={ch.subject?.ar ?? ''}
                                onChange={(e) =>
                                  updateChannelBilingual(chKey, 'subject', 'ar', e.target.value)
                                }
                                dir="rtl"
                              />
                            </div>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                              <Label className="text-xs">
                                {t('notifications.templateForm.channels.bodyEn')}
                              </Label>
                              <textarea
                                value={ch.body?.en ?? ''}
                                onChange={(e) =>
                                  updateChannelBilingual(chKey, 'body', 'en', e.target.value)
                                }
                                rows={3}
                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">
                                {t('notifications.templateForm.channels.bodyAr')}
                              </Label>
                              <textarea
                                value={ch.body?.ar ?? ''}
                                onChange={(e) =>
                                  updateChannelBilingual(chKey, 'body', 'ar', e.target.value)
                                }
                                rows={3}
                                dir="rtl"
                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                              />
                            </div>
                          </div>
                        </>
                      )}
                      {(chKey === 'sms' || chKey === 'whatsapp') && (
                        <>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                              <Label className="text-xs">
                                {t('notifications.templateForm.channels.templateEn')}
                              </Label>
                              <textarea
                                value={ch.template?.en ?? ''}
                                onChange={(e) =>
                                  updateChannelBilingual(chKey, 'template', 'en', e.target.value)
                                }
                                rows={2}
                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">
                                {t('notifications.templateForm.channels.templateAr')}
                              </Label>
                              <textarea
                                value={ch.template?.ar ?? ''}
                                onChange={(e) =>
                                  updateChannelBilingual(chKey, 'template', 'ar', e.target.value)
                                }
                                rows={2}
                                dir="rtl"
                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                              />
                            </div>
                          </div>
                          {chKey === 'whatsapp' && (
                            <div>
                              <Label className="text-xs">
                                {t('notifications.templateForm.channels.templateId')}
                              </Label>
                              <Input
                                value={ch.templateId ?? ''}
                                onChange={(e) => updateChannel(chKey, 'templateId', e.target.value)}
                              />
                            </div>
                          )}
                        </>
                      )}
                      {(chKey === 'push' || chKey === 'inApp') && (
                        <>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                              <Label className="text-xs">
                                {t('notifications.templateForm.channels.titleEn')}
                              </Label>
                              <Input
                                value={ch.title?.en ?? ''}
                                onChange={(e) =>
                                  updateChannelBilingual(chKey, 'title', 'en', e.target.value)
                                }
                              />
                            </div>
                            <div>
                              <Label className="text-xs">
                                {t('notifications.templateForm.channels.titleAr')}
                              </Label>
                              <Input
                                value={ch.title?.ar ?? ''}
                                onChange={(e) =>
                                  updateChannelBilingual(chKey, 'title', 'ar', e.target.value)
                                }
                                dir="rtl"
                              />
                            </div>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                              <Label className="text-xs">
                                {t('notifications.templateForm.channels.bodyEn')}
                              </Label>
                              <textarea
                                value={ch.body?.en ?? ''}
                                onChange={(e) =>
                                  updateChannelBilingual(chKey, 'body', 'en', e.target.value)
                                }
                                rows={2}
                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">
                                {t('notifications.templateForm.channels.bodyAr')}
                              </Label>
                              <textarea
                                value={ch.body?.ar ?? ''}
                                onChange={(e) =>
                                  updateChannelBilingual(chKey, 'body', 'ar', e.target.value)
                                }
                                rows={2}
                                dir="rtl"
                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                              />
                            </div>
                          </div>
                          {chKey === 'inApp' && (
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div>
                                <Label className="text-xs">
                                  {t('notifications.templateForm.channels.icon')}
                                </Label>
                                <Input
                                  value={ch.icon ?? ''}
                                  onChange={(e) => updateChannel(chKey, 'icon', e.target.value)}
                                  placeholder="bell"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">
                                  {t('notifications.templateForm.channels.actionUrl')}
                                </Label>
                                <Input
                                  value={ch.actionUrl ?? ''}
                                  onChange={(e) =>
                                    updateChannel(chKey, 'actionUrl', e.target.value)
                                  }
                                  placeholder="/appointments"
                                />
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Variables */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('notifications.templateForm.variables.title')}
              </h3>
              <Button variant="ghost" size="sm" onClick={addVariable}>
                <Plus className="h-3.5 w-3.5 me-1" />{' '}
                {t('notifications.templateForm.variables.addVariable')}
              </Button>
            </div>
            {variables.map((v, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="flex-1 grid gap-2 sm:grid-cols-4">
                  <Input
                    placeholder={t('notifications.templateForm.variables.keyLabel')}
                    value={v.key}
                    onChange={(e) => updateVariable(idx, 'key', e.target.value)}
                  />
                  <Input
                    placeholder={t('notifications.templateForm.variables.labelEn')}
                    value={v.label.en}
                    onChange={(e) => updateVariableLabel(idx, 'en', e.target.value)}
                  />
                  <Input
                    placeholder={t('notifications.templateForm.variables.labelAr')}
                    value={v.label.ar}
                    onChange={(e) => updateVariableLabel(idx, 'ar', e.target.value)}
                    dir="rtl"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={v.isRequired}
                      onChange={(e) => updateVariable(idx, 'isRequired', e.target.checked)}
                      className="rounded"
                    />
                    {t('notifications.templateForm.variables.required')}
                  </label>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeVariable(idx)}
                  aria-label={t('notifications.templateForm.variables.removeVariableAria')}
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {t('common.actions.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isPending}>
            {isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {isEdit
              ? t('notifications.templates.actions.editTemplate')
              : t('notifications.templates.actions.createTemplate')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default TemplateFormDialog;
