// ── Branding & Logo Propagation Types (§14) ────────────────────

/**
 * Bilingual text field (English + Arabic).
 */
export interface BilingualText {
  en: string;
  ar?: string;
}

/**
 * Branding address configuration.
 * Documents always show Main Branch address.
 */
export interface BrandingAddress {
  main: BilingualText;
  branchId?: string; // Which branch address for documents
}

/**
 * Full branding configuration as stored in tenant-DB `settings` collection.
 * Stored with `type: "branding"` discriminator.
 */
export interface IBrandingConfig {
  _id?: string;
  type: 'branding';

  // === Logo ===
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;

  // === Clinic Information (for documents) ===
  clinicName: BilingualText;
  address: BrandingAddress;
  phone: string;
  email: string;
  website: string;

  // === Colors ===
  primaryColor: string; // Sidebar, Buttons — e.g. "#4f46e5"
  accentColor: string; // Highlights, Success — e.g. "#10b981"

  // === Custom CSS (optional, for PDF templates) ===
  customCss: string | null;

  // === Metadata ===
  updatedAt?: string;
  updatedBy?: string;
}

/**
 * Partial branding update payload (PATCH /api/branding).
 * All fields optional except never change `type`.
 */
export type IBrandingUpdate = Partial<
  Omit<IBrandingConfig, '_id' | 'type' | 'updatedAt' | 'updatedBy'>
>;

/**
 * Data passed to `<ClinicHeader />` component for document templates (§15).
 */
export interface IClinicHeaderData {
  logoUrl: string | null;
  clinicName: BilingualText;
  address: string; // Resolved main branch address
  phone: string;
  email: string;
}

/**
 * Doctor info displayed in document headers (Prescription, Treatment Plan, Lab Order).
 */
export interface IDocumentDoctorInfo {
  name: BilingualText;
  specialty: BilingualText;
  licenseNumber?: string;
}

/**
 * Branding propagation target summary.
 * Used for admin UI to show where branding is applied.
 */
export type BrandingPropagationTarget =
  | 'sidebar'
  | 'login_page'
  | 'invoice_pdf'
  | 'prescription_pdf'
  | 'treatment_plan_pdf'
  | 'consent_form'
  | 'email_template'
  | 'mobile_app'
  | 'browser_tab'
  | 'notification_email';

export const BRANDING_PROPAGATION_TARGETS: BrandingPropagationTarget[] = [
  'sidebar',
  'login_page',
  'invoice_pdf',
  'prescription_pdf',
  'treatment_plan_pdf',
  'consent_form',
  'email_template',
  'mobile_app',
  'browser_tab',
  'notification_email',
];

/**
 * Default branding configuration for new tenants.
 */
export const DEFAULT_BRANDING: Omit<IBrandingConfig, '_id' | 'updatedAt' | 'updatedBy'> = {
  type: 'branding',
  logoUrl: null,
  logoDarkUrl: null,
  faviconUrl: null,
  clinicName: { en: 'My Dental Clinic', ar: '' },
  address: { main: { en: '', ar: '' } },
  phone: '',
  email: '',
  website: '',
  primaryColor: '#4f46e5',
  accentColor: '#10b981',
  customCss: null,
};
