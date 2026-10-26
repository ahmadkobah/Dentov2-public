/**
 * Online Booking Integration Guide — Developer Portal
 *
 * Phase 7: Comprehensive guide for third-party developers to integrate
 * with the Dento Online Booking API, Embeddable Widget, and WhatsApp Bot.
 *
 * Sections:
 *   1. Quick Start / Overview
 *   2. API Reference (Booking Endpoints)
 *   3. Embeddable Widget
 *   4. WhatsApp Bot Setup
 *   5. Webhooks & Notifications
 */

import { useState } from 'react';
import {
  BookOpen,
  Code,
  Globe,
  MessageSquare,
  Bell,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Terminal,
  Zap,
  Shield,
  ArrowRight,
} from 'lucide-react';

// ── Constants ───────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const SECTIONS = [
  { key: 'overview', label: 'Overview', icon: BookOpen },
  { key: 'api', label: 'API Reference', icon: Code },
  { key: 'widget', label: 'Booking Widget', icon: Globe },
  { key: 'whatsapp', label: 'WhatsApp Bot', icon: MessageSquare },
  { key: 'webhooks', label: 'Webhooks', icon: Bell },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

// ── Endpoint Data ───────────────────────────────────────────

interface Endpoint {
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  description: string;
  auth: 'Public' | 'JWT' | 'API Key';
  params?: Array<{ name: string; type: string; required: boolean; description: string }>;
  body?: string;
  response?: string;
}

