export const notifications = {
  // ── Notifications Page ───────────────────────────────
  page: {
    title: 'Notifications',
    unreadCount: '{{count}} unread notification',
    unreadCountPlural: '{{count}} unread notifications',
    allCaughtUp: 'All caught up!',
  },

  // ── Actions ──────────────────────────────────────────
  actions: {
    showAll: 'Show All',
    unreadOnly: 'Unread Only',
    markAllRead: 'Mark All Read',
    preferences: 'Preferences',
    markAsRead: 'Mark as read',
    dismiss: 'Dismiss',
    dismissNotification: 'Dismiss notification',
  },

  // ── Relative Time ────────────────────────────────────
  relativeTime: {
    justNow: 'just now',
    minAgo: '{{count}} min ago',
    hourAgo: '{{count}} hour ago',
    hoursAgo: '{{count}} hours ago',
    yesterday: 'Yesterday',
    daysAgo: '{{count}} days ago',
  },

  // ── Filter Options ───────────────────────────────────
  filterOptions: {
    all: 'All',
    appointments: 'Appointments',
    payments: 'Payments',
    clinical: 'Clinical',
    inventory: 'Inventory',
    system: 'System',
    marketing: 'Marketing',
    recall: 'Recall',
    queue: 'Queue',
  },

  // ── Empty / Error ────────────────────────────────────
  empty: {
    title: 'No notifications',
    allRead: 'All notifications have been read.',
    nothingForFilter: 'Nothing to show for this filter.',
  },
  error: {
    loadFailed: 'Failed to load notifications',
    checkConnection: 'Please check your connection and try again.',
  },

  // ── Templates Page ───────────────────────────────────
  templates: {
    page: {
      title: 'Notification Templates',
      description: 'Manage reusable notification templates for all channels',
    },
    actions: {
      newTemplate: 'New Template',
      createTemplate: 'Create template',
      editTemplate: 'Edit template',
      deleteTemplate: 'Delete template',
      toggleTemplate: 'Toggle template',
    },
    search: {
      ariaLabel: 'Search templates',
      placeholder: 'Search by name or key...',
    },
    categories: {
      all: 'All',
      appointment: 'Appointment',
      payment: 'Payment',
      clinical: 'Clinical',
      inventory: 'Inventory',
      system: 'System',
      marketing: 'Marketing',
      recall: 'Recall',
      queue: 'Queue',
    },
    channels: {
      email: 'Email',
      sms: 'SMS',
      whatsapp: 'WhatsApp',
      push: 'Push Notification',
      inApp: 'In-App',
    },
    triggerLabels: {
      auto: 'Auto',
      manual: 'Manual',
      scheduled: 'Scheduled',
    },
    channelStatus: {
      enabled: 'Enabled',
      disabled: 'Disabled',
    },
    empty: {
      title: 'No templates found',
      adjustFilter: 'Try adjusting your search or filter.',
      createFirst: 'Create your first notification template to get started.',
    },
    error: {
      loadFailed: 'Failed to load templates',
      tryAgain: 'Please try again later.',
    },
  },

  // ── Template Form Dialog ─────────────────────────────
  templateForm: {
    createTitle: 'Create Template',
    editTitle: 'Edit Template',
    labels: {
      templateKey: 'Template Key',
      category: 'Category',
      nameEnglish: 'Name (English)',
      nameArabic: 'Name (Arabic)',
      trigger: 'Trigger',
      descriptionOptional: 'Description (optional)',
    },
    placeholders: {
      templateKey: 'e.g. appointment_reminder',
      templateName: 'Template name',
      nameArabic: 'اسم القالب',
      description: 'Briefly describe this template',
    },
    channels: {
      title: 'Channels',
      enableAtLeastOne: 'Enable at least one channel',
      subjectEn: 'Subject (EN)',
      subjectAr: 'Subject (AR)',
      bodyEn: 'Body (EN)',
      bodyAr: 'Body (AR)',
      templateEn: 'Template (EN)',
      templateAr: 'Template (AR)',
      templateId: 'WhatsApp Template ID',
      titleEn: 'Title (EN)',
      titleAr: 'Title (AR)',
      icon: 'Icon',
      actionUrl: 'Action URL',
    },
    variables: {
      title: 'Template Variables',
      addVariable: 'Add Variable',
      removeVariable: 'Remove',
      removeVariableAria: 'Remove variable',
      keyLabel: 'Key',
      labelEn: 'Label (EN)',
      labelAr: 'Label (AR)',
      required: 'Required',
    },
  },

  // ── Alert Rules Page ─────────────────────────────────
  alertRules: {
    page: {
      title: 'Alert Rules',
      description: 'Configure automated alerts for clinic operations',
    },
    actions: {
      newRule: 'New Rule',
      createAlertRule: 'Create alert rule',
      edit: 'Edit',
      editRule: 'Edit rule',
      delete: 'Delete',
      deleteRule: 'Delete rule',
      deactivateRule: 'Deactivate rule',
      activateRule: 'Activate rule',
    },
    search: {
      placeholder: 'Search rules...',
    },
    triggerTypes: {
      lowStock: 'Low Stock',
      noShow: 'No Show',
      paymentOverdue: 'Payment Overdue',
      recallDue: 'Recall Due',
      queueThreshold: 'Queue Threshold',
      systemAlert: 'System Alert',
      clinicalAlert: 'Clinical Alert',
      all: 'All',
    },
    stats: {
      cooldown: '{{minutes}}m cooldown',
      triggers: '{{count}} triggers',
      dWindow: '({{days}}d window)',
    },
    empty: {
      noMatch: 'No alert rules match your filters',
      noRules: 'No alert rules configured yet',
    },
    error: {
      loadFailed: 'Failed to load alert rules',
    },
  },

  // ── Bulk Notification Modal ──────────────────────────
  bulk: {
    title: 'Bulk Notification',
    description: 'Send notifications to multiple recipients',
    audience: {
      label: 'Audience',
      allPatients: 'All Patients',
      allPatientsDesc: 'Send to all active patients',
      allStaff: 'All Staff',
      allStaffDesc: 'Send to all active staff members',
      patientGroup: 'Patient Group',
      patientGroupDesc: 'Filter patients by tags or visit date',
    },
    template: {
      label: 'Template',
      placeholder: 'Select notification template',
      noTemplates: 'No templates available',
    },
    channels: {
      label: 'Channels',
      inApp: 'In-App',
      email: 'Email',
      sms: 'SMS',
      whatsapp: 'WhatsApp',
      push: 'Push',
    },
    variables: {
      label: 'Message Variables',
      clinicName: 'Clinic Name',
      customMessage: 'Custom message (optional)',
    },
    actions: {
      cancel: 'Cancel',
      send: 'Send Notification',
      sending: 'Sending...',
    },
    toast: {
      sent: 'Sent to {{count}} recipients',
      sendFailed: 'Failed to send bulk notification',
      selectTemplate: 'Please select a notification template',
      selectChannel: 'Please select at least one channel',
    },
  },
} as const;
