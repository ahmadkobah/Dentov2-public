export const insurance = {
  // ── Companies Page ───────────────────────────────────
  companies: {
    page: {
      title: 'Insurance Companies',
      description: 'Manage insurance company providers and coverage settings',
    },
    actions: {
      exportCsv: 'Export CSV',
      addCompany: 'Add Company',
      edit: 'Edit',
      deactivate: 'Deactivate',
    },
    search: {
      placeholder: 'Search by name, code...',
    },
    columns: {
      companyName: 'Company Name',
      code: 'Code',
      coveragePercent: 'Coverage %',
      maxCoverage: 'Max Coverage',
      contact: 'Contact',
      status: 'Status',
      created: 'Created',
    },
    status: {
      active: 'Active',
      inactive: 'Inactive',
    },
    dialog: {
      deactivateTitle: 'Deactivate insurance company?',
    },
    toast: {
      deactivated: 'Insurance company deactivated',
      deactivateFailed: 'Failed to deactivate company',
    },
    empty: {
      title: 'No insurance companies found',
      description: 'Add an insurance company to get started.',
    },
    error: {
      loadFailed: 'Failed to load insurance companies',
    },
  },

  // ── Company Detail Page ──────────────────────────────
  companyDetail: {
    actions: {
      back: 'Back',
      edit: 'Edit',
    },
    title: 'Company Details',
    labels: {
      nameEnglish: 'Name (English)',
      nameArabic: 'Name (Arabic)',
      code: 'Code',
      contactPerson: 'Contact Person',
      phone: 'Phone',
      email: 'Email',
      defaultCoverage: 'Default Coverage',
      maxCoverage: 'Max Coverage',
      created: 'Created',
      lastUpdated: 'Last Updated',
    },
    quickActions: {
      title: 'Quick Actions',
      viewClaims: 'View Claims',
      newClaim: 'New Claim',
    },
    error: {
      loadFailed: 'Failed to load company',
    },
  },

  // ── Company Form Page ────────────────────────────────
  companyForm: {
    createTitle: 'New Insurance Company',
    createDescription: 'Add a new insurance company',
    editTitle: 'Edit {{name}}',
    editDescription: 'Update company details',
    actions: {
      back: 'Back',
      create: 'Create Company',
      update: 'Update Company',
    },
    labels: {
      companyName: 'Company Name',
      nameEnglish: 'Name (English) *',
      nameArabic: 'Name (Arabic)',
      companyCode: 'Company Code *',
      contactPerson: 'Contact Person',
      phone: 'Phone',
      email: 'Email',
      defaultCoveragePercent: 'Default Coverage %',
      maxCoverageAmount: 'Max Coverage Amount',
    },
    placeholders: {
      nameEnglish: 'Company name in English',
      companyCode: 'Unique code (e.g., BUPA, AXA)',
      contactPerson: 'Name',
      email: 'claims@company.com',
      maxCoverage: '0 = unlimited',
    },
    toast: {
      updated: 'Company updated',
      created: 'Company created',
      updateFailed: 'Update failed',
      createFailed: 'Create failed',
    },
    validation: {
      nameRequired: 'English name is required',
      invalidEmail: 'Invalid email address',
      coverageRequired: 'Coverage percentage is required',
      cannotBeNegative: 'Cannot be negative',
      cannotExceed100: 'Cannot exceed 100%',
      maxCoverageRequired: 'Max coverage is required',
    },
  },

  // ── Claims Page ──────────────────────────────────────
  claims: {
    page: {
      title: 'Insurance Claims',
      description: 'Track and manage insurance claim submissions',
    },
    actions: {
      exportCsv: 'Export CSV',
      newClaim: 'New Claim',
      viewDetails: 'View Details',
    },
    columns: {
      claimNumber: 'Claim #',
      patient: 'Patient',
      claimed: 'Claimed',
      approved: 'Approved',
      patientResponsibility: 'Patient Resp.',
      status: 'Status',
      claimDate: 'Claim Date',
    },
    filters: {
      allStatuses: 'All Statuses',
      pending: 'Pending',
      submitted: 'Submitted',
      underReview: 'Under Review',
      approved: 'Approved',
      denied: 'Denied',
      appealed: 'Appealed',
      to: 'to',
      searchPlaceholder: 'Search by claim # or patient name...',
    },
    summary: {
      totalClaimed: 'Total Claimed:',
      approved: 'Approved:',
      patientResponsibility: 'Patient Responsibility:',
    },
    empty: {
      title: 'No insurance claims found',
      description: 'Create a new claim to get started.',
    },
    error: {
      loadFailed: 'Failed to load claims',
    },
  },

  // ── Claim Detail Page ────────────────────────────────
  claimDetail: {
    actions: {
      back: 'Back',
      submit: 'Submit',
      startReview: 'Start Review',
      approve: 'Approve',
      deny: 'Deny',
      appeal: 'Appeal',
    },
    sections: {
      patientInformation: 'Patient Information',
      financialDetails: 'Financial Details',
      documents: 'Documents',
    },
    labels: {
      patient: 'Patient',
      serviceDate: 'Service Date',
      totalAmount: 'Total Amount',
      claimedAmount: 'Claimed Amount',
      approvedAmount: 'Approved Amount',
      patientResponsibility: 'Patient Responsibility',
      denialReason: 'Denial Reason',
    },
    documents: {
      view: 'View',
      noDocuments: 'No documents attached',
    },
    toast: {
      statusUpdated: 'Claim status updated to {{status}}',
      statusUpdateFailed: 'Failed to update claim status',
    },
    error: {
      loadFailed: 'Failed to load claim',
    },
  },

  // ── Create Claim Page ────────────────────────────────
  createClaim: {
    page: {
      title: 'New Insurance Claim',
      description: 'File a new insurance claim',
    },
    actions: {
      back: 'Back',
      submit: 'Submit Claim',
    },
    labels: {
      patient: 'Patient *',
      invoice: 'Invoice',
      claimDate: 'Claim Date *',
      serviceDate: 'Service Date *',
      totalAmount: 'Total Amount *',
      claimedAmount: 'Claimed Amount *',
      notes: 'Notes',
    },
    toast: {
      created: 'Insurance claim created',
      createFailed: 'Failed to create claim',
    },
    validation: {
      claimDateRequired: 'Claim date is required',
      serviceDateRequired: 'Service date is required',
    },
  },

  // ── Claim Timeline ───────────────────────────────────
  timeline: {
    steps: {
      pending: 'Pending',
      submitted: 'Submitted',
      underReview: 'Under Review',
      approved: 'Approved',
      paid: 'Paid',
    },
    terminal: {
      denied: 'Denied',
      appealed: 'Appealed',
      partiallyApproved: 'Partially Approved',
    },
  },

  // ── Claim Status Badge ───────────────────────────────
  statusBadge: {
    pending: 'Pending',
    submitted: 'Submitted',
    underReview: 'Under Review',
    approved: 'Approved',
    partiallyApproved: 'Partially Approved',
    denied: 'Denied',
    appealed: 'Appealed',
    paid: 'Paid',
  },
} as const;
