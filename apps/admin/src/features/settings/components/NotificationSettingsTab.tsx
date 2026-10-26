/**
 * Notification Settings Tab — Settings Page
 *
 * Two sub-views toggled by segmented control:
 * 1. Preferences — per-user channel/category/quiet-hours settings
 * 2. Templates  — CRUD for notification templates
 */

import { useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Label,
  Input,
} from '@dento/ui';
import {
  Bell,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  FileText,
  Mail,
  MessageSquare,
  Smartphone,
  Send,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Settings2,
  Clock,
  Volume2,
  Play,
  Moon,
} from 'lucide-react';
import {
  useNotificationTemplates,
  useDeleteTemplate,
  useUpdateTemplate,
  type NotificationTemplate,
} from '../../notifications/hooks/useNotificationTemplates.js';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '../../notifications/hooks/useNotificationPreferences.js';
import { TemplateFormDialog } from '../../notifications/components/TemplateFormDialog.js';
import {
  SOUND_PRESETS,
  playNotificationSound,
  type SoundPreset,
} from '../../../lib/notification-sounds.js';
import { setNotificationSoundPreset } from '../../../hooks/useSocket.js';
import { useTranslation } from '@/stores/locale.store.js';

// ── Helpers ────────────────────────────────────────────────

function resolveText(value: string | { en: string; ar: string }): string {
  return typeof value === 'string' ? value : value.en;
}

type SubView = 'preferences' | 'templates';

const CATEGORY_META: Record<string, { label: string; color: string; description: string }> = {
  appointment: {
    label: 'settings.notifications.categories.appointments',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    description: 'settings.notifications.categories.appointmentsDesc',
  },
  payment: {
    label: 'settings.notifications.categories.payments',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    description: 'settings.notifications.categories.paymentsDesc',
  },
  clinical: {
    label: 'settings.notifications.categories.clinical',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    description: 'settings.notifications.categories.clinicalDesc',
  },
  inventory: {
    label: 'settings.notifications.categories.inventory',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    description: 'settings.notifications.categories.inventoryDesc',
  },
  system: {
    label: 'settings.notifications.categories.system',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    description: 'settings.notifications.categories.systemDesc',
  },
  marketing: {
    label: 'settings.notifications.categories.marketing',
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    description: 'settings.notifications.categories.marketingDesc',
  },
  recall: {
    label: 'settings.notifications.categories.recall',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    description: 'settings.notifications.categories.recallDesc',
  },
  queue: {
    label: 'settings.notifications.categories.queue',
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    description: 'settings.notifications.categories.queueDesc',
  },
};

const CHANNEL_LIST: Array<{
  key: 'email' | 'sms' | 'whatsapp' | 'push' | 'inApp';
  icon: typeof Mail;
  label: string;
}> = [
  { key: 'email', icon: Mail, label: 'settings.notifications.channels.email' },
  { key: 'sms', icon: MessageSquare, label: 'settings.notifications.channels.sms' },
  { key: 'whatsapp', icon: Send, label: 'settings.notifications.channels.whatsapp' },
  { key: 'push', icon: Smartphone, label: 'settings.notifications.channels.push' },
  { key: 'inApp', icon: Bell, label: 'settings.notifications.channels.inApp' },
];

const triggerLabels: Record<string, string> = {
  automatic: 'settings.notifications.triggerLabels.auto',
  manual: 'settings.notifications.triggerLabels.manual',
  scheduled: 'settings.notifications.triggerLabels.scheduled',
};

const templateCategories = [
  'all',
  'appointment',
  'payment',
  'clinical',
  'inventory',
  'system',
  'marketing',
  'recall',
  'queue',
];

// ── Main Component ─────────────────────────────────────────

