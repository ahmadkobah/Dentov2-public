import { useState, useMemo } from 'react';
import { Button } from '@dento/ui';
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
} from 'lucide-react';
import {
  useNotificationTemplates,
  useDeleteTemplate,
  useUpdateTemplate,
  type NotificationTemplate,
} from '../hooks/useNotificationTemplates.js';
import { TemplateFormDialog } from '../components/TemplateFormDialog.js';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Helpers ────────────────────────────────────────────────────────────

function t(value: string | { en: string; ar: string }): string {
  return typeof value === 'string' ? value : value.en;
}

const categoryLabels: Record<string, { label: string; color: string }> = {
  appointment: {
    label: 'Appointment',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  payment: {
    label: 'Payment',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  clinical: {
    label: 'Clinical',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  inventory: {
    label: 'Inventory',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  system: {
    label: 'System',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  },
  marketing: {
    label: 'Marketing',
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  },
  recall: {
    label: 'Recall',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  queue: {
    label: 'Queue',
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  },
};

function channelIcons(channels: NotificationTemplate['channels']) {
  const icons: Array<{ icon: typeof Mail; label: string; enabled: boolean }> = [];
  if (channels.email) icons.push({ icon: Mail, label: 'Email', enabled: channels.email.isEnabled });
  if (channels.sms)
    icons.push({ icon: MessageSquare, label: 'SMS', enabled: channels.sms.isEnabled });
  if (channels.whatsapp)
    icons.push({ icon: Send, label: 'WhatsApp', enabled: channels.whatsapp.isEnabled });
  if (channels.push)
    icons.push({ icon: Smartphone, label: 'Push', enabled: channels.push.isEnabled });
  if (channels.inApp)
    icons.push({ icon: Bell, label: 'In-App', enabled: channels.inApp.isEnabled });
  return icons;
}

// ── Component ──────────────────────────────────────────────────────────

const categories = [
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

export function NotificationTemplatesPage() {
  const { t: translate } = useTranslation();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);

  const { data: templates, isLoading, isError } = useNotificationTemplates();
  const deleteMutation = useDeleteTemplate();
  const updateMutation = useUpdateTemplate();

  const filtered = useMemo(() => {
    if (!templates) return [];
    return templates.filter((tpl) => {
      if (category !== 'all' && tpl.category !== category) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = t(tpl.name).toLowerCase();
        const key = tpl.key.toLowerCase();
        if (!name.includes(q) && !key.includes(q)) return false;
      }
      return true;
    });
  }, [templates, category, search]);

  // ── Loading ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-red-500 dark:text-red-400">
        <AlertCircle className="h-10 w-10 mb-2" />
        <p className="text-lg font-medium">
          {translate('notifications.templates.error.loadFailed')}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {translate('notifications.templates.error.tryAgain')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {translate('notifications.templates.page.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {translate('notifications.templates.page.description')}
          </p>
        </div>
        <Button
          aria-label={translate('notifications.templates.actions.createTemplate')}
          onClick={() => {
            setEditingTemplate(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 me-2" />{' '}
          {translate('notifications.templates.actions.newTemplate')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            aria-label={translate('notifications.templates.search.ariaLabel')}
            placeholder={translate('notifications.templates.search.placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full ps-10 pe-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                category === cat
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {translate(
                cat === 'all'
                  ? 'notifications.templates.categories.all'
                  : `notifications.templates.categories.${cat}`,
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
          <FileText className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-lg font-medium">{translate('notifications.templates.empty.title')}</p>
          <p className="text-sm mt-1">
            {search || category !== 'all'
              ? translate('notifications.templates.empty.adjustFilter')
              : translate('notifications.templates.empty.createFirst')}
          </p>
        </div>
      )}

      {/* Template Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((tpl) => {
          const cat = categoryLabels[tpl.category] ?? {
            label: tpl.category,
            color: 'bg-gray-100 text-gray-700',
          };
          const icons = channelIcons(tpl.channels);

          return (
            <div
              key={tpl._id}
              className={`rounded-xl border p-4 transition-shadow hover:shadow-md ${
                tpl.isActive
                  ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60'
              }`}
            >
              {/* Top row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {t(tpl.name)}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                    {tpl.key}
                  </p>
                </div>
                <span
                  className={`ms-2 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cat.color}`}
                >
                  {cat.label}
                </span>
              </div>

              {/* Description */}
              {tpl.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                  {tpl.description}
                </p>
              )}

              {/* Channel icons */}
              <div className="flex items-center gap-2 mb-3">
                {icons.map(({ icon: Icon, label, enabled }) => (
                  <div
                    key={label}
                    title={`${label}: ${
                      enabled
                        ? translate('notifications.templates.channelStatus.enabled')
                        : translate('notifications.templates.channelStatus.disabled')
                    }`}
                    className={`p-1 rounded ${
                      enabled
                        ? 'text-brand-600 dark:text-brand-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                ))}
                <span className="ms-auto text-xs text-gray-400">
                  {translate(
                    tpl.trigger === 'automatic'
                      ? 'notifications.templates.triggerLabels.auto'
                      : tpl.trigger === 'manual'
                        ? 'notifications.templates.triggerLabels.manual'
                        : 'notifications.templates.triggerLabels.scheduled',
                  )}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 pt-2 border-t border-gray-100 dark:border-gray-700">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={translate('notifications.templates.actions.toggleTemplate')}
                  onClick={() =>
                    updateMutation.mutate({
                      id: tpl._id,
                      data: { isActive: !tpl.isActive },
                    })
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
                  aria-label={translate('notifications.templates.actions.editTemplate')}
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
                    aria-label={translate('notifications.templates.actions.deleteTemplate')}
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

      <TemplateFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        template={editingTemplate}
      />
    </div>
  );
}

export default NotificationTemplatesPage;
