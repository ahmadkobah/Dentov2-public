export const reports = {
  // Hub page
  'reports.title': 'Reports & Analytics',
  'reports.subtitle': 'Dashboard reports, clinic insights & advanced analytics',
  'reports.totalReports': '{{count}} Reports',
  'reports.free': '{{count}} Free',
  'reports.dashboardOverview': 'Dashboard Overview',
  'reports.reportCategories': 'Report Categories',

  // Quick stats
  'reports.stat.revenueThisMonth': 'Revenue This Month',
  'reports.stat.patientsThisMonth': 'Patients This Month',
  'reports.stat.todaysAppointments': "Today's Appointments",
  'reports.stat.noShowRate': 'No-Show Rate',
  'reports.stat.vsLastMonth': 'vs last month',

  // Category labels
  'reports.category.financial': 'Financial',
  'reports.category.patient': 'Patient',
  'reports.category.appointment': 'Appointment',
  'reports.category.clinical': 'Clinical',
  'reports.category.operational': 'Operational',
  'reports.category.inventory': 'Inventory',

  // Loading / Error
  'reports.loading': 'Loading...',
  'reports.error.dashboardData': 'Failed to load dashboard data. Please try again later.',
  'reports.error.loadReport': 'Failed to load report',
  'reports.error.retryMessage': 'Please check your connection and try again.',
  'reports.error.retry': 'Retry',
  'reports.generatingReport': 'Generating report…',

  // Category page
  'reports.categoryNotFound': 'Category not found',
  'reports.backToHub': 'Back to Reports Hub',
  'reports.allReports': 'All Reports',
  'reports.freeReports': 'Free Reports',
  'reports.advancedReports': 'Advanced Analytics Reports',
  'reports.reportsCount': '{{count}} reports',
  'reports.freeCount': '{{free}} free',
  'reports.advancedCount': '{{paid}} advanced',

  // Report badges
  'reports.badge.free': 'FREE',
  'reports.badge.advanced': 'ADVANCED',
  'reports.badge.live': 'LIVE',
  'reports.badge.locked': 'Advanced',

  // Locked / Upgrade
  'reports.locked.title': 'This report requires Advanced Analytics',
  'reports.locked.message':
    'Upgrade to access detailed analytics, custom date ranges, export capabilities, and trend analysis.',
  'reports.locked.advancedAnalytics': 'Advanced Analytics',
  'reports.upgrade.title': 'Unlock Advanced Analytics',
  'reports.upgrade.subtitle':
    'Get access to 23+ advanced reports, scheduled report delivery, custom exports, and trend analysis.',
  'reports.upgrade.unlockCategory': 'Unlock {{count}} Advanced {{category}} Reports',
  'reports.upgrade.unlockSubtitle':
    'Get detailed analytics, trend analysis, custom date ranges & export capabilities',
  'reports.upgrade.button': 'Upgrade — $199/mo',

  // Report detail page
  'reports.detail.categoryReports': '{{category}} Reports',
  'reports.detail.generated': 'Generated {{date}}',
  'reports.detail.export': 'Export',

  // Live report card
  'reports.liveCard.loadingLive': 'Loading live data…',
  'reports.liveCard.loadFailed': 'Failed to load live data — showing preview',
  'reports.liveCard.viewFull': 'View Full Report',
  'reports.liveCard.export': 'Export',

  // Chart
  'reports.chart.noData': 'No chart data available',

  // Data table
  'reports.dataTable.noData': 'No table data available',
  'reports.dataTable.rows': '{{count}} rows',
  'reports.dataTable.page': 'Page {{current}} of {{total}}',
  'reports.dataTable.previous': 'Previous',
  'reports.dataTable.next': 'Next',

  // Filter bar
  'reports.filter.from': 'From',
  'reports.filter.to': 'To',
  'reports.filter.period': 'Period',
  'reports.filter.daily': 'Daily',
  'reports.filter.weekly': 'Weekly',
  'reports.filter.monthly': 'Monthly',
  'reports.filter.quarterly': 'Quarterly',
  'reports.filter.yearly': 'Yearly',
  'reports.filter.branch': 'Branch',
  'reports.filter.allBranches': 'All branches',
  'reports.filter.doctor': 'Doctor',
  'reports.filter.allDoctors': 'All doctors',
  'reports.filter.apply': 'Apply',

  // Export dialog
  'reports.export.title': 'Export Report',
  'reports.export.chooseFormat': 'Choose a format to export',
  'reports.export.csv': 'CSV',
  'reports.export.csvDesc': 'Comma-separated values — opens in any spreadsheet',
  'reports.export.excel': 'Excel',
  'reports.export.excelDesc': 'Microsoft Excel workbook (.xlsx)',
  'reports.export.pdf': 'PDF',
  'reports.export.pdfDesc': 'Print-ready document with charts',
  'reports.export.cancel': 'Cancel',
  'reports.export.submit': 'Export {{format}}',
  'reports.export.toast.success': 'Report export queued successfully',
  'reports.export.toast.failed': 'Export failed. Please try again.',

  // Report PDF
  'reports.pdf.period': 'Period:',
  'reports.pdf.generated': 'Generated:',
  'reports.pdf.clinic': 'Clinic:',
  'reports.pdf.detailedData': 'Detailed Data',
  'reports.pdf.download': 'Download PDF',

  // History page
  'reports.history.title': 'Report History',
  'reports.history.subtitle': 'Previously generated report exports and their status',
  'reports.history.col.report': 'Report',
  'reports.history.col.category': 'Category',
  'reports.history.col.format': 'Format',
  'reports.history.col.status': 'Status',
  'reports.history.col.generated': 'Generated',
  'reports.history.col.triggeredBy': 'Triggered By',
  'reports.history.col.actions': 'Actions',
  'reports.history.download': 'Download',
  'reports.history.status.pending': 'Pending',
  'reports.history.status.processing': 'Processing',
  'reports.history.status.completed': 'Completed',
  'reports.history.status.failed': 'Failed',
  'reports.history.empty.title': 'No report history yet',
  'reports.history.empty.description':
    'When you export or schedule reports, their generation history will appear here.',
  'reports.history.browseReports': 'Browse Reports',
  'reports.history.loadFailed': 'Failed to load report history',
  'reports.history.refreshPrompt': 'Please try refreshing the page.',

  // Saved reports page
  'reports.saved.title': 'Saved Reports',
  'reports.saved.subtitle': 'Your saved report configurations for quick access',
  'reports.saved.saved': 'Saved {{date}}',
  'reports.saved.empty.title': 'No saved reports yet',
  'reports.saved.empty.description':
    'When you save a report configuration from any report detail page, it will appear here for quick access.',
  'reports.saved.browseReports': 'Browse Reports',
  'reports.saved.toast.removed': 'Report removed from saved',
  'reports.saved.toast.removeFailed': 'Failed to delete saved report',
  'reports.saved.loadFailed': 'Failed to load saved reports',

  // Scheduled reports page
  'reports.scheduled.title': 'Scheduled Reports',
  'reports.scheduled.tab.schedules': 'Schedules',
  'reports.scheduled.tab.history': 'History',
  'reports.scheduled.col.name': 'Name',
  'reports.scheduled.col.schedule': 'Schedule',
  'reports.scheduled.col.format': 'Format',
  'reports.scheduled.col.delivery': 'Delivery',
  'reports.scheduled.col.status': 'Status',
  'reports.scheduled.col.nextRun': 'Next Run',
  'reports.scheduled.frequency.daily': 'Daily',
  'reports.scheduled.frequency.weekly': 'Weekly',
  'reports.scheduled.frequency.monthly': 'Monthly',
  'reports.scheduled.status.active': 'Active',
  'reports.scheduled.status.paused': 'Paused',
  'reports.scheduled.action.runNow': 'Run Now',
  'reports.scheduled.action.pause': 'Pause',
  'reports.scheduled.action.resume': 'Resume',
  'reports.scheduled.action.delete': 'Delete',
  'reports.scheduled.toast.triggered': 'Report generation triggered',
  'reports.scheduled.toast.triggerFailed': 'Failed to trigger report generation',
  'reports.scheduled.toast.paused': 'Schedule paused',
  'reports.scheduled.toast.resumed': 'Schedule resumed',
  'reports.scheduled.toast.updateFailed': 'Failed to update schedule',
  'reports.scheduled.toast.deleted': 'Schedule deleted',
  'reports.scheduled.toast.deleteFailed': 'Failed to delete schedule',
  'reports.scheduled.empty.title': 'No scheduled reports',
  'reports.scheduled.empty.description': 'Create a schedule to automatically generate reports.',
  'reports.scheduled.historyEmpty.title': 'No generation history',
  'reports.scheduled.historyEmpty.description': 'Scheduled report runs will appear here.',
};
