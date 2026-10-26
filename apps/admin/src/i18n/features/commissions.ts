export const commissions = {
  // ── Page ──
  'commissions.title': 'Doctor Commissions',
  'commissions.subtitle': 'Track commissions and process payouts',
  'commissions.approveAllBtn': 'Approve All Pending ({{count}})',
  'commissions.exportCsv': 'Export CSV',

  // Tabs
  'commissions.tab.commissions': 'Commissions',
  'commissions.tab.payouts': 'Payouts',

  // Commissions filter
  'commissions.filter.allStatuses': 'All Statuses',
  'commissions.filter.pending': 'Pending',
  'commissions.filter.approved': 'Approved',
  'commissions.filter.paid': 'Paid',
  'commissions.filter.cancelled': 'Cancelled',

  // Payouts filter
  'commissions.payouts.filter.draft': 'Draft',
  'commissions.payouts.filter.processed': 'Processed',
  'commissions.payouts.filter.cancelled': 'Cancelled',

  // Commission columns
  'commissions.col.doctor': 'Doctor',
  'commissions.col.invoice': 'Invoice',
  'commissions.col.rate': 'Rate',
  'commissions.col.invoiceAmt': 'Invoice Amt',
  'commissions.col.commission': 'Commission',
  'commissions.col.status': 'Status',
  'commissions.col.created': 'Created',

  // Payout columns
  'commissions.payouts.col.payoutNumber': 'Payout #',
  'commissions.payouts.col.doctor': 'Doctor',
  'commissions.payouts.col.total': 'Total',
  'commissions.payouts.col.method': 'Method',
  'commissions.payouts.col.items': 'Items',
  'commissions.payouts.col.status': 'Status',
  'commissions.payouts.col.created': 'Created',

  // Actions
  'commissions.action.approve': 'Approve',
  'commissions.action.process': 'Process',

  // Empty / Error
  'commissions.empty.title': 'No commissions found',
  'commissions.empty.desc': 'Commissions will appear when invoices are created.',
  'commissions.payouts.empty.title': 'No payouts found',
  'commissions.payouts.empty.desc': 'Create a payout to process approved commissions.',
  'commissions.error.load': 'Failed to load commissions',
  'commissions.payouts.error.load': 'Failed to load payouts',

  // Toast
  'commissions.toast.approved': 'Commission approved',
  'commissions.toast.bulkApproved': 'All pending commissions approved',
  'commissions.toast.processed': 'Payout processed',
  'commissions.toast.payoutCreated': 'Payout created',
  'commissions.toast.approveFailed': 'Failed to approve commission',
  'commissions.toast.bulkApproveFailed': 'Failed to approve commissions',
  'commissions.toast.processFailed': 'Failed to process payout',
  'commissions.toast.payoutFailed': 'Failed to create payout',

  // ── Detail Page ──
  'commissions.detail.title': 'Commission Details',
  'commissions.detail.backBtn': 'Back',
  'commissions.detail.approveBtn': 'Approve',
  'commissions.detail.cardTitle': 'Commission Information',
  'commissions.detail.invoiceAmount': 'Invoice Amount',
  'commissions.detail.commissionRate': 'Commission Rate',
  'commissions.detail.commissionAmount': 'Commission Amount',
  'commissions.detail.invoice': 'Invoice',
  'commissions.detail.created': 'Created',
  'commissions.detail.approved': 'Approved',
  'commissions.detail.paid': 'Paid',
  'commissions.detail.payoutId': 'Payout ID',
  'commissions.detail.notes': 'Notes',

  // Summary cards
  'commissions.summary.pending': 'Pending',
  'commissions.summary.approved': 'Approved',
  'commissions.summary.paidOut': 'Paid Out',

  // ── Approval Form ──
  'commissions.approval.titleSingle': 'Approve Commission',
  'commissions.approval.titleBulk': 'Approve {{count}} Commissions',
  'commissions.approval.doctor': 'Doctor',
  'commissions.approval.invoice': 'Invoice',
  'commissions.approval.rate': 'Rate',
  'commissions.approval.commission': 'Commission',
  'commissions.approval.commissionsCount': 'Commissions',
  'commissions.approval.totalAmount': 'Total Amount',
  'commissions.approval.notes': 'Approval Notes (optional)',
  'commissions.approval.notesPlaceholder': 'Add notes about this approval...',
  'commissions.approval.cancelBtn': 'Cancel',
  'commissions.approval.approveBtn': 'Approve',

  // ── Create Payout Dialog ──
  'commissions.payout.triggerBtn': 'Create Payout',
  'commissions.payout.title': 'Create Commission Payout',
  'commissions.payout.doctor': 'Doctor',
  'commissions.payout.paymentMethod': 'Payment Method',
  'commissions.payout.reference': 'Reference',
  'commissions.payout.notes': 'Notes',
  'commissions.payout.cancelBtn': 'Cancel',
  'commissions.payout.submitBtn': 'Create Payout',

  // Payment methods
  'commissions.payout.method.cash': 'Cash',
  'commissions.payout.method.bankTransfer': 'Bank Transfer',
  'commissions.payout.method.cheque': 'Cheque',
} as const;
