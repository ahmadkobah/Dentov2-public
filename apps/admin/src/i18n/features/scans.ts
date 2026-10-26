export const scans = {
  // ── List Page ──
  'scans.title': '3D Scans',
  'scans.subtitle': 'Manage intraoral 3D scan files',
  'scans.newScan': 'Upload Scan',
  'scans.searchPlaceholder': 'Search by scan #, patient...',

  // Table columns
  'scans.col.scanNumber': 'Scan #',
  'scans.col.patient': 'Patient',
  'scans.col.type': 'Type',
  'scans.col.formats': 'Formats',
  'scans.col.size': 'Size',
  'scans.col.status': 'Status',
  'scans.col.date': 'Date',

  // Filters
  'scans.filter.allTypes': 'All Types',
  'scans.filter.allStatuses': 'All Statuses',

  // Scan type labels
  'scans.type.fullArch': 'Full Arch',
  'scans.type.upperArch': 'Upper Arch',
  'scans.type.lowerArch': 'Lower Arch',
  'scans.type.bite': 'Bite Registration',
  'scans.type.singleTooth': 'Single Tooth',
  'scans.type.other': 'Other',

  // Status labels
  'scans.status.uploaded': 'Uploaded',
  'scans.status.ready': 'Ready',
  'scans.status.error': 'Error',

  // Actions
  'scans.action.view': 'View Details',
  'scans.action.delete': 'Delete',
  'scans.action.download': 'Download ZIP',
  'scans.action.viewModel': 'View 3D Model',
  'scans.action.hideViewer': 'Hide 3D Model',

  // Toast
  'scans.toast.created': '3D scan uploaded successfully',
  'scans.toast.deleted': '3D scan deleted',
  'scans.toast.deleteFailed': 'Failed to delete scan',
  'scans.toast.createFailed': 'Failed to upload scan',
  'scans.toast.downloadFailed': 'Failed to download scan file',

  // Confirm dialogs
  'scans.confirm.deleteTitle': 'Delete 3D scan?',
  'scans.confirm.deleteDesc':
    'Scan {{number}} will be permanently deleted. This action cannot be undone.',

  // Empty / Error
  'scans.empty.title': 'No scans found',
  'scans.empty.desc': 'Upload a 3D scan to get started.',
  'scans.error.load': 'Failed to load scans',
  'scans.error.notFound': 'Scan not found',

  // ── Form Page ──
  'scans.form.title': 'Upload 3D Scan',
  'scans.form.subtitle': 'Upload an intraoral scan ZIP package for a patient.',
  'scans.form.patientSection': 'Patient & Doctor',
  'scans.form.patient': 'Patient *',
  'scans.form.doctor': 'Doctor *',
  'scans.form.branch': 'Branch',
  'scans.form.selectBranch': 'Select branch',
  'scans.form.scanSection': 'Scan Details',
  'scans.form.scanType': 'Scan Type',
  'scans.form.scannerModel': 'Scanner Model',
  'scans.form.scannerModelPlaceholder': 'e.g. iTero Element 5D',
  'scans.form.scanDate': 'Scan Date',
  'scans.form.notes': 'Notes',
  'scans.form.notesPlaceholder': 'Optional clinical notes...',
  'scans.form.uploadSection': 'Scan File',
  'scans.form.uploadHint': 'Upload a ZIP archive or individual 3D model file (STL, PLY, OBJ).',
  'scans.form.dropZip': 'Drop file here or click to browse',
  'scans.form.uploadedSize': 'Uploaded: {{size}} MB',
  'scans.form.submit': 'Upload Scan',
  'scans.form.validation.selectPatient': 'Please select a patient',
  'scans.form.validation.selectDoctor': 'Please select a doctor',
  'scans.form.validation.uploadFile': 'Please upload a scan file',

  // ── Detail Page ──
  'scans.detail.subtitle': 'Scan Details',
  'scans.detail.scanInfo': 'Scan Information',
  'scans.detail.fileInfo': 'File Information',
  'scans.detail.notes': 'Notes',
  'scans.detail.originalSize': 'Original Size',
  'scans.detail.fileCount': 'File Count',
  'scans.detail.created': 'Created',

  // ── 3D Viewer ──
  'scans.viewer.title': '3D Viewer',
  'scans.viewer.loading': 'Loading 3D model...',
  'scans.viewer.controls': 'Left-click to rotate • Scroll to zoom • Right-click to pan',
  'scans.viewer.views': 'Views',
  'scans.viewer.front': 'Front',
  'scans.viewer.back': 'Back',
  'scans.viewer.left': 'Left',
  'scans.viewer.right': 'Right',
  'scans.viewer.top': 'Top',
  'scans.viewer.bottom': 'Bottom',
  'scans.viewer.wireframe': 'Wireframe',
  'scans.viewer.flatShading': 'Flat Shading',
  'scans.viewer.autoRotate': 'Auto Rotate',
  'scans.viewer.measure': 'Measure',
  'scans.viewer.resetView': 'Reset View',
  'scans.viewer.zoomFit': 'Zoom to Fit',
  'scans.viewer.screenshot': 'Screenshot',
  'scans.viewer.fullscreen': 'Fullscreen',
  'scans.viewer.exitFullscreen': 'Exit Fullscreen',
  'scans.viewer.darkBg': 'Dark Background',
  'scans.viewer.lightBg': 'Light Background',
};
