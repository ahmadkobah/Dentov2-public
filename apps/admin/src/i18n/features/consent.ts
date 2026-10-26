export const consent = {
  // ── Page ──
  'consent.title': 'Consent Forms',
  'consent.subtitle': 'Manage consent templates and view signed consent forms',

  // Tabs
  'consent.tab.templates': 'Templates',
  'consent.tab.signedForms': 'Signed Forms',

  // ── Templates Tab ──
  'consent.templates.searchPlaceholder': 'Search templates...',
  'consent.templates.newBtn': 'New Template',

  // Templates columns
  'consent.templates.col.name': 'Name',
  'consent.templates.col.procedureType': 'Procedure Type',
  'consent.templates.col.status': 'Status',
  'consent.templates.col.created': 'Created',

  // Templates badges
  'consent.templates.badge.active': 'Active',
  'consent.templates.badge.inactive': 'Inactive',
  'consent.templates.badge.default': 'Default',

  // Templates empty / error
  'consent.templates.empty.title': 'No consent templates',
  'consent.templates.empty.desc': 'Create your first consent template to get started.',
  'consent.templates.error.load': 'Failed to load consent templates',

  // Templates confirm
  'consent.templates.confirm.deactivateTitle': 'Deactivate Template',
  'consent.templates.confirm.deactivateDesc': 'Are you sure you want to deactivate this template?',

  // ── Signed Forms Tab ──
  'consent.forms.signBtn': 'Sign Consent Form',
  'consent.forms.searchPlaceholder': 'Search by patient name...',

  // Forms columns
  'consent.forms.col.template': 'Template',
  'consent.forms.col.patient': 'Patient',
  'consent.forms.col.doctor': 'Doctor',
  'consent.forms.col.signedAt': 'Signed At',
  'consent.forms.col.signature': 'Signature',

  // Forms badges
  'consent.forms.badge.signed': 'Signed',
  'consent.forms.badge.pending': 'Pending',

  // Forms empty / error
  'consent.forms.empty.title': 'No signed consent forms',
  'consent.forms.empty.desc': 'Create a signed consent form to get started.',
  'consent.forms.error.load': 'Failed to load consent forms',

  // ── Template Form Dialog ──
  'consent.templateForm.createTitle': 'Create Consent Template',
  'consent.templateForm.editTitle': 'Edit Consent Template',
  'consent.templateForm.nameEn': 'Name (English) *',
  'consent.templateForm.nameAr': 'Name (Arabic)',
  'consent.templateForm.procedureType': 'Procedure Type *',
  'consent.templateForm.contentEn': 'Content (English) *',
  'consent.templateForm.contentAr': 'Content (Arabic)',
  'consent.templateForm.risksEn': 'Risks (English)',
  'consent.templateForm.risksAr': 'Risks (Arabic)',
  'consent.templateForm.active': 'Active',
  'consent.templateForm.cancelBtn': 'Cancel',
  'consent.templateForm.createBtn': 'Create',
  'consent.templateForm.updateBtn': 'Update',

  // Template form placeholders
  'consent.templateForm.nameEnPlaceholder': 'Extraction Consent',
  'consent.templateForm.nameArPlaceholder': 'موافقة الخلع',
  'consent.templateForm.procedurePlaceholder': 'e.g. Extraction, Root Canal, Implant',
  'consent.templateForm.contentEnPlaceholder': 'I, the undersigned, consent to...',
  'consent.templateForm.contentArPlaceholder': 'أنا الموقع أدناه، أوافق على...',
  'consent.templateForm.risksEnPlaceholder': 'Possible risks include...',
  'consent.templateForm.risksArPlaceholder': 'تشمل المخاطر المحتملة...',

  // ── Sign Consent Form Modal ──
  'consent.sign.title': 'Sign Consent Form',
  'consent.sign.patient': 'Patient',
  'consent.sign.template': 'Consent Template',
  'consent.sign.templatePlaceholder': 'Select a template…',
  'consent.sign.doctor': 'Attending Doctor',
  'consent.sign.doctorPlaceholder': 'Select a doctor…',
  'consent.sign.consentDetails': 'Consent Details',
  'consent.sign.risksTitle': 'Risks & Complications',
  'consent.sign.signatureTitle': 'Patient Signature',
  'consent.sign.clearSignature': 'Clear',
  'consent.sign.signatureInstruction': 'Draw your signature above using mouse or touch',
  'consent.sign.dateLabel': 'Date:',
  'consent.sign.cancelBtn': 'Cancel',
  'consent.sign.submitBtn': 'Sign & Submit',

  // ── View Consent Form Modal ──
  'consent.view.title': 'View Consent Form',
  'consent.view.printBtn': 'Print',
  'consent.view.patient': 'Patient',
  'consent.view.doctor': 'Doctor',
  'consent.view.template': 'Template',
  'consent.view.signedAt': 'Signed At',
  'consent.view.contentTitle': 'Consent Content',
  'consent.view.signatureTitle': 'Patient Signature',
  'consent.view.noSignature': 'No signature',

  // ── Signature Widget ──
  'consent.signature.label': 'Signature',
  'consent.signature.clearBtn': 'Clear',
  'consent.signature.confirmBtn': 'Confirm Signature',
} as const;
