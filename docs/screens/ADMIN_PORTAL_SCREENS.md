# Admin Portal — v2 Screen Designs

**Date:** February 25, 2026
**Stack:** React 19 + TailAdmin (Free) + Tailwind CSS 4 + Shadcn/ui + Lucide Icons
**RTL/LTR:** Tailwind Logical Properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`)
**Dark Mode:** ✅ Eingebaut (TailAdmin native)
**Layout:** Collapsible Sidebar + Top Header + Content Area + Optional Chat Panel

> **Konvention:** Admin Portal ist **bi-direktional** — Sprache wird vom Tenant gewählt.
> Arabic (ar) → RTL: Sidebar rechts, Text rechts-ausgerichtet, Formulare gespiegelt.
> English (en) → LTR: Sidebar links, Text links-ausgerichtet (Standard).
> Alle Screens nutzen **Tailwind Logical Properties** — KEIN `left`/`right`, nur `start`/`end`.

---

## RTL/LTR Konvention — Alle Screens

```
LTR (English):                          RTL (Arabic):
┌──────┬──────────────┬──────┐          ┌──────┬──────────────┬──────┐
│ Side │  Content     │ Chat │          │ Chat │  Content     │ Side │
│ bar  │              │Panel │          │Panel │              │ bar  │
│ ←    │              │    → │          │ ←    │              │    → │
└──────┴──────────────┴──────┘          └──────┴──────────────┴──────┘

Tailwind: className="flex" → automatisch reversed in RTL
Sidebar:  className="border-e" → rechter Rand in LTR, linker in RTL
Margins:  className="ms-4" → margin-left in LTR, margin-right in RTL
Text:     className="text-start" → left in LTR, right in RTL
Icons:    className="rtl:rotate-180" → Pfeile spiegeln in RTL
```

---

## 1. Layout-Grundstruktur

### LTR (English)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────┐                                      🔔  💬 3  👤 Dr. Ahmed ▾ │
│ │  LOGO   │  Cairo Smile Dental               [Search ⌘K]         ◑ Dark  │
│ └─────────┘                                                                 │
├──────────────┬──────────────────────────────────────────────────────────────┤
│              │                                                              │
│ ─ Main ──── │  Dashboard > Patients > Ahmed Mohamed                        │
│ 📊 Dashboard │                                                              │
│ 📋 Patients  │  ┌──────────────────────────────────────────────────────┐    │
│ 📅 Appoint.  │  │                                                      │    │
│ 🦷 Charts    │  │              PAGE CONTENT                            │    │
│ 📝 Treatments│  │                                                      │    │
│ 🔬 Lab Orders│  └──────────────────────────────────────────────────────┘    │
│              │                                                              │
│ ─ Financial ─│                                                              │
│ 💰 Invoices  │                                                              │
│ 💳 Payments  │                                                              │
│ 🛡️ Insurance │                                                              │
│              │                                                              │
│ ─ Operations─│                                                              │
│ 📦 Inventory │                                                              │
│ 🏥 Branches  │                                                              │
│ 👥 Staff     │                                                              │
│ ⚙️ Settings  │                                                              │
│              │                                                              │
├──────────────┴──────────────────────────────────────────────────────────────┤
│ Cairo Smile v2.0  •  Dr. Ahmed (Dentist)  •  Branch: Main  •  🇪🇬 EGP     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### RTL (Arabic) — Sidebar rechts, Text rechts

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  د. أحمد ▾  👤  3 💬  🔔                       ┌─────────┐                 │
│  ◑ داكن          [بحث ⌘K]       عيادة ابتسامة القاهرة  │  LOGO   │                 │
│                                                 └─────────┘                 │
├──────────────────────────────────────────────────────────────┬──────────────┤
│                                                              │              │
│  لوحة المعلومات > المرضى > أحمد محمد                         │ ─ رئيسي ─── │
│                                                              │ 📊 لوحة      │
│  ┌──────────────────────────────────────────────────────┐    │ 📋 المرضى    │
│  │                                                      │    │ 📅 المواعيد   │
│  │              محتوى الصفحة                              │    │ 🦷 الأسنان   │
│  │                                                      │    │ 📝 العلاجات  │
│  └──────────────────────────────────────────────────────┘    │ 🔬 المختبر   │
│                                                              │              │
│                                                              │ ─ المالية ── │
│                                                              │ 💰 الفواتير  │
│                                                              │ 💳 المدفوعات │
│                                                              │ 🛡️ التأمين   │
│                                                              │              │
│                                                              │ ─ العمليات ─ │
│                                                              │ 📦 المخزون   │
│                                                              │ 🏥 الفروع    │
│                                                              │ 👥 الموظفين  │
│                                                              │ ⚙️ الإعدادات │
│                                                              │              │
├──────────────────────────────────────────────────────────────┴──────────────┤
│  🇪🇬 ج.م  •  الفرع: الرئيسي  •  د. أحمد (طبيب أسنان)  •  عيادة ابتسامة  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Layout-Komponente (RTL-aware)

```tsx
// packages/web/src/admin/layouts/AdminPortalLayout.tsx
import { useLocale } from '@/hooks/useLocale';

