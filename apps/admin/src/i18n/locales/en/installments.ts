export const installments = {
  // ── Page ─────────────────────────────────────────────
  page: {
    title: 'Installment Plans',
    description: 'Manage patient payment installment plans',
  },

  // ── Actions ──────────────────────────────────────────
  actions: {
    exportCsv: 'Export CSV',
    newPlan: 'New Plan',
    back: 'Back',
    cancelPlan: 'Cancel Plan',
    record: 'Record',
    waive: 'Waive',
    createPlan: 'Create Plan',
    viewDetails: 'View Details',
  },

  // ── Filters / Search ────────────────────────────────
  search: {
    placeholder: 'Search by plan # or patient...',
  },
  filters: {
    allStatuses: 'All Statuses',
    active: 'Active',
    completed: 'Completed',
    defaulted: 'Defaulted',
    cancelled: 'Cancelled',
    to: 'to',
  },

  // ── Columns ──────────────────────────────────────────
  columns: {
    planNumber: 'Plan #',
    patient: 'Patient',
    total: 'Total',
    remaining: 'Remaining',
    progress: 'Progress',
    nextDue: 'Next Due',
    paymentStatus: 'Payment Status',
    frequency: 'Frequency',
    status: 'Status',
    startDate: 'Start Date',
  },

  // ── Status ───────────────────────────────────────────
  status: {
    active: 'Active',
    completed: 'Completed',
    defaulted: 'Defaulted',
    cancelled: 'Cancelled',
    partial: 'Partial',
  },

  // ── Payment Status ────────────────────────────────────
  paymentStatus: {
    pending: 'Pending',
    paid: 'Paid',
    overdue: 'Overdue',
    partiallyPaid: 'Partially Paid',
    waived: 'Waived',
  },

  // ── Frequency ────────────────────────────────────────
  frequency: {
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    biweeklyAlt: 'Biweekly',
    monthly: 'Monthly',
  },

  // ── Timeliness ───────────────────────────────────────
  timeliness: {
    onTime: 'On Time',
    late: 'Late',
    fullyPaid: 'Fully Paid',
    cancelled: 'Cancelled',
    waived: 'Waived',
    upcoming: 'Upcoming',
  },

  // ── Summary ──────────────────────────────────────────
  summary: {
    totalPlanned: 'Total Planned:',
    totalRemaining: 'Total Remaining:',
  },

  // ── Empty / Error ────────────────────────────────────
  empty: {
    title: 'No installment plans found',
    description: 'Create a new installment plan for a patient.',
  },
  error: {
    loadFailed: 'Failed to load installment plans',
  },

  // ── Detail Page ──────────────────────────────────────
  detail: {
    cards: {
      patient: 'Patient',
      financials: 'Financials',
      progress: 'Progress',
    },
    labels: {
      total: 'Total',
      downPayment: 'Down Payment',
      remaining: 'Remaining',
      payments: 'Payments',
      frequency: 'Frequency',
    },
    paymentSchedule: 'Payment Schedule',
    scheduleColumns: {
      number: '#',
      dueDate: 'Due Date',
      amount: 'Amount',
      paid: 'Paid',
      status: 'Status',
      timeliness: 'Timeliness',
      action: 'Action',
    },
    notes: 'Notes',
  },

  // ── Dialogs ──────────────────────────────────────────
  dialog: {
    cancelTitle: 'Cancel installment plan?',
    cancelDescription: 'Outstanding payments will not be collected.',
    cancelConfirm: 'Cancel Plan',
  },

  // ── Toasts ───────────────────────────────────────────
  toast: {
    paymentRecorded: 'Payment recorded',
    paymentRecordFailed: 'Failed to record payment',
    paymentWaived: 'Payment waived',
    paymentWaiveFailed: 'Failed to waive payment',
    planCancelled: 'Installment plan cancelled',
    planCancelFailed: 'Failed to cancel plan',
    planCreated: 'Installment plan created',
    planCreateFailed: 'Failed to create plan',
  },

  // ── Form ─────────────────────────────────────────────
  form: {
    title: 'New Installment Plan',
    description: 'Create a payment plan for a patient',
    labels: {
      patient: 'Patient *',
      invoice: 'Invoice',
      totalAmount: 'Total Amount *',
      downPayment: 'Down Payment',
      numberOfInstallments: '# of Installments *',
      frequency: 'Frequency',
      startDate: 'Start Date *',
      notes: 'Notes',
    },
    summary: {
      totalAmount: 'Total Amount',
      downPayment: 'Down Payment',
      remaining: 'Remaining',
      perInstallment: 'Per Installment',
    },
    notesPlaceholder: 'Additional notes…',
    validation: {
      totalAmountRequired: 'Total amount is required',
      totalAmountPositive: 'Total amount must be greater than 0',
      downPaymentRequired: 'Down payment is required',
      downPaymentNonNegative: 'Down payment cannot be negative',
      numberOfInstallmentsRequired: 'Number of installments is required',
      atLeastOneInstallment: 'At least 1 installment',
      maximumInstallments: 'Maximum 24 installments',
      startDateRequired: 'Start date is required',
    },
  },

  // ── Record Payment Dialog ────────────────────────────
  recordPayment: {
    title: 'Record Payment — Installment #{{number}}',
    dueAmount: 'Due Amount',
    alreadyPaid: 'Already Paid',
    remaining: 'Remaining',
    paymentAmount: 'Payment Amount',
    cancel: 'Cancel',
    fullAmount: 'Full ({{amount}})',
    halfAmount: 'Half ({{amount}})',
    notesOptional: 'Notes (optional)',
    notesPlaceholder: 'e.g. Paid via bank transfer, ref #12345',
    exceedsBalance: 'Amount cannot exceed remaining balance of {{amount}}',
    partialWarning: 'Partial payment — {{amount}} will remain outstanding',
    recordAmount: 'Record {{amount}}',
    enterAdjustment: 'Enter an adjustment quantity and reason',
  },
} as const;
