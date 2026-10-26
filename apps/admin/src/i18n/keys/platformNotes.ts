/**
 * Platform Notes feature — Translation keys
 * Source: PlatformNotesPage.tsx
 */

export const platformNotes = {
  title: 'Platform Notes',
  description:
    'Communication between your clinic and the platform team. Notes you send here are visible to the platform administrators.',
  inputPlaceholder: 'Write a note to the platform team…',
  send: 'Send',
  empty: 'No notes yet. Messages from the platform team will appear here.',
  source: {
    platformTeam: 'Platform Team',
    yourTeam: 'Your Team',
  },
  time: {
    justNow: 'just now',
    minutesAgo: 'm ago',
    hoursAgo: 'h ago',
    daysAgo: 'd ago',
  },
} as const;
