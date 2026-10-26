/**
 * ChatPanel — main sidebar panel combining ChannelList + ChatView + ChatInput.
 *
 * Per ADMIN_PORTAL_SCREENS.md §14 and V2_STRUCTURE.md:
 * - w-80 right sidebar (left in RTL)
 * - border-s divider
 * - Slide-in/out animation
 * - Channel list → select → message view + input
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { Button } from '@dento/ui';
import { useChatStore } from '@/stores/chat.store.js';
import { useChannelList, useSendMessage, useMessageList, useMarkChannelRead } from './useChat.js';
import type { ChatMessage, CreateMessageInput } from './useChat.js';
import { ChannelList } from './ChannelList.js';
import { ChatView } from './ChatView.js';
import { ChatInput } from './ChatInput.js';
import { CreateChannelDialog } from './CreateChannelDialog.js';
import { TicketChatView } from './TicketChatView.js';
import { useSupportTickets } from '@/features/support/hooks/useSupport.js';

export function ChatPanel() {
  const {
    isOpen,
    closePanel,
    activeChannelId,
    activeTicketId,
    setActiveChannel,
    setActiveTicket,
    setTotalUnread,
    setTicketUnread,
  } = useChatStore();
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showCreateChannel, setShowCreateChannel] = useState(false);

  // ── Channel list (only fetch when panel is open) ────────────
  const { data: channelData } = useChannelList({}, isOpen);
  const channels = useMemo(() => channelData?.channels ?? [], [channelData?.channels]);

  // Compute total unread
  const totalUnread = useMemo(
    () => channels.reduce((sum, ch) => sum + (ch.unreadCount ?? 0), 0),
    [channels],
  );

  useEffect(() => {
    setTotalUnread(totalUnread);
  }, [totalUnread, setTotalUnread]);

  // ── Support ticket "unread" (waiting_customer = support replied) ──
  const { data: ticketData } = useSupportTickets({ limit: 50 });
  const ticketUnread = useMemo(() => {
    const tickets = ticketData?.tickets ?? [];
    return tickets.filter((t) => t.status === 'waiting_customer').length;
  }, [ticketData?.tickets]);

  useEffect(() => {
    setTicketUnread(ticketUnread);
  }, [ticketUnread, setTicketUnread]);

  // ── Messages for active channel ────────────────────────────
  const {
    data: messagePages,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useMessageList(activeChannelId ?? '');

  const messages = messagePages?.pages.flatMap((p) => p.data.messages).reverse() ?? [];

  // ── Mutations ──────────────────────────────────────────────
  const sendMutation = useSendMessage(activeChannelId ?? '');
  const markReadMutation = useMarkChannelRead(activeChannelId ?? '');

  // Mark channel as read when selected
  useEffect(() => {
    if (activeChannelId) {
      markReadMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannelId]);

  const handleSelectChannel = useCallback(
    (id: string) => {
      setActiveChannel(id);
      setReplyTo(null);
    },
    [setActiveChannel],
  );

  const handleBack = useCallback(() => {
    setActiveChannel(null);
    setReplyTo(null);
  }, [setActiveChannel]);

  const handleTicketBack = useCallback(() => {
    setActiveTicket(null);
  }, [setActiveTicket]);

  const handleSelectTicket = useCallback(
    (id: string) => {
      setActiveTicket(id);
    },
    [setActiveTicket],
  );

  const handleSend = useCallback(
    (data: CreateMessageInput) => {
      if (!activeChannelId) return;
      sendMutation.mutate(data);
    },
    [activeChannelId, sendMutation],
  );

  const handleReply = useCallback((msg: ChatMessage) => {
    setReplyTo(msg);
  }, []);

  const activeChannel = channels.find((c) => c._id === activeChannelId) ?? null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 end-0 z-50 flex w-80 flex-col border-s border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
      {/* Close button — overlay (all screens) */}
      <div className="absolute end-2 top-2 z-10">
        <Button variant="ghost" size="icon" onClick={closePanel} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Panel content */}
      {activeTicketId ? (
        <TicketChatView ticketId={activeTicketId} onBack={handleTicketBack} />
      ) : activeChannelId ? (
        <>
          <div className="flex-1 overflow-hidden">
            <ChatView
              channel={activeChannel}
              messages={messages}
              hasMore={hasNextPage ?? false}
              isFetchingMore={isFetchingNextPage}
              onLoadMore={() => fetchNextPage()}
              onBack={handleBack}
              onReply={handleReply}
            />
          </div>
          <ChatInput
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onSend={handleSend}
            disabled={sendMutation.isPending}
          />
        </>
      ) : (
        <ChannelList
          channels={channels}
          activeChannelId={activeChannelId}
          onSelectChannel={handleSelectChannel}
          onSelectTicket={handleSelectTicket}
          onCreateChannel={() => setShowCreateChannel(true)}
          onClose={closePanel}
        />
      )}

      <CreateChannelDialog
        open={showCreateChannel}
        onOpenChange={setShowCreateChannel}
        onChannelCreated={(id) => setActiveChannel(id)}
      />
    </div>
  );
}
