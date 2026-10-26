// Schemas — Single Source of Truth (Zod)
export * from './auth.schema.js';
export * from './patient.schema.js';
export * from './appointment.schema.js';
export * from './tenant.schema.js';
export * from './schedule.schema.js';
export * from './booking.schema.js';
export * from './leave.schema.js';

// Week 10 — Dental Chart, Treatment Plans, Procedure Notes
export * from './dental-chart.schema.js';
export * from './treatment-plan.schema.js';
export * from './procedure-note.schema.js';

// Week 11 — Imaging + Prescriptions
export * from './medication.schema.js';
export * from './prescription.schema.js';
export * from './xray.schema.js';
export * from './cbct.schema.js';
export * from './xray-type.schema.js';
export * from './cbct-scan-region.schema.js';

// Phase 2 Completion — Lab Order Types
export * from './lab-order-type.schema.js';

// Week 12 — Dental Labs, Lab Orders, Services, Consent, Chat, Doctors
export * from './doctor.schema.js';
export * from './dental-lab.schema.js';
export * from './lab-order.schema.js';
export * from './service.schema.js';
export * from './consent.schema.js';
export * from './chat.schema.js';

// Week 13 — Notifications, Settings, Audit, Webhooks, Custom Fields, Workflows, 2FA
export * from './settings.schema.js';
export * from './audit.schema.js';
export * from './webhook.schema.js';
export * from './custom-field.schema.js';
export * from './workflow.schema.js';
export * from './totp.schema.js';
export * from './notification.schema.js';

// Gap Closure — Users + Branches
export * from './user.schema.js';
export * from './branch.schema.js';

// Platform RBAC — Platform User Management
export * from './platform-user.schema.js';

// Week 14 — Invoices + Payments (Phase 4: Financial)
export * from './invoice.schema.js';
export * from './payment.schema.js';

// Phase 4 Week 1 — Insurance Companies + Claims + Installments
export * from './insurance.schema.js';
export * from './installment.schema.js';
export * from './commission.schema.js';

// Phase 5 — Inventory Management System
export * from './inventory.schema.js';

// Phase 5 — Reports & Analytics System
export * from './report.schema.js';

// Phase 7 — Platform System Settings
export * from './system-settings.schema.js';

// Phase 7 — Feature Flags
export * from './feature-flag.schema.js';

// Phase 7 — Storage
export * from './storage.schema.js';

// Intraoral 3D Scans
export * from './scan.schema.js';

// Country Config — Platform Country Management
export * from './country.schema.js';
