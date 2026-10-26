export const leave = {
  // ── Page ─────────────────────────────────────────────
  page: {
    title: 'Leave Management',
    description: 'Configure leave types, manage requests, and track balances',
  },

  // ── Tabs ─────────────────────────────────────────────
  tabs: {
    leaveRequests: 'Leave Requests',
    leaveTypes: 'Leave Types',
    balances: 'Balances',
  },

  // ── Leave Types Columns ──────────────────────────────
  typeColumns: {
    name: 'Name',
    code: 'Code',
    maxDaysPerYear: 'Max Days/Year',
    paid: 'Paid',
    unpaid: 'Unpaid',
    approval: 'Approval',
    required: 'Required',
    auto: 'Auto',
    color: 'Color',
  },

  // ── Leave Requests Columns ───────────────────────────
  requestColumns: {
    period: 'Period',
    days: 'Days',
    reason: 'Reason',
    status: 'Status',
    requested: 'Requested',
  },

  // ── Leave Request Actions ────────────────────────────
  requestActions: {
    approve: 'Approve',
    reject: 'Reject',
  },

  // ── Balance Columns ──────────────────────────────────
  balanceColumns: {
    year: 'Year',
    total: 'Total',
    used: 'Used',
    remaining: 'Remaining',
    carriedForward: 'Carried Forward',
  },

  // ── Filters ──────────────────────────────────────────
  filters: {
    allStatuses: 'All Statuses',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  },

  // ── Empty States ─────────────────────────────────────
  empty: {
    requests: {
      title: 'No leave requests',
      description: 'Leave requests from staff will appear here.',
    },
    types: {
      title: 'No leave types',
      description: 'Configure leave types (annual, sick, etc.) for your clinic.',
    },
    balances: {
      title: 'No leave balances',
      description: 'Leave balances are created when requests are submitted.',
    },
  },

  // ── Error ────────────────────────────────────────────
  error: {
    loadFailed: 'Failed to load',
  },

  // ── Toasts ───────────────────────────────────────────
  toast: {
    approved: 'Leave approved',
    approveFailed: 'Failed to approve',
    rejected: 'Leave rejected',
    rejectFailed: 'Failed to reject',
  },
} as const;
