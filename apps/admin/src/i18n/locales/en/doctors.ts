export const doctors = {
  // ── Page ─────────────────────────────────────────────
  page: {
    title: 'Doctors',
    description: 'Manage clinic doctors and their availability',
  },

  // ── Actions ──────────────────────────────────────────
  actions: {
    syncDoctors: 'Sync Doctors',
    edit: 'Edit',
    deactivate: 'Deactivate',
    activate: 'Activate',
    remove: 'Remove',
    back: 'Back',
    removeDoctor: 'Remove Doctor',
    clear: 'Clear',
    saving: 'Saving...',
    saveChanges: 'Save Changes',
  },

  // ── Filters / Search ────────────────────────────────
  search: {
    placeholder: 'Search by name, specialization...',
  },
  filters: {
    allSpecializations: 'All Specializations',
    specialization: 'Specialization',
    all: 'All',
    active: 'Active',
    inactive: 'Inactive',
    status: 'Status',
    searchPlaceholder: 'Search by name, specialization...',
  },

  // ── Columns ──────────────────────────────────────────
  columns: {
    doctor: 'Doctor',
    specialization: 'Specialization',
    scheduling: 'Scheduling',
    availability: 'Availability',
    status: 'Status',
  },

  // ── Cell Text ────────────────────────────────────────
  cell: {
    slotDuration: '{{duration}}min slots',
    maxPerDay: 'Max {{count}}/day',
    accepting: 'Accepting',
    notAccepting: 'Not Accepting',
    onlineBooking: 'Online Booking',
  },

  // ── Status ───────────────────────────────────────────
  status: {
    active: 'Active',
    inactive: 'Inactive',
  },

  // ── Toasts ───────────────────────────────────────────
  toast: {
    syncedDoctors: 'Synced {{count}} doctor(s)',
    synced: 'Synced {{count}} doctor(s)',
    allSynced: 'All doctors are already synced',
    alreadySynced: 'All doctors are already synced',
    syncFailed: 'Failed to sync doctors',
    deactivated: 'Doctor deactivated',
    activated: 'Doctor activated',
    statusUpdateFailed: 'Failed to update doctor status',
    toggleFailed: 'Failed to update doctor status',
    removed: 'Doctor removed',
    removeFailed: 'Failed to remove doctor',
    profileUpdated: 'Doctor profile updated',
    profileUpdateFailed: 'Failed to update doctor profile',
  },

  // ── Empty / Error ────────────────────────────────────
  empty: {
    title: 'No doctors found',
    description:
      "Doctors are automatically synced when clinic users with the 'dentist' role are created.",
    syncAction: 'Sync Doctors',
  },
  error: {
    loadFailed: 'Failed to load doctor',
  },

  // ── Dialogs ──────────────────────────────────────────
  dialog: {
    deactivateTitle: 'Deactivate doctor?',
    activateTitle: 'Activate doctor?',
    removeTitle: 'Remove doctor?',
    confirmDeactivate: 'Deactivate',
    confirmActivate: 'Activate',
    confirmRemove: 'Remove',
  },

  // ── Common (used across pages) ──────────────────────
  common: {
    back: 'Back',
  },

  // ── Form ─────────────────────────────────────────────
  form: {
    // Section titles (flat keys to match component usage)
    professionalInfo: 'Professional Information',
    branchAssignment: 'Branch Assignment',
    schedulingSettings: 'Scheduling Settings',
    appearance: 'Appearance',

    // Field labels
    title: 'Title',
    specialization: 'Specialization',
    licenseNumber: 'License Number',
    displayOrder: 'Display Order',
    bio: 'Bio',
    primaryBranch: 'Primary Branch',
    defaultSlotDuration: 'Default Slot Duration (min)',
    bufferBetweenSlots: 'Buffer Between Slots (min)',
    maxDailyPatients: 'Max Daily Patients',
    acceptingNewPatients: 'Accepting New Patients',
    acceptingNewPatientsDesc: 'Show as available for new patient bookings',
    onlineBookingEnabled: 'Online Booking Enabled',
    onlineBookingEnabledDesc: 'Allow patients to book online with this doctor',
    calendarColor: 'Calendar Color',

    // Placeholders / pickers
    selectTitle: 'Select title',
    selectSpecialization: 'Select specialization',
    enterSpecialization: 'Enter specialization',
    licenseNumberPlaceholder: 'e.g. LIC-12345',
    bioPlaceholder: 'Brief professional bio...',
    selectPrimaryBranch: 'Select primary branch',
    noLimit: 'No limit',
    otherCustom: 'Other (Custom)',
    noBranches: 'No branches configured. Go to Settings > Branches to add branches.',

    // Actions / state
    clear: 'Clear',
    saving: 'Saving...',
    saveChanges: 'Save Changes',
    specializationRequired: 'Specialization is required',

    // Sub-groups still kept for places that may use the nested keys
    sections: {
      professionalInfo: 'Professional Information',
      branchAssignment: 'Branch Assignment',
      schedulingSettings: 'Scheduling Settings',
      appearance: 'Appearance',
    },
    labels: {
      title: 'Title',
      specialization: 'Specialization *',
      licenseNumber: 'License Number',
      displayOrder: 'Display Order',
      bio: 'Bio',
      primaryBranch: 'Primary Branch',
      defaultSlotDuration: 'Default Slot Duration (min)',
      bufferBetweenSlots: 'Buffer Between Slots (min)',
      maxDailyPatients: 'Max Daily Patients',
      acceptingNewPatients: 'Accepting New Patients',
      onlineBookingEnabled: 'Online Booking Enabled',
      calendarColor: 'Calendar Color',
    },
    placeholders: {
      selectTitle: 'Select title',
      selectSpecialization: 'Select specialization',
      enterSpecialization: 'Enter specialization',
      licenseNumber: 'e.g. LIC-12345',
      bio: 'Brief professional bio...',
      selectPrimaryBranch: 'Select primary branch',
      noLimit: 'No limit',
    },
    switchDescriptions: {
      acceptingNewPatients: 'Show as available for new patient bookings',
      onlineBooking: 'Allow patients to book online with this doctor',
    },
    specializations: {
      generalDentist: 'General Dentist',
      orthodontist: 'Orthodontist',
      periodontist: 'Periodontist',
      endodontist: 'Endodontist',
      prosthodontist: 'Prosthodontist',
      oralSurgeon: 'Oral Surgeon',
      pediatricDentist: 'Pediatric Dentist',
      cosmeticDentist: 'Cosmetic Dentist',
      implantologist: 'Implantologist',
      otherCustom: 'Other (Custom)',
    },
    titles: {
      dr: 'Dr.',
      prof: 'Prof.',
      assocProf: 'Assoc. Prof.',
    },
    validation: {
      specializationRequired: 'Specialization is required',
    },
  },

  // ── Detail Page ──────────────────────────────────────
  detail: {
    // dynamic content rendered from DoctorDetailPage
  },
} as const;
