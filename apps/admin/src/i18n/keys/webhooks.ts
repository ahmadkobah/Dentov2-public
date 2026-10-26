/**
 * Webhooks feature — Translation keys
 * Source: WebhooksPage.tsx
 */

export const webhooks = {
  // ── Page ──────────────────────────────────────────────
  page: {
    title: 'Webhooks',
    description: 'Manage webhook endpoints and monitor deliveries',
    addEndpoint: 'Add Endpoint',
  },

  // ── Stats ─────────────────────────────────────────────
  stats: {
    totalEndpoints: 'Total Endpoints',
    active: 'Active',
    failing: 'Failing',
    avgSuccess: 'Avg Success',
  },

  // ── Status labels ─────────────────────────────────────
  status: {
    active: 'Active',
    disabled: 'Disabled',
    failing: 'Failing',
  },

  // ── Filters ───────────────────────────────────────────
  filters: {
    searchPlaceholder: 'Search by URL or name…',
    all: 'All',
    active: 'Active',
    disabled: 'Disabled',
    failed: 'Failed',
  },

  // ── Empty states ──────────────────────────────────────
  empty: {
    filtered: 'No webhooks match your filters.',
    default: 'No webhook endpoints configured yet.',
  },

  // ── Error ─────────────────────────────────────────────
  errorLoading: 'Failed to load webhooks.',
  retry: 'Retry',

  // ── Confirm ───────────────────────────────────────────
  deleteConfirm: 'Delete this webhook endpoint?',

  // ── Delivery table ────────────────────────────────────
  deliveries: {
    columns: {
      event: 'Event',
      status: 'Status',
      http: 'HTTP',
      duration: 'Duration',
      time: 'Time',
    },
    empty: 'No deliveries yet.',
  },
} as const;