export function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const { direction, t } = useLocale(); // 'ltr' | 'rtl'

  return (
    // dir is set on <html> by useLocale — all children inherit
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Sidebar — TailAdmin Collapsible
          In LTR: renders on left (default flex order)
          In RTL: renders on right (flex auto-reverses) */}
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        logo={tenant.branding?.logo} // Dynamic from tenant settings
        clinicName={tenant.name}
      />

      {/* Main Content — always in the middle */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        <Header
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onChatClick={() => setChatOpen(!chatOpen)}
          unreadCount={unreadChatCount}
          searchPlaceholder={t('search.placeholder')} // "Search..." / "بحث..."
        />
        <main className="mx-auto w-full max-w-screen-2xl p-4 md:p-6">
          <Breadcrumb />
          {children}
        </main>
      </div>

      {/* Chat Panel — slides from end side
          In LTR: slides from right
          In RTL: slides from left */}
      {chatOpen && (
        <ChatPanel
          className="w-80 border-s border-gray-200 dark:border-gray-700"
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
```

### Sidebar-Konfiguration (rollenbasiert)

```tsx
const ADMIN_SIDEBAR: SidebarSection[] = [
  {
    label: 'sidebar.main', // i18n key
    items: [
      { icon: LayoutDashboard, label: 'sidebar.dashboard', href: '/admin/dashboard', roles: ['*'] },
      { icon: Users, label: 'sidebar.patients', href: '/admin/patients', roles: ['*'] },
      { icon: Calendar, label: 'sidebar.appointments', href: '/admin/appointments', roles: ['*'] },
      {
        icon: Activity,
        label: 'sidebar.dailyOps',
        href: '/admin/daily-operations',
        roles: ['tenant_admin', 'receptionist', 'dentist'],
      },
    ],
  },
  {
    label: 'sidebar.clinical',
    items: [
      {
        icon: Tooth,
        label: 'sidebar.charts',
        href: '/admin/dental-charts',
        roles: ['dentist', 'hygienist'],
      },
      {
        icon: ClipboardList,
        label: 'sidebar.treatments',
        href: '/admin/treatment-plans',
        roles: ['dentist'],
      },
      {
        icon: FileText,
        label: 'sidebar.procedures',
        href: '/admin/procedure-notes',
        roles: ['dentist'],
      },
      {
        icon: Pill,
        label: 'sidebar.prescriptions',
        href: '/admin/prescriptions',
        roles: ['dentist'],
      },
      { icon: Scan, label: 'sidebar.xrays', href: '/admin/xrays', roles: ['dentist', 'lab_tech'] },
      {
        icon: Microscope,
        label: 'sidebar.labOrders',
        href: '/admin/lab-orders',
        roles: ['dentist', 'lab_tech'],
      },
      {
        icon: FileCheck,
        label: 'sidebar.consent',
        href: '/admin/consent-forms',
        roles: ['dentist', 'receptionist'],
      },
    ],
  },
  {
    label: 'sidebar.financial',
    items: [
      {
        icon: Receipt,
        label: 'sidebar.invoices',
        href: '/admin/invoices',
        roles: ['tenant_admin', 'accountant'],
      },
      {
        icon: CreditCard,
        label: 'sidebar.payments',
        href: '/admin/payments',
        roles: ['tenant_admin', 'accountant', 'receptionist'],
      },
      {
        icon: Shield,
        label: 'sidebar.insurance',
        href: '/admin/insurance',
        roles: ['tenant_admin', 'accountant'],
      },
      {
        icon: Wallet,
        label: 'sidebar.installments',
        href: '/admin/installments',
        roles: ['tenant_admin', 'accountant'],
      },
      {
        icon: TrendingUp,
        label: 'sidebar.commissions',
        href: '/admin/commissions',
        roles: ['tenant_admin'],
      },
    ],
  },
  {
    label: 'sidebar.operations',
    items: [
      {
        icon: Package,
        label: 'sidebar.inventory',
        href: '/admin/inventory',
        roles: ['tenant_admin', 'assistant'],
      },
      {
        icon: Building,
        label: 'sidebar.branches',
        href: '/admin/branches',
        roles: ['tenant_admin'],
      },
      { icon: UserCog, label: 'sidebar.staff', href: '/admin/staff', roles: ['tenant_admin'] },
      {
        icon: Clock,
        label: 'sidebar.schedules',
        href: '/admin/schedules',
        roles: ['tenant_admin', 'receptionist'],
      },
      { icon: CalendarOff, label: 'sidebar.leave', href: '/admin/leave', roles: ['*'] },
      {
        icon: BarChart3,
        label: 'sidebar.reports',
        href: '/admin/reports',
        roles: ['tenant_admin', 'accountant'],
      },
      {
        icon: Bell,
        label: 'sidebar.notifications',
        href: '/admin/notifications',
        roles: ['tenant_admin'],
      },
      {
        icon: Settings,
        label: 'sidebar.settings',
        href: '/admin/settings',
        roles: ['tenant_admin'],
      },
    ],
  },
];

// Filter by user role
const visibleItems = ADMIN_SIDEBAR.map((section) => ({
  ...section,
  items: section.items.filter(
    (item) => item.roles.includes('*') || item.roles.includes(currentUser.role),
  ),
})).filter((section) => section.items.length > 0);
```

---

## 2. Dashboard

### LTR

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Dashboard                                        Today: Feb 25, 2026 ▾    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ 24            │  │ 18            │  │ 3            │  │ EGP 12,450   │   │
│  │ Today's       │  │ Appointments │  │ Walk-ins     │  │ Revenue      │   │
│  │ Patients      │  │ Remaining    │  │ Waiting      │  │ Today        │   │
│  │ 👥 ↗ +12%     │  │ 📅 ↘ -3%      │  │ 🚶 →          │  │ 💰 ↗ +8%     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
│  ┌────────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │ Appointments Today                 │  │ Revenue (Last 7 Days)        │  │
│  │                                    │  │                              │  │
│  │  09:00  Ahmed M. — Dr. Samy   ✅   │  │  15k ┤      ╭─╮            │  │
│  │  09:30  Sara K.  — Dr. Samy   🟢   │  │  10k ┤  ╭───╯ ╰──         │  │
│  │  10:00  Mona A.  — Dr. Layla  ⏳   │  │   5k ┤──╯              EGP │  │
│  │  10:30  Khaled F.— Dr. Samy   ⏳   │  │   0k ┤                     │  │
│  │  11:00  Youssef  — Dr. Layla  ⏳   │  │      Mon Tue Wed Thu Fri   │  │
│  │  [View Full Calendar →]            │  │                              │  │
│  └────────────────────────────────────┘  └──────────────────────────────┘  │
│                                                                             │
│  ┌────────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │ Chair Status (Live)                │  │ Quick Actions                │  │
│  │                                    │  │                              │  │
│  │  🟢 Chair 1 — Available            │  │  [+ New Patient]             │  │
│  │  🔴 Chair 2 — Sara K. (25 min)     │  │  [+ New Appointment]         │  │
│  │  🟢 Chair 3 — Available            │  │  [+ Walk-in]                 │  │
│  │  🔴 Chair 4 — Nadia R. (10 min)    │  │  [+ New Invoice]             │  │
│  │  🟡 Chair 5 — Cleaning             │  │  [📊 Daily Report]           │  │
│  └────────────────────────────────────┘  └──────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### RTL (Arabic)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ▾ اليوم: ٢٥ فبراير ٢٠٢٦                                   لوحة المعلومات │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ ج.م ١٢,٤٥٠   │  │            ٣ │  │           ١٨ │  │           ٢٤ │   │
│  │ الإيرادات     │  │ في الانتظار  │  │ المواعيد     │  │ مرضى اليوم   │   │
│  │ اليوم         │  │              │  │ المتبقية     │  │              │   │
│  │ ٪٨+ ↗ 💰     │  │ → 🚶         │  │ ٪٣- ↘ 📅     │  │ ٪١٢+ ↗ 👥   │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
│  ┌──────────────────────────────┐  ┌────────────────────────────────────┐  │
│  │ الإيرادات (آخر ٧ أيام)       │  │ مواعيد اليوم                       │  │
│  │                              │  │                                    │  │
│  │       ╭─╮      ┤ ١٥ألف      │  │  ✅  د. سامي  — أحمد م.    ٠٩:٠٠ │  │
│  │  ──╭──╯ ╰───╮  ┤ ١٠ألف      │  │  🟢  د. سامي  — سارة ك.   ٠٩:٣٠ │  │
│  │  ج.م        ╰──┤  ٥ألف      │  │  ⏳  د. ليلى  — منى أ.    ١٠:٠٠ │  │
│  │                 ┤  ٠         │  │  ⏳  د. سامي  — خالد ف.   ١٠:٣٠ │  │
│  │   جمعة خميس أربع ثلاث إثنين  │  │  ⏳  د. ليلى  — يوسف     ١١:٠٠ │  │
│  │                              │  │            [← عرض التقويم كاملاً] │  │
│  └──────────────────────────────┘  └────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────┐  ┌────────────────────────────────────┐  │
│  │ إجراءات سريعة                │  │ حالة الكراسي (مباشر)               │  │
│  │                              │  │                                    │  │
│  │  [+ مريض جديد]               │  │  متاح — كرسي ١ 🟢                 │  │
│  │  [+ موعد جديد]               │  │  سارة ك. (٢٥ د) — كرسي ٢ 🔴      │  │
│  │  [+ حالة طوارئ]              │  │  متاح — كرسي ٣ 🟢                 │  │
│  │  [+ فاتورة جديدة]            │  │  نادية ر. (١٠ د) — كرسي ٤ 🔴     │  │
│  │  [📊 التقرير اليومي]          │  │  تنظيف — كرسي ٥ 🟡                │  │
│  └──────────────────────────────┘  └────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Dashboard Implementierung

```tsx
import { useLocale } from '@/hooks/useLocale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';

function Dashboard() {
  const { t, formatNumber, formatCurrency } = useLocale();
  const { data: stats } = useQuery({ queryKey: ['dashboard-stats'] });

  return (
    <div className="space-y-6">
      {/* Stat Cards — grid auto-reverses in RTL */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t('dashboard.todayPatients')}
          value={formatNumber(stats?.todayPatients)}
          icon={Users}
          change="+12%"
        />
        <StatCard
          title={t('dashboard.remainingAppts')}
          value={formatNumber(stats?.remainingAppointments)}
          icon={Calendar}
        />
        <StatCard
          title={t('dashboard.walkinsWaiting')}
          value={formatNumber(stats?.walkinsWaiting)}
          icon={UserPlus}
        />
        <StatCard
          title={t('dashboard.todayRevenue')}
          value={formatCurrency(stats?.todayRevenue)} // "EGP 12,450" / "١٢,٤٥٠ ج.م"
          icon={DollarSign}
        />
      </div>

      {/* Two-column layout — auto-reverses in RTL */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AppointmentsToday />
        <RevenueChart />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChairStatus />
        <QuickActions />
      </div>
    </div>
  );
}
```

---

## 3. Patient List

### LTR

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Patients                                                 [+ New Patient]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [🔍 Search by name, phone, ID...]  [Gender ▾]  [Status ▾]  [⬇ Export]   │
│                                                                             │
│  ┌─────┬──────────────────┬────────┬───────────────┬────────┬────────────┐ │
│  │     │ PATIENT          │ GENDER │ PHONE         │ LAST   │ BALANCE    │ │
│  │     │                  │        │               │ VISIT  │            │ │
│  ├─────┼──────────────────┼────────┼───────────────┼────────┼────────────┤ │
│  │ ☐   │ 👤 Ahmed Mohamed │ Male   │ +20 101234567 │ Feb 20 │ EGP 0      │ │
│  │     │ #P-001           │        │               │        │            │ │
│  ├─────┼──────────────────┼────────┼───────────────┼────────┼────────────┤ │
│  │ ☐   │ 👤 Sara Khaled   │ Female │ +20 100000043 │ Feb 24 │ EGP 1,200  │ │
│  │     │ #P-002           │        │               │        │ ⚠️ Overdue  │ │
│  ├─────┼──────────────────┼────────┼───────────────┼────────┼────────────┤ │
│  │ ☐   │ 👤 Omar Hassan   │ Male   │ +20 112345678 │ Jan 15 │ EGP 0      │ │
│  │     │ #P-003           │        │               │        │            │ │
│  └─────┴──────────────────┴────────┴───────────────┴────────┴────────────┘ │
│                                                                             │
│  Showing 1-25 of 1,247       ← 1 2 3 ... 50 →                     25/pg ▾ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### RTL (Arabic)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [+ مريض جديد]                                               المرضى       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [⬇ تصدير]  [▾ الحالة]  [▾ الجنس]  [...بحث بالاسم، الهاتف، الرقم 🔍]    │
│                                                                             │
│  ┌────────────┬────────┬───────────────┬────────┬──────────────────┬─────┐ │
│  │ الرصيد     │ آخر    │ الهاتف        │ الجنس  │ المريض           │     │ │
│  │            │ زيارة   │               │        │                  │     │ │
│  ├────────────┼────────┼───────────────┼────────┼──────────────────┼─────┤ │
│  │ ج.م ٠     │ ٢٠ فبر │ ٢٠+ ١٠١٢٣٤٥ │ ذكر    │ أحمد محمد 👤     │  ☐  │ │
│  │            │        │               │        │ P-001#           │     │ │
│  ├────────────┼────────┼───────────────┼────────┼──────────────────┼─────┤ │
│  │ ج.م ١,٢٠٠ │ ٢٤ فبر │ ٢٠+ ١٠٩٨٧٦٥ │ أنثى   │ سارة خالد 👤     │  ☐  │ │
│  │ ⚠️ متأخر   │        │               │        │ P-002#           │     │ │
│  └────────────┴────────┴───────────────┴────────┴──────────────────┴─────┘ │
│                                                                             │
│  ▾ صفحة/٢٥                    ← ٥٠ ... ٣ ٢ ١ →       ١,٢٤٧ من ٢٥-١ عرض │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Patient Detail (Tabs)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back    Ahmed Mohamed  #P-001            Male · 35y · +20 101234567     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Overview] [Medical] [Appointments] [Charts] [Treatments] [Invoices]      │
│  [X-Rays] [Prescriptions] [Documents]                                      │
│  ═══════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  ┌── Overview ──────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  ┌─── Contact ─────────┐  ┌─── Medical ────────────────────────┐   │   │
│  │  │ Phone: +20 101234567│  │ Blood Type: O+                     │   │   │
│  │  │ Email: ahmed@mail   │  │ Allergies: Penicillin, Latex       │   │   │
│  │  │ Address: Cairo, EG  │  │ Conditions: Diabetes Type 2        │   │   │
│  │  │ DOB: 1991-03-15     │  │ Medications: Metformin 500mg       │   │   │
│  │  │ Insurance: AXA #123 │  │ Smoker: Yes                        │   │   │
│  │  └─────────────────────┘  └────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  │  ┌─── Recent Activity ───────────────────────────────────────────┐  │   │
│  │  │ Feb 24 — Appointment with Dr. Samy (Root Canal #14)          │  │   │
│  │  │ Feb 20 — Invoice #INV-0234 (EGP 3,500) — PAID               │  │   │
│  │  │ Feb 15 — X-Ray (Periapical #14) taken                        │  │   │
│  │  │ Feb 10 — Treatment Plan created (3 procedures)                │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Patient DataTable Implementierung

```tsx
import { DataTable } from '@/components/ui/data-table';
import { useLocale } from '@/hooks/useLocale';

function PatientList() {
  const { t, formatCurrency, formatDate, direction } = useLocale();

  const columns: ColumnDef<Patient>[] = [
    { id: 'select' },
    {
      accessorKey: 'name',
      header: t('patients.name'),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">👤 {row.original.name}</div>
          <div className="text-xs text-muted-foreground">#{row.original.patientId}</div>
        </div>
      ),
    },
    { accessorKey: 'gender', header: t('patients.gender') },
    { accessorKey: 'phone', header: t('patients.phone') },
    {
      accessorKey: 'lastVisit',
      header: t('patients.lastVisit'),
      cell: ({ row }) => formatDate(row.original.lastVisit), // "Feb 20" / "٢٠ فبر"
    },
    {
      accessorKey: 'balance',
      header: t('patients.balance'),
      cell: ({ row }) => (
        <div>
          <span>{formatCurrency(row.original.balance)}</span>
          {row.original.balance > 0 && (
            <Badge variant="warning" className="ms-2">
              {t('common.overdue')}
            </Badge>
          )}
        </div>
      ),
    },
    { id: 'actions' /* DropdownMenu */ },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('patients.title')}</h1>
        <Button>
          <Plus className="me-2 h-4 w-4" />
          {t('patients.new')}
        </Button>
      </div>
      <DataTable columns={columns} data={patients} />
    </div>
  );
}
```

---

## 4. Appointments Calendar

### LTR

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Appointments                             [+ New Appointment]  [+ Walk-in] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Day] [Week] [Month] [List]     ← Feb 25, 2026 →     [Dr. Samy ▾] [All]  │
│  ═══════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  ┌── Week View ─────────────────────────────────────────────────────────┐  │
│  │       │ Mon 24  │ Tue 25  │ Wed 26  │ Thu 27  │ Fri 28  │          │  │
│  │       │         │ TODAY   │         │         │         │          │  │
│  │ 08:00 │         │         │         │         │ 🟡       │          │  │
│  │       │         │         │         │         │         │          │  │
│  │ 09:00 │ ▓▓▓▓▓▓▓ │ ▓▓▓▓▓▓▓ │         │ ▓▓▓▓▓▓▓ │         │          │  │
│  │       │ Ahmed M │ Sara K. │         │ Layla M │         │          │  │
│  │       │ Dr.Samy │ Dr.Samy │         │ Dr.Samy │         │          │  │
│  │ 09:30 │         │         │         │         │         │          │  │
│  │       │         │ ▓▓▓▓▓▓▓ │         │         │         │          │  │
│  │ 10:00 │ ▓▓▓▓▓▓▓ │ Mona A. │ ▓▓▓▓▓▓▓ │         │         │          │  │
│  │       │ Khaled  │ Dr.Layla│ Omar H. │         │         │          │  │
│  │       │ Dr.Layla│         │ Dr.Samy │         │         │          │  │
│  │ 10:30 │         │ ▓▓▓▓▓▓▓ │         │ ▓▓▓▓▓▓▓ │         │          │  │
│  │       │         │ Khaled  │         │ Nadia   │         │          │  │
│  │       │         │ Dr.Samy │         │ Dr.Layla│         │          │  │
│  └───────┴─────────┴─────────┴─────────┴─────────┴─────────┴──────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### RTL (Arabic) — Woche spiegelt

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [+ حالة طوارئ]  [+ موعد جديد]                                 المواعيد   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [الكل] [▾ د. سامي]     → ٢٥ فبراير ٢٠٢٦ ←     [قائمة] [شهر] [أسبوع] [يوم] │
│  ═══════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  ┌── عرض أسبوعي ────────────────────────────────────────────────────────┐  │
│  │          │ جمعة ٢٨│ خميس ٢٧│ أربعاء ٢٦│ ثلاثاء ٢٥│ إثنين ٢٤│       │  │
│  │          │        │        │          │ اليوم    │         │       │  │
│  │   ٠٨:٠٠ │ 🟡      │        │          │          │         │       │  │
│  │          │        │        │          │          │         │       │  │
│  │   ٠٩:٠٠ │        │ ▓▓▓▓▓▓ │          │ ▓▓▓▓▓▓▓  │ ▓▓▓▓▓▓▓ │       │  │
│  │          │        │ ليلى م │          │ سارة ك.  │ أحمد م. │       │  │
│  │          │        │ د.سامي │          │ د.سامي   │ د.سامي  │       │  │
│  │   ٠٩:٣٠ │        │        │          │          │         │       │  │
│  │          │        │        │          │ ▓▓▓▓▓▓▓  │         │       │  │
│  │   ١٠:٠٠ │        │        │ ▓▓▓▓▓▓▓  │ منى أ.   │ ▓▓▓▓▓▓▓ │       │  │
│  │          │        │        │ عمر ح.   │ د.ليلى   │ خالد    │       │  │
│  │          │        │        │ د.سامي   │          │ د.ليلى  │       │  │
│  └──────────┴────────┴────────┴──────────┴──────────┴─────────┴───────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### New Appointment Dialog

```
┌──────────────────────────────────────────┐
│  New Appointment                    [✕]  │
├──────────────────────────────────────────┤
│                                          │
│  Patient *                               │
│  [🔍 Search patient...        ▾]        │
│                                          │
│  Doctor *                                │
│  [Dr. Samy Hassan             ▾]        │
│                                          │
│  Branch *                                │
│  [Main Branch                 ▾]        │
│                                          │
│  Date *              Time *              │
│  [📅 Feb 26, 2026]   [10:00 AM ▾]      │
│                                          │
│  Duration            Type                │
│  [30 min ▾]          [Check-up ▾]       │
│                                          │
│  Notes                                   │
│  [                                    ]  │
│                                          │
│  ☐ Send SMS reminder to patient          │
│  ☐ Recurring appointment                 │
│                                          │
│         [Cancel]  [Create Appointment]   │
└──────────────────────────────────────────┘
```

### Calendar Implementierung

```tsx
// Using @fullcalendar/react with RTL support
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useLocale } from '@/hooks/useLocale';

function AppointmentCalendar() {
  const { direction, language } = useLocale();

  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin]}
      initialView="timeGridWeek"
      direction={direction} // 'rtl' | 'ltr' — FullCalendar native support
      locale={language} // 'ar' | 'en' — auto-translates labels
      headerToolbar={{
        start: 'prev,next today', // FullCalendar uses start/end (RTL-aware)
        center: 'title',
        end: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
      }}
      slotMinTime="08:00:00"
      slotMaxTime="20:00:00"
      events={appointments}
      eventClick={handleEventClick}
      selectable={true}
      select={handleSlotSelect} // Opens new appointment dialog
    />
  );
}
```

---

## 5. Daily Operations Hub

### LTR

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Daily Operations                        📅 Feb 25, 2026  🏥 Branch: Main │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Scheduled│ │ Arrived  │ │ Waiting  │ │ In Chair │ │Completed │        │
│  │    12    │ │    8     │ │    3     │ │    4     │ │    5     │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                                             │
│  [All Today]  [Scheduled]  [Walk-ins]  [Waiting Room]  [In Chair]          │
│  ══════════════════════════════════════════════════════════════════          │
│                                                                             │
│  ┌─────┬──────────┬──────────┬────────┬────────┬────────┬────────┬──────┐ │
│  │ #   │ Patient  │ Type     │ Time   │ Doctor │ Chair  │ Status │ Act. │ │
│  ├─────┼──────────┼──────────┼────────┼────────┼────────┼────────┼──────┤ │
│  │ --  │ Ahmed M. │ 🗓 Appt  │ 09:00  │ Dr. S  │   --   │ ⏳ Pend│[Arr.]│ │
│  │ 001 │ Sara K.  │ 🗓 Appt  │ 09:30  │ Dr. S  │ Ch. 2  │ 🔴 Chair│[Done]│ │
│  │ 002 │ Omar H.  │ 🚶Walk-in│ 09:45  │   --   │   --   │ ⏳ Wait│[Call]│ │
│  │ 003 │ Mona A.  │ 🗓 Appt  │ 10:00  │ Dr. L  │   --   │ 🟢 Arr.│[Call]│ │
│  │ 004 │ Youssef  │ 🚶Walk-in│ 10:15  │   --   │   --   │ ⏳ Wait│[Call]│ │
│  └─────┴──────────┴──────────┴────────┴────────┴────────┴────────┴──────┘ │
│                                                                             │
│  CHAIR OVERVIEW                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│  │ 🟢 Chair 1   │ │ 🔴 Chair 2   │ │ 🟢 Chair 3   │ │ 🔴 Chair 4   │      │
│  │   Available  │ │  Sara K.     │ │   Available  │ │  Nadia R.    │      │
│  │              │ │  Dr. Samy    │ │              │ │  Dr. Layla   │      │
│  │              │ │  ⏱ 25 min    │ │              │ │  ⏱ 10 min    │      │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘      │
│                                                                             │
│  [+ New Walk-in]                                              [🔄 Live]    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### RTL (Arabic)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  الفرع: الرئيسي 🏥  ٢٥ فبراير ٢٠٢٦ 📅                  العمليات اليومية │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│        ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│        │  مكتمل   │ │ في الكرسي│ │ في الانتظار│ │  وصلوا   │ │  مجدول   │  │
│        │    ٥     │ │    ٤     │ │    ٣     │ │    ٨     │ │   ١٢     │  │
│        └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                                             │
│  [في الكرسي]  [غرفة الانتظار]  [بدون موعد]  [مجدولين]  [الكل اليوم]      │
│  ══════════════════════════════════════════════════════════════════          │
│                                                                             │
│  ┌──────┬────────┬────────┬────────┬──────────┬──────────┬─────┐          │
│  │ إجراء│ الحالة  │ الكرسي │ الطبيب │ الوقت    │ المريض   │  #  │          │
│  ├──────┼────────┼────────┼────────┼──────────┼──────────┼─────┤          │
│  │[وصل] │ ⏳ منتظر│  --    │ --     │ ٠٩:٠٠   │ أحمد م.🗓│ --  │          │
│  │[تم]  │ 🔴 كرسي│ ك. ٢   │ د. س   │ ٠٩:٣٠   │ سارة ك.🗓│ ٠٠١│          │
│  │[نداء]│ ⏳ انتظار│ --    │ --     │ ٠٩:٤٥   │ عمر ح. 🚶│ ٠٠٢│          │
│  │[نداء]│ 🟢 وصل │ --     │ د. ل   │ ١٠:٠٠   │ منى أ.🗓 │ ٠٠٣│          │
│  └──────┴────────┴────────┴────────┴──────────┴──────────┴─────┘          │
│                                                                             │
│  نظرة عامة على الكراسي                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│  │  كرسي ٤ 🔴   │ │  كرسي ٣ 🟢   │ │  كرسي ٢ 🔴   │ │  كرسي ١ 🟢   │      │
│  │  نادية ر.    │ │   متاح       │ │  سارة ك.     │ │   متاح       │      │
│  │  د. ليلى     │ │              │ │  د. سامي     │ │              │      │
│  │  ⏱ ١٠ د      │ │              │ │  ⏱ ٢٥ د      │ │              │      │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘      │
│                                                                             │
│  [🔄 مباشر]                                          [+ حالة بدون موعد]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Chair Assignment Modal

```
LTR:                                    RTL:
┌────────────────────────────┐          ┌────────────────────────────┐
│  Assign to Chair      [✕]  │          │  [✕]      تعيين إلى كرسي   │
│                             │          │                             │
│  Patient: Omar H. (#002)   │          │   (٠٠٢#) عمر ح. :المريض   │
│  Doctor:  [Dr. Samy    ▾]  │          │  [▾ د. سامي]  :الطبيب      │
│                             │          │                             │
│  Available Chairs:          │          │          :الكراسي المتاحة   │
│  ○ Chair 1 (Standard) 🟢   │          │   🟢 (عادي) كرسي ١ ○        │
│  ○ Chair 3 (Standard) 🟢   │          │   🟢 (عادي) كرسي ٣ ○        │
│                             │          │                             │
│  [Cancel]  [Assign]        │          │        [تعيين]  [إلغاء]     │
└────────────────────────────┘          └────────────────────────────┘
```

---

## 6. Dental Chart

### LTR

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Patient: Ahmed Mohamed                              [📜 History] [💾]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌── Adult Dental Chart ────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  UPPER JAW                                                           │  │
│  │  ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐│  │
│  │  │18 │17 │16 │15 │14 │13 │12 │11 │21 │22 │23 │24 │25 │26 │27 │28 ││  │
│  │  │   │   │🔴 │   │🟡 │   │   │   │   │   │   │   │   │🔵 │   │   ││  │
│  │  └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘│  │
│  │                                                                      │  │
│  │  LOWER JAW                                                           │  │
│  │  ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐│  │
│  │  │48 │47 │46 │45 │44 │43 │42 │41 │31 │32 │33 │34 │35 │36 │37 │38 ││  │
│  │  │   │   │   │   │   │   │   │   │   │   │   │🟡 │   │🔴 │   │❌ ││  │
│  │  └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘│  │
│  │                                                                      │  │
│  │  Legend: 🔴 Caries  🟡 Filling  🔵 Crown  ❌ Missing  ⬜ Healthy    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌── Selected: Tooth #16 ───────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  Conditions:  [Caries ▾]  Surface: [Occlusal ▾]  Severity: [Mod ▾]  │  │
│  │                                                                       │  │
│  │  Linked Records:                                                      │  │
│  │  📋 Treatment Plan: Root Canal (Feb 10)                               │  │
│  │  🔬 X-Ray: Periapical #16 (Feb 15)                                   │  │
│  │  💊 Prescription: Amoxicillin 500mg (Feb 24)                          │  │
│  │                                                                       │  │
│  │  [+ Add Condition]  [+ Link X-Ray]  [+ Create Treatment]             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### RTL (Arabic) — Chart bleibt gespiegelt NICHT (Zähne sind universal)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [💾] [📜 السجل]                               أحمد محمد :المريض →        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌── مخطط الأسنان للبالغين ─────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  الفك العلوي                                                         │  │
│  │  ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐│  │
│  │  │18 │17 │16 │15 │14 │13 │12 │11 │21 │22 │23 │24 │25 │26 │27 │28 ││  │
│  │  │   │   │🔴 │   │🟡 │   │   │   │   │   │   │   │   │🔵 │   │   ││  │
│  │  └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘│  │
│  │                                                                      │  │
│  │  ⬜ سليم  ❌ مفقود  🔵 تاج  🟡 حشوة  🔴 تسوس  :الرموز               │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌── المحدد: سن رقم ١٦ ────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  [▾ متوسط] :الشدة  [▾ إطباقي] :السطح  [▾ تسوس] :الحالة               │  │
│  │                                                                       │  │
│  │  السجلات المرتبطة:                                                    │  │
│  │  📋 خطة علاج: علاج عصب (١٠ فبر)                                      │  │
│  │  🔬 أشعة: حول الذروة #١٦ (١٥ فبر)                                    │  │
│  │  💊 وصفة: أموكسيسيلين ٥٠٠ مج (٢٤ فبر)                                │  │
│  │                                                                       │  │
│  │  [+ إضافة حالة]  [+ ربط أشعة]  [+ إنشاء علاج]                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

> **Wichtig:** Der Dental Chart selbst wird **NICHT gespiegelt** in RTL — die Zahn-Nummern
> (FDI-System) sind international standardisiert. Nur Labels, Buttons und Panel-Layouts spiegeln.

### Dental Chart Implementierung

> **Library:** `react-odontogram` v0.5.5+ (MIT, beibehalten aus v1).
> v0.5.5 hat alle v1-Lücken geschlossen: FDI nativ, `teethConditions` API,
> Dark Mode, Child Teeth (`maxTeeth=5`), `readOnly`, `showHalf`.
> Wir wrappen es mit eigenem Detail-Panel, Surface-Diagramm und Linked Records.

```tsx
import { Odontogram } from 'react-odontogram';
import 'react-odontogram/style.css';

function DentalChart({ patientId }: { patientId: string }) {
  const { t } = useLocale();
  const { isDark } = useTheme();
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [chartType, setChartType] = useState<'adult' | 'child'>('adult');

  // Map DB conditions → react-odontogram teethConditions format
  const conditions: ToothConditionGroup[] = teethData
    .filter((t) => t.condition !== 'healthy')
    .map((t) => ({
      label: t.condition,
      teeth: [`teeth-${t.toothNumber}`],
      fillColor: CONDITIONS[t.condition].bg,
      outlineColor: CONDITIONS[t.condition].color,
    }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chart — react-odontogram handles all SVG rendering */}
      <div className="lg:col-span-2">
        <Card>
          <CardContent className="p-6">
            <Odontogram
              notation="FDI" // Native FDI (was Universal in v1)
              theme={isDark ? 'dark' : 'light'} // Native dark mode
              maxTeeth={chartType === 'child' ? 5 : 8} // Child teeth support
              teethConditions={conditions} // Clean conditions API
              singleSelect={true}
              readOnly={viewingHistory}
              showLabels={true}
              showHalf="full"
              onChange={handleToothSelect}
              tooltip={{
                placement: 'top',
                content: (tooth) => <ToothTooltip tooth={tooth} data={teethData} />,
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Detail Panel — our custom code (mirrors in RTL) */}
      {selectedTooth && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t('chart.selected')}: {t('chart.tooth')} #{selectedTooth}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Select label={t('chart.condition')} />
              <Select label={t('chart.surface')} /> {/* Own surface SVG diagram */}
              <Select label={t('chart.severity')} /> {/* v2 NEW */}
            </div>
            <LinkedRecords toothNumber={selectedTooth} patientId={patientId} />
            <ActionButtons tooth={selectedTooth} />{' '}
            {/* + Add Condition, + Link X-Ray, + Create Treatment */}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## 7. Treatment Plans

### LTR

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Treatment Plans — Ahmed Mohamed                      [+ New Plan]         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌── Active Plan: Root Canal + Crown #16 ────────────────────────────┐    │
│  │  Status: 🟡 In Progress   Doctor: Dr. Samy   Created: Feb 10     │    │
│  │                                                                    │    │
│  │  ┌───┬─────────────────────┬────────┬──────────┬────────┬───────┐ │    │
│  │  │ # │ PROCEDURE           │ TOOTH  │ STATUS   │  FEE   │       │ │    │
│  │  ├───┼─────────────────────┼────────┼──────────┼────────┼───────┤ │    │
│  │  │ 1 │ Periapical X-Ray    │ #16    │ ✅ Done   │ EGP 200│       │ │    │
│  │  │ 2 │ Root Canal Therapy  │ #16    │ 🟡 In Pr. │EGP 3500│       │ │    │
│  │  │ 3 │ Post & Core         │ #16    │ ⏳ Pend.  │EGP 1200│       │ │    │
│  │  │ 4 │ Porcelain Crown     │ #16    │ ⏳ Pend.  │EGP 2500│       │ │    │
│  │  └───┴─────────────────────┴────────┴──────────┴────────┴───────┘ │    │
│  │                                                                    │    │
│  │  Total: EGP 7,400          Paid: EGP 3,700       Due: EGP 3,700  │    │
│  │  ████████████████████░░░░░░░░░░░░░░░░░░░░ 50% Paid                │    │
│  │                                                                    │    │
│  │  [📄 Print Plan]  [📧 Send to Patient]  [💰 Create Invoice]       │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Lab Orders

### LTR

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Lab Orders                                              [+ New Lab Order] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [🔍 Search...]  [Lab ▾]  [Status ▾]  [Doctor ▾]                          │
│                                                                             │
│  ┌────────┬────────────────┬──────────────────┬─────────┬────────┬──────┐ │
│  │ ORDER  │ PATIENT        │ TYPE             │ LAB     │ STATUS │ DUE  │ │
│  ├────────┼────────────────┼──────────────────┼─────────┼────────┼──────┤ │
│  │ LO-087 │ Ahmed Mohamed  │ PFM Crown #16    │ Al-Nour │ 🟡 Sent │ Mar 1│ │
│  │ LO-086 │ Sara Khaled    │ Zirconia Bridge  │ Dental+ │ 🔴 Late │ Fev25│ │
│  │ LO-085 │ Mona Ali       │ Night Guard      │ Al-Nour │ 🟢 Ready│ Feb23│ │
│  │ LO-084 │ Omar Hassan    │ Implant Abutment │ MaxLab  │ ✅ Deliv│ Feb20│ │
│  └────────┴────────────────┴──────────────────┴─────────┴────────┴──────┘ │
│                                                                             │
│  Showing 1-25 of 87           ← 1 2 3 4 →                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### New Lab Order Dialog

```
┌──────────────────────────────────────────────┐
│  New Lab Order                          [✕]  │
├──────────────────────────────────────────────┤
│                                              │
│  Patient *    [🔍 Search patient...     ▾]  │
│  Doctor *     [Dr. Samy Hassan          ▾]  │
│                                              │
│  Lab *        [Al-Nour Dental Lab       ▾]  │
│  Type *       [PFM Crown               ▾]  │
│                                              │
│  Tooth/Teeth  [#16                      ▾]  │
│  Shade        [A2                       ▾]  │
│  Due Date     [📅 Mar 1, 2026             ]  │
│                                              │
│  Special Instructions                        │
│  [Occlusal clearance 1.5mm, check         ]  │
│  [mesial contact...                        ]  │
│                                              │
│  Attachments  [📎 Upload photos/scans]       │
│                                              │
│       [Cancel]  [Create Order & Notify Lab]  │
└──────────────────────────────────────────────┘
```

---

## 9. Invoices

### LTR

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Invoices                                               [+ New Invoice]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [🔍 Search...]  [Status ▾]  [Date Range 📅]  [Doctor ▾]  [⬇ Export]     │
│                                                                             │
│  ┌──────────┬────────────────┬────────────┬──────────┬────────┬──────────┐ │
│  │ INVOICE  │ PATIENT        │ AMOUNT     │ PAID     │ STATUS │ DATE     │ │
│  ├──────────┼────────────────┼────────────┼──────────┼────────┼──────────┤ │
│  │ INV-0237 │ Ahmed Mohamed  │ EGP 3,500  │ EGP 3500 │ ✅ Paid │ Feb 24  │ │
│  │ INV-0236 │ Sara Khaled    │ EGP 7,400  │ EGP 3700 │ 🟡 Part.│ Feb 23  │ │
│  │ INV-0235 │ Mona Ali       │ EGP 1,200  │ EGP 0    │ 🔴 Unpd.│ Feb 22  │ │
│  │ INV-0234 │ Omar Hassan    │ EGP 450    │ EGP 450  │ ✅ Paid │ Feb 20  │ │
│  └──────────┴────────────────┴────────────┴──────────┴────────┴──────────┘ │
│                                                                             │
│  Summary:  Total: EGP 12,550   Paid: EGP 7,650   Outstanding: EGP 4,900   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### RTL (Arabic)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [+ فاتورة جديدة]                                             الفواتير    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [⬇ تصدير]  [▾ الطبيب]  [📅 نطاق التاريخ]  [▾ الحالة]  [...بحث 🔍]      │
│                                                                             │
│  ┌──────────┬────────┬──────────┬────────────┬────────────────┬──────────┐ │
│  │ التاريخ  │ الحالة  │ المدفوع  │ المبلغ     │ المريض         │ الفاتورة │ │
│  ├──────────┼────────┼──────────┼────────────┼────────────────┼──────────┤ │
│  │ ٢٤ فبر   │ ✅ مدفوع│ ٣,٥٠٠ ج.م│ ٣,٥٠٠ ج.م │ أحمد محمد      │ INV-0237│ │
│  │ ٢٣ فبر   │ 🟡 جزئي│ ٣,٧٠٠ ج.م│ ٧,٤٠٠ ج.م │ سارة خالد      │ INV-0236│ │
│  │ ٢٢ فبر   │ 🔴 غير │ ٠ ج.م    │ ١,٢٠٠ ج.م │ منى علي        │ INV-0235│ │
│  └──────────┴────────┴──────────┴────────────┴────────────────┴──────────┘ │
│                                                                             │
│  المتبقي: ج.م ٤,٩٠٠   المدفوع: ج.م ٧,٦٥٠   الإجمالي: ج.م ١٢,٥٥٠ :ملخص│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Invoice Detail / PDF Preview

```
┌──────────────────────────────────────────────────────────────────┐
│  Invoice #INV-0236                [📄 PDF]  [📧 Email]  [🖨 Print]│
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  CAIRO SMILE DENTAL CLINIC                                  │ │
│  │  123 Tahrir Street, Cairo, Egypt                            │ │
│  │  Tel: +20 2 1234567                                         │ │
│  │                                                             │ │
│  │  INVOICE                             Date: Feb 23, 2026    │ │
│  │  #INV-0236                           Due:  Mar 8, 2026     │ │
│  │                                                             │ │
│  │  Bill To:                                                   │ │
│  │  Sara Khaled                                                │ │
│  │  +20 100000043                                              │ │
│  │  ─────────────────────────────────────────────────────────  │ │
│  │  # │ Description              │ Tooth │ Qty │ Price │ Total│ │
│  │  ──┼──────────────────────────┼───────┼─────┼───────┼──────│ │
│  │  1 │ Root Canal Therapy       │  #16  │  1  │ 3,500 │ 3500│ │
│  │  2 │ Post & Core Build-up     │  #16  │  1  │ 1,200 │ 1200│ │
│  │  3 │ Porcelain Crown          │  #16  │  1  │ 2,500 │ 2500│ │
│  │  4 │ Periapical X-Ray         │  #16  │  1  │   200 │  200│ │
│  │  ─────────────────────────────────────────────────────────  │ │
│  │                              Subtotal:         EGP 7,400   │ │
│  │                              VAT (14%):        EGP 1,036   │ │
│  │                              TOTAL:            EGP 8,436   │ │
│  │                              Paid:             EGP 3,700   │ │
│  │                              BALANCE DUE:      EGP 4,736   │ │
│  │                                                             │ │
│  │  Payment History:                                           │ │
│  │  • Feb 23 — EGP 3,700 (Cash) ✅                            │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  [💳 Record Payment]  [📅 Installment Plan]  [🔗 Send Payment Link]│
└──────────────────────────────────────────────────────────────────┘
```

---

## 10. Payments & Reconciliation

### LTR

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Payments                                                     This Week ▾  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ EGP 23,450   │  │ EGP 15,200   │  │ EGP 8,250    │  │ 18           │  │
│  │ Total Billed │  │ Collected    │  │ Outstanding  │  │ Transactions │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                             │
│  [Payments]  [Daily Reconciliation]                                        │
│  ══════════════════════════════════                                         │
│                                                                             │
│  ┌──────────┬──────────────┬────────────┬──────────┬──────────┬──────────┐│
│  │ REF      │ PATIENT      │ AMOUNT     │ METHOD   │ STATUS   │ TIME     ││
│  ├──────────┼──────────────┼────────────┼──────────┼──────────┼──────────┤│
│  │ PAY-0412 │ Ahmed M.     │ EGP 3,500  │ 💵 Cash   │ ✅ Conf. │ 14:30   ││
│  │ PAY-0411 │ Sara K.      │ EGP 3,700  │ 💳 Paymob │ ✅ Conf. │ 12:15   ││
│  │ PAY-0410 │ Khaled F.    │ EGP 800    │ 💵 Cash   │ ✅ Conf. │ 10:45   ││
│  │ PAY-0409 │ Nadia R.     │ EGP 2,000  │ 🏦 Transfer│ ⏳ Pend.│ 09:30   ││
│  └──────────┴──────────────┴────────────┴──────────┴──────────┴──────────┘│
│                                                                             │
│  ┌── Daily Reconciliation Tab ──────────────────────────────────────────┐  │
│  │  Feb 25, 2026 — EOD Summary                          [🖨 Print]     │  │
│  │                                                                       │  │
│  │  Cash:          EGP 4,300   (3 transactions)                         │  │
│  │  Paymob:        EGP 3,700   (1 transaction)                          │  │
│  │  Bank Transfer: EGP 2,000   (1 transaction — pending)                │  │
│  │  ──────────────────────────────────────────                          │  │
│  │  Total:         EGP 10,000  (5 transactions)                         │  │
│  │                                                                       │  │
│  │  Expected (from invoices):  EGP 10,800                               │  │
│  │  Difference:                EGP -800  ⚠️ (1 pending transfer)        │  │
│  │                                                                       │  │
│  │  [✅ Mark Day as Reconciled]                                          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Inventory

### LTR

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Inventory                                                  [+ New Item]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Items]  [Stock]  [Movements]  [Purchase Orders]  [Suppliers]             │
│  ══════════════════════════════════════════════════════════════             │
│                                                                             │
│  ⚠️ Low Stock Alerts (3)                                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ 🔴 Composite Resin A2 — 5 units (min: 20)      [Reorder]             ││
│  │ 🟡 Latex Gloves (M)  — 12 boxes (min: 10)      [Reorder]             ││
│  │ 🟡 Anesthetic Carpules — 15 units (min: 10)    [Reorder]             ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  [🔍 Search items...]  [Category ▾]  [Branch ▾]                           │
│                                                                             │
│  ┌─────────────────────┬──────────┬────────┬──────┬──────────┬───────────┐│
│  │ ITEM                │ CATEGORY │ STOCK  │ MIN  │ UNIT COST│ VALUE     ││
│  ├─────────────────────┼──────────┼────────┼──────┼──────────┼───────────┤│
│  │ Composite Resin A2  │ Material │ 🔴 5   │ 20   │ EGP 350  │ EGP 1,750 ││
│  │ Latex Gloves (M)    │ Supply   │ 🟡 12  │ 10   │ EGP 85   │ EGP 1,020 ││
│  │ Anesthetic Carpules │ Medicine │ 🟡 15  │ 10   │ EGP 120  │ EGP 1,800 ││
│  │ Disposable Bibs     │ Supply   │ 🟢 200 │ 50   │ EGP 5    │ EGP 1,000 ││
│  │ Endo Files #25      │ Tool     │ 🟢 45  │ 15   │ EGP 180  │ EGP 8,100 ││
│  └─────────────────────┴──────────┴────────┴──────┴──────────┴───────────┘│
│                                                                             │
│  Total Inventory Value: EGP 245,670                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Reports

### LTR

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Reports                                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─── Revenue Reports ──────────────────────────────────────────────────┐  │
│  │  📊 Daily Revenue    📊 Monthly Revenue    📊 Revenue by Doctor       │  │
│  │  📊 Revenue by Service   📊 Revenue by Payment Method                 │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─── Patient Reports ──────────────────────────────────────────────────┐  │
│  │  👥 New Patients     👥 Patient Demographics    👥 Active Patients    │  │
│  │  👥 Outstanding Balances                                              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─── Operational Reports ──────────────────────────────────────────────┐  │
│  │  📅 Appointment Stats    📦 Inventory Stock    🏥 Branch Performance  │  │
│  │  ⏰ Staff Attendance     📋 Treatment Completion                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  ┌── Selected: Monthly Revenue ─────────────────────────────────────────┐  │
│  │  Date Range: [📅 Jan 1] to [📅 Feb 25]    Branch: [All ▾]  [⬇ PDF] │  │
│  │                                                                       │  │
│  │  ┌────────────┬──────────────┬──────────────┬──────────────────────┐  │  │
│  │  │ Month      │ Revenue      │ Expenses     │ Net Profit           │  │  │
│  │  ├────────────┼──────────────┼──────────────┼──────────────────────┤  │  │
│  │  │ January    │ EGP 125,400  │ EGP 34,200   │ EGP 91,200   ↗ 15% │  │  │
│  │  │ February   │ EGP 98,700   │ EGP 28,500   │ EGP 70,200   ↘ -8% │  │  │
│  │  └────────────┴──────────────┴──────────────┴──────────────────────┘  │  │
│  │                                                                       │  │
│  │  [Area Chart showing monthly revenue trend]                          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Settings

### LTR

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Settings                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [General]  [Branding]  [Notifications]  [Users]  [Sessions]  [Billing]    │
│  ══════════════════════════════════════════════════════════════════          │
│                                                                             │
│  ┌── General Tab ────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  Clinic Name     [Cairo Smile Dental Clinic          ]                │ │
│  │  Phone           [+20 2 1234567                      ]                │ │
│  │  Email           [info@cairosmile.com                ]                │ │
│  │  Address         [123 Tahrir Street, Cairo           ]                │ │
│  │                                                                        │ │
│  │  ─── Locale ──────────────────────────────────────────                │ │
│  │  Language        [Arabic (العربية)                ▾]  ← Changes RTL  │ │
│  │  Currency        [EGP — Egyptian Pound            ▾]                  │ │
│  │  Timezone        [Africa/Cairo (UTC+2)            ▾]                  │ │
│  │  Date Format     [dd/MM/yyyy                      ▾]                  │ │
│  │                                                                        │ │
│  │  ─── Working Hours ───────────────────────────────────                │ │
│  │  Sunday     [09:00] to [17:00]  ☑ Active                             │ │
│  │  Monday     [09:00] to [17:00]  ☑ Active                             │ │
│  │  Tuesday    [09:00] to [17:00]  ☑ Active                             │ │
│  │  Wednesday  [09:00] to [17:00]  ☑ Active                             │ │
│  │  Thursday   [09:00] to [14:00]  ☑ Active                             │ │
│  │  Friday     [Off]               ☐ Closed                             │ │
│  │  Saturday   [10:00] to [14:00]  ☑ Active                             │ │
│  │                                                                        │ │
│  │  [💾 Save Changes]                                                     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### RTL Settings

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                  الإعدادات │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [الفواتير]  [الجلسات]  [المستخدمون]  [الإشعارات]  [الهوية]  [عام]        │
│  ══════════════════════════════════════════════════════════════════          │
│                                                                             │
│  ┌── عام ────────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  [          عيادة ابتسامة القاهرة لطب الأسنان]     اسم العيادة        │ │
│  │  [                      ٢٠+ ٢ ١٢٣٤٥٦٧]           الهاتف              │ │
│  │  [                info@cairosmile.com]           البريد الإلكتروني      │ │
│  │                                                                        │ │
│  │  ─── اللغة والعملة ───────────────────────────────────                │ │
│  │  RTL يغير ←  [▾                (العربية) العربية]           اللغة      │ │
│  │              [▾           ج.م — الجنيه المصري]             العملة      │ │
│  │              [▾           (٢+UTC) أفريقيا/القاهرة]        المنطقة الزمنية │ │
│  │                                                                        │ │
│  │  ─── ساعات العمل ──────────────────────────────────                   │ │
│  │  نشط ☑  [١٧:٠٠] إلى [٠٩:٠٠]     الأحد                              │ │
│  │  نشط ☑  [١٧:٠٠] إلى [٠٩:٠٠]     الإثنين                            │ │
│  │  مغلق ☐  [عطلة]                    الجمعة                             │ │
│  │                                                                        │ │
│  │                                                     [💾 حفظ التغييرات] │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Sessions Tab (User Sessions — Gap Fix)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Settings > Sessions                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌── My Active Sessions ────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  🖥  Chrome 120 · Windows 11 · Cairo, EG                              │  │
│  │     Last activity: 2 min ago  ← CURRENT SESSION                       │  │
│  │                                                                       │  │
│  │  📱 Safari · iOS 17 · Cairo, EG                                       │  │
│  │     Last activity: 3 hours ago           [🔴 End Session]             │  │
│  │                                                                       │  │
│  │  💻 Firefox · macOS 14 · Alexandria, EG                               │  │
│  │     Last activity: 1 day ago             [🔴 End Session]             │  │
│  │                                                                       │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │            [🔴 End All Other Sessions]                                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌── All Staff Sessions (tenant_admin only) ────────────────────────────┐  │
│  │  [🔍 Search user...]                                                  │  │
│  │                                                                       │  │
│  │  ┌───────────────────┬─────────────────┬─────────────┬────────┬────┐ │  │
│  │  │ USER              │ DEVICE          │ LOCATION    │ LAST   │    │ │  │
│  │  ├───────────────────┼─────────────────┼─────────────┼────────┼────┤ │  │
│  │  │ Dr. Samy (dentist)│ Chrome · Win 11 │ Cairo, EG   │ 5 min  │[🔴]│ │  │
│  │  │ Receptionist Mona │ Safari · iPad   │ Cairo, EG   │ 15 min │[🔴]│ │  │
│  │  │ Dr. Layla (dentist│ Firefox · macOS │ Giza, EG    │ 1 hr   │[🔴]│ │  │
│  │  └───────────────────┴─────────────────┴─────────────┴────────┴────┘ │  │
│  │                                                                       │  │
│  │  Active: 4 sessions · 3 users                                         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 14. Staff Chat Panel (Sidebar)

### LTR — Chat offen neben Content

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Logo]  Cairo Smile                      [🔍] [🔔 2] [💬 3] [👤 Dr.Ahmed] │
├──────────┬───────────────────────────────────────────────┬───────────────────┤
│ Sidebar  │  Main Content (Calendar / Patients / etc.)   │  💬 Chat          │
│          │                                               │                   │
│ Dashboard│  ┌───────────────────────────────────────┐    │  [🔍 Search...]   │
│ Patients │  │                                       │    │                   │
│ Appoint. │  │   Whatever page the user is on        │    │  CHANNELS         │
│ Charts   │  │   (Calendar, Patient Detail, etc.)     │    │  🏢 Main Branch   │
│ ...      │  │                                       │    │  👥 All Doctors    │
│          │  │   The chat doesn't interrupt          │    │  📢 Announce.      │
│          │  │   the workflow — it's a panel         │    │                   │
│          │  │                                       │    │  DIRECT MESSAGES  │
│          │  └───────────────────────────────────────┘    │  Dr. Samy  (2) 🔵│
│          │                                               │  Mona R.   (1) 🔵│
│          │                                               │  Dr. Layla       │
│          │                                               │                   │
│          │                                               │  ─────────────── │
│          │                                               │  Dr. Samy:        │
│          │                                               │  Can you check    │
│          │                                               │  patient #P-001?  │
│          │                                               │  14:30            │
│          │                                               │                   │
│          │                                               │  You:             │
│          │                                               │  Sure, sending    │
│          │                                               │  the x-ray now    │
│          │                                               │  14:32 ✓✓         │
│          │                                               │                   │
│          │                                               │  [📎] [Type...  ➤]│
├──────────┴───────────────────────────────────────────────┴───────────────────┤
│ Footer                                                                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

### RTL — Chat Panel links, Sidebar rechts

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [د. أحمد 👤] [3 💬] [2 🔔] [🔍]                      عيادة ابتسامة [Logo] │
├───────────────────┬───────────────────────────────────────────────┬──────────┤
│  💬 المحادثات      │  المحتوى الرئيسي                              │ الشريط   │
│                   │                                               │ الجانبي  │
│  [...بحث 🔍]      │    ┌───────────────────────────────────────┐  │          │
│                   │    │                                       │  │ لوحة     │
│  القنوات          │    │   الصفحة التي يعمل عليها المستخدم     │  │ المرضى   │
│  الفرع الرئيسي 🏢 │    │                                       │  │ المواعيد │
│  كل الأطباء 👥    │    │   المحادثة لا تقاطع العمل —           │  │ الأسنان  │
│  إعلانات 📢       │    │   إنها لوحة جانبية                     │  │ ...      │
│                   │    │                                       │  │          │
│  رسائل مباشرة     │    └───────────────────────────────────────┘  │          │
│ 🔵 (٢) د. سامي   │                                               │          │
│ 🔵 (١) منى ر.    │                                               │          │
│  د. ليلى          │                                               │          │
│                   │                                               │          │
│  ───────────────  │                                               │          │
│         :د. سامي  │                                               │          │
│  ممكن تتأكد من    │                                               │          │
│  المريض #P-001؟   │                                               │          │
│          ١٤:٣٠    │                                               │          │
│                   │                                               │          │
│            :أنت   │                                               │          │
│  تمام، هبعت       │                                               │          │
│  الأشعة دلوقتي   │                                               │          │
│  ✓✓ ١٤:٣٢         │                                               │          │
│                   │                                               │          │
│ [➤ ...اكتب] [📎] │                                               │          │
├───────────────────┴───────────────────────────────────────────────┴──────────┤
│ التذييل                                                                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Chat Panel Implementierung

```tsx
import { useLocale } from '@/hooks/useLocale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Paperclip, Send } from 'lucide-react';

function ChatPanel({ onClose }: { onClose: () => void }) {
  const { t, direction } = useLocale();
  const [activeChannel, setActiveChannel] = useState<string | null>(null);

  return (
    // border-s = border-left in LTR, border-right in RTL
    <div
      className="flex h-full w-80 flex-col border-s border-gray-200 dark:border-gray-700
                    bg-white dark:bg-gray-800"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="font-semibold">{t('chat.title')}</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ✕
        </Button>
      </div>

      {activeChannel ? (
        /* Message View */
        <>
          <ScrollArea className="flex-1 p-3">
            {messages.map((msg) => (
              <ChatMessage
                key={msg._id}
                message={msg}
                isMine={msg.senderId === currentUser._id}
                // In RTL: "mine" messages align to start (right), "theirs" to end (left)
                // In LTR: "mine" messages align to end (right), "theirs" to start (left)
                className={msg.isMine ? 'flex justify-end' : 'flex justify-start'}
              />
            ))}
          </ScrollArea>

          {/* Input — ms/me auto-flip in RTL */}
          <div className="flex items-center gap-2 border-t p-3">
            <Button variant="ghost" size="sm">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              placeholder={t('chat.typePlaceholder')} // "Type a message..." / "...اكتب رسالة"
              className="flex-1"
              dir="auto" // Auto-detect text direction per message
            />
            <Button size="sm">
              <Send className="h-4 w-4 rtl:rotate-180" /> {/* Flip arrow in RTL */}
            </Button>
          </div>
        </>
      ) : (
        /* Channel List */
        <ScrollArea className="flex-1">
          <ChannelList onSelect={setActiveChannel} />
        </ScrollArea>
      )}
    </div>
  );
}
```

---

## 15. Dark Mode Variante

```
LTR Dark Mode:
┌──────────────────────────────────────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   🔔 💬 👤  ☀ Li│
├───────────░┬─────────────────────────────────────────────────────────────────┤
│ ░ SIDEBAR ░│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░ #1e2028 ░│  ░ CONTENT AREA (#1a1c23)                                   ░ │
│ ░         ░│  ░                                                          ░ │
│ ░ Text:   ░│  ░  ┌─────────────┐  ┌─────────────┐   Cards: #252830     ░ │
│ ░ #94a3b8 ░│  ░  │ 24          │  │ EGP 12,450  │   Text: #e4e4e7      ░ │
│ ░         ░│  ░  │ Patients    │  │ Revenue     │   Muted: #6b7280     ░ │
│ ░ Active: ░│  ░  └─────────────┘  └─────────────┘   Accent: #6366f1    ░ │
│ ░ #6366f1 ░│  ░                                                          ░ │
│ ░         ░│  ░  Borders: #374151                                        ░ │
│ ░░░░░░░░░░░│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└────────────┴─────────────────────────────────────────────────────────────────┘
```

### Color Tokens

```tsx
// tailwind.config.ts
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic tokens used across all screens
        background: { DEFAULT: '#ffffff', dark: '#1a1c23' },
        sidebar: { DEFAULT: '#ffffff', dark: '#1e2028' },
        card: { DEFAULT: '#ffffff', dark: '#252830' },
        border: { DEFAULT: '#e5e7eb', dark: '#374151' },
        text: { DEFAULT: '#111827', dark: '#e4e4e7' },
        muted: { DEFAULT: '#6b7280', dark: '#9ca3af' },
        accent: { DEFAULT: '#4f46e5', dark: '#6366f1' },

        // Status colors (same in light/dark)
        success: '#22c55e',
        warning: '#eab308',
        danger: '#ef4444',
        info: '#3b82f6',
      },
    },
  },
};

// Usage — same classes work in LTR and RTL:
<Card className="bg-card dark:bg-card-dark border border-border dark:border-border-dark">
  <p className="text-text dark:text-text-dark">Patient Name</p>
  <p className="text-muted dark:text-muted-dark">Last visit: Feb 20</p>
</Card>;
```

---

## 16. Responsive: Mobile View

```
Mobile (< 768px) — Sidebar becomes hamburger menu:

┌──────────────────────────────┐
│ ☰  Cairo Smile   🔔 💬 👤   │
├──────────────────────────────┤
│                              │
│  Dashboard                   │
│                              │
│  ┌────────────┐ ┌──────────┐│
│  │ 24         │ │ 18       ││
│  │ Patients   │ │ Appts    ││
│  └────────────┘ └──────────┘│
│  ┌────────────┐ ┌──────────┐│
│  │ 3          │ │ EGP 12k  ││
│  │ Walk-ins   │ │ Revenue  ││
│  └────────────┘ └──────────┘│
│                              │
│  Today's Appointments        │
│  ┌──────────────────────────┐│
│  │ 09:00 Ahmed M. - Dr.Samy││
│  │ 09:30 Sara K.  - Dr.Samy││
│  │ 10:00 Mona A.  - Dr.La. ││
│  └──────────────────────────┘│
│                              │
│  Chair Status                │
│  🟢1  🔴2  🟢3  🔴4  🟡5    │
│                              │
└──────────────────────────────┘

Mobile RTL:

┌──────────────────────────────┐
│  👤 💬 🔔   عيادة ابتسامة  ☰ │
├──────────────────────────────┤
│                              │
│                   لوحة المعلومات│
│                              │
│  ┌──────────┐ ┌────────────┐│
│  │       ١٨ │ │         ٢٤ ││
│  │ المواعيد │ │ المرضى     ││
│  └──────────┘ └────────────┘│
│  ...                         │
└──────────────────────────────┘
```

---

## Zusammenfassung — Admin Portal Screens

| #   | Screen                    | RTL Example | Shadcn Komponenten               | Rollen                 |
| --- | ------------------------- | :---------: | -------------------------------- | ---------------------- |
| 1   | Layout (Sidebar + Header) |     ✅      | Sidebar, Header, Breadcrumb      | Alle                   |
| 2   | Dashboard                 |     ✅      | Card, AreaChart, Table           | Alle                   |
| 3   | Patient List              |     ✅      | DataTable, Badge, Input, Tabs    | Alle                   |
| 4   | Appointments Calendar     |     ✅      | FullCalendar, Dialog, Select     | Alle                   |
| 5   | Daily Operations Hub      |     ✅      | Table, Card, Badge, Button       | Admin, Rezeption, Arzt |
| 6   | Dental Chart              |    ✅\*     | SVG, Card, Select, Badge         | Arzt, Hygiene          |
| 7   | Treatment Plans           |      —      | Card, Table, Badge, Progress     | Arzt                   |
| 8   | Lab Orders                |      —      | DataTable, Dialog, Select, Badge | Arzt, Labor            |
| 9   | Invoices                  |     ✅      | DataTable, Badge, Dialog, PDF    | Admin, Buchhalter      |
| 10  | Payments & Reconciliation |      —      | Card, Table, Tabs, Badge         | Admin, Buchhalter      |
| 11  | Inventory                 |      —      | DataTable, Tabs, Badge, Alert    | Admin, Assistent       |
| 12  | Reports                   |      —      | Card, Select, Table, AreaChart   | Admin, Buchhalter      |
| 13  | Settings                  |     ✅      | Tabs, Input, Select, Switch      | Admin                  |
| 14  | Staff Chat Panel          |     ✅      | ScrollArea, Input, Button        | Alle                   |
| 15  | Dark Mode                 |      —      | Alle oben — dark: Varianten      | Alle                   |
| 16  | Mobile View               |     ✅      | Responsive Hamburger             | Alle                   |

> \* Dental Chart SVG bleibt universal (nicht gespiegelt) — nur UI-Panels/Labels folgen RTL.

### RTL/LTR Regeln (Zusammenfassung)

| Element          | LTR             | RTL            | Tailwind Class        |
| ---------------- | --------------- | -------------- | --------------------- |
| Sidebar Position | Links           | Rechts         | `flex` (auto)         |
| Chat Panel       | Rechts          | Links          | `border-s`            |
| Text Alignment   | Links           | Rechts         | `text-start`          |
| Margins          | margin-left     | margin-right   | `ms-4`                |
| Paddings         | padding-left    | padding-right  | `ps-4`                |
| Borders          | border-right    | border-left    | `border-e`            |
| Arrow Icons      | →               | ←              | `rtl:rotate-180`      |
| Table Columns    | LTR order       | RTL order      | Automatic             |
| Numbers          | 1,234           | ١,٢٣٤          | `formatNumber()`      |
| Currency         | EGP 3,500       | ٣,٥٠٠ ج.م      | `formatCurrency()`    |
| Calendar         | Mon→Sun         | أحد→سبت        | FullCalendar `locale` |
| Dental Chart     | NOT mirrored    | NOT mirrored   | Fixed LTR SVG         |
| Form Labels      | Left of input   | Right of input | `text-start`          |
| Buttons          | [Cancel] [Save] | [حفظ] [إلغاء]  | `flex` (auto)         |