const BOOKING_ENDPOINTS: Endpoint[] = [
  {
    method: 'GET',
    path: '/api/bookings/branches',
    description: 'List branches that have online booking enabled.',
    auth: 'Public',
    response: `{
  "success": true,
  "data": {
    "branches": [
      {
        "_id": "665a...",
        "name": { "en": "Main Branch", "ar": "الفرع الرئيسي" },
        "address": { "en": "123 Dental St" },
        "phone": "+201234567890"
      }
    ]
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/bookings/doctors',
    description: 'List active doctors at a specific branch.',
    auth: 'Public',
    params: [{ name: 'branchId', type: 'string', required: true, description: 'Branch ObjectId' }],
    response: `{
  "success": true,
  "data": {
    "doctors": [
      {
        "_id": "665b...",
        "firstName": "Ahmad",
        "lastName": "Hassan",
        "specialty": "Orthodontics",
        "avatar": null
      }
    ]
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/bookings/slots',
    description: 'Get available time slots for a doctor on a specific date.',
    auth: 'Public',
    params: [
      { name: 'branchId', type: 'string', required: true, description: 'Branch ObjectId' },
      {
        name: 'doctorId',
        type: 'string',
        required: false,
        description: 'Doctor ObjectId (optional — omit for all doctors)',
      },
      { name: 'date', type: 'string', required: true, description: 'Date in YYYY-MM-DD format' },
      {
        name: 'durationMinutes',
        type: 'number',
        required: true,
        description: 'Appointment duration (default: 30)',
      },
    ],
    response: `{
  "success": true,
  "data": {
    "date": "2025-01-20",
    "slots": [
      { "startTime": "09:00", "endTime": "09:30", "isAvailable": true },
      { "startTime": "09:30", "endTime": "10:00", "isAvailable": false },
      { "startTime": "10:00", "endTime": "10:30", "isAvailable": true }
    ]
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/bookings',
    description: 'Create a new online booking appointment.',
    auth: 'Public',
    body: `{
  "branchId": "665a...",
  "doctorId": "665b...",
  "date": "2025-01-20",
  "startTime": "10:00",
  "endTime": "10:30",
  "durationMinutes": 30,
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+201012345678",
  "email": "john@example.com",
  "reason": "Regular checkup"
}`,
    response: `{
  "success": true,
  "data": {
    "bookingId": "665c...",
    "status": "booked",
    "date": "2025-01-20",
    "startTime": "10:00",
    "endTime": "10:30",
    "isAutoConfirmed": false,
    "message": "Booking received — awaiting confirmation"
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/bookings/management',
    description: 'List online bookings with filtering and pagination (admin).',
    auth: 'JWT',
    params: [
      { name: 'page', type: 'number', required: false, description: 'Page number (default: 1)' },
      {
        name: 'limit',
        type: 'number',
        required: false,
        description: 'Items per page (default: 20)',
      },
      {
        name: 'status',
        type: 'string',
        required: false,
        description: 'Filter by status: booked, confirmed, rejected',
      },
      { name: 'branchId', type: 'string', required: false, description: 'Filter by branch' },
      {
        name: 'dateFrom',
        type: 'string',
        required: false,
        description: 'Start date filter (YYYY-MM-DD)',
      },
      {
        name: 'dateTo',
        type: 'string',
        required: false,
        description: 'End date filter (YYYY-MM-DD)',
      },
    ],
  },
  {
    method: 'PATCH',
    path: '/api/bookings/management/:id',
    description: 'Confirm or reject a booking (admin).',
    auth: 'JWT',
    body: `{
  "action": "confirm"  // or "reject"
}`,
  },
  {
    method: 'GET',
    path: '/api/bookings/management/slots',
    description: 'Get slot availability calendar for admin view.',
    auth: 'JWT',
    params: [
      { name: 'branchId', type: 'string', required: true, description: 'Branch ObjectId' },
      { name: 'doctorId', type: 'string', required: false, description: 'Doctor filter' },
      { name: 'dateFrom', type: 'string', required: true, description: 'Start date (YYYY-MM-DD)' },
      { name: 'dateTo', type: 'string', required: true, description: 'End date (YYYY-MM-DD)' },
    ],
  },
  {
    method: 'GET',
    path: '/api/bookings/widget-config',
    description: "Get the tenant's booking widget configuration.",
    auth: 'Public',
    response: `{
  "success": true,
  "data": {
    "primaryColor": "#16a085",
    "buttonPosition": "bottom-right",
    "language": "en",
    "buttonText": "Book Now",
    "showBranding": true
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/bookings/widget.js',
    description: 'Serve the embeddable booking widget JavaScript file.',
    auth: 'Public',
  },
];

// ── Method Badge ────────────────────────────────────────────

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  PATCH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={`inline-flex w-16 items-center justify-center rounded px-2 py-0.5 text-xs font-bold ${METHOD_STYLES[method] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {method}
    </span>
  );
}

function AuthBadge({ auth }: { auth: string }) {
  const styles: Record<string, string> = {
    Public: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    JWT: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    'API Key': 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[auth] ?? ''}`}
    >
      <Shield className="h-3 w-3" />
      {auth}
    </span>
  );
}

// ── Code Block ──────────────────────────────────────────────

function CodeBlock({ code, language = 'json' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative">
      <button
        onClick={handleCopy}
        className="absolute end-2 top-2 rounded p-1 opacity-0 transition-opacity hover:bg-gray-700 group-hover:opacity-100"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-400" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-gray-400" />
        )}
      </button>
      <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
        <code data-language={language}>{code}</code>
      </pre>
    </div>
  );
}

// ── Endpoint Card ───────────────────────────────────────────

function EndpointCard({ ep }: { ep: Endpoint }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
        <MethodBadge method={ep.method} />
        <code className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">
          {ep.path}
        </code>
        <AuthBadge auth={ep.auth} />
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-700/50">
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">{ep.description}</p>

          {ep.params && ep.params.length > 0 && (
            <div className="mb-3">
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Parameters
              </h4>
              <div className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <th className="px-3 py-1.5 text-start text-xs font-medium text-gray-500">
                        Name
                      </th>
                      <th className="px-3 py-1.5 text-start text-xs font-medium text-gray-500">
                        Type
                      </th>
                      <th className="px-3 py-1.5 text-start text-xs font-medium text-gray-500">
                        Required
                      </th>
                      <th className="px-3 py-1.5 text-start text-xs font-medium text-gray-500">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ep.params.map((p) => (
                      <tr key={p.name} className="border-t border-gray-100 dark:border-gray-700/50">
                        <td className="px-3 py-1.5">
                          <code className="text-xs">{p.name}</code>
                        </td>
                        <td className="px-3 py-1.5 text-xs text-gray-500">{p.type}</td>
                        <td className="px-3 py-1.5 text-xs">{p.required ? '✓' : '—'}</td>
                        <td className="px-3 py-1.5 text-xs text-gray-500">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {ep.body && (
            <div className="mb-3">
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Request Body
              </h4>
              <CodeBlock code={ep.body} />
            </div>
          )}

          {ep.response && (
            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Response
              </h4>
              <CodeBlock code={ep.response} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Section: Overview ───────────────────────────────────────

function OverviewSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Online Booking Integration
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          The Dento Online Booking system allows patients to book appointments through multiple
          channels. This guide covers the REST API, embeddable widget, and WhatsApp bot integration.
        </p>
      </div>

      {/* Architecture Overview */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/50">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Integration Channels
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Code,
              title: 'REST API',
              desc: 'Direct API integration for custom booking flows. Public endpoints for branches, doctors, slots, and booking creation.',
            },
            {
              icon: Globe,
              title: 'Embeddable Widget',
              desc: 'Drop-in JavaScript widget with floating action button. One script tag to add to any website.',
            },
            {
              icon: MessageSquare,
              title: 'WhatsApp Bot',
              desc: 'Conversational booking via WhatsApp. Patients text the clinic number and follow a guided flow.',
            },
          ].map((ch) => (
            <div
              key={ch.title}
              className="rounded-md border border-gray-200 bg-white p-4 dark:border-gray-600 dark:bg-gray-800"
            >
              <ch.icon className="mb-2 h-5 w-5 text-primary" />
              <h4 className="text-sm font-semibold">{ch.title}</h4>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{ch.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Start */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Zap className="h-4 w-4 text-amber-500" /> Quick Start
        </h3>
        <div className="space-y-3">
          <StepCard
            step={1}
            title="Enable Online Booking"
            description="In Admin Portal → Settings → Online Booking, enable booking for the branches you want."
          />
          <StepCard
            step={2}
            title="Configure Branch Settings"
            description="Set slot duration, max advance days, auto-confirm, allowed services, and working hours per branch."
          />
          <StepCard
            step={3}
            title="Choose Integration Method"
            description="Use the REST API for custom builds, the embeddable widget for websites, or the WhatsApp bot for messaging."
          />
          <StepCard
            step={4}
            title="Set Tenant Context"
            description="All public booking endpoints require the X-Tenant-Slug header or tenantSlug query parameter to identify the clinic."
          />
        </div>
      </div>

      {/* Authentication */}
      <div className="rounded-lg border border-gray-200 p-5 dark:border-gray-700">
        <h3 className="mb-2 text-sm font-semibold">Authentication</h3>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <strong>Public endpoints</strong> (branches, doctors, slots, create booking) require the{' '}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">
              X-Tenant-Slug
            </code>{' '}
            header to resolve the tenant database.
          </p>
          <p>
            <strong>Admin endpoints</strong> (management, confirm/reject) require JWT Bearer token
            authentication with a{' '}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">
              tenant_admin
            </code>{' '}
            role.
          </p>
        </div>
        <div className="mt-3">
          <CodeBlock
            language="bash"
            code={`# Public endpoint (patient-facing)
curl -H "X-Tenant-Slug: your-clinic-slug" \\
  ${API_BASE}/api/bookings/branches

# Admin endpoint (staff-facing)
curl -H "Authorization: Bearer <jwt_token>" \\
  ${API_BASE}/api/bookings/management`}
          />
        </div>
      </div>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-md border border-gray-100 p-3 dark:border-gray-700/50">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {step}
      </div>
      <div>
        <h4 className="text-sm font-medium">{title}</h4>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
}

// ── Section: API Reference ──────────────────────────────────

function ApiReferenceSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">API Reference</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          All booking endpoints are under{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">
            /api/bookings
          </code>
          . Public endpoints use the tenant middleware for database resolution.
        </p>
      </div>

      {/* Booking Flow */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-900/20">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-300">
          <ArrowRight className="h-4 w-4" /> Typical Booking Flow
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-blue-700 dark:text-blue-400">
          <span className="rounded bg-blue-100 px-2 py-1 dark:bg-blue-900/40">GET /branches</span>
          <ArrowRight className="h-3 w-3" />
          <span className="rounded bg-blue-100 px-2 py-1 dark:bg-blue-900/40">GET /doctors</span>
          <ArrowRight className="h-3 w-3" />
          <span className="rounded bg-blue-100 px-2 py-1 dark:bg-blue-900/40">GET /slots</span>
          <ArrowRight className="h-3 w-3" />
          <span className="rounded bg-blue-100 px-2 py-1 dark:bg-blue-900/40">POST /bookings</span>
        </div>
      </div>

      {/* Endpoint List */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Public Endpoints</h3>
        {BOOKING_ENDPOINTS.filter((e) => e.auth === 'Public').map((ep) => (
          <EndpointCard key={`${ep.method}-${ep.path}`} ep={ep} />
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Admin Endpoints</h3>
        {BOOKING_ENDPOINTS.filter((e) => e.auth === 'JWT').map((ep) => (
          <EndpointCard key={`${ep.method}-${ep.path}`} ep={ep} />
        ))}
      </div>

      {/* Complete Example */}
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Terminal className="h-4 w-4" /> Full Example: Book an Appointment
        </h3>
        <CodeBlock
          language="javascript"
          code={`const API = "${API_BASE}";
const HEADERS = { "X-Tenant-Slug": "your-clinic-slug" };

// 1. Get branches
const { data: { branches } } = await fetch(
  \`\${API}/api/bookings/branches\`,
  { headers: HEADERS }
).then(r => r.json());

// 2. Get doctors for first branch
const branchId = branches[0]._id;
const { data: { doctors } } = await fetch(
  \`\${API}/api/bookings/doctors?branchId=\${branchId}\`,
  { headers: HEADERS }
).then(r => r.json());

// 3. Get available slots
const doctorId = doctors[0]._id;
const { data: { slots } } = await fetch(
  \`\${API}/api/bookings/slots?branchId=\${branchId}&doctorId=\${doctorId}&date=2025-01-20&durationMinutes=30\`,
  { headers: HEADERS }
).then(r => r.json());

// 4. Book an available slot
const available = slots.find(s => s.isAvailable);
const booking = await fetch(\`\${API}/api/bookings\`, {
  method: "POST",
  headers: { ...HEADERS, "Content-Type": "application/json" },
  body: JSON.stringify({
    branchId,
    doctorId,
    date: "2025-01-20",
    startTime: available.startTime,
    endTime: available.endTime,
    durationMinutes: 30,
    firstName: "John",
    lastName: "Doe",
    phone: "+201012345678",
  }),
}).then(r => r.json());

console.log(booking.data);
// { bookingId: "...", status: "booked", isAutoConfirmed: false }`}
        />
      </div>
    </div>
  );
}

// ── Section: Widget ─────────────────────────────────────────

function WidgetSection() {
  const [copiedWidget, setCopiedWidget] = useState(false);

  const widgetCode = `<!-- Dento Booking Widget -->
<script
  src="${API_BASE}/api/bookings/widget.js"
  data-api="${API_BASE}"
  data-tenant="your-clinic-slug"
  defer>
</script>`;

  const handleCopyWidget = () => {
    navigator.clipboard.writeText(widgetCode);
    setCopiedWidget(true);
    setTimeout(() => setCopiedWidget(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Embeddable Booking Widget
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Add online booking to any website with a single script tag. The widget renders a floating
          action button that opens a sliding side panel with the full booking flow.
        </p>
      </div>

      {/* Features */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: 'One-Line Integration', desc: 'Single script tag — no build tools needed' },
          {
            label: 'Bilingual (EN/AR)',
            desc: 'RTL support included with automatic layout switching',
          },
          {
            label: 'Customizable',
            desc: 'Primary color, button position, text, and branding via Admin Settings',
          },
          {
            label: 'Responsive',
            desc: 'Works on desktop and mobile — side panel adapts to viewport',
          },
        ].map((f) => (
          <div key={f.label} className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <h4 className="text-sm font-medium">{f.label}</h4>
            <p className="mt-0.5 text-xs text-gray-500">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Embed Code */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Embed Code</h3>
          <button
            onClick={handleCopyWidget}
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {copiedWidget ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copiedWidget ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <CodeBlock language="html" code={widgetCode} />
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
          <strong>Note:</strong> Replace <code>your-clinic-slug</code> with the actual tenant slug.
          The widget auto-loads configuration from the <code>/api/bookings/widget-config</code>{' '}
          endpoint.
        </div>
      </div>

      {/* Configuration */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">Widget Configuration</h3>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          Configure the widget appearance in Admin Portal → Settings → Booking Widget. Changes are
          applied immediately.
        </p>
        <div className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">Setting</th>
                <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">Default</th>
                <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              <tr>
                <td className="px-3 py-2">
                  <code className="text-xs">primaryColor</code>
                </td>
                <td className="px-3 py-2 text-xs">#16a085</td>
                <td className="px-3 py-2 text-xs text-gray-500">Button and accent color</td>
              </tr>
              <tr>
                <td className="px-3 py-2">
                  <code className="text-xs">buttonPosition</code>
                </td>
                <td className="px-3 py-2 text-xs">bottom-right</td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  FAB position: bottom-right or bottom-left
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2">
                  <code className="text-xs">language</code>
                </td>
                <td className="px-3 py-2 text-xs">en</td>
                <td className="px-3 py-2 text-xs text-gray-500">Widget language: en or ar</td>
              </tr>
              <tr>
                <td className="px-3 py-2">
                  <code className="text-xs">buttonText</code>
                </td>
                <td className="px-3 py-2 text-xs">Book Now</td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  Text displayed on the floating button
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2">
                  <code className="text-xs">showBranding</code>
                </td>
                <td className="px-3 py-2 text-xs">true</td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  Show &quot;Powered by Dento&quot; footer
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* How it works */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">How It Works</h3>
        <ol className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
          <li className="flex gap-2">
            <span className="font-bold text-primary">1.</span> Script loads and reads{' '}
            <code className="text-[10px]">data-api</code> and{' '}
            <code className="text-[10px]">data-tenant</code> from the script tag
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary">2.</span> Fetches widget config from{' '}
            <code className="text-[10px]">GET /api/bookings/widget-config</code>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary">3.</span> Renders a floating action button
            (FAB) in the chosen corner
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary">4.</span> On click, opens a sliding side panel
            with the booking form
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary">5.</span> Patient completes: Branch → Doctor →
            Date → Slot → Info → Submit
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary">6.</span> Booking created via{' '}
            <code className="text-[10px]">POST /api/bookings</code>
          </li>
        </ol>
      </div>
    </div>
  );
}

// ── Section: WhatsApp Bot ───────────────────────────────────

function WhatsAppSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">WhatsApp Booking Bot</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Enable patients to book appointments through WhatsApp. The bot guides them through a
          conversational flow: language → branch → doctor → date → time → name → confirm.
        </p>
      </div>

      {/* Setup Steps */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Setup Guide</h3>
        <div className="space-y-3">
          <SetupStep
            provider="Twilio"
            steps={[
              'Sign up for a Twilio account and activate the WhatsApp Sandbox',
              `Set the webhook URL to: ${API_BASE}/api/whatsapp-bot/{tenant-slug}/twilio`,
              'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM in your .env',
              'Enable the bot in Admin Portal → Settings → WhatsApp Bot',
            ]}
          />
          <SetupStep
            provider="Meta Business API"
            steps={[
              'Create a Meta Business App and enable the WhatsApp API',
              `Set the webhook URL to: ${API_BASE}/api/whatsapp-bot/{tenant-slug}/meta`,
              `Set the verify token to match META_WHATSAPP_VERIFY_TOKEN (default: dento-whatsapp-verify)`,
              'Subscribe to the "messages" webhook field',
              'Set META_WHATSAPP_PHONE_ID and META_WHATSAPP_TOKEN in your .env',
              'Enable the bot in Admin Portal → Settings → WhatsApp Bot',
            ]}
          />
        </div>
      </div>

      {/* Conversation Flow */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Conversation Flow</h3>
        <div className="space-y-2">
          {[
            { user: 'Hi', bot: '👋 Welcome! Please select your language:\n1️⃣ English\n2️⃣ العربية' },
            { user: '1', bot: '🏥 Please select a branch:\n1️⃣ Main Branch\n2️⃣ Downtown Branch' },
            { user: '1', bot: '👨‍⚕️ Please select a doctor:\n1️⃣ Dr. Ahmad Hassan\n2️⃣ Dr. Sarah Ali' },
            { user: '1', bot: '📅 Please enter your preferred date.\nFormat: YYYY-MM-DD' },
            {
              user: '2025-01-20',
              bot: '⏰ Available slots:\n1️⃣ 09:00 — 09:30\n2️⃣ 10:00 — 10:30\n3️⃣ 11:00 — 11:30',
            },
            { user: '2', bot: '📝 Please enter your full name' },
            {
              user: 'John Doe',
              bot: '✅ Confirm booking:\n🏥 Main Branch\n👨‍⚕️ Dr. Ahmad\n📅 2025-01-20\n⏰ 10:00–10:30\nReply yes to confirm',
            },
            { user: 'yes', bot: '🎉 Appointment booked successfully!' },
          ].map((msg, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex justify-end">
                  <div className="rounded-lg bg-green-100 px-3 py-1.5 text-xs text-green-900 dark:bg-green-900/30 dark:text-green-300">
                    {msg.user}
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="whitespace-pre-line rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                    {msg.bot}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Webhook Endpoints */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">Webhook Endpoints</h3>
        <div className="space-y-2">
          <EndpointCard
            ep={{
              method: 'POST',
              path: '/api/whatsapp-bot/:tenantSlug/twilio',
              description:
                'Incoming message webhook for Twilio WhatsApp. Receives form-encoded body with From, Body, MessageSid.',
              auth: 'Public',
            }}
          />
          <EndpointCard
            ep={{
              method: 'GET',
              path: '/api/whatsapp-bot/:tenantSlug/meta',
              description:
                'Meta webhook verification (hub.challenge). Required during webhook registration in Meta Business dashboard.',
              auth: 'Public',
              params: [
                {
                  name: 'hub.mode',
                  type: 'string',
                  required: true,
                  description: 'Must be "subscribe"',
                },
                {
                  name: 'hub.verify_token',
                  type: 'string',
                  required: true,
                  description: 'Must match META_WHATSAPP_VERIFY_TOKEN',
                },
                {
                  name: 'hub.challenge',
                  type: 'string',
                  required: true,
                  description: 'Challenge value to echo back',
                },
              ],
            }}
          />
          <EndpointCard
            ep={{
              method: 'POST',
              path: '/api/whatsapp-bot/:tenantSlug/meta',
              description:
                'Incoming message webhook for Meta WhatsApp Cloud API. Receives JSON with entry[].changes[].value.messages[] structure.',
              auth: 'Public',
            }}
          />
        </div>
      </div>

      {/* Bot Commands */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">Bot Commands</h3>
        <div className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">Command</th>
                <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              <tr>
                <td className="px-3 py-2 text-xs">
                  <code>hi, hello, start, book</code>
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">Start new booking session</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-xs">
                  <code>cancel, إلغاء</code>
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  Cancel current booking and reset session
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-xs">
                  <code>yes, نعم</code>
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  Confirm booking at confirmation step
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-xs">
                  <code>no, لا</code>
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  Reject confirmation and cancel booking
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-xs">
                  <code>مرحبا, حجز</code>
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">Start new session (Arabic)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Session Info */}
      <div className="rounded-md border border-gray-200 p-4 dark:border-gray-700">
        <h3 className="mb-2 text-sm font-semibold">Session Management</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
          <li>• Sessions are stored per phone number in the tenant database</li>
          <li>
            • Sessions auto-expire after 30 minutes of inactivity (configurable in admin settings)
          </li>
          <li>• Only one active session per phone number at a time</li>
          <li>• Bilingual support: English and Arabic with full RTL</li>
        </ul>
      </div>
    </div>
  );
}

function SetupStep({ provider, steps }: { provider: string; steps: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-start text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800/50"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {provider}
      </button>
      {open && (
        <ol className="border-t px-4 py-3 dark:border-gray-700/50">
          {steps.map((s, i) => (
            <li key={i} className="mb-2 flex gap-2 text-xs text-gray-600 dark:text-gray-400">
              <span className="font-bold text-primary">{i + 1}.</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ── Section: Webhooks ───────────────────────────────────────

function WebhooksSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Webhooks &amp; Notifications
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          When bookings are created, confirmed, or rejected, the system fires notifications and
          tenant webhooks so you can integrate with external systems.
        </p>
      </div>

      {/* Booking Events */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">Booking Events</h3>
        <div className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">Event</th>
                <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">Trigger</th>
                <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">Channels</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              <tr>
                <td className="px-3 py-2">
                  <code className="text-xs">booking.created</code>
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">New booking submitted</td>
                <td className="px-3 py-2 text-xs text-gray-500">In-app, Email, SMS, WhatsApp</td>
              </tr>
              <tr>
                <td className="px-3 py-2">
                  <code className="text-xs">booking.confirmed</code>
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  Admin confirms booking (or auto-confirm)
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">Email, SMS, WhatsApp to patient</td>
              </tr>
              <tr>
                <td className="px-3 py-2">
                  <code className="text-xs">booking.rejected</code>
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">Admin rejects booking</td>
                <td className="px-3 py-2 text-xs text-gray-500">Email, SMS, WhatsApp to patient</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tenant Webhooks */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">Tenant Webhooks</h3>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          Configure tenant webhook endpoints in Admin Portal → Webhooks to receive HTTP POST
          callbacks when booking events occur. Webhooks use HMAC-SHA256 signatures for security.
        </p>
        <CodeBlock
          language="json"
          code={`// Example webhook payload
{
  "event": "appointment.created",
  "timestamp": "2025-01-20T10:00:00Z",
  "data": {
    "appointmentId": "665c...",
    "patientName": "John Doe",
    "doctorName": "Dr. Ahmad Hassan",
    "branchName": "Main Branch",
    "date": "2025-01-20",
    "startTime": "10:00",
    "endTime": "10:30",
    "status": "booked",
    "source": "website"
  }
}`}
        />
      </div>

      {/* Notification Channels */}
      <div className="rounded-md border border-gray-200 p-4 dark:border-gray-700">
        <h3 className="mb-2 text-sm font-semibold">Notification Channels</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { name: 'In-App', desc: 'Real-time notifications to admin users via WebSocket' },
            { name: 'Email', desc: 'Via Resend API or SMTP fallback. Requires patient email.' },
            { name: 'SMS', desc: 'Via Twilio. Requires patient phone and TWILIO env vars.' },
            { name: 'WhatsApp', desc: 'Via Twilio sandbox or Meta Business API. Requires phone.' },
          ].map((ch) => (
            <div key={ch.name} className="flex gap-2">
              <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
              <div>
                <span className="text-xs font-medium">{ch.name}</span>
                <p className="text-[10px] text-gray-500">{ch.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────

export default function BookingIntegrationGuidePage() {
  const [activeSection, setActiveSection] = useState<SectionKey>('overview');

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Online Booking Integration Guide
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Developer documentation for integrating with the Dento Online Booking system
        </p>
      </div>

      {/* Section Nav */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeSection === s.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <s.icon className="h-4 w-4" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div>
        {activeSection === 'overview' && <OverviewSection />}
        {activeSection === 'api' && <ApiReferenceSection />}
        {activeSection === 'widget' && <WidgetSection />}
        {activeSection === 'whatsapp' && <WhatsAppSection />}
        {activeSection === 'webhooks' && <WebhooksSection />}
      </div>
    </div>
  );
}
