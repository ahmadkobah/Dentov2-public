export const auditLogs = {
  // Page
  'auditLogs.title': 'Audit Logs',
  'auditLogs.subtitle': 'Platform-wide security and change audit trail',

  // Stat cards
  'auditLogs.stat.today': 'Today',
  'auditLogs.stat.thisWeek': 'This Week',
  'auditLogs.stat.highSensitivity': 'High Sensitivity',
  'auditLogs.stat.failures': 'Failures',

  // Table columns
  'auditLogs.col.timestamp': 'Timestamp',
  'auditLogs.col.actor': 'Actor',
  'auditLogs.col.action': 'Action',
  'auditLogs.col.resource': 'Resource',
  'auditLogs.col.tenant': 'Tenant',
  'auditLogs.col.sensitivity': 'Sensitivity',
  'auditLogs.col.status': 'Status',

  // Filters
  'auditLogs.filter.searchPlaceholder': 'Search logs…',
  'auditLogs.filter.sensitivity': 'Sensitivity',
  'auditLogs.filter.status': 'Status',
  'auditLogs.filter.allLevels': 'All Levels',
  'auditLogs.filter.allStatus': 'All Status',

  // Empty / Error
  'auditLogs.empty.message': 'No audit logs found.',
  'auditLogs.error.title': 'Failed to load audit logs',
  'auditLogs.error.desc': 'Could not retrieve audit log data. Please try again.',

  // Detail sheet
  'auditLogs.detail.actor': 'Actor',
  'auditLogs.detail.tenant': 'Tenant',
  'auditLogs.detail.timestamp': 'Timestamp',
  'auditLogs.detail.resourceId': 'Resource ID',
  'auditLogs.detail.ipAddress': 'IP Address',
  'auditLogs.detail.userAgent': 'User Agent',
  'auditLogs.detail.before': 'Before',
  'auditLogs.detail.after': 'After',
  'auditLogs.detail.metadata': 'Metadata',
  'auditLogs.detail.copy': 'Copy',
  'auditLogs.detail.copied': 'copied',
  'auditLogs.detail.error': 'Failed to load audit log details.',
} as const;
