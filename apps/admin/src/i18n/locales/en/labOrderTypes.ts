export const labOrderTypes = {
  // ── Page ─────────────────────────────────────────────
  page: {
    title: 'Lab Order Types',
    description: 'Manage categories and types for dental lab orders',
  },

  // ── Actions ──────────────────────────────────────────
  actions: {
    add: 'Add Type',
  },

  // ── Search / Filters ────────────────────────────────
  search: {
    placeholder: 'Search by name…',
  },
  filters: {
    allCategories: 'All Categories',
  },

  // ── Columns ──────────────────────────────────────────
  columns: {
    sortOrder: '#',
    name: 'Name',
    category: 'Category',
    turnaround: 'Turnaround',
    type: 'Type',
    status: 'Status',
  },

  // ── Categories ───────────────────────────────────────
  category: {
    crown_bridge: 'Crown & Bridge',
    veneers: 'Veneers',
    removable: 'Removable',
    appliances: 'Appliances',
    orthodontics: 'Orthodontics',
    implants: 'Implants',
    diagnostics: 'Diagnostics',
    other: 'Other',
  },

  // ── Badges ──────────────────────────────────────────
  badge: {
    custom: 'Custom',
    default: 'Default',
  },

  // ── Status ───────────────────────────────────────────
  status: {
    active: 'Active',
    inactive: 'Inactive',
  },

  // ── Empty / Error ────────────────────────────────────
  empty: {
    title: 'No lab order types found',
    description: 'Create a new lab order type or adjust your filters.',
  },
  error: {
    loadFailed: 'Failed to load lab order types',
  },

  // ── Dialog ───────────────────────────────────────────
  dialog: {
    addTitle: 'Add Lab Order Type',
    editTitle: 'Edit Lab Order Type',
  },

  // ── Form ─────────────────────────────────────────────
  form: {
    nameEn: 'Name (English)',
    nameAr: 'Name (Arabic)',
    category: 'Category',
    turnaroundDays: 'Turnaround (days)',
    description: 'Description',
    descriptionPlaceholder: 'Optional description…',
    sortOrder: 'Sort Order',
    isActive: 'Active',
  },
} as const;
