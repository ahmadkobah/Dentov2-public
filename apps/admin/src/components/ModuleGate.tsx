/**
 * ModuleGate — Wraps a page/feature and shows a marketing upgrade prompt
 * when the tenant's subscription doesn't include the required module.
 *
 * Usage:
 *   <ModuleGate module="dental_charts">
 *     <DentalChartsPage />
 *   </ModuleGate>
 */

import type { ReactNode } from 'react';
import { Crown, Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button, PageHeader } from '@dento/ui';
import { CORE_MODULES } from '@dento/shared';
import { useSubscriptionPlan } from '../features/subscription/hooks/useSubscription.js';
import { Link } from 'react-router-dom';

// ── Module Marketing Catalog ────────────────────────────────

interface ModuleInfo {
  name: string;
  tagline: string;
  features: string[];
}

const MODULE_CATALOG: Record<string, ModuleInfo> = {
  patients: {
    name: 'Patient Records',
    tagline: 'Comprehensive patient management with full medical history',
    features: [
      'Detailed patient profiles & demographics',
      'Medical history & allergy tracking',
      'Document attachments & notes',
      'Advanced search & filtering',
    ],
  },
  appointments: {
    name: 'Appointments',
    tagline: 'Smart scheduling with calendar views and automated reminders',
    features: [
      'Drag-and-drop calendar scheduling',
      'Automated SMS & email reminders',
      'Multi-provider & multi-branch support',
      'Daily operations queue',
    ],
  },
  dental_charts: {
    name: 'Dental Charts',
    tagline: 'Interactive dental charting with visual tooth diagrams',
    features: [
      'Interactive odontogram (adult & pediatric)',
      'Condition & procedure mapping per tooth',
      'Chart history & comparison',
      'Treatment integration',
    ],
  },
  treatment_plans: {
    name: 'Treatment Plans',
    tagline: 'Create, track, and manage patient treatment plans',
    features: [
      'Multi-phase treatment planning',
      'Cost estimates & patient approval',
      'Progress tracking per procedure',
      'Insurance pre-authorization support',
    ],
  },
  procedure_notes: {
    name: 'Procedure Notes',
    tagline: 'Document clinical procedures with structured templates',
    features: [
      'Customizable procedure templates',
      'Pre/post operative notes',
      'Image & attachment support',
      'Linked to dental charts & treatment plans',
    ],
  },
  prescriptions: {
    name: 'Prescriptions',
    tagline: 'Digital prescription management with medication tracking',
    features: [
      'E-prescription generation',
      'Drug interaction warnings',
      'Prescription history per patient',
      'Print & PDF export',
    ],
  },
  xrays: {
    name: 'X-Rays & Imaging',
    tagline: 'Digital radiography management and DICOM viewer integration',
    features: [
      'X-ray image upload & organization',
      'CBCT scan management',
      'Before/after comparison tools',
      'Cloud storage & DICOM support',
    ],
  },
  lab_orders: {
    name: 'Lab Orders',
    tagline: 'Streamline dental lab workflows from order to delivery',
    features: [
      'Lab order creation & tracking',
      'Dental lab directory management',
      'Status updates & notifications',
      'Cost tracking per order',
    ],
  },
  invoices: {
    name: 'Invoices',
    tagline: 'Professional invoice generation with automatic calculations',
    features: [
      'Auto-generate from treatment plans',
      'Multi-currency support',
      'Tax & discount management',
      'Batch invoicing capabilities',
    ],
  },
  payments: {
    name: 'Payments',
    tagline: 'Track and reconcile all patient payments in one place',
    features: [
      'Multiple payment method tracking',
      'Payment receipts & history',
      'Outstanding balance alerts',
      'Payment reconciliation reports',
    ],
  },
  inventory: {
    name: 'Inventory',
    tagline: 'Complete dental supply management with smart reordering',
    features: [
      'Stock level monitoring & alerts',
      'Automated reorder suggestions',
      'Supplier management & purchase orders',
      'Expiry tracking & batch management',
    ],
  },
  insurance: {
    name: 'Insurance',
    tagline: 'Insurance company management and claims processing',
    features: [
      'Insurance company directory',
      'Claims submission & tracking',
      'Pre-authorization workflows',
      'EOB processing & reconciliation',
    ],
  },
  installments: {
    name: 'Installments',
    tagline: 'Flexible payment plans for patient financial comfort',
    features: [
      'Custom installment plan creation',
      'Automated payment reminders',
      'Overdue tracking & alerts',
      'Payment schedule management',
    ],
  },
  commissions: {
    name: 'Commissions',
    tagline: 'Doctor and staff commission tracking and reporting',
    features: [
      'Configurable commission rules',
      'Auto-calculate from procedures',
      'Monthly commission reports',
      'Multi-tier commission structures',
    ],
  },
  schedules: {
    name: 'Schedules',
    tagline: 'Doctor and staff scheduling with shift management',
    features: [
      'Weekly/monthly schedule views',
      'Shift templates & recurring patterns',
      'Schedule exceptions & overrides',
      'Branch-level scheduling',
    ],
  },
  leave: {
    name: 'Leave Management',
    tagline: 'Staff leave requests, approvals, and balance tracking',
    features: [
      'Leave request & approval workflow',
      'Leave balance tracking per staff',
      'Calendar integration',
      'Leave type configuration',
    ],
  },
  attendance: {
    name: 'Attendance',
    tagline: 'Staff attendance tracking with clock-in/out management',
    features: [
      'Daily attendance recording',
      'Clock-in/out tracking',
      'Attendance reports & analytics',
      'Late/absent notifications',
    ],
  },
  consent: {
    name: 'Consent Forms',
    tagline: 'Digital consent form management with e-signatures',
    features: [
      'Customizable consent templates',
      'Digital signature capture',
      'Patient acknowledgment tracking',
      'Regulatory compliance support',
    ],
  },
  reports: {
    name: 'Advanced Analytics',
    tagline: 'Detailed analytics, trend analysis, and custom reporting',
    features: [
      'Financial & revenue reports',
      'Patient demographics & trends',
      'Appointment analytics & heatmaps',
      'Export to PDF, Excel & CSV',
    ],
  },
  services_catalog: {
    name: 'Services Catalog',
    tagline: "Manage your clinic's service catalog with pricing",
    features: [
      'Service categories & organization',
      'Multi-currency pricing',
      'Service duration & resource allocation',
      'Treatment-to-service mapping',
    ],
  },
  branches: {
    name: 'Branches',
    tagline: 'Multi-branch clinic management in one platform',
    features: [
      'Branch profiles & settings',
      'Per-branch staff assignment',
      'Branch-level reporting',
      'Resource sharing configuration',
    ],
  },
  doctors: {
    name: 'Doctors',
    tagline: 'Doctor profile management with specializations and availability',
    features: [
      'Doctor profiles & credentials',
      'Specialization tracking',
      'Availability & schedule management',
      'Performance & workload overview',
    ],
  },
  notifications: {
    name: 'Notifications',
    tagline: 'Smart notification system with email, SMS, and in-app alerts',
    features: [
      'Multi-channel notifications',
      'Customizable alert rules',
      'Notification templates',
      'Delivery tracking & logs',
    ],
  },
  users: {
    name: 'User Management',
    tagline: 'Role-based access control and staff account management',
    features: [
      'Role-based permissions (RBAC)',
      'Staff account provisioning',
      'Activity audit logs',
      'Multi-factor authentication',
    ],
  },
  settings: {
    name: 'Settings',
    tagline: 'Clinic configuration and system preferences',
    features: [
      'General clinic settings',
      'Working hours configuration',
      'Branding & appearance',
      'Integration settings',
    ],
  },
  webhooks: {
    name: 'Webhooks',
    tagline: 'Real-time event notifications to external services',
    features: [
      'Event-driven integrations',
      'Custom webhook endpoints',
      'Delivery logs & retry management',
      'Payload configuration',
    ],
  },
  audit_logs: {
    name: 'Audit Logs',
    tagline: 'Track and monitor all system activity',
    features: [
      'Full activity audit trail',
      'User action tracking',
      'Data change history',
      'Compliance reporting',
    ],
  },
};

