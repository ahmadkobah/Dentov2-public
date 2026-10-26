/**
 * Chat Panel Store — §37 Staff Chat.
 *
 * Controls the chat sidebar panel open/close state,
 * the active channel, and unread counts.
 */

import { create } from 'zustand';

interface ChatState {
  /** Whether the chat panel is open */
  isOpen: boolean;
  /** The currently selected channel ID */
  activeChannelId: string | null;
  /** The currently selected support ticket ID (inline chat) */
  activeTicketId: string | null;
  /** Total unread messages across all channels */
  totalUnread: number;
  /** Number of support tickets awaiting customer attention */
  ticketUnread: number;

  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  setActiveChannel: (id: string | null) => void;
  setActiveTicket: (id: string | null) => void;
  setTotalUnread: (count: number) => void;
  setTicketUnread: (count: number) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  activeChannelId: null,
  activeTicketId: null,
  totalUnread: 0,
  ticketUnread: 0,

  togglePanel: () => set((s) => ({ isOpen: !s.isOpen })),
  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),
  setActiveChannel: (id) => set({ activeChannelId: id, activeTicketId: null }),
  setActiveTicket: (id) => set({ activeTicketId: id, activeChannelId: null }),
  setTotalUnread: (count) => set({ totalUnread: count }),
  setTicketUnread: (count) => set({ ticketUnread: count }),
}));
