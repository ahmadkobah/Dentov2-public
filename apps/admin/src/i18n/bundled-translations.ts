/**
 * Bundled English Translations — Fallback
 *
 * Assembled from all namespace files so the admin app works
 * immediately without waiting for API calls.  When the locale
 * store loads translations from the API they merge/override
 * these values.
 *
 * Three source directories:
 *  - features/   → flat key format  (key may include namespace prefix)
 *  - locales/en/ → nested objects   (need flattening)
 *  - keys/       → nested objects   (need flattening)
 */

// ── Feature-level (flat format) ─────────────────────────
import {
  appointmentTypes,
  appointments,
  attendance,
  auditLogs,
  auth,
  branches,
  cbct,
  commissions,
  consent,
  dashboard,
  dentalCharts,
  onboarding,
  onlineBookings,
  operations,
  patients,
  payments,
  prescriptions,
  procedureNotes,
  profile,
  reports,
  scans,
  schedules,
  services,
} from './features/index.js';

// ── Locale-level (nested — will be flattened) ────────────
import {
  dentalLabs as _dentalLabs,
  doctors as _doctors,
  documents as _documents,
  installments as _installments,
  insurance as _insurance,
  inventory as _inventory,
  invoices as _invoices,
  labOrders as _labOrders,
  labOrderTypes as _labOrderTypes,
  leave as _leave,
  medications as _medications,
  notifications as _notifications,
} from './locales/en/index.js';

// ── Key-level (nested — will be flattened) ───────────────
import {
  settings as _settings,
  subscription as _subscription,
  support as _support,
  treatmentPlans as _treatmentPlans,
  users as _users,
  webhooks as _webhooks,
  xrays as _xrays,
  docs as _docs,
  platformNotes as _platformNotes,
  uploads as _uploads,
  components as _components,
} from './keys/index.js';

// ── Flatten nested objects to dot-notation ───────────────
function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') {
      result[key] = v;
    } else if (typeof v === 'object' && v !== null) {
      Object.assign(result, flatten(v as Record<string, unknown>, key));
    }
  }
  return result;
}

// ── Strip namespace prefix from feature flat-key objects ──
// Feature files use keys like "dashboard.title" but t() already
// splits the namespace, so the stored key must be just "title".
function stripPrefix(ns: string, obj: Record<string, string>): Record<string, string> {
  const prefix = `${ns}.`;
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k.startsWith(prefix) ? k.slice(prefix.length) : k] = v;
  }
  return result;
}

