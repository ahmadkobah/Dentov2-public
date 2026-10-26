export const dentalCharts = {
  // ── Page ──
  'dentalCharts.title': 'Dental Chart',
  'dentalCharts.selectPatient': 'Select a patient to view their dental chart',
  'dentalCharts.selectTeeth': 'Select teeth to begin charting',
  'dentalCharts.navigateHint': 'Navigate from a patient profile to view their dental chart.',
  'dentalCharts.sessionCount': '{{count}} conditions in this session',
  'dentalCharts.noConditions': 'No conditions in this session',

  // Action buttons
  'dentalCharts.printBtn': 'Print',
  'dentalCharts.snapshotBtn': 'Snapshot',

  // Tabs
  'dentalCharts.tab.chart': 'Chart',
  'dentalCharts.tab.history': 'History',
  'dentalCharts.tab.compare': 'Compare',

  // Toolbar
  'dentalCharts.dentition': 'Dentition:',
  'dentalCharts.dentition.adult': 'Adult',
  'dentalCharts.dentition.child': 'Child',

  // Condition names
  'dentalCharts.condition.healthy': 'healthy',
  'dentalCharts.condition.cavity': 'cavity',
  'dentalCharts.condition.crown': 'crown',
  'dentalCharts.condition.bridge': 'bridge',
  'dentalCharts.condition.implant': 'implant',
  'dentalCharts.condition.missing': 'missing',
  'dentalCharts.condition.rct': 'rct',
  'dentalCharts.condition.filling': 'filling',
  'dentalCharts.condition.extractionNeeded': 'extraction needed',
  'dentalCharts.condition.periodontal': 'periodontal',
  'dentalCharts.condition.veneer': 'veneer',
  'dentalCharts.condition.temporary': 'temporary',
  'dentalCharts.condition.pontic': 'pontic',

  // Severity
  'dentalCharts.severity.none': 'None',
  'dentalCharts.severity.mild': 'Mild',
  'dentalCharts.severity.moderate': 'Moderate',
  'dentalCharts.severity.severe': 'Severe',

  // Trigger labels
  'dentalCharts.trigger.manual': 'Manual',
  'dentalCharts.trigger.toothUpdate': 'Tooth Update',
  'dentalCharts.trigger.procedureNote': 'Procedure Note',
  'dentalCharts.trigger.treatmentPlan': 'Treatment Plan',

  // ── Detail Panel ──
  'dentalCharts.detail.toothNumber': 'Tooth #{{number}}',
  'dentalCharts.detail.teethSelected': '{{count}} teeth selected:',
  'dentalCharts.detail.surfaces': 'Surfaces',
  'dentalCharts.detail.condition': 'Condition',
  'dentalCharts.detail.severity': 'Severity',
  'dentalCharts.detail.notes': 'Notes',
  'dentalCharts.detail.notesPlaceholder': 'Optional notes...',
  'dentalCharts.detail.saveBtn': 'Save',

  // ── History Tab ──
  'dentalCharts.history.loadFailed': 'Failed to load chart history.',
  'dentalCharts.history.noSnapshots': 'No snapshots recorded yet.',
  'dentalCharts.history.chartedTooth': '{{count}} charted tooth',
  'dentalCharts.history.chartedTeeth': '{{count}} charted teeth',
  'dentalCharts.history.procedureNoteTooth': '{{count}} procedure note tooth',
  'dentalCharts.history.procedureNoteTeeth': '{{count}} procedure note teeth',
  'dentalCharts.history.page': 'Page {{current}} of {{total}} ({{count}} snapshots)',
  'dentalCharts.history.previous': 'Previous',
  'dentalCharts.history.next': 'Next',

  // ── Compare Tab ──
  'dentalCharts.compare.minSnapshots': 'At least 2 snapshots are required for comparison.',
  'dentalCharts.compare.snapshotA': 'Snapshot A',
  'dentalCharts.compare.snapshotB': 'Snapshot B',
  'dentalCharts.compare.selectPlaceholder': 'Select snapshot',
  'dentalCharts.compare.compareBtn': 'Compare',
  'dentalCharts.compare.toothCharted': '{{count}} tooth charted',
  'dentalCharts.compare.teethCharted': '{{count}} teeth charted',

  // ── Snapshot Dialog ──
  'dentalCharts.snapshot.title': 'Save Chart Snapshot',
  'dentalCharts.snapshot.notesLabel': 'Notes (optional)',
  'dentalCharts.snapshot.notesPlaceholder': 'e.g. Pre-treatment baseline',
  'dentalCharts.snapshot.cancelBtn': 'Cancel',
  'dentalCharts.snapshot.saveBtn': 'Save Snapshot',

  // Toast
  'dentalCharts.toast.saved': 'Chart entry saved',
  'dentalCharts.toast.snapshotSaved': 'Chart snapshot saved',
  'dentalCharts.toast.saveFailed': 'Failed to save chart entry',
  'dentalCharts.toast.snapshotFailed': 'Failed to save snapshot',

  // ── Print View ──
  'dentalCharts.print.title': 'Dental Chart Report',
  'dentalCharts.print.generated': 'Generated:',
  'dentalCharts.print.at': 'at',
  'dentalCharts.print.legend': 'Legend',
  'dentalCharts.print.summary': 'Summary',
  'dentalCharts.print.summaryColCondition': 'Condition',
  'dentalCharts.print.summaryColCount': 'Count',
  'dentalCharts.print.totalTeethCharted': 'Total teeth charted',
  'dentalCharts.print.toothDetails': 'Tooth Details',
  'dentalCharts.print.colToothNumber': 'Tooth #',
  'dentalCharts.print.colCondition': 'Condition',
  'dentalCharts.print.colSurfaces': 'Surfaces',
  'dentalCharts.print.colNotes': 'Notes',
  'dentalCharts.print.latestSnapshotNotes': 'Latest Snapshot Notes',
  'dentalCharts.print.recorded': 'Recorded:',

  // ── Tooth Surface SVG ──
  'dentalCharts.surface.occlusal': 'occlusal surface',
  'dentalCharts.surface.mesial': 'mesial surface',
  'dentalCharts.surface.distal': 'distal surface',
  'dentalCharts.surface.buccal': 'buccal surface',
  'dentalCharts.surface.lingual': 'lingual surface',
} as const;
