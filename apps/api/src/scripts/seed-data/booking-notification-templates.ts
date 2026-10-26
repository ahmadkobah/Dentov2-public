/**
 * Booking Notification Template Seeds
 *
 * Seeds notification templates for online booking events:
 * - booking.created          → Staff: new online booking received
 * - booking.confirmed        → Patient: booking confirmed
 * - booking.confirmed_with_changes → Patient: booking confirmed with schedule changes
 * - booking.rejected         → Patient: booking rejected
 *
 * Variables available:
 *   {{patientName}}, {{doctorName}}, {{date}}, {{startTime}},
 *   {{endTime}}, {{branchName}}, {{confirmationMessage}}, {{rejectionReason}}
 */

export interface BookingNotificationTemplateSeed {
  key: string;
  name: { en: string; ar: string };
  description: string;
  category: 'appointment';
  trigger: 'automatic';
  channels: {
    email?: {
      isEnabled: boolean;
      subject: { en: string; ar: string };
      body: { en: string; ar: string };
    };
    sms?: {
      isEnabled: boolean;
      template: { en: string; ar: string };
    };
    whatsapp?: {
      isEnabled: boolean;
      template: { en: string; ar: string };
      templateId?: string;
    };
    inApp?: {
      isEnabled: boolean;
      title: { en: string; ar: string };
      body: { en: string; ar: string };
      icon?: string;
      actionUrl?: string;
    };
  };
  variables: Array<{
    key: string;
    label: { en: string; ar: string };
    isRequired: boolean;
  }>;
  isActive: boolean;
  isSystem: boolean;
}

const COMMON_VARIABLES: BookingNotificationTemplateSeed['variables'] = [
  { key: 'patientName', label: { en: 'Patient Name', ar: 'اسم المريض' }, isRequired: true },
  { key: 'doctorName', label: { en: 'Doctor Name', ar: 'اسم الطبيب' }, isRequired: true },
  { key: 'date', label: { en: 'Appointment Date', ar: 'تاريخ الموعد' }, isRequired: true },
  { key: 'startTime', label: { en: 'Start Time', ar: 'وقت البداية' }, isRequired: true },
  { key: 'endTime', label: { en: 'End Time', ar: 'وقت النهاية' }, isRequired: true },
  { key: 'branchName', label: { en: 'Branch Name', ar: 'اسم الفرع' }, isRequired: true },
];

