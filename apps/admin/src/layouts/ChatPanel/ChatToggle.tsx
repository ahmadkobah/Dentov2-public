/**
 * ChatToggle — 💬 header button with unread badge.
 *
 * Per ADMIN_PORTAL_SCREENS.md §14 and V2_STRUCTURE.md:
 * Toggles the chat sidebar panel open/closed.
 * Shows unread count badge when > 0.
 */

import { MessageCircle } from 'lucide-react';
import { Button } from '@dento/ui';
import { useChatStore } from '../../stores/chat.store.js';

export function ChatToggle() {
  const { togglePanel, totalUnread, ticketUnread } = useChatStore();
  const badge = totalUnread + ticketUnread;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={togglePanel}
      aria-label="Toggle chat"
      className="relative h-10 w-10 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
    >
      <MessageCircle className="h-5 w-5" />
      {badge > 0 && (
        <span className="absolute end-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Button>
  );
}
