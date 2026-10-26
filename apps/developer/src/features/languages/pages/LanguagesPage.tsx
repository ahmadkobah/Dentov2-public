/**
 * Languages Page — Developer Portal
 *
 * Manage the platform language registry and translation packs.
 * Shows available languages and their translation packs with key counts.
 */

import { useState } from 'react';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Separator,
  toast,
} from '@dento/ui';
import {
  Plus,
  FileText,
  Loader2,
  Globe,
  Edit2,
  Trash2,
  ChevronRight,
  Search,
  Save,
} from 'lucide-react';
import {
  useLanguages,
  useTranslationPacks,
  useCreateTranslationPack,
  useUpdateTranslationPack,
  useDeleteTranslationPack,
  type TranslationPack,
} from '../hooks/useLanguages.js';

export default function LanguagesPage() {
  const { data: languages, isLoading: langsLoading } = useLanguages();
  const { data: packs, isLoading: packsLoading } = useTranslationPacks();
  const [selectedPack, setSelectedPack] = useState<TranslationPack | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [filterLocale, setFilterLocale] = useState<string>('');
  const [filterSearch, setFilterSearch] = useState('');

  const isLoading = langsLoading || packsLoading;

  // Group packs by locale
  const filteredPacks = (packs ?? []).filter((p) => {
    if (filterLocale && p.locale !== filterLocale) return false;
    if (filterSearch && !p.namespace.toLowerCase().includes(filterSearch.toLowerCase()))
      return false;
    return true;
  });

  const packsByLocale = filteredPacks.reduce(
    (acc, p) => {
      (acc[p.locale] ??= []).push(p);
      return acc;
    },
    {} as Record<string, TranslationPack[]>,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Languages & Translations
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage the platform language registry and translation packs
          </p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New Translation Pack
        </Button>
      </div>

      {/* Language Registry Cards */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
          Language Registry
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(languages ?? []).map((lang) => {
            const langPacks = (packs ?? []).filter((p) => p.locale === lang.code);
            const totalKeys = langPacks.reduce(
              (sum, p) => sum + Object.keys(p.translations).length,
              0,
            );
            return (
              <Card key={lang._id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Globe className="h-4 w-4 text-brand-500" />
                      {lang.name.en}
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                      {lang.isDefault && <Badge variant="default">Default</Badge>}
                      <Badge variant={lang.isActive ? 'success' : 'secondary'}>
                        {lang.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>
                    Code:{' '}
                    <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">{lang.code}</code>
                    {' · '}Direction: {lang.direction.toUpperCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>
                      {langPacks.length} pack{langPacks.length !== 1 ? 's' : ''}
                    </span>
                    <span>{totalKeys} keys total</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Translation Packs */}
      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Translation Packs</h2>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Filter namespace…"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-[200px] pl-9"
              />
            </div>
            <select
              value={filterLocale}
              onChange={(e) => setFilterLocale(e.target.value)}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="">All locales</option>
              {(languages ?? []).map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name.en} ({l.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {Object.entries(packsByLocale)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([locale, localePacks]) => (
            <div key={locale} className="mb-6">
              <h3 className="mb-2 text-sm font-medium uppercase text-gray-500">
                {locale} — {localePacks.length} pack{localePacks.length !== 1 ? 's' : ''}
              </h3>
              <div className="space-y-2">
                {localePacks
                  .sort((a, b) => a.namespace.localeCompare(b.namespace))
                  .map((pack) => (
                    <PackRow key={pack._id} pack={pack} onEdit={() => setSelectedPack(pack)} />
                  ))}
              </div>
            </div>
          ))}

        {filteredPacks.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p>No translation packs found</p>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {selectedPack && <EditPackDialog pack={selectedPack} onClose={() => setSelectedPack(null)} />}

      {/* Create Dialog */}
      {createOpen && (
        <CreatePackDialog
          locales={(languages ?? []).map((l) => l.code)}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </div>
  );
}

// ── Pack Row ────────────────────────────────────────────────

function PackRow({ pack, onEdit }: { pack: TranslationPack; onEdit: () => void }) {
  const keyCount = Object.keys(pack.translations).length;
  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-brand-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="flex items-center gap-3">
        <FileText className="h-4 w-4 text-gray-400" />
        <div>
          <span className="font-medium text-gray-900 dark:text-white">{pack.namespace}</span>
          <span className="ml-2 text-xs text-gray-500">v{pack.version}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={pack.isActive ? 'success' : 'secondary'} className="text-xs">
          {pack.isActive ? 'Active' : 'Inactive'}
        </Badge>
        {pack.isDefault && (
          <Badge variant="outline" className="text-xs">
            Default
          </Badge>
        )}
        <span className="text-sm text-gray-500">{keyCount} keys</span>
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </div>
    </button>
  );
}

// ── Edit Pack Dialog ────────────────────────────────────────

function EditPackDialog({ pack, onClose }: { pack: TranslationPack; onClose: () => void }) {
  const [translations, setTranslations] = useState<Record<string, string>>({
    ...pack.translations,
  });
  const [search, setSearch] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const updateMutation = useUpdateTranslationPack(pack._id);
  const deleteMutation = useDeleteTranslationPack();

  const keys = Object.keys(translations)
    .filter(
      (k) =>
        !search ||
        k.toLowerCase().includes(search.toLowerCase()) ||
        translations[k].toLowerCase().includes(search.toLowerCase()),
    )
    .sort();

  function handleSave() {
    updateMutation.mutate({ translations }, { onSuccess: () => onClose() });
  }

  function handleDelete() {
    if (!confirm(`Delete pack "${pack.namespace}" (${pack.locale})?`)) return;
    deleteMutation.mutate(pack._id, { onSuccess: () => onClose() });
  }

  function handleAddKey() {
    const k = newKey.trim();
    if (!k) return;
    if (translations[k] !== undefined) {
      toast.error('Key already exists');
      return;
    }
    setTranslations({ ...translations, [k]: newValue });
    setNewKey('');
    setNewValue('');
  }

  function handleRemoveKey(key: string) {
    const next = { ...translations };
    delete next[key];
    setTranslations(next);
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5" />
            {pack.namespace}
            <Badge variant="outline" className="ml-2">
              {pack.locale}
            </Badge>
            <span className="text-sm font-normal text-gray-500">v{pack.version}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Search + Add */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search keys or values…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Add Key Row */}
        <div className="flex gap-2">
          <Input
            placeholder="New key"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="flex-1"
            dir={pack.locale === 'ar' ? 'rtl' : 'ltr'}
          />
          <Button variant="outline" size="icon" onClick={handleAddKey}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Translation Entries */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {keys.map((key) => (
            <div
              key={key}
              className="flex items-center gap-2 rounded border border-gray-100 p-2 dark:border-gray-800"
            >
              <code className="min-w-[200px] shrink-0 truncate text-xs text-gray-600 dark:text-gray-400">
                {key}
              </code>
              <Input
                value={translations[key]}
                onChange={(e) => setTranslations({ ...translations, [key]: e.target.value })}
                className="flex-1 text-sm"
                dir={pack.locale === 'ar' ? 'rtl' : 'ltr'}
              />
              <button
                type="button"
                onClick={() => handleRemoveKey(key)}
                className="shrink-0 p-1 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {keys.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">No keys match your search</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          {!pack.isDefault && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="mr-auto"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Create Pack Dialog ──────────────────────────────────────

function CreatePackDialog({ locales, onClose }: { locales: string[]; onClose: () => void }) {
  const [locale, setLocale] = useState(locales[0] ?? 'en');
  const [namespace, setNamespace] = useState('');
  const createMutation = useCreateTranslationPack();

  function handleCreate() {
    const ns = namespace.trim().toLowerCase();
    if (!ns) {
      toast.error('Namespace is required');
      return;
    }
    createMutation.mutate(
      { locale, namespace: ns, translations: {} },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Translation Pack
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Locale</Label>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              {locales.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Namespace</Label>
            <Input
              placeholder="e.g. patients, billing, custom_module"
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Lowercase, underscores only. e.g. "patients", "custom_reports"
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-2">
            <Plus className="h-4 w-4" />
            {createMutation.isPending ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
