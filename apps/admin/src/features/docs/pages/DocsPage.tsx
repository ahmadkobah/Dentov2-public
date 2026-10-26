import { useState, useMemo } from 'react';
import { Input, Card, CardContent, Badge } from '@dento/ui';
import { Search, FileText, ChevronRight, BookOpen, Mail, Phone } from 'lucide-react';
import { useDocs, useDoc, useDocsConfig, type Doc } from '../hooks/useDocs.js';
import { useBrandingStore } from '../../../stores/branding.store.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDate } from '@/lib/date.js';
import DOMPurify from 'dompurify';

// ── Simple Markdown Renderer ─────────────────────────────

function renderMarkdown(md: string): string {
  return md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-8 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(
      /`([^`]+)`/g,
      '<code class="rounded bg-gray-100 px-1.5 py-0.5 text-sm dark:bg-gray-800">$1</code>',
    )
    .replace(/^- (.+)$/gm, '<li class="ms-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ms-4 list-decimal">$2</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

// ── Component ────────────────────────────────────────────

export default function DocsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const { data: docs = [], isLoading } = useDocs();
  const { data: activeDoc } = useDoc(selectedSlug);
  const { data: config } = useDocsConfig();
  const { logoUrl: tenantLogo } = useBrandingStore();
  const displayLogo = config?.headerLogo || tenantLogo;

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, Doc[]>();
    let filtered = docs;
    if (search) {
      const q = search.toLowerCase();
      filtered = docs.filter(
        (d) => d.title.toLowerCase().includes(q) || d.category.toLowerCase().includes(q),
      );
    }
    for (const doc of filtered) {
      const list = map.get(doc.category) || [];
      list.push(doc);
      map.set(doc.category, list);
    }
    return map;
  }, [docs, search]);

  // Auto-select first doc
  if (!selectedSlug && docs.length > 0) {
    setSelectedSlug(docs[0].slug);
  }

  return (
    <div className="space-y-6">
      {/* Branded Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white overflow-hidden">
          {displayLogo ? (
            <img src={displayLogo} alt="Docs" className="h-full w-full object-contain" />
          ) : (
            <BookOpen className="h-5 w-5" />
          )}
        </div>
        <h1 className="text-xl font-bold text-foreground">
          {config?.headerTitle || t('docs.defaultTitle')}
        </h1>
      </div>

      <p className="text-sm text-muted-foreground">{t('docs.subtitle')}</p>

      <div className="flex gap-6 min-h-[60vh]">
        {/* Sidebar — article list */}
        <div className="w-72 shrink-0 space-y-3">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={t('docs.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-10"
            />
          </div>

          {isLoading ? (
            <p className="py-4 text-center text-sm text-gray-400">{t('docs.loading')}</p>
          ) : docs.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">{t('docs.empty')}</p>
          ) : (
            <nav className="space-y-4">
              {[...grouped.entries()].map(([category, items]) => (
                <div key={category}>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {category}
                  </h3>
                  <ul className="space-y-0.5">
                    {items.map((doc) => (
                      <li key={doc._id}>
                        <button
                          onClick={() => setSelectedSlug(doc.slug)}
                          className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-sm transition-colors ${
                            selectedSlug === doc.slug
                              ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                          }`}
                        >
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="truncate">{doc.title}</span>
                          {selectedSlug === doc.slug && (
                            <ChevronRight className="ms-auto h-4 w-4 shrink-0" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          )}
        </div>

        {/* Content — article viewer */}
        <Card className="flex-1">
          <CardContent className="p-6">
            {activeDoc ? (
              <article>
                <div className="mb-6 border-b pb-4 dark:border-gray-800">
                  <Badge variant="outline" className="mb-2">
                    {activeDoc.category}
                  </Badge>
                  <h1 className="text-2xl font-bold">{activeDoc.title}</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    {t('docs.lastUpdated')} {formatDate(activeDoc.updatedAt)}
                  </p>
                </div>
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(renderMarkdown(activeDoc.content)),
                  }}
                />
              </article>
            ) : (
              <div className="flex h-full items-center justify-center py-20 text-gray-400">
                <div className="text-center">
                  <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-40" />
                  <p>{t('docs.selectArticle')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      {(config?.footerSupportEmail ||
        config?.footerSupportPhone ||
        config?.footerCopyrightText ||
        config?.footerPlatformVersion) && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4 text-xs text-gray-400 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-4">
            {config.footerSupportEmail && (
              <a
                href={`mailto:${config.footerSupportEmail}`}
                className="flex items-center gap-1 hover:text-gray-600"
              >
                <Mail className="h-3 w-3" /> {config.footerSupportEmail}
              </a>
            )}
            {config.footerSupportPhone && (
              <a
                href={`tel:${config.footerSupportPhone}`}
                className="flex items-center gap-1 hover:text-gray-600"
              >
                <Phone className="h-3 w-3" /> {config.footerSupportPhone}
              </a>
            )}
          </div>
          <div className="flex items-center gap-3">
            {config.footerCopyrightText && <span>{config.footerCopyrightText}</span>}
            {config.footerPlatformVersion && (
              <Badge variant="secondary" className="text-[10px]">
                {config.footerPlatformVersion}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
