/**
 * Languages Tab — Tenant Detail Page
 *
 * Manage which languages a tenant has enabled (supportedLanguages)
 * and their default language setting.
 */

import { useState, useEffect } from 'react';
import { Button, Badge, Switch, toast } from '@dento/ui';
import { Globe, Loader2, Save } from 'lucide-react';
import { useLanguages } from '../../languages/hooks/useLanguages.js';
import type { TenantDetail } from '../types/tenant-detail.types.js';
import { apiClient } from '../../../lib/api-client.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface Props {
  tenant: TenantDetail;
  tenantId: string;
}

export function LanguagesTab({ tenant, tenantId }: Props) {
  const { data: allLanguages, isLoading } = useLanguages();
  const qc = useQueryClient();
  const [selectedLangs, setSelectedLangs] = useState<string[]>(tenant.supportedLanguages ?? ['en']);
  const [defaultLang, setDefaultLang] = useState(tenant.language ?? 'en');

  useEffect(() => {
    setSelectedLangs(tenant.supportedLanguages ?? ['en']);
    setDefaultLang(tenant.language ?? 'en');
  }, [tenant]);

  const updateMutation = useMutation({
    mutationFn: (body: { supportedLanguages: string[]; defaultLanguage: string }) =>
      apiClient.patch(`/api/platform/tenants/${tenantId}`, {
        settings: {
          supportedLanguages: body.supportedLanguages,
          defaultLanguage: body.defaultLanguage,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant languages updated');
    },
    onError: () => toast.error('Failed to update languages'),
  });

  function toggleLang(code: string) {
    if (code === 'en') return; // EN is always required
    if (code === defaultLang) return; // Can't disable default
    setSelectedLangs((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  function handleSave() {
    if (!selectedLangs.includes(defaultLang)) {
      toast.error('Default language must be in the supported list');
      return;
    }
    updateMutation.mutate({
      supportedLanguages: selectedLangs,
      defaultLanguage: defaultLang,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const activeLanguages = (allLanguages ?? []).filter((l) => l.isActive);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tenant Languages</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure which languages this tenant can use. Adding a secondary language will
          automatically activate the Language Pack module.
        </p>
      </div>

      {/* Language toggles */}
      <div className="space-y-3">
        {activeLanguages.map((lang) => {
          const isEnabled = selectedLangs.includes(lang.code);
          const isDefault = defaultLang === lang.code;
          return (
            <div
              key={lang.code}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-brand-500" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {lang.name.en}
                    </span>
                    <code className="rounded bg-gray-100 px-1.5 text-xs dark:bg-gray-800">
                      {lang.code}
                    </code>
                    {lang.direction === 'rtl' && (
                      <Badge variant="outline" className="text-xs">
                        RTL
                      </Badge>
                    )}
                  </div>
                  {isDefault && (
                    <span className="text-xs text-brand-600 dark:text-brand-400">
                      Default language
                    </span>
                  )}
                  {lang.code === 'en' && !isDefault && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">Always enabled</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isEnabled && !isDefault && lang.code !== 'en' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDefaultLang(lang.code)}
                    className="text-xs"
                  >
                    Set as default
                  </Button>
                )}
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => toggleLang(lang.code)}
                  disabled={isDefault || lang.code === 'en'}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {updateMutation.isPending ? 'Saving…' : 'Save Languages'}
        </Button>
      </div>
    </div>
  );
}