// ── Assembled bundle ─────────────────────────────────────
export const bundledTranslations: Record<string, Record<string, string>> = {
  // App chrome — sidebar, header, error boundary
  app: {
    'search.placeholder': 'Search patients, appointments...',
    darkMode: 'Toggle dark mode',
    language: 'Toggle language',
    notifications: 'Notifications',
    'notifications.new': 'New',
    'notifications.none': 'No notifications',
    'notifications.viewAll': 'View All Notifications',
    'user.profile': 'My Profile',
    'user.settings': 'Settings',
    'user.help': 'Help & Support',
    'user.signOut': 'Sign Out',
    'group.Core': 'Core',
    'group.Clinical': 'Clinical',
    'group.Medical': 'Medical',
    'group.Financial': 'Financial',
    'group.Operations': 'Operations',
    'group.Reports': 'Reports',
    'group.System': 'System',
    'group.Support': 'Support',
    'nav.Dashboard': 'Dashboard',
    'nav.Daily Operations': 'Daily Operations',
    'nav.Patients': 'Patients',
    'nav.Doctors': 'Doctors',
    'nav.Services': 'Services',
    'nav.Schedules': 'Schedules',
    'nav.Appointments': 'Appointments',
    'nav.Appt Types': 'Appt Types',
    'nav.Online Bookings': 'Online Bookings',
    'nav.Waitlist': 'Waitlist',
    'nav.Treatment Plans': 'Treatment Plans',
    'nav.Procedure Notes': 'Procedure Notes',
    'nav.Consent Forms': 'Consent Forms',
    'nav.Prescriptions & Medications': 'Prescriptions & Medications',
    'nav.X-Rays': 'X-Rays',
    'nav.CBCT': 'CBCT',
    'nav.3D Scans': '3D Scans',
    'nav.Lab Orders': 'Lab Orders',
    'nav.Lab Order Types': 'Lab Order Types',
    'nav.Dental Labs': 'Dental Labs',
    'nav.Invoices': 'Invoices',
    'nav.Payments': 'Payments',
    'nav.Installments': 'Installments',
    'nav.Insurance Co.': 'Insurance Co.',
    'nav.Claims': 'Claims',
    'nav.Commissions': 'Commissions',
    'nav.Branches': 'Branches',
    'nav.Inventory': 'Inventory',
    'nav.Categories': 'Categories',
    'nav.Transfers': 'Transfers',
    'nav.Stock Count': 'Stock Count',
    'nav.Expiry Tracker': 'Expiry Tracker',
    'nav.Reports': 'Reports',
    'nav.Financial': 'Financial',
    'nav.Patient': 'Patient',
    'nav.Clinical': 'Clinical',
    'nav.Operational': 'Operational',
    'nav.Saved': 'Saved',
    'nav.Scheduled': 'Scheduled',
    'nav.History': 'History',
    'nav.Users': 'Users',
    'nav.Notifications': 'Notifications',
    'nav.Alert Rules': 'Alert Rules',
    'nav.Settings': 'Settings',
    'nav.Webhooks': 'Webhooks',
    'nav.Audit Logs': 'Audit Logs',
    'nav.Subscription': 'Subscription',
    'nav.Workflows': 'Workflows',
    'nav.Platform Notes': 'Platform Notes',
    'nav.Support': 'Support',
    'sidebar.needHelp': 'Need Help?',
    'sidebar.needHelpDesc': 'Check our documentation or contact support.',
    'sidebar.viewDocs': 'View Docs',
    'error.title': 'Something went wrong',
    'error.desc': 'The error has been reported. Please refresh the page.',
    'error.refresh': 'Refresh',
  },

  // Common shared strings
  common: {
    'actions.save': 'Save',
    'actions.cancel': 'Cancel',
    'actions.delete': 'Delete',
    'actions.edit': 'Edit',
    'actions.view': 'View',
    'actions.create': 'Create',
    'actions.add': 'Add',
    'actions.remove': 'Remove',
    'actions.search': 'Search',
    'actions.filter': 'Filter',
    'actions.export': 'Export',
    'actions.import': 'Import',
    'actions.print': 'Print',
    'actions.download': 'Download',
    'actions.upload': 'Upload',
    'actions.confirm': 'Confirm',
    'actions.submit': 'Submit',
    'actions.back': 'Back',
    'actions.next': 'Next',
    'actions.previous': 'Previous',
    'actions.close': 'Close',
    'actions.refresh': 'Refresh',
    'actions.retry': 'Retry',
    'actions.loading': 'Loading...',
    'actions.saving': 'Saving...',
    'actions.send': 'Send',
    'actions.reset': 'Reset',
    'actions.apply': 'Apply',
    'actions.update': 'Update',
    'status.active': 'Active',
    'status.inactive': 'Inactive',
    'status.pending': 'Pending',
    'status.completed': 'Completed',
    'status.cancelled': 'Cancelled',
    'status.confirmed': 'Confirmed',
    'status.draft': 'Draft',
    'status.paid': 'Paid',
    'status.unpaid': 'Unpaid',
    'status.overdue': 'Overdue',
    'status.partial': 'Partial',
    'status.refunded': 'Refunded',
    'status.approved': 'Approved',
    'status.rejected': 'Rejected',
    'messages.success': 'Operation successful',
    'messages.error': 'An error occurred',
    'messages.saved': 'Changes saved successfully',
    'messages.deleted': 'Deleted successfully',
    'messages.noData': 'No data available',
    'messages.loading': 'Loading...',
    'messages.confirmDelete': 'Are you sure you want to delete this?',
    'messages.unsavedChanges': 'You have unsaved changes. Are you sure you want to leave?',
    'time.today': 'Today',
    'time.yesterday': 'Yesterday',
    'time.tomorrow': 'Tomorrow',
    'time.thisWeek': 'This Week',
    'time.thisMonth': 'This Month',
    'time.lastMonth': 'Last Month',
    'pagination.page': 'Page',
    'pagination.of': 'of',
    'pagination.showing': 'Showing',
    'pagination.entries': 'entries',
    'pagination.perPage': 'Per page',
    'pagination.previous': 'Previous',
    'pagination.next': 'Next',
  },

  // ── Feature namespaces (flat keys — strip redundant prefix) ──
  appointmentTypes: stripPrefix('appointmentTypes', appointmentTypes),
  appointments: stripPrefix('appointments', appointments),
  attendance: stripPrefix('attendance', attendance),
  auditLogs: stripPrefix('auditLogs', auditLogs),
  auth: stripPrefix('auth', auth),
  branches: stripPrefix('branches', branches),
  cbct: stripPrefix('cbct', cbct),
  commissions: stripPrefix('commissions', commissions),
  consent: stripPrefix('consent', consent),
  dashboard: stripPrefix('dashboard', dashboard),
  dentalCharts: stripPrefix('dentalCharts', dentalCharts),
  onboarding: stripPrefix('onboarding', onboarding),
  onlineBookings: stripPrefix('onlineBookings', onlineBookings),
  operations: stripPrefix('operations', operations),
  patients: stripPrefix('patients', patients),
  payments: stripPrefix('payments', payments),
  prescriptions: stripPrefix('prescriptions', prescriptions),
  procedureNotes: stripPrefix('procedureNotes', procedureNotes),
  profile: stripPrefix('profile', profile),
  reports: stripPrefix('reports', reports),
  scans: stripPrefix('scans', scans),
  schedules: stripPrefix('schedules', schedules),
  services: stripPrefix('services', services),

  // ── Locale namespaces (nested → flattened) ──
  dentalLabs: flatten(_dentalLabs),
  doctors: flatten(_doctors),
  documents: flatten(_documents),
  installments: flatten(_installments),
  insurance: flatten(_insurance),
  inventory: flatten(_inventory),
  invoices: flatten(_invoices),
  labOrders: flatten(_labOrders),
  labOrderTypes: flatten(_labOrderTypes),
  leave: flatten(_leave),
  medications: flatten(_medications),
  notifications: flatten(_notifications),

  // ── Key namespaces (nested → flattened) ──
  settings: flatten(_settings),
  subscription: flatten(_subscription),
  support: flatten(_support),
  treatmentPlans: flatten(_treatmentPlans),
  users: flatten(_users),
  webhooks: flatten(_webhooks),
  xrays: flatten(_xrays),
  docs: flatten(_docs),
  platformNotes: flatten(_platformNotes),
  uploads: flatten(_uploads),
  components: flatten(_components),
};