// ── Component ───────────────────────────────────────────────

interface ModuleGateProps {
  /** Module slug as used in tenant.enabledModules */
  module: string;
  children: ReactNode;
}

export function ModuleGate({ module, children }: ModuleGateProps) {
  const { data } = useSubscriptionPlan();
  const enabledModules = data?.plan?.enabledModules ?? [];

  // Modules that piggy-back on a parent module (e.g. audit_logs → reports)
  const MODULE_ALIASES: Record<string, string> = {
    audit_logs: 'reports',
  };

  const resolved = MODULE_ALIASES[module] ?? module;

  // If no modules defined (empty array = free tier with all basic), allow access
  // If module (or its parent alias) is in the list, allow access
  // Core modules are always enabled regardless of subscription
  const isEnabled =
    CORE_MODULES.has(module) ||
    enabledModules.length === 0 ||
    enabledModules.includes(module) ||
    enabledModules.includes(resolved);

  if (isEnabled) {
    return <>{children}</>;
  }

  const info = MODULE_CATALOG[module] ?? {
    name: module.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    tagline: 'Unlock this module to access advanced features',
    features: [
      'Full module access',
      'Advanced tools & workflows',
      'Reports & analytics',
      'API access',
    ],
  };

  return (
    <div className="space-y-6">
      <PageHeader title={info.name} description="This module requires activation" />

      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {/* Header gradient */}
          <div className="bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center text-white">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Lock className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold">Unlock {info.name}</h2>
            <p className="mt-2 text-brand-100">{info.tagline}</p>
          </div>

          {/* Features list */}
          <div className="px-8 py-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <Sparkles className="h-4 w-4" />
              What you get
            </h3>
            <ul className="space-y-3">
              {info.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="border-t border-gray-200 bg-gray-50 px-8 py-6 dark:border-gray-700 dark:bg-gray-800">
            <Link to="/subscription">
              <Button className="w-full gap-2 py-3 text-base font-semibold">
                <Crown className="h-5 w-5" />
                Upgrade Plan to Enable {info.name}
              </Button>
            </Link>
            <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
              Contact your platform administrator to enable this module
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
