export const attendance = {
  // Page
  'attendance.title': 'Attendance',
  'attendance.subtitle': 'Staff attendance tracking and clock in/out',

  // Action buttons
  'attendance.clockIn': 'Clock In',
  'attendance.clockOut': 'Clock Out',
  'attendance.startBreak': 'Start Break',
  'attendance.endBreak': 'End Break',

  // Table columns
  'attendance.col.date': 'Date',
  'attendance.col.checkIn': 'Check In',
  'attendance.col.checkOut': 'Check Out',
  'attendance.col.hours': 'Hours',
  'attendance.col.late': 'Late (min)',
  'attendance.col.overtime': 'OT (min)',
  'attendance.col.status': 'Status',

  // Filter options
  'attendance.filter.allStatuses': 'All Statuses',
  'attendance.filter.present': 'Present',
  'attendance.filter.late': 'Late',
  'attendance.filter.absent': 'Absent',
  'attendance.filter.halfDay': 'Half Day',
  'attendance.filter.onLeave': 'On Leave',
  'attendance.filter.holiday': 'Holiday',

  // Toast
  'attendance.toast.clockedIn': 'Clocked in successfully',
  'attendance.toast.clockedOut': 'Clocked out successfully',
  'attendance.toast.breakStarted': 'Break started',
  'attendance.toast.breakEnded': 'Break ended',
  'attendance.toast.clockInFailed': 'Failed to clock in',
  'attendance.toast.clockOutFailed': 'Failed to clock out',
  'attendance.toast.breakStartFailed': 'Failed to start break',
  'attendance.toast.breakEndFailed': 'Failed to end break',

  // Empty / Error
  'attendance.empty.title': 'No attendance records',
  'attendance.empty.desc': 'Attendance records will appear when staff clock in.',
  'attendance.error.load': 'Failed to load attendance',
} as const;
