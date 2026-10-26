export const payments = {
  // Page
  'payments.title': 'Payments',
  'payments.subtitle': 'Track and manage patient payments',
  'payments.recordPayment': 'Record Payment',

  // Summary cards
  'payments.summary.totalBilled': 'Total Billed',
  'payments.summary.collected': 'Collected',
  'payments.summary.refunded': 'Refunded',
  'payments.summary.transactions': 'Transactions',

  // Table columns
  'payments.col.invoice': 'Invoice',
  'payments.col.patient': 'Patient',
  'payments.col.amount': 'Amount',
  'payments.col.method': 'Method',
  'payments.col.status': 'Status',
  'payments.col.reference': 'Reference',
  'payments.col.date': 'Date',

  // Payment methods
  'payments.method.cash': 'Cash',
  'payments.method.card': 'Card',
  'payments.method.bankTransfer': 'Bank Transfer',
  'payments.method.cheque': 'Cheque',
  'payments.method.insurance': 'Insurance',
  'payments.method.online': 'Online',
  'payments.method.fawry': 'Fawry',
  'payments.method.meeza': 'Meeza',

  // Status labels
  'payments.status.pending': 'Pending',
  'payments.status.completed': 'Completed',
  'payments.status.failed': 'Failed',
  'payments.status.refunded': 'Refunded',

  // Filters
  'payments.filter.allStatuses': 'All Statuses',
  'payments.filter.allMethods': 'All Methods',
  'payments.filter.search': 'Search payments…',

  // Actions
  'payments.action.viewDetails': 'View Details',
  'payments.action.refund': 'Refund',

  // Confirm dialog
  'payments.confirm.refundTitle': 'Refund payment?',
  'payments.confirm.refundMessage':
    'Refund {{amount}} to the patient. This action cannot be undone.',

  // Toast
  'payments.toast.refunded': 'Payment refunded',
  'payments.toast.refundFailed': 'Failed to refund payment',
  'payments.toast.recorded': 'Payment recorded successfully',
  'payments.toast.recordFailed': 'Failed to record payment',

  // Empty state
  'payments.empty.title': 'No payments found',
  'payments.empty.description': 'Record a payment to get started.',

  // Record Payment Page
  'payments.record.title': 'Record Payment',
  'payments.record.subtitle': 'Record a payment against an invoice',
  'payments.record.back': 'Back',

  // Payment Detail Page
  'payments.detail.title': 'Payment Details',
  'payments.detail.info': 'Payment Information',
  'payments.detail.amount': 'Amount',
  'payments.detail.method': 'Method',
  'payments.detail.invoice': 'Invoice',
  'payments.detail.receivedAt': 'Received At',
  'payments.detail.created': 'Created',
  'payments.detail.reference': 'Reference',
  'payments.detail.cardBrand': 'Card Brand',
  'payments.detail.lastFourDigits': 'Last 4 Digits',
  'payments.detail.refundButton': 'Refund Payment',
  'payments.detail.refundPrompt':
    'Please provide a reason for this refund. This action cannot be undone.',
  'payments.detail.reason': 'Reason',
  'payments.detail.reasonPlaceholder': 'Enter refund reason…',
  'payments.detail.cancel': 'Cancel',
  'payments.detail.confirmRefund': 'Confirm Refund',
  'payments.detail.refunding': 'Refunding…',
  'payments.detail.refundedLabel': 'Refunded',
  'payments.detail.refundedOn': 'Refunded on {{date}}',
  'payments.detail.refundReason': 'Reason: {{reason}}',
  'payments.detail.notes': 'Notes',

  // Payment Form
  'payments.form.invoice': 'Invoice',
  'payments.form.amount': 'Amount',
  'payments.form.paymentMethod': 'Payment Method',
  'payments.form.reference': 'Reference',
  'payments.form.transactionId': 'Transaction ID',
  'payments.form.notes': 'Notes',
  'payments.form.referencePlaceholder': 'Optional reference number',
  'payments.form.notesPlaceholder': 'Optional notes…',
  'payments.form.paymentAmount': 'Payment Amount',
  'payments.form.submit': 'Record Payment',

  // Payment Method Selector
  'payments.methodSelector.placeholder': 'Select method',

  // Reconciliation Page
  'payments.reconciliation.title': 'Daily Reconciliation',
  'payments.reconciliation.subtitle': 'End-of-day payment reconciliation by branch',
  'payments.reconciliation.col.date': 'Date',
  'payments.reconciliation.col.status': 'Status',
  'payments.reconciliation.col.cash': 'Cash',
  'payments.reconciliation.col.card': 'Card',
  'payments.reconciliation.col.online': 'Online',
  'payments.reconciliation.col.expected': 'Expected',
  'payments.reconciliation.col.discrepancy': 'Discrepancy',
  'payments.reconciliation.openToday': 'Open Today',
  'payments.reconciliation.toast.opened': 'Reconciliation opened for today',
  'payments.reconciliation.toast.openFailed': 'Failed to open reconciliation',
  'payments.reconciliation.toast.closed': 'Reconciliation closed',
  'payments.reconciliation.toast.closeFailed': 'Failed to close reconciliation',
  'payments.reconciliation.toast.reviewed': 'Reconciliation reviewed',
  'payments.reconciliation.toast.reviewFailed': 'Failed to review reconciliation',
  'payments.reconciliation.action.close': 'Close',
  'payments.reconciliation.action.markReviewed': 'Mark Reviewed',
  'payments.reconciliation.empty.title': 'No reconciliations found',
  'payments.reconciliation.empty.description': 'Open a daily reconciliation to start tracking.',

  // Receipt PDF
  'payments.receipt.title': 'Payment Receipt',
  'payments.receipt.patient': 'Patient',
  'payments.receipt.invoice': 'Invoice',
  'payments.receipt.method': 'Method',
  'payments.receipt.status': 'Status',
  'payments.receipt.reference': 'Reference',
  'payments.receipt.card': 'Card',
  'payments.receipt.date': 'Date',
  'payments.receipt.amountPaid': 'Amount Paid',
  'payments.receipt.notes': 'Notes',
  'payments.receipt.thankYou': 'Thank you for your payment',
  'payments.receipt.btn': 'Receipt PDF',
  'payments.receipt.generating': 'Generating...',
};
