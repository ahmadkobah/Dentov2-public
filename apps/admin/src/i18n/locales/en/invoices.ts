export const invoices = {
  // ── List Page ────────────────────────────────────────
  list: {
    page: {
      title: 'Invoices',
      description: 'Manage patient invoices and billing',
    },
    actions: {
      exportCsv: 'Export CSV',
      newInvoice: 'New Invoice',
      viewDetails: 'View Details',
      edit: 'Edit',
      issueInvoice: 'Issue Invoice',
      recordPayment: 'Record Payment',
      cancel: 'Cancel',
    },
    stats: {
      totalRevenue: 'Total Revenue',
      invoices: 'invoices',
      collected: 'Collected',
      outstanding: 'Outstanding',
      last30Days: 'Last 30 Days',
    },
    search: {
      placeholder: 'Search by invoice #, patient...',
    },
    filters: {
      allStatuses: 'All Statuses',
      draft: 'Draft',
      issued: 'Issued',
      installment: 'Installment',
      paid: 'Paid',
      partiallyPaid: 'Partially Paid',
      overdue: 'Overdue',
      cancelled: 'Cancelled',
      refunded: 'Refunded',
    },
    columns: {
      invoiceNumber: 'Invoice #',
      patient: 'Patient',
      total: 'Total',
      balanceDue: 'Balance Due',
      status: 'Status',
      dueDate: 'Due Date',
      created: 'Created',
    },
    toast: {
      issued: 'Invoice issued',
      issueFailed: 'Failed to issue invoice',
      cancelled: 'Invoice cancelled',
      cancelFailed: 'Failed to cancel invoice',
    },
    empty: {
      title: 'No invoices found',
      description: 'Create a new invoice to get started.',
    },
    error: {
      loadFailed: 'Failed to load invoices',
    },
    confirm: {
      cancelTitle: 'Cancel invoice?',
      cancelLabel: 'Cancel Invoice',
    },
    doctorFilter: {
      allDoctors: 'All Doctors',
      doctor: 'Doctor',
    },
  },

  // ── Form Page ────────────────────────────────────────
  formPage: {
    createTitle: 'New Invoice',
    editTitle: 'Edit Invoice {{number}}',
    createDescription: 'Create a new invoice',
    editDescription: 'Update invoice details (draft only)',
    actions: {
      back: 'Back',
    },
    error: {
      loadFailed: 'Failed to load invoice. Please go back and try again.',
    },
    toast: {
      updated: 'Invoice updated',
      created: 'Invoice created',
      updateFailed: 'Update failed',
      createFailed: 'Create failed',
    },
  },

  // ── Invoice Form Component ───────────────────────────
  form: {
    labels: {
      patient: 'Patient *',
      branch: 'Branch *',
      doctor: 'Treating Doctor',
      currency: 'Currency',
      dueDate: 'Due Date',
      discountPercent: 'Discount %',
      taxPercent: 'Tax %',
      notes: 'Notes',
      termsAndConditions: 'Terms & Conditions',
    },
    placeholders: {
      notes: 'Internal notes…',
      terms: 'Payment terms…',
      description: 'Description',
      toothNumber: '#',
    },
    lineItems: {
      title: 'Line Items',
      addItem: 'Add Item',
      columns: {
        description: 'Description',
        tooth: 'Tooth',
        qty: 'Qty',
        unitPrice: 'Unit Price',
        discount: 'Discount',
      },
    },
    totals: {
      subtotal: 'Subtotal',
      discount: 'Discount ({{percent}}%)',
      tax: 'Tax ({{percent}}%)',
      total: 'Total',
    },
    actions: {
      createInvoice: 'Create Invoice',
      updateInvoice: 'Update Invoice',
    },
    validation: {
      descriptionRequired: 'Description is required',
      qtyRequired: 'Required',
      qtyMin: 'Min 1',
      cannotBeNegative: 'Cannot be negative',
      atLeastOneItem: 'At least one line item is required',
      invalidDate: 'Invalid date',
    },
  },

  // ── Detail Page ──────────────────────────────────────
  detail: {
    title: 'Invoice {{number}}',
    description: 'Patient: {{name}}',
    actions: {
      back: 'Back',
      print: 'Print',
      email: 'Email',
      edit: 'Edit',
      issue: 'Issue',
      recordPayment: 'Record Payment',
      refund: 'Refund',
      cancel: 'Cancel',
    },
    sections: {
      invoiceDetails: 'Invoice Details',
      lineItems: 'Line Items',
      insurance: 'Insurance',
    },
    labels: {
      issueDate: 'Issue Date',
      dueDate: 'Due Date',
      created: 'Created',
      currency: 'Currency',
    },
    columns: {
      description: 'Description',
      tooth: 'Tooth',
      qty: 'Qty',
      unitPrice: 'Unit Price',
      discount: 'Discount',
      total: 'Total',
    },
    totals: {
      subtotal: 'Subtotal',
      discount: 'Discount',
      tax: 'Tax',
      total: 'Total',
      amountPaid: 'Amount Paid',
      balanceDue: 'Balance Due',
    },
    other: {
      notes: 'Notes',
      termsAndConditions: 'Terms & Conditions',
      insuredAmount: 'Insured Amount',
      patientResponsibility: 'Patient Responsibility',
    },
    toast: {
      issued: 'Invoice issued successfully',
      issueFailed: 'Failed to issue invoice',
      cancelled: 'Invoice cancelled',
      cancelFailed: 'Failed to cancel invoice',
      emailed: 'Invoice emailed successfully',
      emailFailed: 'Failed to send invoice email',
    },
  },

  // ── Status Badge ─────────────────────────────────────
  statusBadge: {
    draft: 'Draft',
    issued: 'Issued',
    installment: 'Installment',
    paid: 'Paid',
    partiallyPaid: 'Partially Paid',
    partial: 'Partial',
    overdue: 'Overdue',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  },

  // ── PDF ──────────────────────────────────────────────
  pdf: {
    title: 'INVOICE',
    patient: 'Patient:',
    issueDate: 'Issue Date:',
    dueDate: 'Due Date:',
    currency: 'Currency:',
    itemsTitle: 'Items',
    columns: {
      description: 'Description',
      qty: 'Qty',
      unitPrice: 'Unit Price',
      discount: 'Discount',
      total: 'Total',
    },
    totals: {
      subtotal: 'Subtotal',
      discount: 'Discount',
      tax: 'Tax',
      total: 'Total',
      amountPaid: 'Amount Paid',
      balanceDue: 'Balance Due',
    },
    insurance: {
      title: 'Insurance',
      insuredAmount: 'Insured Amount',
      patientResponsibility: 'Patient Responsibility',
    },
    notes: 'Notes',
    termsAndConditions: 'Terms & Conditions',
    generatedOn: 'Generated on {{date}} • Invoice {{number}}',
    downloadPdf: 'Download PDF',
    generating: 'Generating...',
    toothNumber: 'Tooth #{{number}}',
  },
} as const;
