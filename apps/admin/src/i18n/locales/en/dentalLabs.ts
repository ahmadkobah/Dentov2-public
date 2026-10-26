export const dentalLabs = {
  // ── Page ─────────────────────────────────────────────
  page: {
    title: 'Dental Labs',
    description: 'Manage external dental laboratories for lab orders',
  },

  // ── Actions ──────────────────────────────────────────
  actions: {
    addLab: 'Add Lab',
    edit: 'Edit',
    deactivate: 'Deactivate',
  },

  // ── Filters / Search ────────────────────────────────
  search: {
    placeholder: 'Search by name, city, or specialty…',
    showInactive: 'Show inactive',
  },

  // ── Columns ──────────────────────────────────────────
  columns: {
    turnaround: '{{days}}d turnaround',
  },

  // ── Status ───────────────────────────────────────────
  status: {
    active: 'Active',
    inactive: 'Inactive',
  },

  // ── Empty / Error ────────────────────────────────────
  empty: {
    search: 'No dental labs match your search.',
    noData: 'No dental labs configured yet.',
  },
  error: {
    loadFailed: 'Failed to load dental labs.',
    retry: 'Retry',
  },

  // ── Dialogs ──────────────────────────────────────────
  dialog: {
    deactivateTitle: 'Deactivate "{{name}}"?',
    addTitle: 'Add Dental Lab',
    editTitle: 'Edit Dental Lab',
  },

  // ── Form ─────────────────────────────────────────────
  form: {
    name: 'Lab Name',
    namePlaceholder: 'e.g. Al-Noor Dental Lab',
    contactPerson: 'Contact Person',
    contactPersonPlaceholder: 'Full name',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    addressPlaceholder: 'Street address',
    city: 'City',
    cityPlaceholder: 'e.g. Riyadh',
    specialties: 'Specialties',
    specialtiesPlaceholder: 'Crowns, Bridges, Dentures…',
    specialtiesHint: 'Separate multiple specialties with commas',
    rating: 'Rating',
    turnaroundDays: 'Turnaround (days)',
    pricingNotes: 'Pricing Notes',
    pricingNotesPlaceholder: 'Add any notes about pricing…',
    isActive: 'Active',
  },
} as const;
