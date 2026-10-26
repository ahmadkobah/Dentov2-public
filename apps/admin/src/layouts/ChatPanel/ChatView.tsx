/**
 * ChatView — message history pane.
 *
 * Per ADMIN_PORTAL_SCREENS.md §14:
 * - Scrollable message list with infinite scroll (cursor-based)
 * - Sender name + avatar + timestamp
 * - Message types: text, image, file, voice, system
 * - Reply preview
 * - Edit/delete indicators
 * - dir="auto" for mixed LTR/RTL text
 */

import { useRef, useEffect, useCallback, Fragment } from 'react';
import { Loader2, ArrowDown, FileIcon, Mic, CornerUpLeft } from 'lucide-react';
import { Button } from '@dento/ui';
import type { ChatMessage, ChatChannel } from './useChat.js';
import { useThemeStore } from '@/stores/theme.store.js';
import { formatDate } from '@/lib/date.js';

interface ChatViewProps {
  channel: ChatChannel | null;
  messages: ChatMessage[];
  hasMore: boolean;
  isFetchingMore: boolean;
  onLoadMore: () => void;
  onBack: () => void;
  onReply: (msg: ChatMessage) => void;
}

function formatMessageTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(dateStr: string, _locale: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return formatDate(dateStr);
}

function isSameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function ChatView({
  channel,
  messages,
  hasMore,
  isFetchingMore,
  onLoadMore,
  onBack,
  onReply,
}: ChatViewProps) {
  const locale = useThemeStore((s) => s.locale);
  const lang = locale === 'ar' ? 'ar' : 'en';
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || isFetchingMore || !hasMore) return;
    if (containerRef.current.scrollTop < 100) {
      onLoadMore();
    }
  }, [isFetchingMore, hasMore, onLoadMore]);

  if (!channel) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-gray-400">
        <p className="text-sm">Select a channel to start chatting</p>
      </div>
    );
  }

  const channelName = channel.name?.[lang] ?? channel.name?.en ?? 'Direct Message';

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2.5 dark:border-gray-700">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-7 w-7"
          aria-label="Back to channels"
        >
          <ArrowDown className="h-4 w-4 rotate-90 rtl:-rotate-90" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {channelName}
          </p>
          <p className="text-[11px] text-gray-500">
            {channel.members.length} member{channel.members.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-3 py-2">
        {/* Load more */}
        {isFetchingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        )}
        {hasMore && !isFetchingMore && (
          <div className="flex justify-center py-2">
            <Button variant="ghost" size="sm" onClick={onLoadMore} className="text-xs">
              Load older messages
            </Button>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, i) => {
          const prevMsg = i > 0 ? messages[i - 1] : null;
          const showDate = !prevMsg || !isSameDay(prevMsg.createdAt, msg.createdAt);

          return (
            <Fragment key={msg._id}>
              {showDate && (
                <div className="my-3 flex items-center gap-2">
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                  <span className="text-[10px] font-medium text-gray-400">
                    {formatDateSeparator(msg.createdAt, locale)}
                  </span>
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                </div>
              )}
              <MessageBubble msg={msg} onReply={onReply} />
            </Fragment>
          );
        })}

        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-gray-400">No messages yet. Say hello!</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ── Message Bubble ─────────────────────────────────────────

function MessageBubble({
  msg,
  onReply,
}: {
  msg: ChatMessage;
  onReply: (msg: ChatMessage) => void;
}) {
  if (msg.type === 'system') {
    return <div className="my-2 text-center text-[11px] italic text-gray-400">{msg.text}</div>;
  }

  if (msg.isDeleted) {
    return (
      <div className="group mb-2">
        <div className="flex items-start gap-2">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            {msg.senderName?.charAt(0) ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-400 italic">This message was deleted</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group mb-2">
      <div className="flex items-start gap-2">
        {/* Avatar */}
        {msg.senderAvatarUrl ? (
          <img
            src={msg.senderAvatarUrl}
            alt={msg.senderName}
            className="h-7 w-7 flex-shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-medium text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
            {msg.senderName?.charAt(0) ?? '?'}
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Sender + Time */}
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold text-gray-900 dark:text-white">
              {msg.senderName}
            </span>
            <span className="text-[10px] text-gray-400">{formatMessageTime(msg.createdAt)}</span>
            {msg.isEdited && <span className="text-[10px] text-gray-400">(edited)</span>}
            {/* Reply action */}
            <button
              onClick={() => onReply(msg)}
              className="ms-auto hidden text-gray-400 hover:text-gray-600 group-hover:inline-flex dark:hover:text-gray-300"
            >
              <CornerUpLeft className="h-3 w-3" />
            </button>
          </div>

          {/* Reply preview */}
          {msg.replyPreview && (
            <div className="mb-1 mt-0.5 rounded border-s-2 border-brand-400 bg-gray-50 px-2 py-1 dark:bg-gray-800">
              <p className="text-[10px] font-medium text-brand-600 dark:text-brand-400">
                {msg.replyPreview.senderName}
              </p>
              <p className="truncate text-[11px] text-gray-500">{msg.replyPreview.text}</p>
            </div>
          )}

          {/* Text */}
          {msg.text && (
            <p dir="auto" className="whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-300">
              {msg.text}
            </p>
          )}

          {/* Attachments */}
          {msg.attachments.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {msg.attachments.map((att, idx) => (
                <AttachmentPreview key={idx} attachment={att} msgType={msg.type} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Attachment Preview ─────────────────────────────────────

function AttachmentPreview({
  attachment,
  msgType,
}: {
  attachment: {
    filename: string;
    url: string;
    mimeType: string;
    size: number;
    thumbnailUrl?: string;
  };
  msgType: string;
}) {
  const isImage = msgType === 'image' || attachment.mimeType.startsWith('image/');
  const isVoice = msgType === 'voice' || attachment.mimeType.startsWith('audio/');

  if (isImage) {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer">
        <img
          src={attachment.thumbnailUrl ?? attachment.url}
          alt={attachment.filename}
          className="max-h-40 max-w-[200px] rounded-lg object-cover"
        />
      </a>
    );
  }

  if (isVoice) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-800">
        <Mic className="h-4 w-4 text-gray-500" />
        <audio src={attachment.url} controls className="h-8 max-w-[180px]" />
      </div>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
    >
      <FileIcon className="h-4 w-4 text-gray-400" />
      <span className="max-w-[120px] truncate">{attachment.filename}</span>
      <span className="text-[10px] text-gray-400">{(attachment.size / 1024).toFixed(0)}KB</span>
    </a>
  );
}
