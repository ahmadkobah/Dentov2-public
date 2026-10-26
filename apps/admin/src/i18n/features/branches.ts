export const branches = {
  // ── List Page ──
  'branches.title': 'Branches',
  'branches.subtitle': 'Manage clinic branches, chairs, and working hours',
  'branches.addBranch': 'Add Branch',
  'branches.searchPlaceholder': 'Search by name, code, city...',

  // Table columns
  'branches.col.branch': 'Branch',
  'branches.col.location': 'Location',
  'branches.col.chairs': 'Chairs',
  'branches.col.hours': 'Hours',
  'branches.col.status': 'Status',

  // Badges
  'branches.badge.primary': 'Primary',
  'branches.badge.active': 'Active',
  'branches.badge.inactive': 'Inactive',
  'branches.badge.ramadan': 'Ramadan',

  // Action dropdown
  'branches.action.edit': 'Edit',
  'branches.action.deactivate': 'Deactivate',
  'branches.action.activate': 'Activate',
  'branches.action.enableRamadan': 'Enable Ramadan Mode',
  'branches.action.disableRamadan': 'Disable Ramadan Mode',

  // Filter
  'branches.filter.all': 'All',
  'branches.filter.active': 'Active',
  'branches.filter.inactive': 'Inactive',

  // Create dialog
  'branches.create.title': 'Create Branch',
  'branches.create.desc': 'Add a new clinic branch location.',
  'branches.create.nameEn': 'Name (English)',
  'branches.create.nameAr': 'Name (Arabic)',
  'branches.create.code': 'Branch Code',
  'branches.create.city': 'City',
  'branches.create.address': 'Address',
  'branches.create.phone': 'Phone',
  'branches.create.email': 'Email',
  'branches.create.cancelBtn': 'Cancel',
  'branches.create.submitBtn': 'Create Branch',

  // Create placeholders
  'branches.create.nameEnPlaceholder': 'Main Branch',
  'branches.create.nameArPlaceholder': 'الفرع الرئيسي',
  'branches.create.codePlaceholder': 'BR-001',
  'branches.create.cityPlaceholder': 'Riyadh',
  'branches.create.addressPlaceholder': 'King Fahd Road...',
  'branches.create.phonePlaceholder': '+966...',
  'branches.create.emailPlaceholder': 'branch@clinic.com',

  // Toast
  'branches.toast.created': 'Branch created successfully',
  'branches.toast.deactivated': 'Branch deactivated',
  'branches.toast.activated': 'Branch activated',
  'branches.toast.ramadanEnabled': 'Ramadan mode enabled',
  'branches.toast.ramadanDisabled': 'Ramadan mode disabled',
  'branches.toast.createFailed': 'Failed to create branch',
  'branches.toast.updateFailed': 'Failed to update branch',

  // Confirm dialog
  'branches.confirm.title': 'Confirm Action',

  // Empty / Error
  'branches.empty.title': 'No branches found',
  'branches.empty.desc': 'Create your first branch to get started.',

  // ── Detail Page ──
  'branches.detail.backBtn': 'Back to Branches',
  'branches.detail.breadcrumb': 'Branches',
  'branches.detail.notFound': 'Branch not found.',

  // Tabs
  'branches.detail.tab.info': 'Info',
  'branches.detail.tab.chairs': 'Chairs',
  'branches.detail.tab.workingHours': 'Working Hours',
  'branches.detail.tab.ramadanHours': 'Ramadan Hours',
  'branches.detail.tab.holidays': 'Holidays',

  // Info tab
  'branches.detail.info.title': 'Basic Information',
  'branches.detail.info.desc': 'Update the branch details below.',
  'branches.detail.info.nameEn': 'Name (English)',
  'branches.detail.info.nameAr': 'Name (Arabic)',
  'branches.detail.info.addressEn': 'Address (English)',
  'branches.detail.info.addressAr': 'Address (Arabic)',
  'branches.detail.info.city': 'City',
  'branches.detail.info.phone': 'Phone',
  'branches.detail.info.email': 'Email',
  'branches.detail.info.saveBtn': 'Save Info',

  // Chairs tab
  'branches.detail.chairs.title': 'Chairs',
  'branches.detail.chairs.desc': '{{active}} active, {{total}} total chairs configured.',
  'branches.detail.chairs.addBtn': 'Add Chair',
  'branches.detail.chairs.namePlaceholder': 'Chair name (optional)',
  'branches.detail.chairs.saveBtn': 'Save Chairs',
  'branches.detail.chairs.empty':
    'No chairs configured. Click "Add Chair" to set up treatment chairs.',

  // Equipment types
  'branches.detail.chairs.standard': 'Standard',
  'branches.detail.chairs.surgical': 'Surgical',
  'branches.detail.chairs.pediatric': 'Pediatric',

  // Chair status
  'branches.detail.chairs.active': 'Active',
  'branches.detail.chairs.inactive': 'Inactive',

  // Working hours tab
  'branches.detail.hours.title': 'Working Hours',
  'branches.detail.hours.open': 'Open',
  'branches.detail.hours.closed': 'Closed',
  'branches.detail.hours.to': 'to',
  'branches.detail.hours.saveBtn': 'Save Working Hours',

  // Day names
  'branches.detail.hours.sunday': 'Sunday',
  'branches.detail.hours.monday': 'Monday',
  'branches.detail.hours.tuesday': 'Tuesday',
  'branches.detail.hours.wednesday': 'Wednesday',
  'branches.detail.hours.thursday': 'Thursday',
  'branches.detail.hours.friday': 'Friday',
  'branches.detail.hours.saturday': 'Saturday',

  // Ramadan hours tab
  'branches.detail.ramadan.title': 'Ramadan Hours',
  'branches.detail.ramadan.desc': 'Configure working hours during Ramadan mode.',
  'branches.detail.ramadan.saveBtn': 'Save Ramadan Hours',

  // Holidays tab
  'branches.detail.holidays.title': 'Holidays',
  'branches.detail.holidays.desc': '{{count}} holidays configured.',
  'branches.detail.holidays.addBtn': 'Add Holiday',
  'branches.detail.holidays.namePlaceholder': 'Holiday name (English)',
  'branches.detail.holidays.nameArPlaceholder': 'Arabic (optional)',
  'branches.detail.holidays.saveBtn': 'Save Holidays',
  'branches.detail.holidays.empty': 'No holidays configured.',

  // Ramadan mode toggle
  'branches.detail.ramadan.modeLabel': 'Ramadan Mode',
  'branches.detail.ramadan.modeDesc':
    'When enabled, this branch uses Ramadan working hours for scheduling and booking.',
  'branches.detail.ramadan.modeOn': 'Active',
  'branches.detail.ramadan.modeOff': 'Inactive',

  // Slot config tab
  'branches.detail.tab.slotConfig': 'Slot Config',
  'branches.detail.slotConfig.title': 'Appointment Slot Configuration',
  'branches.detail.slotConfig.desc':
    'Control how appointment time slots are generated for this branch.',
  'branches.detail.slotConfig.defaultDuration': 'Default Slot Duration',
  'branches.detail.slotConfig.minDuration': 'Min Duration',
  'branches.detail.slotConfig.maxDuration': 'Max Duration',
  'branches.detail.slotConfig.buffer': 'Buffer Between Slots',
  'branches.detail.slotConfig.leadTime': 'Booking Lead Time',
  'branches.detail.slotConfig.windowDays': 'Booking Window',
  'branches.detail.slotConfig.minutes': 'min',
  'branches.detail.slotConfig.hours': 'hours',
  'branches.detail.slotConfig.days': 'days',
  'branches.detail.slotConfig.saveBtn': 'Save Slot Config',

  // Detail toasts
  'branches.detail.toast.infoSaved': 'Branch info saved',
  'branches.detail.toast.chairsSaved': 'Chairs saved',
  'branches.detail.toast.hoursSaved': 'Working hours saved',
  'branches.detail.toast.ramadanSaved': 'Ramadan hours saved',
  'branches.detail.toast.holidaysSaved': 'Holidays saved',
  'branches.detail.toast.slotConfigSaved': 'Slot configuration saved',
  'branches.detail.toast.saveFailed': 'Failed to save changes',
} as const;
