/**
 * ChatInput — message input with attachments + reply.
 *
 * Per ADMIN_PORTAL_SCREENS.md §14:
 * - 📎 attachment button
 * - Send icon (rotated 180° in RTL)
 * - dir="auto" on input
 * - Reply preview bar when replying to a message
 */

import { useState, useRef, useCallback, type KeyboardEvent } from 'react';
import { Send, Paperclip, X, Loader2 } from 'lucide-react';
import { Button, Input } from '@dento/ui';
import type { ChatMessage, CreateMessageInput } from './useChat.js';
import { useChatUpload } from './useChat.js';

interface ChatInputProps {
  replyTo: ChatMessage | null;
  onCancelReply: () => void;
  onSend: (data: CreateMessageInput) => void;
  disabled?: boolean;
}

export function ChatInput({ replyTo, onCancelReply, onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upload = useChatUpload();

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    onSend({
      type: 'text',
      text: trimmed,
      replyToId: replyTo?._id,
    });

    setText('');
    onCancelReply();
    inputRef.current?.focus();
  }, [text, replyTo, onSend, onCancelReply]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset the input so re-selecting the same file triggers change
      e.target.value = '';

      try {
        const result = await upload.mutateAsync(file);
        onSend({
          type: 'file',
          attachments: [result],
          replyToId: replyTo?._id,
        });
        onCancelReply();
      } catch {
        // Upload error is tracked via upload.isError — no extra handling needed
      }
    },
    [upload, onSend, replyTo, onCancelReply],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="border-t border-gray-200 dark:border-gray-700">
      {/* Reply Preview */}
      {replyTo && (
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 dark:bg-gray-800">
          <div className="min-w-0 flex-1 border-s-2 border-brand-400 ps-2">
            <p className="text-[10px] font-medium text-brand-600 dark:text-brand-400">
              {replyTo.senderName}
            </p>
            <p className="truncate text-[11px] text-gray-500">{replyTo.text}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancelReply}
            className="h-6 w-6"
            aria-label="Cancel reply"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <input
          ref={fileInputRef}
          type="file"
          aria-label="Choose file to attach"
          className="hidden"
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
          onChange={handleFileSelect}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Attach file"
          disabled={disabled || upload.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          {upload.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </Button>

        <Input
          ref={inputRef}
          dir="auto"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="h-9 flex-1 text-sm"
        />

        <Button
          variant="ghost"
          size="icon"
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="h-8 w-8 shrink-0 text-brand-500 hover:text-brand-600 rtl:rotate-180"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
