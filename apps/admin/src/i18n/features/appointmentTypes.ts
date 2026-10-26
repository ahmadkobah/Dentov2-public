export const appointmentTypes = {
  // Page
  'appointmentTypes.title': 'Appointment Types',
  'appointmentTypes.subtitle': 'Manage appointment type definitions',
  'appointmentTypes.newType': 'New Type',

  // Table columns
  'appointmentTypes.col.name': 'Name',
  'appointmentTypes.col.code': 'Code',
  'appointmentTypes.col.duration': 'Duration',
  'appointmentTypes.col.fee': 'Fee',
  'appointmentTypes.col.flags': 'Flags',
  'appointmentTypes.col.status': 'Status',

  // Badges
  'appointmentTypes.badge.doctor': 'Doctor',
  'appointmentTypes.badge.online': 'Online',
  'appointmentTypes.badge.active': 'Active',
  'appointmentTypes.badge.inactive': 'Inactive',
  'appointmentTypes.badge.default': 'Default',

  // Actions dropdown
  'appointmentTypes.action.edit': 'Edit',
  'appointmentTypes.action.delete': 'Delete',

  // Toast
  'appointmentTypes.toast.created': 'Appointment type created',
  'appointmentTypes.toast.updated': 'Appointment type updated',
  'appointmentTypes.toast.deactivated': 'Appointment type deactivated',
  'appointmentTypes.toast.createFailed': 'Failed to create appointment type',
  'appointmentTypes.toast.updateFailed': 'Failed to update appointment type',
  'appointmentTypes.toast.deactivateFailed': 'Failed to deactivate appointment type',

  // Confirm dialog
  'appointmentTypes.confirm.deactivateTitle': 'Deactivate Appointment Type',
  'appointmentTypes.confirm.deactivateDesc':
    'Are you sure you want to deactivate this appointment type? It will no longer be available for new appointments.',

  // Empty / Error
  'appointmentTypes.empty.title': 'No appointment types',
  'appointmentTypes.empty.desc': 'Create your first appointment type to get started.',
  'appointmentTypes.error.load': 'Failed to load types',

  // Form dialog
  'appointmentTypes.form.createTitle': 'New Appointment Type',
  'appointmentTypes.form.editTitle': 'Edit Appointment Type',
  'appointmentTypes.form.nameEn': 'Name (EN)',
  'appointmentTypes.form.nameAr': 'Name (AR)',
  'appointmentTypes.form.code': 'Code',
  'appointmentTypes.form.duration': 'Default Duration (min)',
  'appointmentTypes.form.fee': 'Default Fee',
  'appointmentTypes.form.color': 'Color',
  'appointmentTypes.form.icon': 'Icon',
  'appointmentTypes.form.requiresDoctor': 'Requires Doctor',
  'appointmentTypes.form.allowOnline': 'Allow Online Booking',
  'appointmentTypes.form.createBtn': 'Create Type',
  'appointmentTypes.form.saveBtn': 'Save Changes',

  // Form placeholders
  'appointmentTypes.form.nameEnPlaceholder': 'e.g. Root Canal',
  'appointmentTypes.form.nameArPlaceholder': 'e.g. علاج عصب',
  'appointmentTypes.form.codePlaceholder': 'e.g. root-canal',
  'appointmentTypes.form.iconPlaceholder': 'e.g. tooth syringe',
  'appointmentTypes.form.feePlaceholder': '0.00',
} as const;
