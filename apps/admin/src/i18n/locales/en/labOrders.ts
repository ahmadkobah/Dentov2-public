export const labOrders = {
  // ── Page ─────────────────────────────────────────────
  page: {
    title: 'Lab Orders',
    description: 'Track dental lab orders and deliveries',
  },

  // ── Actions ──────────────────────────────────────────
  actions: {
    newLabOrder: 'New Lab Order',
    sendToLab: 'Send to Lab',
    markInProgress: 'Mark In Progress',
    markReady: 'Mark Ready',
    markDelivered: 'Mark Delivered',
    cancel: 'Cancel',
    reject: 'Reject',
    reopenAsDraft: 'Reopen as Draft',
  },

  // ── Filters / Search ────────────────────────────────
  search: {
    placeholder: 'Search by order #, description...',
  },
  filters: {
    allStatuses: 'All Statuses',
  },

  // ── Columns ──────────────────────────────────────────
  columns: {
    orderNumber: 'Order #',
    description: 'Description',
    materialShade: 'Material / Shade',
    status: 'Status',
    expected: 'Expected',
    cost: 'Cost',
    ordered: 'Ordered',
  },

  // ── Status ───────────────────────────────────────────
  status: {
    draft: 'Draft',
    sent: 'Sent',
    inProgress: 'In Progress',
    ready: 'Ready',
    delivered: 'Delivered',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  },

  // ── Cell Text ────────────────────────────────────────
  cell: {
    teeth: 'Teeth:',
    shade: 'Shade:',
    overdue: '(overdue)',
    paid: 'Paid',
  },

  // ── Empty / Error ────────────────────────────────────
  empty: {
    title: 'No lab orders found',
    description: 'Lab orders will appear here once created from treatment plans.',
  },
  error: {
    loadFailed: 'Failed to load lab orders',
  },

  // ── Toasts ───────────────────────────────────────────
  toast: {
    statusUpdated: 'Status updated to {{status}}',
    statusUpdateFailed: 'Failed to update status',
    created: 'Lab order created',
    createFailed: 'Failed to create lab order',
  },

  // ── Stats ────────────────────────────────────────────────
  stats: {
    total: 'Total Orders',
    inProgress: 'In Progress',
    ready: 'Ready for Pickup',
    overdue: 'Overdue',
  },

  // ── Detail Page ──────────────────────────────────
  detail: {
    subtitle: 'Lab order details',
    back: 'Back to Lab Orders',
    statusDates: 'Status & Dates',
    clinicalDetails: 'Clinical Details',
    financial: 'Financial',
    paymentStatus: 'Payment',
    unpaid: 'Unpaid',
    notes: 'Notes & Instructions',
    actualDelivery: 'Actual Delivery',
    tryInDate: 'Try-in Date',
    tryInNotes: 'Try-in Notes',
    adjustmentRequired: 'Adjustment Required',
    adjustmentNotes: 'Adjustment Notes',
    statusNotes: 'Status Notes',
    noNotes: 'No notes recorded',
    yes: 'Yes',
  },

  // ── Form ─────────────────────────────────────────────
  form: {
    createTitle: 'New Lab Order',
    editTitle: 'Edit Lab Order',
    patient: 'Patient',
    doctor: 'Doctor',
    branch: 'Branch',
    dentalLab: 'Dental Lab',
    selectLab: 'Select lab…',
    searchLab: 'Search labs…',
    noLabsFound: 'No dental labs found.',
    orderType: 'Order Type',
    selectType: 'Select type…',
    searchType: 'Search types…',
    noTypesFound: 'No order types found.',
    toothNumbers: 'Tooth Numbers',
    toothNumbersHint: 'Comma-separated (e.g. 11, 12, 21)',
    shade: 'Shade',
    selectShade: 'Select shade…',
    searchShade: 'Search shades…',
    noShadesFound: 'No shades found.',
    material: 'Material',
    selectMaterial: 'Select material…',
    searchMaterial: 'Search materials…',
    noMaterialsFound: 'No materials found.',
    scan: '3D Scan',
    selectScan: 'Select scan…',
    searchScan: 'Search scans…',
    noScansFound: 'No scans for this patient.',
    description: 'Description',
    descriptionPlaceholder: 'Describe the work needed…',
    specialInstructions: 'Special Instructions',
    specialInstructionsPlaceholder: 'Any special lab instructions…',
    expectedDelivery: 'Expected Delivery',
    cost: 'Cost',
  },
} as const;
