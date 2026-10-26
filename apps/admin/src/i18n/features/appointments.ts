export const appointments = {
  // Page
  'appointments.title': 'Appointments',
  'appointments.subtitle': 'Schedule and manage patient appointments',
  'appointments.bookBtn': 'Book Appointment',
  'appointments.loading': 'Loading…',

  // Toast
  'appointments.toast.booked': 'Appointment booked successfully',
  'appointments.toast.cancelled': 'Appointment cancelled',
  'appointments.toast.rescheduled': 'Appointment rescheduled',
  'appointments.toast.statusUpdated': 'Appointment status updated',
  'appointments.toast.bookFailed': 'Failed to book appointment',
  'appointments.toast.cancelFailed': 'Failed to cancel appointment',
  'appointments.toast.rescheduleFailed': 'Failed to reschedule appointment',
  'appointments.toast.statusFailed': 'Failed to update appointment status',
  'appointments.toast.patientCreated': 'Patient created',

  // Error
  'appointments.error.load': 'Failed to load appointments',

  // Confirm dialog
  'appointments.confirm.cancelTitle': 'Cancel Appointment',
  'appointments.confirm.cancelDesc':
    'Are you sure you want to cancel this appointment? The patient will be notified.',
  'appointments.confirm.cancelBtn': 'Cancel Appointment',

  // Calendar
  'appointments.calendar.fallback': 'Appointment',

  // Form dialog
  'appointments.form.bookTitle': 'Book Appointment',
  'appointments.form.editTitle': 'Edit Appointment',
  'appointments.form.patient': 'Patient',
  'appointments.form.doctor': 'Doctor',
  'appointments.form.branch': 'Branch',
  'appointments.form.date': 'Date',
  'appointments.form.startTime': 'Start Time',
  'appointments.form.endTime': 'End Time',
  'appointments.form.duration': 'Duration (min)',
  'appointments.form.type': 'Type',
  'appointments.form.typePlaceholder': 'Choose a type…',
  'appointments.form.source': 'Source',
  'appointments.form.chair': 'Chair',
  'appointments.form.reason': 'Reason',
  'appointments.form.notes': 'Notes',
  'appointments.form.internalNotes': 'Internal Notes',
  'appointments.form.consultationFee': 'Consultation Fee',
  'appointments.form.walkIn': 'Walk-in appointment',
  'appointments.form.newPatient': 'New Patient',
  'appointments.form.bookBtn': 'Book Appointment',
  'appointments.form.saveBtn': 'Save Changes',

  // Form placeholders
  'appointments.form.patientPlaceholder': 'Select patient…',
  'appointments.form.patientSearch': 'Search patients…',
  'appointments.form.patientEmpty': 'No patients found.',
  'appointments.form.doctorPlaceholder': 'Select doctor…',
  'appointments.form.doctorSearch': 'Search doctors…',
  'appointments.form.doctorEmpty': 'No doctors found.',
  'appointments.form.branchPlaceholder': 'Select branch…',
  'appointments.form.branchSearch': 'Search branches…',
  'appointments.form.branchEmpty': 'No branches found.',
  'appointments.form.chairPlaceholder': 'Select chair…',
  'appointments.form.chairBranchFirst': 'Select a branch first',
  'appointments.form.reasonPlaceholder': 'Reason for visit',
  'appointments.form.notesPlaceholder': 'Notes',
  'appointments.form.internalNotesPlaceholder': 'Internal staff notes (not visible to patient)',
  'appointments.form.feePlaceholder': '0.00',

  // Form select groups
  'appointments.form.selectDefault': 'Default',
  'appointments.form.selectCustom': 'Custom',

  // Detail panel
  'appointments.detail.title': 'Appointment Details',
  'appointments.detail.doctor': 'Doctor',
  'appointments.detail.reason': 'Reason',
  'appointments.detail.notes': 'Notes',
  'appointments.detail.fee': 'Fee:',
  'appointments.detail.general': 'General',
  'appointments.detail.walkIn': 'Walk-in',

  // Detail actions
  'appointments.detail.sendWhatsApp': 'Send WhatsApp',
  'appointments.detail.sendSms': 'Send SMS',
  'appointments.detail.markAs': 'Mark as',
  'appointments.detail.confirm': 'Confirm',
  'appointments.detail.markNoShow': 'Mark No-show',
  'appointments.detail.cancelAppointment': 'Cancel Appointment',
} as const;
