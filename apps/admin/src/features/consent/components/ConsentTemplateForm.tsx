/**
 * ConsentTemplateForm — dialog for Create / Edit consent template.
 *
 * Per V2_DATABASE.md §5.11 consent_templates fields:
 * - name { en, ar }
 * - procedureType
 * - content { en, ar }
 * - risks { en, ar }
 * - isActive
 */

import { useState, useEffect } from 'react';
import { Button, Input, Label } from '@dento/ui';
import { X, Save, Loader2 } from 'lucide-react';
import type { ConsentTemplate, CreateConsentTemplateInput } from '../hooks/useConsent.js';
import { useSupportedLanguages } from '../../../hooks/useSupportedLanguages.js';
import { useTranslation } from '../../../stores/locale.store.js';

interface ConsentTemplateFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateConsentTemplateInput) => void;
  isLoading?: boolean;
  /** Pass existing template for edit mode */
  template?: ConsentTemplate | null;
}

const empty: CreateConsentTemplateInput = {
  name: { en: '', ar: '' },
  procedureType: '',
  content: { en: '', ar: '' },
  risks: { en: '', ar: '' },
  isActive: true,
};

export function ConsentTemplateForm({
  open,
  onClose,
  onSubmit,
  isLoading,
  template,
}: ConsentTemplateFormProps) {
  const [form, setForm] = useState<CreateConsentTemplateInput>(empty);
  const { isMultiLang } = useSupportedLanguages();
  const { t } = useTranslation();

  // Populate form when editing
  useEffect(() => {
    if (template) {
      setForm({
        name: { en: template.name.en, ar: template.name.ar },
        procedureType: template.procedureType,
        content: { en: template.content.en, ar: template.content.ar },
        risks: { en: template.risks?.en ?? '', ar: template.risks?.ar ?? '' },
        isActive: template.isActive,
      });
    } else {
      setForm(empty);
    }
  }, [template]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const setBilingual = (key: 'name' | 'content' | 'risks', lang: 'en' | 'ar', value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: { ...prev[key], [lang]: value } as { en: string; ar: string },
    }));
  };

  if (!open) return null;

  const isEdit = !!template;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="animate-in fade-in w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEdit ? t('consent.templateForm.editTitle') : t('consent.templateForm.createTitle')}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-4">
          {/* Name (en/ar) */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t('consent.templateForm.nameEn')}</Label>
              <Input
                required
                value={form.name.en}
                onChange={(e) => setBilingual('name', 'en', e.target.value)}
                placeholder={t('consent.templateForm.nameEnPlaceholder')}
              />
            </div>
            {isMultiLang && (
              <div>
                <Label>{t('consent.templateForm.nameAr')}</Label>
                <Input
                  dir="rtl"
                  value={form.name.ar}
                  onChange={(e) => setBilingual('name', 'ar', e.target.value)}
                  placeholder={t('consent.templateForm.nameArPlaceholder')}
                />
              </div>
            )}
          </div>

          {/* Procedure Type */}
          <div>
            <Label>{t('consent.templateForm.procedureType')}</Label>
            <Input
              required
              value={form.procedureType}
              onChange={(e) => setForm((p) => ({ ...p, procedureType: e.target.value }))}
              placeholder={t('consent.templateForm.procedurePlaceholder')}
            />
          </div>

          {/* Content (en/ar) */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t('consent.templateForm.contentEn')}</Label>
              <textarea
                required
                rows={5}
                value={form.content.en}
                onChange={(e) => setBilingual('content', 'en', e.target.value)}
                placeholder={t('consent.templateForm.contentEnPlaceholder')}
                className="flex min-h-[80px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:ring-offset-gray-900"
              />
            </div>
            {isMultiLang && (
              <div>
                <Label>{t('consent.templateForm.contentAr')}</Label>
                <textarea
                  dir="rtl"
                  rows={5}
                  value={form.content.ar}
                  onChange={(e) => setBilingual('content', 'ar', e.target.value)}
                  placeholder={t('consent.templateForm.contentArPlaceholder')}
                  className="flex min-h-[80px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:ring-offset-gray-900"
                />
              </div>
            )}
          </div>

          {/* Risks (en/ar) */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t('consent.templateForm.risksEn')}</Label>
              <textarea
                rows={3}
                value={form.risks?.en ?? ''}
                onChange={(e) => setBilingual('risks', 'en', e.target.value)}
                placeholder={t('consent.templateForm.risksEnPlaceholder')}
                className="flex min-h-[60px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:ring-offset-gray-900"
              />
            </div>
            {isMultiLang && (
              <div>
                <Label>{t('consent.templateForm.risksAr')}</Label>
                <textarea
                  dir="rtl"
                  rows={3}
                  value={form.risks?.ar ?? ''}
                  onChange={(e) => setBilingual('risks', 'ar', e.target.value)}
                  placeholder={t('consent.templateForm.risksArPlaceholder')}
                  className="flex min-h-[60px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:ring-offset-gray-900"
                />
              </div>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <Label htmlFor="isActive" className="mb-0 cursor-pointer">
              {t('consent.templateForm.active')}
            </Label>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t('consent.templateForm.cancelBtn')}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="me-2 h-4 w-4" />
            )}
            {isEdit ? t('consent.templateForm.updateBtn') : t('consent.templateForm.createBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