export const bookingNotificationTemplates: BookingNotificationTemplateSeed[] = [
  // ── booking.created — Notify staff ────────────────────────
  {
    key: 'booking.created',
    name: {
      en: 'New Online Booking',
      ar: 'حجز إلكتروني جديد',
    },
    description: 'Sent to clinic staff when a new online booking is received',
    category: 'appointment',
    trigger: 'automatic',
    channels: {
      inApp: {
        isEnabled: true,
        title: {
          en: 'New Online Booking',
          ar: 'حجز إلكتروني جديد',
        },
        body: {
          en: '{{patientName}} has requested an appointment with {{doctorName}} on {{date}} at {{startTime}} — {{branchName}}',
          ar: '{{patientName}} طلب موعد مع {{doctorName}} في {{date}} الساعة {{startTime}} — {{branchName}}',
        },
        icon: 'calendar-plus',
        actionUrl: '/online-bookings',
      },
      email: {
        isEnabled: true,
        subject: {
          en: 'New Online Booking — {{patientName}}',
          ar: 'حجز إلكتروني جديد — {{patientName}}',
        },
        body: {
          en: 'A new online booking has been received.\n\nPatient: {{patientName}}\nDoctor: {{doctorName}}\nDate: {{date}}\nTime: {{startTime}} — {{endTime}}\nBranch: {{branchName}}\n\nPlease review and confirm the booking in the admin panel.',
          ar: 'تم استلام حجز إلكتروني جديد.\n\nالمريض: {{patientName}}\nالطبيب: {{doctorName}}\nالتاريخ: {{date}}\nالوقت: {{startTime}} — {{endTime}}\nالفرع: {{branchName}}\n\nيرجى مراجعة وتأكيد الحجز من لوحة الإدارة.',
        },
      },
    },
    variables: COMMON_VARIABLES,
    isActive: true,
    isSystem: true,
  },

  // ── booking.confirmed — Notify patient ────────────────────
  {
    key: 'booking.confirmed',
    name: {
      en: 'Booking Confirmed',
      ar: 'تم تأكيد الحجز',
    },
    description: 'Sent to the patient when their online booking is confirmed',
    category: 'appointment',
    trigger: 'automatic',
    channels: {
      email: {
        isEnabled: true,
        subject: {
          en: 'Your Booking is Confirmed',
          ar: 'تم تأكيد حجزك',
        },
        body: {
          en: 'Dear {{patientName}},\n\nYour appointment has been confirmed.\n\nDoctor: {{doctorName}}\nDate: {{date}}\nTime: {{startTime}} — {{endTime}}\nBranch: {{branchName}}\n\n{{confirmationMessage}}\n\nThank you for choosing our clinic.',
          ar: 'عزيزي/عزيزتي {{patientName}}،\n\nتم تأكيد موعدك.\n\nالطبيب: {{doctorName}}\nالتاريخ: {{date}}\nالوقت: {{startTime}} — {{endTime}}\nالفرع: {{branchName}}\n\n{{confirmationMessage}}\n\nشكراً لاختياركم عيادتنا.',
        },
      },
      sms: {
        isEnabled: true,
        template: {
          en: 'Your booking is confirmed! {{doctorName}} on {{date}} at {{startTime}}. {{branchName}}.',
          ar: 'تم تأكيد حجزك! {{doctorName}} في {{date}} الساعة {{startTime}}. {{branchName}}.',
        },
      },
    },
    variables: [
      ...COMMON_VARIABLES,
      {
        key: 'confirmationMessage',
        label: { en: 'Confirmation Message', ar: 'رسالة التأكيد' },
        isRequired: false,
      },
    ],
    isActive: true,
    isSystem: true,
  },

  // ── booking.confirmed_with_changes — Notify patient ───────
  {
    key: 'booking.confirmed_with_changes',
    name: {
      en: 'Booking Confirmed with Changes',
      ar: 'تم تأكيد الحجز مع تعديلات',
    },
    description:
      'Sent to the patient when their booking is confirmed with a different date, time, or doctor',
    category: 'appointment',
    trigger: 'automatic',
    channels: {
      email: {
        isEnabled: true,
        subject: {
          en: 'Your Booking is Confirmed (Updated Schedule)',
          ar: 'تم تأكيد حجزك (جدول محدث)',
        },
        body: {
          en: 'Dear {{patientName}},\n\nYour appointment has been confirmed with an updated schedule.\n\nDoctor: {{doctorName}}\nDate: {{date}}\nTime: {{startTime}} — {{endTime}}\nBranch: {{branchName}}\n\nPlease note this may differ from your original request. If this does not work for you, please contact us.\n\nThank you for choosing our clinic.',
          ar: 'عزيزي/عزيزتي {{patientName}}،\n\nتم تأكيد موعدك بجدول محدث.\n\nالطبيب: {{doctorName}}\nالتاريخ: {{date}}\nالوقت: {{startTime}} — {{endTime}}\nالفرع: {{branchName}}\n\nيرجى ملاحظة أن هذا قد يختلف عن طلبك الأصلي. إذا لم يناسبك ذلك، يرجى التواصل معنا.\n\nشكراً لاختياركم عيادتنا.',
        },
      },
      sms: {
        isEnabled: true,
        template: {
          en: 'Your booking is confirmed with changes: {{doctorName}} on {{date}} at {{startTime}}. {{branchName}}. Contact us if this does not work.',
          ar: 'تم تأكيد حجزك مع تعديلات: {{doctorName}} في {{date}} الساعة {{startTime}}. {{branchName}}. تواصل معنا إذا لم يناسبك.',
        },
      },
    },
    variables: COMMON_VARIABLES,
    isActive: true,
    isSystem: true,
  },

  // ── booking.rejected — Notify patient ─────────────────────
  {
    key: 'booking.rejected',
    name: {
      en: 'Booking Rejected',
      ar: 'تم رفض الحجز',
    },
    description: 'Sent to the patient when their online booking is rejected',
    category: 'appointment',
    trigger: 'automatic',
    channels: {
      email: {
        isEnabled: true,
        subject: {
          en: 'Your Booking Could Not Be Confirmed',
          ar: 'لم نتمكن من تأكيد حجزك',
        },
        body: {
          en: 'Dear {{patientName}},\n\nUnfortunately, we were unable to confirm your appointment request.\n\nDoctor: {{doctorName}}\nDate: {{date}}\nTime: {{startTime}} — {{endTime}}\nBranch: {{branchName}}\n\nReason: {{rejectionReason}}\n\nPlease feel free to book again at a different time or contact us for assistance.\n\nWe apologize for any inconvenience.',
          ar: 'عزيزي/عزيزتي {{patientName}}،\n\nللأسف، لم نتمكن من تأكيد طلب موعدك.\n\nالطبيب: {{doctorName}}\nالتاريخ: {{date}}\nالوقت: {{startTime}} — {{endTime}}\nالفرع: {{branchName}}\n\nالسبب: {{rejectionReason}}\n\nلا تتردد في الحجز مرة أخرى في وقت آخر أو التواصل معنا للمساعدة.\n\nنعتذر عن أي إزعاج.',
        },
      },
      sms: {
        isEnabled: true,
        template: {
          en: 'We could not confirm your booking for {{date}} at {{startTime}}. Reason: {{rejectionReason}}. Please try again or contact us.',
          ar: 'لم نتمكن من تأكيد حجزك في {{date}} الساعة {{startTime}}. السبب: {{rejectionReason}}. يرجى المحاولة مرة أخرى أو التواصل معنا.',
        },
      },
    },
    variables: [
      ...COMMON_VARIABLES,
      {
        key: 'rejectionReason',
        label: { en: 'Rejection Reason', ar: 'سبب الرفض' },
        isRequired: true,
      },
    ],
    isActive: true,
    isSystem: true,
  },

  // ── appointment.confirmed — Notify patient via SMS/WhatsApp ──
  {
    key: 'appointment.confirmed',
    name: {
      en: 'Appointment Confirmed',
      ar: 'تم تأكيد الموعد',
    },
    description:
      'Sent to the patient when their appointment is confirmed by the clinic (via SMS or WhatsApp)',
    category: 'appointment',
    trigger: 'automatic',
    channels: {
      sms: {
        isEnabled: true,
        template: {
          en: 'Hi {{patientName}}, your appointment at {{clinicName}} on {{date}} at {{startTime}} has been confirmed. See you then!',
          ar: 'مرحباً {{patientName}}، تم تأكيد موعدك في {{clinicName}} بتاريخ {{date}} الساعة {{startTime}}. نراكم قريباً!',
        },
      },
      whatsapp: {
        isEnabled: true,
        template: {
          en: 'Hi {{patientName}} 👋\n\nYour appointment at *{{clinicName}}* has been confirmed:\n📅 Date: {{date}}\n🕐 Time: {{startTime}}\n\nSee you then!',
          ar: 'مرحباً {{patientName}} 👋\n\nتم تأكيد موعدك في *{{clinicName}}*:\n📅 التاريخ: {{date}}\n🕐 الوقت: {{startTime}}\n\nنراكم قريباً!',
        },
      },
    },
    variables: [
      { key: 'patientName', label: { en: 'Patient Name', ar: 'اسم المريض' }, isRequired: true },
      { key: 'clinicName', label: { en: 'Clinic Name', ar: 'اسم العيادة' }, isRequired: true },
      { key: 'date', label: { en: 'Appointment Date', ar: 'تاريخ الموعد' }, isRequired: true },
      { key: 'startTime', label: { en: 'Start Time', ar: 'وقت البداية' }, isRequired: true },
      { key: 'appointmentId', label: { en: 'Appointment ID', ar: 'رقم الموعد' }, isRequired: true },
    ],
    isActive: true,
    isSystem: true,
  },
];
