/**
 * TicketChatView — inline support-ticket messages inside the chat panel.
 *
 * Replaces navigate-away behaviour: renders the ticket conversation
 * right inside the w-80 sidebar, matching the chat UX.
 */

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, LifeBuoy, Loader2 } from 'lucide-react';
import { Button, Badge } from '@dento/ui';
import {
  useSupportTicketDetail,
  useAddMessage,
  type TicketMessage,
} from '@/features/support/hooks/useSupport.js';

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

interface TicketChatViewProps {
  ticketId: string;
  onBack: () => void;
}

export function TicketChatView({ ticketId, onBack }: TicketChatViewProps) {
  const { data: ticket, isLoading } = useSupportTicketDetail(ticketId);
  const addMessage = useAddMessage();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  if (isLoading || !ticket) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const messages = ticket.messages ?? [];
  const isClosed = ticket.status === 'closed';

  function handleSend() {
    if (!text.trim()) return;
    addMessage.mutate({ ticketId, message: text.trim() });
    setText('');
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2.5 dark:border-gray-700">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <LifeBuoy className="h-4 w-4 text-gray-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">
            #{ticket.ticketNumber}
          </p>
          <p className="truncate text-[10px] text-gray-500">{ticket.subject}</p>
        </div>
        <Badge variant="secondary" className="text-[10px] capitalize">
          {ticket.status.replace('_', ' ')}
        </Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {/* Initial description */}
        <div className="mb-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
          <p className="mb-1 text-[10px] font-semibold text-gray-500">
            {ticket.createdBy?.name ?? 'Unknown'} · {formatTime(ticket.createdAt)}
          </p>
          <p className="whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-300">
            {ticket.description}
          </p>
        </div>

        {messages.map((msg: TicketMessage, idx: number) => {
          const isSupport = msg.sender.role !== 'tenant_user' && msg.sender.role !== 'admin';
          return (
            <div
              key={msg._id ?? idx}
              className={`mb-2 rounded-lg p-3 ${
                isSupport ? 'bg-brand-50 dark:bg-brand-900/20' : 'bg-gray-50 dark:bg-gray-800/50'
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">
                  {msg.sender.name}{' '}
                  <span className="font-normal text-gray-400">
                    ({isSupport ? 'Support' : 'You'})
                  </span>
                </span>
                <span className="text-[10px] text-gray-400">{formatTime(msg.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-300">
                {msg.message}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!isClosed && (
        <div className="border-t border-gray-200 px-3 py-2 dark:border-gray-700">
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a reply…"
              rows={2}
              className="flex-1 resize-none rounded-md border border-gray-200 bg-transparent px-2.5 py-1.5 text-xs outline-none focus:border-brand-500 dark:border-gray-700"
            />
            <Button
              size="icon"
              className="h-8 w-8"
              disabled={!text.trim() || addMessage.isPending}
              onClick={handleSend}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