export function NotificationSettingsTab() {
  const [view, setView] = useState<SubView>('preferences');
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Segmented toggle */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        <button
          onClick={() => setView('preferences')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            view === 'preferences'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Settings2 className="h-4 w-4" />
          {t('settings.notifications.tabs.preferences')}
        </button>
        <button
          onClick={() => setView('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            view === 'templates'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <FileText className="h-4 w-4" />
          {t('settings.notifications.tabs.templates')}
        </button>
      </div>

      {view === 'preferences' ? <PreferencesView /> : <TemplatesView />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── Preferences View ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

function PreferencesView() {
  const { data: prefs, isLoading, isError } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (isError || !prefs) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-red-500">
        <AlertCircle className="h-10 w-10 mb-2" />
        <p className="text-sm font-medium">{t('settings.notifications.errorLoading')}</p>
      </div>
    );
  }

  function toggleChannel(chKey: 'email' | 'sms' | 'whatsapp' | 'push' | 'inApp') {
    const current = prefs!.channels[chKey]?.isEnabled ?? true;
    updateMutation.mutate({
      channels: { [chKey]: { isEnabled: !current } },
    });
  }

  function toggleCategory(catKey: string) {
    const current = prefs!.categories[catKey];
    if (!current) return;
    updateMutation.mutate({
      categories: {
        ...prefs!.categories,
        [catKey]: { ...current, isEnabled: !current.isEnabled },
      },
    });
  }

  function toggleCategoryChannel(catKey: string, chKey: string) {
    const current = prefs!.categories[catKey];
    if (!current) return;
    const channels = current.channels.includes(chKey as 'email')
      ? current.channels.filter((c) => c !== chKey)
      : [...current.channels, chKey as 'email'];
    updateMutation.mutate({
      categories: {
        ...prefs!.categories,
        [catKey]: { ...current, channels },
      },
    });
  }

  function updateDigestMode(mode: 'realtime' | 'daily' | 'weekly') {
    updateMutation.mutate({ digestMode: mode });
  }

  function updateQuietHours(start: string | null, end: string | null) {
    updateMutation.mutate({ quietHoursStart: start, quietHoursEnd: end });
  }

  return (
    <div className="space-y-6">
      {/* Global Channel Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Volume2 className="h-5 w-5" />
            {t('settings.notifications.channels.title')}
          </CardTitle>
          <CardDescription>{t('settings.notifications.channels.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CHANNEL_LIST.map(({ key, icon: Icon, label }) => {
              const enabled = prefs.channels[key]?.isEnabled ?? true;
              return (
                <button
                  key={key}
                  onClick={() => toggleChannel(key)}
                  disabled={updateMutation.isPending}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    enabled
                      ? 'border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${enabled ? 'text-brand-600' : 'text-gray-400'}`} />
                  <span className="text-sm font-medium flex-1 text-start">{t(label)}</span>
                  {enabled ? (
                    <ToggleRight className="h-5 w-5 text-green-500" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Per-Category Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-5 w-5" />
            {t('settings.notifications.categoryPreferences.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.notifications.categoryPreferences.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(CATEGORY_META).map(([catKey, meta]) => {
            const catPref = prefs.categories[catKey];
            if (!catPref) return null;
            return (
              <div
                key={catKey}
                className={`rounded-lg border p-4 transition-opacity ${
                  catPref.isEnabled
                    ? 'border-gray-200 dark:border-gray-700'
                    : 'border-gray-200 dark:border-gray-700 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}
                      >
                        {t(meta.label)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t(meta.description)}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleCategory(catKey)}
                    disabled={updateMutation.isPending}
                    className="shrink-0"
                  >
                    {catPref.isEnabled ? (
                      <ToggleRight className="h-5 w-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {catPref.isEnabled && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    {CHANNEL_LIST.map(({ key: chKey, icon: Icon, label }) => {
                      const active = catPref.channels.includes(chKey);
                      const channelEnabled = prefs.channels[chKey]?.isEnabled ?? true;
                      return (
                        <button
                          key={chKey}
                          onClick={() => toggleCategoryChannel(catKey, chKey)}
                          disabled={updateMutation.isPending || !channelEnabled}
                          title={
                            !channelEnabled
                              ? `${t(label)} is globally disabled`
                              : `Toggle ${t(label)}`
                          }
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                            active && channelEnabled
                              ? 'border-brand-300 dark:border-brand-700 bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300'
                              : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
                          } ${!channelEnabled ? 'cursor-not-allowed line-through' : ''}`}
                        >
                          <Icon className="h-3 w-3" />
                          {t(label)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Delivery & Quiet Hours */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Digest Mode */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5" />
              Delivery Mode
            </CardTitle>
            <CardDescription>
              Choose how you receive notifications — instantly or in digests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(['realtime', 'daily', 'weekly'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => updateDigestMode(mode)}
                disabled={updateMutation.isPending}
                className={`w-full flex items-center gap-3 rounded-lg border p-3 text-start transition-colors ${
                  prefs.digestMode === mode
                    ? 'border-brand-300 dark:border-brand-700 bg-brand-50 dark:bg-brand-950'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full border-2 ${
                    prefs.digestMode === mode
                      ? 'border-brand-600 bg-brand-600'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                <div>
                  <p className="text-sm font-medium capitalize">
                    {t(`settings.notifications.delivery.${mode}`)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {mode === 'realtime' && t('settings.notifications.delivery.realtimeDesc')}
                    {mode === 'daily' && t('settings.notifications.delivery.dailyDesc')}
                    {mode === 'weekly' && t('settings.notifications.delivery.weeklyDesc')}
                  </p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Moon className="h-5 w-5" />
              Quiet Hours
            </CardTitle>
            <CardDescription>
              Pause non-urgent notifications during specified hours.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!prefs.quietHoursStart && !!prefs.quietHoursEnd}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateQuietHours('22:00', '08:00');
                    } else {
                      updateQuietHours(null, null);
                    }
                  }}
                  disabled={updateMutation.isPending}
                  className="rounded"
                />
                <span className="text-sm font-medium">
                  {t('settings.notifications.quietHours.enableLabel')}
                </span>
              </label>
            </div>
            {prefs.quietHoursStart && prefs.quietHoursEnd && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">{t('settings.notifications.quietHours.start')}</Label>
                  <Input
                    type="time"
                    value={prefs.quietHoursStart}
                    onChange={(e) => updateQuietHours(e.target.value, prefs.quietHoursEnd)}
                    disabled={updateMutation.isPending}
                  />
                </div>
                <div>
                  <Label className="text-xs">{t('settings.notifications.quietHours.end')}</Label>
                  <Input
                    type="time"
                    value={prefs.quietHoursEnd}
                    onChange={(e) => updateQuietHours(prefs.quietHoursStart, e.target.value)}
                    disabled={updateMutation.isPending}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notification Sound */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Volume2 className="h-5 w-5" />
            {t('settings.notifications.sound.title')}
          </CardTitle>
          <CardDescription>{t('settings.notifications.sound.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SOUND_PRESETS.map(({ key, label, description }) => {
              const active = (prefs.soundPreset || 'chime') === key;
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    active
                      ? 'border-brand-300 dark:border-brand-700 bg-brand-50 dark:bg-brand-950'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <button
                    onClick={() => {
                      updateMutation.mutate({ soundPreset: key });
                      setNotificationSoundPreset(key as SoundPreset);
                    }}
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-3 flex-1 text-start"
                  >
                    <div
                      className={`w-3 h-3 rounded-full border-2 shrink-0 ${
                        active
                          ? 'border-brand-600 bg-brand-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
                    </div>
                  </button>
                  {key !== 'none' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playNotificationSound(key as SoundPreset);
                      }}
                      className="shrink-0 rounded-md p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:text-brand-400 dark:hover:bg-brand-950 transition-colors"
                      title={`Preview "${label}" sound`}
                    >
                      <Play className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── Templates View ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

function TemplatesView() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);

  const { data: templates, isLoading, isError } = useNotificationTemplates();
  const deleteMutation = useDeleteTemplate();
  const updateMutation = useUpdateTemplate();
  const { t } = useTranslation();

  const filtered = useMemo(() => {
    if (!templates) return [];
    return templates.filter((tpl) => {
      if (category !== 'all' && tpl.category !== category) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = resolveText(tpl.name).toLowerCase();
        const key = tpl.key.toLowerCase();
        if (!name.includes(q) && !key.includes(q)) return false;
      }
      return true;
    });
  }, [templates, category, search]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('settings.notifications.templates.title')}
              </CardTitle>
              <CardDescription>{t('settings.notifications.templates.description')}</CardDescription>
            </div>
            <Button
              onClick={() => {
                setEditingTemplate(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4 me-2" /> {t('settings.notifications.templates.newTemplate')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                aria-label="Search templates"
                placeholder={t('settings.notifications.templates.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full ps-10 pe-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {templateCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    category === cat
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat === 'all'
                    ? t('settings.notifications.allCategories')
                    : t(CATEGORY_META[cat]?.label ?? cat)}
                </button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="flex flex-col items-center justify-center py-12 text-red-500 dark:text-red-400">
              <AlertCircle className="h-10 w-10 mb-2" />
              <p className="text-sm font-medium">
                {t('settings.notifications.templates.errorLoading')}
              </p>
            </div>
          )}

          {/* Empty */}
          {!isLoading && !isError && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <FileText className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm font-medium">
                {t('settings.notifications.templates.emptyTitle')}
              </p>
              <p className="text-xs mt-1">
                {search || category !== 'all'
                  ? t('settings.notifications.templates.emptyFiltered')
                  : t('settings.notifications.templates.emptyDefault')}
              </p>
            </div>
          )}

          {/* Cards */}
          {!isLoading && !isError && filtered.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((tpl) => {
                const cat = CATEGORY_META[tpl.category] ?? {
                  label: tpl.category,
                  color: 'bg-gray-100 text-gray-700',
                };
                return (
                  <div
                    key={tpl._id}
                    className={`rounded-xl border p-4 transition-shadow hover:shadow-md ${
                      tpl.isActive
                        ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {resolveText(tpl.name)}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                          {tpl.key}
                        </p>
                      </div>
                      <span
                        className={`ms-2 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cat.color}`}
                      >
                        {t(cat.label)}
                      </span>
                    </div>

                    {tpl.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                        {resolveText(tpl.description)}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      {CHANNEL_LIST.map(({ key, icon: Icon, label }) => {
                        const ch = tpl.channels[key];
                        if (!ch) return null;
                        return (
                          <div
                            key={label}
                            title={`${t(label)}: ${ch.isEnabled ? t('settings.notifications.enabled') : t('settings.notifications.disabled')}`}
                            className={`p-1 rounded ${ch.isEnabled ? 'text-brand-600 dark:text-brand-400' : 'text-gray-300 dark:text-gray-600'}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                        );
                      })}
                      <span className="ms-auto text-xs text-gray-400">
                        {t(triggerLabels[tpl.trigger] ?? tpl.trigger)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Toggle template"
                        onClick={() =>
                          updateMutation.mutate({ id: tpl._id, data: { isActive: !tpl.isActive } })
                        }
                      >
                        {tpl.isActive ? (
                          <ToggleRight className="h-4 w-4 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Edit template"
                        onClick={() => {
                          setEditingTemplate(tpl);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!tpl.isSystem && (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Delete template"
                          onClick={() => deleteMutation.mutate(tpl._id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <TemplateFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        template={editingTemplate}
      />
    </div>
  );
}

export default NotificationSettingsTab;
