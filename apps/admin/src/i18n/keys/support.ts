/**
 * Support feature — Translation keys
 * Sources: SupportPage.tsx, TicketDetailPage.tsx, SLATimer.tsx, CreateTicketDialog.tsx
 */

export const support = {
  // ── Page ──────────────────────────────────────────────
  page: {
    title: 'Support',
    description: 'View and track your support tickets',
    reportIssue: 'Report Issue',
  },

  // ── Stat cards ────────────────────────────────────────
  stats: {
    openTickets: 'Open Tickets',
    inProgress: 'In Progress',
    waitingOnYou: 'Waiting on You',
    resolved: 'Resolved',
  },

  // ── Status labels ─────────────────────────────────────
  status: {
    open: 'Open',
    inProgress: 'In Progress',
    waitingOnYou: 'Waiting on You',
    underReview: 'Under Review',
    resolved: 'Resolved',
    closed: 'Closed',
  },

  // ── Priority labels ───────────────────────────────────
  priority: {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
  },

  // ── Category labels ───────────────────────────────────
  category: {
    bug: 'Bug',
    feature: 'Feature',
    billing: 'Billing',
    access: 'Access',
    other: 'Other',
  },

  // ── List view ─────────────────────────────────────────
  list: {
    searchPlaceholder: 'Search by subject or ticket ID…',
    statusFilter: 'Status:',
    priorityFilter: 'Priority:',
    errorLoading: 'Failed to load tickets. Retry',
    loading: 'Loading tickets…',
    emptyFiltered: 'No tickets match your filters.',
    emptyDefault: 'No support tickets yet. Create one to get started.',
  },

  // ── Ticket Detail ─────────────────────────────────────
  detail: {
    slaBreached: 'SLA BREACHED',
    errorLoading: 'Failed to load ticket or ticket not found.',
    backToSupport: 'Back to Support',
    back: 'Back',
    messages: 'Messages',
    noMessages: 'No messages yet.',
    replyPlaceholder: 'Type your reply…',
    sending: 'Sending…',
    send: 'Send',
    sidebar: {
      status: 'Status',
      priority: 'Priority',
      assignedTo: 'Assigned To',
      unassigned: 'Unassigned',
      slaDeadlines: 'SLA Deadlines',
      category: 'Category',
    },
    senderYou: 'You',
    senderSupport: 'Support',
  },

  // ── SLA Timer ─────────────────────────────────────────
  sla: {
    overdue: 'Overdue',
    slaMet: 'SLA Met',
  },

  // ── Create Ticket Dialog ──────────────────────────────
  create: {
    title: 'Create Support Ticket',
    description: 'Submit a new support request. Our team will respond based on SLA timelines.',
    subjectLabel: 'Subject * (min 3 chars)',
    subjectPlaceholder: 'Brief summary of the issue',
    descriptionLabel: 'Description * (min 10 chars)',
    descriptionPlaceholder: 'Detailed description of the issue, steps to reproduce, etc.',
    categoryLabel: 'Category',
    categories: {
      bug: 'Bug',
      featureRequest: 'Feature Request',
      billing: 'Billing',
      accessIssue: 'Access Issue',
      other: 'Other',
    },
    priorityLabel: 'Priority',
    linkedModule: 'Linked Module (optional)',
    linkedModulePlaceholder: 'e.g. dental_charting',
    tags: 'Tags (comma-separated, optional)',
    cancel: 'Cancel',
    creating: 'Creating…',
    createTicket: 'Create Ticket',
  },
} as const;
