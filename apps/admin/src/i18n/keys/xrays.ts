/**
 * X-Rays feature — Translation keys
 * Sources: XrayUploadPage.tsx, XrayListPage.tsx, XrayDetailPage.tsx,
 *          ImagingTimeline.tsx, ImagingLinker.tsx
 */

export const xrays = {
  // ── Shared option labels ──────────────────────────────
  types: {
    periapical: 'Periapical',
    bitewing: 'Bitewing',
    panoramic: 'Panoramic',
    occlusal: 'Occlusal',
    cephalometric: 'Cephalometric',
    other: 'Other',
  },
  purposes: {
    diagnostic: 'Diagnostic',
    preTreatment: 'Pre-treatment',
    postTreatment: 'Post-treatment',
    followUp: 'Follow-up',
    emergency: 'Emergency',
    routineScreening: 'Routine Screening',
  },
  regions: {
    upperLeft: 'Upper Left',
    upperRight: 'Upper Right',
    lowerLeft: 'Lower Left',
    lowerRight: 'Lower Right',
    fullMouth: 'Full Mouth',
    anterior: 'Anterior',
    posterior: 'Posterior',
  },

  // ── Upload page ───────────────────────────────────────
  upload: {
    title: 'Upload X-Ray',
    description: 'Upload a new X-ray image and fill in clinical metadata.',
    back: 'Back',
    imageSection: 'X-Ray Image',
    patientDoctor: 'Patient & Doctor',
    patient: 'Patient *',
    doctor: 'Doctor *',
    details: 'Details',
    titleField: 'Title *',
    xrayType: 'X-Ray Type *',
    clinicalPurpose: 'Clinical Purpose',
    region: 'Region',
    toothNumbers: 'Tooth Numbers',
    capturedDate: 'Captured Date',
    linkTreatmentPlan: 'Link Treatment Plan (optional)',
    linkProcedureNote: 'Link Procedure Note (optional)',
    dropzoneText: 'Drag & drop X-ray image here (JPG, PNG, DICOM — max 25MB)',
  },

  // ── Upload toasts ─────────────────────────────────────
  uploadToast: {
    noImage: 'Please upload an X-ray image first',
    noPatient: 'Please select a patient',
    noDoctor: 'Please select a doctor',
    noTitle: 'Please enter a title',
    success: 'X-ray uploaded successfully',
    failed: 'Failed to save X-ray',
  },

  // ── List page ─────────────────────────────────────────
  list: {
    title: 'X-Rays',
    description: 'Manage patient X-Ray images and metadata',
    uploadButton: 'Upload X-Ray',
    columns: {
      title: 'Title',
      type: 'Type',
      teeth: 'Teeth',
      purpose: 'Purpose',
      links: 'Links',
      captured: 'Captured',
    },
    linked: 'Linked',
    unlinked: 'Unlinked',
    searchPlaceholder: 'Search by title, findings...',
    allTypes: 'All Types',
    allPurposes: 'All Purposes',
    dropdownViewDetails: 'View Details',
    dropdownOpenImage: 'Open Image',
    dropdownDelete: 'Delete',
    emptyTitle: 'No x-rays found',
    emptyDescription: 'Upload x-ray images to get started.',
  },

  // ── Delete confirmation ───────────────────────────────
  deleteDialog: {
    title: 'Delete x-ray?',
    description:
      'This will permanently delete this x-ray image and its metadata. This action cannot be undone.',
  },

  // ── List toasts ───────────────────────────────────────
  listToast: {
    deleted: 'X-Ray deleted',
    deleteFailed: 'Failed to delete',
  },

  // ── Detail page ───────────────────────────────────────
  detail: {
    imageTab: 'Image',
    notFound: 'X-Ray Not Found',
    back: 'Back',
    edit: 'Edit',
    openOriginal: 'Open Original',
    delete: 'Delete',
    noImageAvailable: 'No image available',
    detailsCard: 'Details',
    type: 'Type',
    purpose: 'Purpose',
    region: 'Region',
    captured: 'Captured',
    uploaded: 'Uploaded',
    teethCard: 'Teeth',
    clinicalNotes: 'Clinical Notes',
    notes: 'Notes',
    findings: 'Findings',
    crossLinksCard: 'Cross-Links',
    treatmentPlan: 'Treatment Plan',
    procedureNote: 'Procedure Note',
    dentalChart: 'Dental Chart',
    noLinksYet: 'No cross-links yet',
  },

  // ── Viewer / Annotations ──────────────────────────────
  viewer: {
    annotationPlaceholder: 'Add a note for this annotation...',
    addButton: 'Add',
    cancel: 'Cancel',
    annotationsTitle: 'Annotations',
    saveChanges: 'Save Changes',
    noNote: 'No note',
    saved: 'Saved',
    save: 'Save',
  },

  // ── Viewer toasts ─────────────────────────────────────
  viewerToast: {
    annotationsSaved: 'Annotations saved',
    annotationsFailed: 'Failed to save annotations',
  },

  // ── Edit dialog ───────────────────────────────────────
  editDialog: {
    title: 'Edit X-Ray Details',
    description: 'Update the metadata for this X-ray.',
    titleField: 'Title *',
    type: 'Type',
    purpose: 'Purpose',
    none: 'None',
    region: 'Region',
    toothNumbers: 'Tooth Numbers',
    toothNumbersPlaceholder: '14, 15, 16',
    notes: 'Notes',
    findings: 'Findings',
    cancel: 'Cancel',
    saveChanges: 'Save Changes',
  },

  // ── Edit toasts ───────────────────────────────────────
  editToast: {
    titleRequired: 'Title is required',
    updated: 'X-ray updated',
    updateFailed: 'Failed to update',
    deleted: 'X-ray deleted',
    deleteFailed: 'Failed to delete',
  },

  // ── Imaging Timeline ──────────────────────────────────
  timeline: {
    title: 'Imaging Timeline',
    total: 'total',
    loading: 'Loading imaging history...',
    empty: 'No imaging records yet',
    badgeXray: 'X-Ray',
    badgeCbct: 'CBCT',
    teethPrefix: 'Teeth:',
    linked: 'Linked',
  },

  // ── Imaging Linker ────────────────────────────────────
  linker: {
    titlePrefix: 'Link Images to',
    targetLabels: {
      treatmentPlan: 'Treatment Plan',
      procedureNote: 'Procedure Note',
      dentalChart: 'Dental Chart',
    },
    tabs: {
      xrays: 'X-Rays',
      cbct: 'CBCT',
    },
    loadingXrays: 'Loading unlinked X-Rays...',
    allXraysLinked: 'All X-Rays are linked',
    loadingCbct: 'Loading unlinked CBCT scans...',
    allCbctLinked: 'All CBCT scans are linked',
    teethPrefix: 'Teeth:',
    selectedCount: 'selected',
    xrayCount: 'X-Ray',
    cbctCount: 'CBCT',
    linking: 'Linking...',
    linkButton: 'Link',
    imagesSuffix: 'Image(s)',
  },

  // ── Linker toasts ─────────────────────────────────────
  linkerToast: {
    linkedSuccess: 'image(s) linked successfully',
    linkFailed: 'Failed to link images',
  },
} as const;
