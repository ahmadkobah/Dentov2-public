export const documents = {
  // ── Treatment Plan Template ──────────────────────────
  treatmentPlan: {
    title: 'TREATMENT PLAN',
    patient: 'Patient:',
    age: 'Age:',
    fileNumber: 'File #:',
    diagnosis: 'Diagnosis:',
    columns: {
      number: '#',
      procedure: 'Procedure',
      tooth: 'Tooth',
      surface: 'Surface',
      status: 'Status',
      cost: 'Cost',
      discount: 'Discount',
      net: 'Net',
    },
    status: {
      pending: 'Pending',
      approved: 'Approved',
      inProgress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
    totals: {
      totalCost: 'Total Cost:',
      discount: 'Discount:',
      grandTotal: 'Grand Total:',
    },
    notes: 'Notes:',
    patientSignature: 'Patient Signature',
  },

  // ── Prescription Template ────────────────────────────
  prescription: {
    title: '℞ PRESCRIPTION',
    date: 'Date:',
    patient: 'Patient:',
    age: 'Age:',
    gender: 'Gender:',
    fileNumber: 'File #:',
    diagnosis: 'Diagnosis:',
    columns: {
      number: '#',
      medication: 'Medication',
      dosage: 'Dosage',
      frequency: 'Frequency',
      duration: 'Duration',
      instructions: 'Instructions',
    },
    notes: 'Notes:',
    license: 'License:',
  },

  // ── Lab Order Template ───────────────────────────────
  labOrder: {
    title: 'LAB ORDER',
    orderDate: 'Order Date:',
    expected: 'Expected:',
    patient: 'Patient',
    dentalLab: 'Dental Lab',
    fileNumber: 'File #:',
    orderType: 'Order Type:',
    toothTeeth: 'Tooth/Teeth:',
    shade: 'Shade:',
    material: 'Material:',
    description: 'Description:',
    specialInstructions: 'Special Instructions:',
    cost: 'Cost:',
  },

  // ── Invoice Template ─────────────────────────────────
  invoice: {
    title: 'INVOICE',
    date: 'Date:',
    due: 'Due:',
    billTo: 'Bill To:',
    fileNumber: 'File #:',
    columns: {
      description: 'Description',
      tooth: 'Tooth',
      qty: 'Qty',
      unitPrice: 'Unit Price',
      discount: 'Discount',
      total: 'Total',
    },
    totals: {
      subtotal: 'Subtotal:',
      discount: 'Discount:',
      tax: 'Tax:',
      total: 'Total:',
      amountPaid: 'Amount Paid:',
      balanceDue: 'Balance Due:',
    },
    notes: 'Notes:',
    thankYou: 'Thank you for choosing {{clinicName}}',
  },

  // ── Consent Form Template ────────────────────────────
  consentForm: {
    title: 'CONSENT FORM',
    date: 'Date:',
    patient: 'Patient:',
    age: 'Age:',
    fileNumber: 'File #:',
    risksTitle: 'Possible Risks & Complications:',
    consentStatement:
      'I, the undersigned, hereby consent to the above dental procedure(s). I have been informed of the nature of the procedure(s), the expected benefits, possible risks and complications, and alternative treatments. I have had the opportunity to ask questions and all my questions have been answered to my satisfaction.',
    patientSignature: 'Patient Signature',
    witness: 'Witness',
    treatingDoctor: 'Treating Doctor:',
  },
} as const;
