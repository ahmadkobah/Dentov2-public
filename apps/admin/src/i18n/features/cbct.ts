export const cbct = {
  // ── List Page ──
  'cbct.title': 'CBCT Orders',
  'cbct.subtitle': 'Manage Cone Beam CT scan orders',
  'cbct.newOrder': 'New CBCT Order',
  'cbct.searchPlaceholder': 'Search by order #, indication...',

  // Table columns
  'cbct.col.orderNumber': 'Order #',
  'cbct.col.patient': 'Patient',
  'cbct.col.indication': 'Indication',
  'cbct.col.priority': 'Priority',
  'cbct.col.status': 'Status',
  'cbct.col.scheduled': 'Scheduled',
  'cbct.col.report': 'Report',

  // Filters
  'cbct.filter.allStatuses': 'All Statuses',
  'cbct.filter.allPriorities': 'All Priorities',

  // Status options
  'cbct.status.pending': 'Pending',
  'cbct.status.scheduled': 'Scheduled',
  'cbct.status.completed': 'Completed',
  'cbct.status.reported': 'Reported',
  'cbct.status.cancelled': 'Cancelled',

  // Priority options
  'cbct.priority.normal': 'Normal',
  'cbct.priority.high': 'High',
  'cbct.priority.urgent': 'Urgent',
  'cbct.priority.low': 'Low',

  // Actions dropdown
  'cbct.action.viewDetails': 'View Details',
  'cbct.action.schedule': 'Schedule',
  'cbct.action.markCompleted': 'Mark Completed',
  'cbct.action.markReported': 'Mark Reported',
  'cbct.action.cancel': 'Cancel',
  'cbct.action.delete': 'Delete',

  // Toast
  'cbct.toast.created': 'CBCT order created',
  'cbct.toast.updated': 'CBCT order updated',
  'cbct.toast.deleted': 'CBCT order deleted',
  'cbct.toast.cancelled': 'CBCT order cancelled',
  'cbct.toast.statusUpdated': 'CBCT order status updated',
  'cbct.toast.createFailed': 'Failed to create CBCT order',
  'cbct.toast.updateFailed': 'Failed to update CBCT order',
  'cbct.toast.deleteFailed': 'Failed to delete CBCT order',

  // Confirm
  'cbct.confirm.deleteTitle': 'Delete CBCT order?',
  'cbct.confirm.deleteDesc': 'This action cannot be undone.',
  'cbct.confirm.cancelTitle': 'Cancel CBCT Order',
  'cbct.confirm.cancelDesc': 'Are you sure you want to cancel this CBCT order?',

  // Empty / Error
  'cbct.empty.title': 'No CBCT orders found',
  'cbct.empty.desc': 'Create a new CBCT order to get started.',
  'cbct.error.load': 'Failed to load CBCT orders',

  // ── Form Page ──
  'cbct.form.title': 'New CBCT Order',
  'cbct.form.subtitle': 'Request a new Cone-Beam CT scan for a patient.',
  'cbct.form.backBtn': 'Back',

  // Form sections
  'cbct.form.section.patientDoctor': 'Patient & Requesting Doctor',
  'cbct.form.section.orderDetails': 'Order Details',
  'cbct.form.section.scheduling': 'Scheduling (Optional)',

  // Form labels
  'cbct.form.patient': 'Patient *',
  'cbct.form.doctor': 'Requesting Doctor *',
  'cbct.form.branch': 'Branch',
  'cbct.form.purpose': 'Clinical Purpose',
  'cbct.form.priority': 'Priority',
  'cbct.form.indication': 'Indication',
  'cbct.form.clinicalNotes': 'Clinical Notes',
  'cbct.form.scheduledDate': 'Scheduled Date',
  'cbct.form.scheduledTime': 'Scheduled Time',
  'cbct.form.cancelBtn': 'Cancel',
  'cbct.form.submitBtn': 'Create Order',

  // Purpose options
  'cbct.form.purpose.implantPlanning': 'Implant Planning',
  'cbct.form.purpose.endodonticEvaluation': 'Endodontic Evaluation',
  'cbct.form.purpose.orthodonticAssessment': 'Orthodontic Assessment',
  'cbct.form.purpose.surgicalPlanning': 'Surgical Planning',
  'cbct.form.purpose.tmjEvaluation': 'TMJ Evaluation',
  'cbct.form.purpose.pathologyAssessment': 'Pathology Assessment',
  'cbct.form.purpose.airwayAnalysis': 'Airway Analysis',
  'cbct.form.purpose.other': 'Other',

  // Validation
  'cbct.form.validation.selectPatient': 'Please select a patient',
  'cbct.form.validation.selectDoctor': 'Please select a requesting doctor',

  // ── Detail Page ──
  'cbct.detail.notFound': 'Order Not Found',
  'cbct.detail.backBtn': 'Back',
  'cbct.detail.editBtn': 'Edit',
  'cbct.detail.deleteBtn': 'Delete',

  // Status action buttons
  'cbct.detail.markScheduled': 'Mark Scheduled',
  'cbct.detail.markCompleted': 'Mark Completed',
  'cbct.detail.markReported': 'Mark Reported',
  'cbct.detail.cancelOrder': 'Cancel Order',

  // Detail sections
  'cbct.detail.section.orderDetails': 'Order Details',
  'cbct.detail.section.clinicalInfo': 'Clinical Info',
  'cbct.detail.section.crossLinks': 'Cross-Links',
  'cbct.detail.section.scanData': 'Scan Data',
  'cbct.detail.section.report': 'Report',

  // Detail labels
  'cbct.detail.status': 'Status',
  'cbct.detail.priority': 'Priority',
  'cbct.detail.purpose': 'Purpose',
  'cbct.detail.scheduled': 'Scheduled',
  'cbct.detail.created': 'Created',
  'cbct.detail.indication': 'Indication',
  'cbct.detail.clinicalNotes': 'Clinical Notes',

  // Scan section
  'cbct.detail.scan.file': 'File',
  'cbct.detail.scan.scanner': 'Scanner',
  'cbct.detail.scan.scannedAt': 'Scanned',
  'cbct.detail.scan.downloadDicom': 'Download DICOM',
  'cbct.detail.scan.empty': 'No scan data uploaded yet.',
  'cbct.detail.scan.updateBtn': 'Update Scan',
  'cbct.detail.scan.addBtn': 'Add Scan',

  // Scan upload dialog
  'cbct.detail.scan.uploadTitle': 'Upload Scan Data',
  'cbct.detail.scan.updateTitle': 'Update Scan Data',

  // Report section
  'cbct.detail.report.radiologist': 'Radiologist',
  'cbct.detail.report.status': 'Report Status',
  'cbct.detail.report.statusDraft': 'Draft',
  'cbct.detail.report.statusFinal': 'Final',
  'cbct.detail.report.statusPending': 'Pending',
  'cbct.detail.report.findings': 'Findings',
  'cbct.detail.report.impression': 'Impression',
  'cbct.detail.report.recommendations': 'Recommendations',
  'cbct.detail.report.viewPdf': 'View Report PDF',
  'cbct.detail.report.empty': 'No report yet.',
  'cbct.detail.report.editBtn': 'Edit Report',
  'cbct.detail.report.addBtn': 'Add Report',
  'cbct.detail.report.dialogTitle': 'CBCT Report',

  // Edit order dialog
  'cbct.detail.edit.title': 'Edit CBCT Order',
  'cbct.detail.edit.desc': 'Update the order details.',

  // ── DICOM Viewer ──
  'cbct.viewer.show': 'View CBCT',
  'cbct.viewer.hide': 'Hide Viewer',
  'cbct.viewer.loading': 'Loading DICOM volume…',
  'cbct.viewer.axial': 'Axial',
  'cbct.viewer.coronal': 'Coronal',
  'cbct.viewer.sagittal': 'Sagittal',
  'cbct.viewer.windowLevel': 'W/L',
  'cbct.viewer.zoom': 'Zoom',
  'cbct.viewer.pan': 'Pan',
  'cbct.viewer.length': 'Length',
  'cbct.viewer.angle': 'Angle',
  'cbct.viewer.arrow': 'Arrow',
  'cbct.viewer.crosshairs': 'Crosshairs',
  'cbct.viewer.invert': 'Invert',
  'cbct.viewer.cine': 'CINE',
  'cbct.viewer.reset': 'Reset',
  'cbct.viewer.fullscreen': 'Fullscreen',
  'cbct.viewer.controls': 'Left: Active tool · Middle: Pan · Right: Zoom · Scroll: Slices',
  'cbct.viewer.activeTool': 'Tool',
} as const;
