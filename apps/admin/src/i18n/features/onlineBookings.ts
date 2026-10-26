export const onlineBookings = {
  // Page
  'onlineBookings.title': 'Online Bookings',
  'onlineBookings.subtitle': 'Manage patient booking requests from the online portal',

  // Table columns
  'onlineBookings.col.patient': 'Patient',
  'onlineBookings.col.dateTime': 'Date & Time',
  'onlineBookings.col.doctor': 'Doctor',
  'onlineBookings.col.branch': 'Branch',
  'onlineBookings.col.reason': 'Reason',
  'onlineBookings.col.status': 'Status',
  'onlineBookings.col.lang': 'Lang',

  // Status labels
  'onlineBookings.status.pending': 'Pending',
  'onlineBookings.status.confirmed': 'Confirmed',
  'onlineBookings.status.cancelled': 'Cancelled',
  'onlineBookings.status.completed': 'Completed',
  'onlineBookings.status.noShow': 'No Show',

  // Filters
  'onlineBookings.filter.allStatuses': 'All Statuses',
  'onlineBookings.filter.status': 'Status',
  'onlineBookings.filter.pending': 'Pending',
  'onlineBookings.filter.confirmed': 'Confirmed',
  'onlineBookings.filter.rejected': 'Rejected',
  'onlineBookings.filter.cancelled': 'Cancelled',
  'onlineBookings.filter.fromDate': 'From date',
  'onlineBookings.filter.toDate': 'To date',

  // Actions
  'onlineBookings.action.confirm': 'Confirm',
  'onlineBookings.action.reject': 'Reject',
  'onlineBookings.action.ariaLabel': 'Booking actions',
  'onlineBookings.action.already': 'Already {{status}}',

  // Dialogs
  'onlineBookings.dialog.confirmTitle': 'Confirm Booking',
  'onlineBookings.dialog.confirmDescription':
    'Confirm the booking for {{patient}} on {{date}} at {{time}}?',
  'onlineBookings.dialog.rejectTitle': 'Reject Booking',
  'onlineBookings.dialog.rejectDescription':
    'Reject the booking for {{patient}} on {{date}} at {{time}}?',
  'onlineBookings.dialog.rejectionReason': 'Rejection Reason (optional)',
  'onlineBookings.dialog.rejectionPlaceholder': 'e.g. No available slots at this time',

  // Toast
  'onlineBookings.toast.confirmed': 'Booking confirmed',
  'onlineBookings.toast.confirmFailed': 'Failed to confirm booking',
  'onlineBookings.toast.rejected': 'Booking rejected',
  'onlineBookings.toast.rejectFailed': 'Failed to reject booking',

  // Empty state
  'onlineBookings.empty.title': 'No online bookings',
  'onlineBookings.empty.description': 'Booking requests from the patient portal will appear here',

  // View toggle
  'onlineBookings.view.table': 'Table',
  'onlineBookings.view.slots': 'Slots',

  // Pagination
  'onlineBookings.pagination.page': 'Page {{current}} of {{total}} ({{count}} bookings)',
  'onlineBookings.pagination.previous': 'Previous',
  'onlineBookings.pagination.next': 'Next',

  // Slot Calendar View
  'onlineBookings.slots.branch': 'Branch',
  'onlineBookings.slots.selectBranch': 'Select branch',
  'onlineBookings.slots.doctor': 'Doctor (optional)',
  'onlineBookings.slots.allDoctors': 'All Doctors',
  'onlineBookings.slots.available': 'Available',
  'onlineBookings.slots.occupied': 'Occupied',
  'onlineBookings.slots.availableCount': '{{count}} available',
  'onlineBookings.slots.occupiedCount': '{{count}} occupied',
  'onlineBookings.slots.selectBranchPrompt': 'Select a branch to view available slots',
  'onlineBookings.slots.loading': 'Loading...',
  'onlineBookings.notAssigned': 'Not assigned',
  'onlineBookings.unknown': 'Unknown',
};
