/**
 * Shared Components — Translation keys
 * Sources: ErrorState.tsx, LocaleToggle.tsx, ModuleGate.tsx,
 *          SupportSessionBanner.tsx, ToothSelector.tsx,
 *          entity-selectors/*.tsx
 */

export const components = {
  // ── ErrorState ────────────────────────────────────────
  errorState: {
    defaultTitle: 'Something went wrong',
    defaultMessage: 'An unexpected error occurred.',
    retry: 'Retry',
  },

  // ── LocaleToggle ─────────────────────────────────────
  localeToggle: {
    ariaLabel: 'Toggle language',
    switchToArabic: 'Switch to Arabic',
    switchToEnglish: 'Switch to English',
  },

  // ── ModuleGate ────────────────────────────────────────
  moduleGate: {
    requiresActivation: 'This module requires activation',
    unlockPrefix: 'Unlock',
    whatYouGet: 'What you get',
    upgradePrefix: 'Upgrade Plan to Enable',
    contactAdmin: 'Contact your platform administrator to enable this module',
    // Fallback tagline for unknown modules
    defaultTagline: 'Unlock this module to access advanced features',
    defaultFeatures: {
      fullAccess: 'Full module access',
      advancedTools: 'Advanced tools & workflows',
      reportsAnalytics: 'Reports & analytics',
      apiAccess: 'API access',
    },
    // Module catalog entries
    catalog: {
      patients: {
        name: 'Patient Records',
        tagline: 'Comprehensive patient management with full medical history',
        features: {
          profiles: 'Detailed patient profiles & demographics',
          history: 'Medical history & allergy tracking',
          documents: 'Document attachments & notes',
          search: 'Advanced search & filtering',
        },
      },
      appointments: {
        name: 'Appointments',
        tagline: 'Smart scheduling with calendar views and automated reminders',
        features: {
          calendar: 'Drag-and-drop calendar scheduling',
          reminders: 'Automated SMS & email reminders',
          multiProvider: 'Multi-provider & multi-branch support',
          dailyOps: 'Daily operations queue',
        },
      },
      dentalCharts: {
        name: 'Dental Charts',
        tagline: 'Interactive dental charting with visual tooth diagrams',
        features: {
          odontogram: 'Interactive odontogram (adult & pediatric)',
          mapping: 'Condition & procedure mapping per tooth',
          history: 'Chart history & comparison',
          integration: 'Treatment integration',
        },
      },
      treatmentPlans: {
        name: 'Treatment Plans',
        tagline: 'Create, track, and manage patient treatment plans',
        features: {
          multiPhase: 'Multi-phase treatment planning',
          costEstimates: 'Cost estimates & patient approval',
          progressTracking: 'Progress tracking per procedure',
          insurance: 'Insurance pre-authorization support',
        },
      },
      procedureNotes: {
        name: 'Procedure Notes',
        tagline: 'Document clinical procedures with structured templates',
        features: {
          templates: 'Customizable procedure templates',
          prePost: 'Pre/post operative notes',
          attachments: 'Image & attachment support',
          linked: 'Linked to dental charts & treatment plans',
        },
      },
      prescriptions: {
        name: 'Prescriptions',
        tagline: 'Digital prescription management with medication tracking',
        features: {
          ePrescription: 'E-prescription generation',
          interactions: 'Drug interaction warnings',
          history: 'Prescription history per patient',
          export: 'Print & PDF export',
        },
      },
      xrays: {
        name: 'X-Rays & Imaging',
        tagline: 'Digital radiography management and DICOM viewer integration',
        features: {
          upload: 'X-ray image upload & organization',
          cbct: 'CBCT scan management',
          comparison: 'Before/after comparison tools',
          storage: 'Cloud storage & DICOM support',
        },
      },
      labOrders: {
        name: 'Lab Orders',
        tagline: 'Streamline dental lab workflows from order to delivery',
        features: {
          creation: 'Lab order creation & tracking',
          directory: 'Dental lab directory management',
          status: 'Status updates & notifications',
          cost: 'Cost tracking per order',
        },
      },
      invoices: {
        name: 'Invoices',
        tagline: 'Professional invoice generation with automatic calculations',
        features: {
          autoGenerate: 'Auto-generate from treatment plans',
          multiCurrency: 'Multi-currency support',
          taxDiscount: 'Tax & discount management',
          batch: 'Batch invoicing capabilities',
        },
      },
      payments: {
        name: 'Payments',
        tagline: 'Track and reconcile all patient payments in one place',
        features: {
          methods: 'Multiple payment method tracking',
          receipts: 'Payment receipts & history',
          alerts: 'Outstanding balance alerts',
          reconciliation: 'Payment reconciliation reports',
        },
      },
      inventory: {
        name: 'Inventory',
        tagline: 'Complete dental supply management with smart reordering',
        features: {
          stockAlerts: 'Stock level monitoring & alerts',
          reorder: 'Automated reorder suggestions',
          suppliers: 'Supplier management & purchase orders',
          expiry: 'Expiry tracking & batch management',
        },
      },
      insurance: {
        name: 'Insurance',
        tagline: 'Insurance company management and claims processing',
        features: {
          directory: 'Insurance company directory',
          claims: 'Claims submission & tracking',
          preAuth: 'Pre-authorization workflows',
          eob: 'EOB processing & reconciliation',
        },
      },
      installments: {
        name: 'Installments',
        tagline: 'Flexible payment plans for patient financial comfort',
        features: {
          customPlans: 'Custom installment plan creation',
          reminders: 'Automated payment reminders',
          overdue: 'Overdue tracking & alerts',
          schedule: 'Payment schedule management',
        },
      },
      commissions: {
        name: 'Commissions',
        tagline: 'Doctor and staff commission tracking and reporting',
        features: {
          rules: 'Configurable commission rules',
          autoCalc: 'Auto-calculate from procedures',
          reports: 'Monthly commission reports',
          multiTier: 'Multi-tier commission structures',
        },
      },
      schedules: {
        name: 'Schedules',
        tagline: 'Doctor and staff scheduling with shift management',
        features: {
          views: 'Weekly/monthly schedule views',
          templates: 'Shift templates & recurring patterns',
          exceptions: 'Schedule exceptions & overrides',
          branch: 'Branch-level scheduling',
        },
      },
      leave: {
        name: 'Leave Management',
        tagline: 'Staff leave requests, approvals, and balance tracking',
        features: {
          workflow: 'Leave request & approval workflow',
          balance: 'Leave balance tracking per staff',
          calendar: 'Calendar integration',
          config: 'Leave type configuration',
        },
      },
      attendance: {
        name: 'Attendance',
        tagline: 'Staff attendance tracking with clock-in/out management',
        features: {
          recording: 'Daily attendance recording',
          clockInOut: 'Clock-in/out tracking',
          reports: 'Attendance reports & analytics',
          notifications: 'Late/absent notifications',
        },
      },
      consent: {
        name: 'Consent Forms',
        tagline: 'Digital consent form management with e-signatures',
        features: {
          templates: 'Customizable consent templates',
          eSignature: 'Digital signature capture',
          tracking: 'Patient acknowledgment tracking',
          compliance: 'Regulatory compliance support',
        },
      },
      reports: {
        name: 'Advanced Analytics',
        tagline: 'Detailed analytics, trend analysis, and custom reporting',
        features: {
          financial: 'Financial & revenue reports',
          demographics: 'Patient demographics & trends',
          appointmentAnalytics: 'Appointment analytics & heatmaps',
          export: 'Export to PDF, Excel & CSV',
        },
      },
      servicesCatalog: {
        name: 'Services Catalog',
        tagline: "Manage your clinic's service catalog with pricing",
        features: {
          categories: 'Service categories & organization',
          pricing: 'Multi-currency pricing',
          duration: 'Service duration & resource allocation',
          mapping: 'Treatment-to-service mapping',
        },
      },
      branches: {
        name: 'Branches',
        tagline: 'Multi-branch clinic management in one platform',
        features: {
          profiles: 'Branch profiles & settings',
          staff: 'Per-branch staff assignment',
          reporting: 'Branch-level reporting',
          sharing: 'Resource sharing configuration',
        },
      },
      doctors: {
        name: 'Doctors',
        tagline: 'Doctor profile management with specializations and availability',
        features: {
          credentials: 'Doctor profiles & credentials',
          specialization: 'Specialization tracking',
          availability: 'Availability & schedule management',
          performance: 'Performance & workload overview',
        },
      },
      notifications: {
        name: 'Notifications',
        tagline: 'Smart notification system with email, SMS, and in-app alerts',
        features: {
          multiChannel: 'Multi-channel notifications',
          alertRules: 'Customizable alert rules',
          templates: 'Notification templates',
          delivery: 'Delivery tracking & logs',
        },
      },
      users: {
        name: 'User Management',
        tagline: 'Role-based access control and staff account management',
        features: {
          rbac: 'Role-based permissions (RBAC)',
          provisioning: 'Staff account provisioning',
          auditLogs: 'Activity audit logs',
          mfa: 'Multi-factor authentication',
        },
      },
      settingsModule: {
        name: 'Settings',
        tagline: 'Clinic configuration and system preferences',
        features: {
          general: 'General clinic settings',
          hours: 'Working hours configuration',
          branding: 'Branding & appearance',
          integrations: 'Integration settings',
        },
      },
      webhooks: {
        name: 'Webhooks',
        tagline: 'Real-time event notifications to external services',
        features: {
          eventDriven: 'Event-driven integrations',
          custom: 'Custom webhook endpoints',
          logs: 'Delivery logs & retry management',
          payload: 'Payload configuration',
        },
      },
      auditLogs: {
        name: 'Audit Logs',
        tagline: 'Track and monitor all system activity',
        features: {
          trail: 'Full activity audit trail',
          userTracking: 'User action tracking',
          changeHistory: 'Data change history',
          complianceReporting: 'Compliance reporting',
        },
      },
    },
  },

  // ── SupportSessionBanner ──────────────────────────────
  supportSession: {
    bannerTitle: 'Support Session Active',
    assistingPrefix: '— ',
    assistingSuffix: ' is assisting your clinic',
    expiresLabel: 'Expires:',
  },

  // ── ToothSelector ─────────────────────────────────────
  toothSelector: {
    placeholder: 'Click to select teeth...',
    selectedSuffix: 'selected',
    hint: 'Click teeth to select / deselect (FDI notation)',
  },

  // ── Entity Selectors ──────────────────────────────────
  branchCombobox: {
    placeholder: 'Select branch...',
    searchPlaceholder: 'Search by name or code...',
    empty: 'No branches found.',
  },
  doctorCombobox: {
    placeholder: 'Select doctor...',
    searchPlaceholder: 'Search by name...',
    empty: 'No doctors found.',
  },
  patientCombobox: {
    placeholder: 'Select patient...',
    searchPlaceholder: 'Search by name or code...',
    empty: 'No patients found.',
  },
  invoiceCombobox: {
    placeholder: 'Select invoice...',
    searchPlaceholder: 'Search by invoice number...',
    empty: 'No invoices found.',
  },
  procedureNoteCombobox: {
    placeholder: 'Select procedure note...',
    searchPlaceholder: 'Search by procedure name...',
    emptyForPatient: 'No notes for this patient.',
    emptyDefault: 'No procedure notes found.',
  },
  treatmentPlanCombobox: {
    placeholder: 'Select treatment plan...',
    searchPlaceholder: 'Search by title...',
    emptyForPatient: 'No plans for this patient.',
    emptyDefault: 'No treatment plans found.',
  },
} as const;
