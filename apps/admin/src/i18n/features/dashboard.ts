export const dashboard = {
  // Page
  'dashboard.title': 'Dashboard',
  'dashboard.today': 'Today:',
  'dashboard.lastUpdated': 'Last updated:',

  // Stat cards
  'dashboard.stat.todaysPatients': "Today's Patients",
  'dashboard.stat.appointmentsRemaining': 'Appointments Remaining',
  'dashboard.stat.walkInsWaiting': 'Walk-ins Waiting',
  'dashboard.stat.revenueThisMonth': 'Revenue This Month',

  // Appointments widget
  'dashboard.appointments.title': 'Appointments Today',
  'dashboard.appointments.viewCalendar': 'View Full Calendar',

  // Revenue widget
  'dashboard.revenue.title': 'Revenue (Last 7 Days)',
  'dashboard.revenue.tooltip': 'Revenue',
  'dashboard.revenue.lastMonth': 'Last Month',
  'dashboard.revenue.thisMonth': 'This Month',
  'dashboard.revenue.total': 'Total:',

  // Low stock widget
  'dashboard.lowStock.title': 'Low Stock Alerts',
  'dashboard.lowStock.viewAll': 'View All',
  'dashboard.lowStock.healthy': 'All stock levels are healthy.',
  'dashboard.lowStock.qty': 'Qty',
  'dashboard.lowStock.reorder': 'Reorder',
  'dashboard.lowStock.badge': 'Low',

  // Waiting room widget
  'dashboard.waitingRoom.title': 'Waiting Room',
  'dashboard.waitingRoom.live': 'Live',
  'dashboard.waitingRoom.patientsWaiting': 'Patients Waiting',
  'dashboard.waitingRoom.avgWaitTime': 'Avg Wait Time',
  'dashboard.waitingRoom.min': 'min',
  'dashboard.waitingRoom.empty': 'No patients currently waiting.',

  // Error / cached
  'dashboard.error.load': 'Failed to load dashboard data',
  'dashboard.error.cached': 'Showing cached data. Please try refreshing.',
} as const;
