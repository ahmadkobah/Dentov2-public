export const medications = {
  // ── Page ─────────────────────────────────────────────
  page: {
    title: 'Medications',
  },

  // ── Actions ──────────────────────────────────────────
  actions: {
    addMedication: 'Add Medication',
    edit: 'Edit',
    deactivate: 'Deactivate',
    restore: 'Restore',
    cancel: 'Cancel',
    saveChanges: 'Save Changes',
  },

  // ── Filters / Search ────────────────────────────────
  search: {
    placeholder: 'Search medications...',
  },
  filters: {
    category: 'Category',
    allCategories: 'All Categories',
    allStatus: 'All Status',
    active: 'Active',
    inactive: 'Inactive',
    status: 'Status',
  },

  // ── Columns ──────────────────────────────────────────
  columns: {
    name: 'Name',
    genericName: 'Generic Name',
    category: 'Category',
    form: 'Form',
    strength: 'Strength',
    status: 'Status',
  },

  // ── Status ───────────────────────────────────────────
  status: {
    active: 'Active',
    inactive: 'Inactive',
    custom: 'Custom',
    default: 'Default',
  },

  // ── Categories ───────────────────────────────────────
  categories: {
    analgesic: 'analgesic',
    antibiotic: 'antibiotic',
    antiInflammatory: 'anti-inflammatory',
    anesthetic: 'anesthetic',
    antiseptic: 'antiseptic',
    antifungal: 'antifungal',
    corticosteroid: 'corticosteroid',
    other: 'other',
  },

  // ── Dosage Forms ─────────────────────────────────────
  dosageForms: {
    tablet: 'tablet',
    capsule: 'capsule',
    syrup: 'syrup',
    injection: 'injection',
    cream: 'cream',
    gel: 'gel',
    mouthwash: 'mouthwash',
    drops: 'drops',
    spray: 'spray',
    powder: 'powder',
    other: 'other',
  },

  // ── Empty / Error ────────────────────────────────────
  empty: {
    title: 'No medications found',
    description: 'Medications will appear here once seeded or created.',
  },
  error: {
    loadFailed: 'Failed to load medications',
  },

  // ── Dialogs ──────────────────────────────────────────
  dialog: {
    deactivateTitle: 'Deactivate medication?',
    deactivateDescription: '"{{name}}" will be marked inactive and hidden from prescription forms.',
    confirmDeactivate: 'Deactivate',
    addTitle: 'Add Medication',
    editTitle: 'Edit Medication',
    addDescription: 'Fill in the details to add a new medication to the catalog.',
    editDescription: 'Update the medication details below.',
  },

  // ── Form ─────────────────────────────────────────────
  form: {
    labels: {
      nameEnglish: 'Name (English) *',
      nameArabic: 'Name (Arabic)',
      genericName: 'Generic Name',
      category: 'Category *',
      dosageForm: 'Dosage Form *',
      strength: 'Strength',
      defaultDosage: 'Default Dosage',
      defaultFrequency: 'Default Frequency',
      defaultDuration: 'Default Duration',
      instructionsEnglish: 'Instructions (English)',
      instructionsArabic: 'Instructions (Arabic)',
    },
    placeholders: {
      nameEnglish: 'e.g. Amoxicillin',
      nameArabic: 'e.g. أموكسيسيلين',
      genericName: 'e.g. Amoxicillin trihydrate',
      strength: 'e.g. 500mg',
      defaultDosage: 'e.g. 500mg',
      defaultFrequency: 'e.g. 3x daily',
      defaultDuration: 'e.g. 7 days',
      instructionsEnglish: 'e.g. Take after meals',
      instructionsArabic: 'مثلاً: يؤخذ بعد الأكل',
    },
  },

  // ── Toasts ───────────────────────────────────────────
  toast: {
    deactivated: 'Medication deactivated',
    deactivateFailed: 'Failed to deactivate',
    restored: 'Medication restored',
    restoreFailed: 'Failed to restore',
    nameRequired: 'Name (English) is required',
    updated: 'Medication updated',
    created: 'Medication created',
    updateFailed: 'Failed to update medication',
    createFailed: 'Failed to create medication',
  },
} as const;
