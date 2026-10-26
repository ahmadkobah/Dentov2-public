import { useState } from 'react';
import { Send, Loader2, Shield, Building2 } from 'lucide-react';
import { Button } from '@dento/ui';
import { usePlatformNotes, useCreatePlatformNote } from '../hooks/usePlatformNotes.js';
import { useTranslation } from '@/stores/locale.store.js';

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function PlatformNotesPage() {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const { data, isLoading } = usePlatformNotes();
  const createNote = useCreatePlatformNote();

  const notes = data?.data ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    createNote.mutate(trimmed, { onSuccess: () => setContent('') });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('platformNotes.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('platformNotes.description')}
        </p>
      </div>

      {/* Send Note */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('platformNotes.inputPlaceholder')}
            maxLength={2000}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
          />
          <Button
            type="submit"
            disabled={!content.trim() || createNote.isPending}
            className="flex items-center gap-2"
          >
            {createNote.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t('platformNotes.send')}
          </Button>
        </form>
      </div>

      {/* Notes Timeline */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : notes.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('platformNotes.empty')}
          </p>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note._id} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  {note.source === 'platform' ? (
                    <Shield className="h-4 w-4 text-brand-500" />
                  ) : (
                    <Building2 className="h-4 w-4 text-success-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                        note.source === 'platform'
                          ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                          : 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400'
                      }`}
                    >
                      {note.source === 'platform'
                        ? t('platformNotes.source.platformTeam')
                        : t('platformNotes.source.yourTeam')}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {note.authorName}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      · {timeAgo(note.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{note.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
