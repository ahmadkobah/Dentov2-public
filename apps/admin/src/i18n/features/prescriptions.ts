export const prescriptions = {
  // Page
  'prescriptions.title': 'Prescriptions',
  'prescriptions.subtitle': 'Manage patient prescriptions',

  // Tabs
  'prescriptions.tab.prescriptions': 'Prescriptions',
  'prescriptions.tab.medications': 'Medications',

  // Table columns
  'prescriptions.col.rxNumber': 'Rx #',
  'prescriptions.col.patient': 'Patient',
  'prescriptions.col.items': 'Items',
  'prescriptions.col.diagnosis': 'Diagnosis',
  'prescriptions.col.status': 'Status',
  'prescriptions.col.date': 'Date',

  // Search & filters
  'prescriptions.search': 'Search by Rx #, diagnosis...',
  'prescriptions.filter.allStatuses': 'All Statuses',
  'prescriptions.filter.draft': 'Draft',
  'prescriptions.filter.active': 'Active',
  'prescriptions.filter.dispensed': 'Dispensed',
  'prescriptions.filter.cancelled': 'Cancelled',

  // Actions
  'prescriptions.newPrescription': 'New Prescription',
  'prescriptions.action.view': 'View',
  'prescriptions.action.edit': 'Edit',
  'prescriptions.action.print': 'Print',
  'prescriptions.action.activate': 'Activate',
  'prescriptions.action.markDispensed': 'Mark Dispensed',
  'prescriptions.action.cancel': 'Cancel',
  'prescriptions.action.delete': 'Delete',

  // Toast
  'prescriptions.toast.deleted': 'Prescription deleted',
  'prescriptions.toast.deleteFailed': 'Failed to delete prescription',
  'prescriptions.toast.statusUpdated': 'Status updated to {{status}}',
  'prescriptions.toast.statusUpdateFailed': 'Failed to update status',
  'prescriptions.toast.created': 'Prescription created',
  'prescriptions.toast.createFailed': 'Failed to create prescription',
  'prescriptions.toast.updated': 'Prescription updated',
  'prescriptions.toast.updateFailed': 'Failed to update prescription',

  // Empty state
  'prescriptions.empty.title': 'No prescriptions found',
  'prescriptions.empty.description': 'Create your first prescription to get started.',

  // Form
  'prescriptions.form.editTitle': 'Edit Prescription',
  'prescriptions.form.newTitle': 'New Prescription',
  'prescriptions.form.patient': 'Patient',
  'prescriptions.form.doctor': 'Doctor',
  'prescriptions.form.diagnosis': 'Diagnosis',
  'prescriptions.form.statusDraft': 'Draft',
  'prescriptions.form.statusActive': 'Active',
  'prescriptions.form.medications': 'Medications',
  'prescriptions.form.dosage': 'Dosage',
  'prescriptions.form.frequency': 'Frequency',
  'prescriptions.form.duration': 'Duration',
  'prescriptions.form.qty': 'Qty',
  'prescriptions.form.instructions': 'Instructions',
  'prescriptions.form.notes': 'Notes',
  'prescriptions.form.add': 'Add',
  'prescriptions.form.selectDoctor': 'Select a doctor…',
  'prescriptions.form.selectMedication': 'Select a medication…',
  'prescriptions.form.validationPatientDoctor': 'Please select a patient and doctor',
  'prescriptions.form.validationMedication': 'Add at least one medication',
  'prescriptions.form.cancel': 'Cancel',
  'prescriptions.form.create': 'Create Prescription',

  // View modal
  'prescriptions.view.rxNumber': 'Rx #{{number}}',
  'prescriptions.view.col.index': '#',
  'prescriptions.view.col.medication': 'Medication',
  'prescriptions.view.col.dosage': 'Dosage',
  'prescriptions.view.col.frequency': 'Frequency',
  'prescriptions.view.col.duration': 'Duration',
  'prescriptions.view.col.qty': 'Qty',
  'prescriptions.view.col.instructions': 'Instructions',
  'prescriptions.view.notes': 'Notes',
  'prescriptions.view.print': 'Print',

  // PDF
  'prescriptions.pdf.title': 'Prescription',
  'prescriptions.pdf.patient': 'Patient',
  'prescriptions.pdf.doctor': 'Doctor',
  'prescriptions.pdf.dosage': 'Dosage',
  'prescriptions.pdf.frequency': 'Frequency',
  'prescriptions.pdf.duration': 'Duration',
  'prescriptions.pdf.route': 'Route',
  'prescriptions.pdf.instructions': 'Instructions',
  'prescriptions.pdf.qty': 'Qty',
  'prescriptions.pdf.refills': 'Refills',
  'prescriptions.pdf.notes': 'Notes',
  'prescriptions.pdf.patientInfo': 'Patient Information',
  'prescriptions.pdf.name': 'Name:',
  'prescriptions.pdf.age': 'Age:',
  'prescriptions.pdf.gender': 'Gender:',
  'prescriptions.pdf.phone': 'Phone:',
  'prescriptions.pdf.prescribingDoctor': 'Prescribing Doctor',
  'prescriptions.pdf.doctorLabel': 'Doctor:',
  'prescriptions.pdf.specialty': 'Specialty:',
  'prescriptions.pdf.license': 'License #:',
  'prescriptions.pdf.diagnosis': 'Diagnosis',
  'prescriptions.pdf.medications': 'Medications',
  'prescriptions.pdf.years': 'years',
  'prescriptions.pdf.date': 'Date:',
  'prescriptions.pdf.prescription': 'PRESCRIPTION',
  'prescriptions.pdf.btn': 'Download PDF',
  'prescriptions.pdf.generating': 'Generating...',
  'prescriptions.pdf.validFor': 'This prescription is valid for 30 days from date of issue',
  'prescriptions.pdf.generatedOn': 'Generated on',
  'prescriptions.pdf.licenseLabel': 'License:',

  // Item counts
  'prescriptions.items.medications': '{{count}} medication(s)',
  'prescriptions.view.status': 'Status',
  'prescriptions.view.diagnosis': 'Diagnosis',
  'prescriptions.view.medications': 'Medications',

  // Delete dialog
  'prescriptions.delete.title': 'Delete prescription?',
  'prescriptions.delete.description':
    'Prescription "{{number}}" will be permanently deleted. Only draft prescriptions can be deleted.',
  'prescriptions.delete.confirm': 'Delete',

  // Error
  'prescriptions.error.loadFailed': 'Failed to load prescriptions',
};
