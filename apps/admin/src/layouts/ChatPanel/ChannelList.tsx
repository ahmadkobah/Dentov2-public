/**
 * ChannelList — left pane of the chat panel.
 *
 * Per ADMIN_PORTAL_SCREENS.md §14:
 * - CHANNELS section (branch, role, announcement, custom)
 * - DIRECT MESSAGES section
 * - Unread badges per channel
 * - Search filter
 * - New channel button
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Hash,
  Users,
  Megaphone,
  Building2,
  MessageCircle,
  X,
  LifeBuoy,
} from 'lucide-react';
import { Input, Button, Badge } from '@dento/ui';
import { useThemeStore } from '@/stores/theme.store.js';
import { useSupportTickets } from '@/features/support/hooks/useSupport.js';
import { useChatStore } from '@/stores/chat.store.js';
import type { ChatChannel } from './useChat.js';

interface ChannelListProps {
  channels: ChatChannel[];
  activeChannelId: string | null;
  onSelectChannel: (id: string) => void;
  onSelectTicket?: (id: string) => void;
  onCreateChannel: () => void;
  onClose?: () => void;
  searchText?: string;
}

const CHANNEL_ICONS: Record<string, typeof Hash> = {
  branch: Building2,
  role: Users,
  announcement: Megaphone,
  custom: Hash,
  direct: MessageCircle,
};

function formatTime(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function ChannelList({
  channels,
  activeChannelId,
  onSelectChannel,
  onSelectTicket,
  onCreateChannel,
  onClose,
}: ChannelListProps) {
  const [search, setSearch] = useState('');
  const locale = useThemeStore((s) => s.locale);
  const lang = locale === 'ar' ? 'ar' : 'en';
  const navigate = useNavigate();
  const closePanel = useChatStore((s) => s.closePanel);

  // Fetch active support tickets for the "Support Tickets" section
  const { data: ticketData } = useSupportTickets({ limit: 20 });

  const filtered = useMemo(() => {
    if (!search.trim()) return channels;
    const q = search.toLowerCase();
    return channels.filter((ch) => {
      const name = ch.name?.[lang] ?? ch.name?.en ?? '';
      return name.toLowerCase().includes(q);
    });
  }, [channels, search, lang]);

  const groupChannels = filtered.filter((c) => c.type !== 'direct');
  const directChannels = filtered.filter((c) => c.type === 'direct');

  // Filter support tickets that have messages and aren't closed
  const activeTickets = useMemo(() => {
    const tickets = ticketData?.tickets ?? [];
    const open = tickets.filter((t) => t.status !== 'closed' && t.status !== 'resolved');
    if (!search.trim()) return open;
    const q = search.toLowerCase();
    return open.filter(
      (t) => t.subject.toLowerCase().includes(q) || t.ticketNumber.toLowerCase().includes(q),
    );
  }, [ticketData?.tickets, search]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Chat</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCreateChannel}
            className="h-7 w-7"
            aria-label="New chat"
            title="New chat"
          >
            <Plus className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7"
              aria-label="Close chat"
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search channels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 ps-8 text-xs"
          />
        </div>
      </div>

      {/* Channel Sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Group Channels */}
        {groupChannels.length > 0 && (
          <div className="px-2 pt-2">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Channels
            </p>
            {groupChannels.map((ch) => (
              <ChannelItem
                key={ch._id}
                channel={ch}
                lang={lang}
                isActive={ch._id === activeChannelId}
                onClick={() => onSelectChannel(ch._id)}
              />
            ))}
          </div>
        )}

        {/* Direct Messages */}
        {directChannels.length > 0 && (
          <div className="px-2 pt-3">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Direct Messages
            </p>
            {directChannels.map((ch) => (
              <ChannelItem
                key={ch._id}
                channel={ch}
                lang={lang}
                isActive={ch._id === activeChannelId}
                onClick={() => onSelectChannel(ch._id)}
              />
            ))}
          </div>
        )}

        {/* Support Tickets */}
        {activeTickets.length > 0 && (
          <div className="px-2 pt-3">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Support Tickets
            </p>
            {activeTickets.map((ticket) => {
              const lastMsg = ticket.messages?.[ticket.messages.length - 1];
              return (
                <button
                  key={ticket._id}
                  onClick={() => {
                    if (onSelectTicket) {
                      onSelectTicket(ticket._id);
                    } else {
                      closePanel();
                      navigate(`/support/tickets/${ticket._id}`);
                    }
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-start transition-colors text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <LifeBuoy className="h-4 w-4 flex-shrink-0 opacity-60" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-xs font-medium">
                        #{ticket.ticketNumber} {ticket.subject}
                      </span>
                      {lastMsg && (
                        <span className="ms-1 flex-shrink-0 text-[10px] text-gray-400">
                          {formatTime(lastMsg.createdAt)}
                        </span>
                      )}
                    </div>
                    {lastMsg && (
                      <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                        {lastMsg.sender.name}: {lastMsg.message}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {filtered.length === 0 && activeTickets.length === 0 && (
          <p className="px-4 py-8 text-center text-xs text-gray-400">No channels found</p>
        )}
      </div>
    </div>
  );
}

// ── Channel Item ───────────────────────────────────────────

function ChannelItem({
  channel,
  lang,
  isActive,
  onClick,
}: {
  channel: ChatChannel;
  lang: 'en' | 'ar';
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = CHANNEL_ICONS[channel.type] ?? Hash;
  const name = channel.name?.[lang] ?? channel.name?.en ?? 'Direct';
  const unread = channel.unreadCount ?? 0;

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-start transition-colors ${
        isActive
          ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
      }`}
    >
      <Icon className="h-4 w-4 flex-shrink-0 opacity-60" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className={`truncate text-xs ${unread > 0 ? 'font-semibold' : 'font-medium'}`}>
            {name}
          </span>
          {channel.lastMessage?.sentAt && (
            <span className="ms-1 flex-shrink-0 text-[10px] text-gray-400">
              {formatTime(channel.lastMessage.sentAt)}
            </span>
          )}
        </div>
        {channel.lastMessage && (
          <div className="flex items-center justify-between">
            <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
              {channel.lastMessage.text}
            </p>
            {unread > 0 && (
              <Badge
                variant="default"
                className="ms-1 h-4 min-w-4 flex-shrink-0 rounded-full px-1 text-[10px]"
              >
                {unread}
              </Badge>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
