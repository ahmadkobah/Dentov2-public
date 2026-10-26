import { useState } from 'react';
import { Send, Loader2, Building2, Shield } from 'lucide-react';
import { Button } from '@dento/ui';
import type { TenantDetail } from '../types/tenant-detail.types.js';
import { useTenantNotes, useCreateTenantNote } from '../hooks/useTenantNotes.js';
import { useTenantRecentActivity } from '../hooks/useTenantAuditLogs.js';

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

type TimelineItem =
  | {
      type: 'note';
      _id: string;
      source: 'platform' | 'tenant';
      authorName: string;
      content: string;
      createdAt: string;
    }
  | { type: 'activity'; _id: string; description: string; createdAt: string };

export function WorkflowsTab({ tenant }: { tenant: TenantDetail }) {
  const [content, setContent] = useState('');
  const { data: notesData, isLoading: notesLoading } = useTenantNotes(tenant.slug);
  const { data: activityData, isLoading: activityLoading } = useTenantRecentActivity(tenant.slug);
  const createNote = useCreateTenantNote(tenant.slug);

  const isLoading = notesLoading || activityLoading;

  // Merge notes + audit logs into a single sorted timeline
  const timeline: TimelineItem[] = [];

  if (notesData?.data) {
    for (const note of notesData.data) {
      timeline.push({
        type: 'note',
        _id: note._id,
        source: note.source,
        authorName: note.authorName,
        content: note.content,
        createdAt: note.createdAt,
      });
    }
  }

  if (activityData?.data) {
    for (const log of activityData.data) {
      timeline.push({
        type: 'activity',
        _id: log._id,
        description: log.description ?? `${log.action} ${log.resourceType}`,
        createdAt: log.createdAt,
      });
    }
  }

  timeline.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    createNote.mutate(trimmed, { onSuccess: () => setContent('') });
  }

  return (
    <div className="space-y-6">
      {/* Add Note Form */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
          Add a Note for {tenant.name.en}
        </h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          This note will be visible to the tenant in their admin panel.
        </p>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a note (e.g. 'Upgraded plan to Pro', 'Fixed billing issue')…"
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
            Send
          </Button>
        </form>
      </div>

      {/* Activity Timeline */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Activity Timeline
        </h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : timeline.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No activity yet. Notes and tenant actions will appear here.
          </p>
        ) : (
          <div className="relative space-y-0">
            {/* Vertical line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-200 dark:bg-gray-700" />

            {timeline.map((item) => (
              <div key={item._id} className="relative flex gap-4 py-3">
                {/* Icon */}
                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white bg-gray-100 dark:border-gray-900 dark:bg-gray-800">
                  {item.type === 'note' ? (
                    item.source === 'platform' ? (
                      <Shield className="h-3.5 w-3.5 text-brand-500" />
                    ) : (
                      <Building2 className="h-3.5 w-3.5 text-success-500" />
                    )
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-gray-400" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {item.type === 'note' ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                            item.source === 'platform'
                              ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                              : 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400'
                          }`}
                        >
                          {item.source === 'platform' ? 'Platform' : 'Tenant'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {item.authorName}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{item.content}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
                  )}
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    {timeAgo(item.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
