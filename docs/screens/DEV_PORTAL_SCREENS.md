# Dev Portal — v2 Screen Designs

**Date:** February 25, 2026
**Stack:** React 19 + TailAdmin (Free) + Tailwind CSS 4 + Shadcn/ui + Lucide Icons
**RTL/LTR:** Tailwind Logical Properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`)
**Dark Mode:** ✅ Eingebaut (TailAdmin native)
**Layout:** Collapsible Sidebar (links/LTR, rechts/RTL) + Top Header + Content Area

> **Konvention:** Dev Portal ist immer **LTR** (English) — Platform-Admin arbeitet auf Englisch.
> RTL wird hier nicht benötigt, da das Dev Portal kein Tenant-spezifisches Locale hat.

---

## 1. Layout-Grundstruktur

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────┐                                                    🔔  👤 Admin │
│ │    D     │  DENTO Platform                         [Search ⌘K]   ◑ Dark   │
│ └─────────┘                                                                  │
├──────────────┬───────────────────────────────────────────────────────────────┤
│              │                                                               │
│ 📊 Dashboard │  ┌─────────────────────────────────────────────────────────┐  │
│              │  │                                                         │  │
│ ─ SaaS ──── │  │              CONTENT AREA                               │  │
│ 🏢 Tenants   │  │                                                         │  │
│ 📈 Monitoring│  │  Breadcrumbs:  Dashboard > Tenants > Clinic Cairo      │  │
│ 🚀 Deploys   │  │                                                         │  │
│ 💰 Billing   │  │  ┌───────────────────────────────────────────────────┐  │  │
│ 🌐 Domains   │  │  │                                                   │  │  │
│ 🎧 Support   │  │  │          Page-specific content                    │  │  │
│              │  │  │                                                   │  │  │
│ ─ Platform ─ │  │  └───────────────────────────────────────────────────┘  │  │
│ 📦 Modules   │  │                                                         │  │
│ 🏷️ Pricing   │  └─────────────────────────────────────────────────────────┘  │
│ 🚩 Flags     │                                                               │
│ 📝 Fields    │                                                               │
│              │                                                               │
│ ─ Config ─── │                                                               │
│ ⚙️ Settings  │                                                               │
│ 💾 Storage   │                                                               │
│ 📁 Backups   │                                                               │
│              │                                                               │
│ ─ API ────── │                                                               │
│ 🔑 API Keys  │                                                               │
│ 🔗 Webhooks  │                                                               │
│              │                                                               │
│ ─ Logs ───── │                                                               │
│ 🛡️ Audit     │                                                               │
│ 💻 System    │                                                               │
│              │                                                               │
├──────────────┴───────────────────────────────────────────────────────────────┤
│ Dento v2.0.0  •  Platform Admin  •  128 Tenants  •  0 Errors                │
└──────────────────────────────────────────────────────────────────────────────┘
```

### TailAdmin Layout-Komponenten

```tsx
// packages/web/src/developer/layouts/DevPortalLayout.tsx
import { Sidebar } from '@/components/layouts/Sidebar';
import { Header } from '@/components/layouts/Header';
import { Breadcrumb } from '@/components/ui/breadcrumb';

export function DevPortalLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Sidebar — TailAdmin Collapsible */}
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Header — TailAdmin Top Bar */}
        <Header
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          searchPlaceholder="Search tenants, modules, logs…"
        />

        {/* Content */}
        <main className="mx-auto w-full max-w-screen-2xl p-4 md:p-6">
          <Breadcrumb />
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## 2. Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Dashboard                                                    Last 30 days ▾│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ 128           │  │ $12,450      │  │ 99.8%        │  │ 3            │   │
│  │ Active        │  │ MRR          │  │ Uptime       │  │ Open         │   │
│  │ Tenants       │  │ ↑ 12%        │  │ ↑ 0.1%       │  │ Tickets      │   │
│  │ 📈 ↗          │  │ 💰 ↗          │  │ ✅ →          │  │ 🎫 ↘          │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │ Revenue (last 12 months)            │  │ Tenants by Country          │  │
│  │                                     │  │                             │  │
│  │  $15k ┤          ╭─╮               │  │  🇪🇬 Egypt        72  (56%)  │  │
│  │  $10k ┤     ╭─╮──╯ ╰──╮           │  │  🇸🇦 Saudi Arabia 38  (30%)  │  │
│  │   $5k ┤╭─╮──╯          ╰──        │  │  🇦🇪 UAE          12  (9%)   │  │
│  │    $0 ┤╰─╯                         │  │  🇯🇴 Jordan        4  (3%)   │  │
│  │       └────────────────────────     │  │  🇰🇼 Kuwait        2  (2%)   │  │
│  │       M  A  M  J  J  A  S  O  N    │  │                             │  │
│  └─────────────────────────────────────┘  └─────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Recent Activity                                          View All → │  │
│  ├──────────┬───────────────────────────────────────┬──────────────────┤  │
│  │ 2 min    │ 🟢 Tenant "Cairo Smile" activated      │ tenant_admin     │  │
│  │ 15 min   │ 🔵 Module "CBCT" enabled for Riyadh    │ platform_admin   │  │
│  │ 1 hr     │ 🟡 Deployment v2.1.3 rolled out        │ auto             │  │
│  │ 3 hr     │ 🔴 Error spike — 23 errors in 5 min    │ monitoring       │  │
│  │ 5 hr     │ 🟢 Support session ended (Dr. Ahmed)   │ support          │  │
│  └──────────┴───────────────────────────────────────┴──────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Shadcn/ui + Recharts Implementierung

```tsx
// Stat Cards — Shadcn Card + TailAdmin styling
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, Activity, Ticket } from 'lucide-react';

function StatCard({ title, value, change, icon: Icon, trend }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className={`text-xs ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>{change}</p>
      </CardContent>
    </Card>
  );
}

// Revenue Chart — Recharts
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

function RevenueChart({ data }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue (last 12 months)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis dataKey="month" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip />
            <Area type="monotone" dataKey="revenue" stroke="#4f46e5" fill="#4f46e580" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

---

## 3. Tenant List

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Tenants                                                   [+ New Tenant]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [🔍 Search tenants...]  [Status ▾]  [Country ▾]  [Plan ▾]  [⬇ Export]   │
│                                                                             │
│  ┌─────┬───────────────────┬──────────┬──────┬─────────┬────────┬────────┐ │
│  │     │ TENANT            │ STATUS   │ PLAN │ COUNTRY │ USERS  │ MRR    │ │
│  ├─────┼───────────────────┼──────────┼──────┼─────────┼────────┼────────┤ │
│  │ ☐   │ 🦷 Cairo Smile    │ 🟢 Active │ Pro  │ 🇪🇬 EG   │ 12/50  │ $189   │ │
│  │     │ clinic-cairo       │          │      │         │        │        │ │
│  ├─────┼───────────────────┼──────────┼──────┼─────────┼────────┼────────┤ │
│  │ ☐   │ 🦷 Riyadh Dental  │ 🟢 Active │ Pro  │ 🇸🇦 SA   │ 8/50   │ $249   │ │
│  │     │ clinic-riyadh      │          │      │         │        │        │ │
│  ├─────┼───────────────────┼──────────┼──────┼─────────┼────────┼────────┤ │
│  │ ☐   │ 🦷 Dubai Smiles   │ 🟡 Trial  │ Free │ 🇦🇪 AE   │ 3/10   │ $0     │ │
│  │     │ clinic-dubai       │          │      │         │        │        │ │
│  ├─────┼───────────────────┼──────────┼──────┼─────────┼────────┼────────┤ │
│  │ ☐   │ 🦷 Amman Clinic   │ 🔴 Susp.  │ —    │ 🇯🇴 JO   │ 5/10   │ $0     │ │
│  │     │ clinic-amman       │ Overdue  │      │         │        │        │ │
│  └─────┴───────────────────┴──────────┴──────┴─────────┴────────┴────────┘ │
│                                                                             │
│  Showing 1-4 of 128         ← 1 2 3 4 ... 13 →                     25/pg ▾│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### TanStack Table + Shadcn DataTable

```tsx
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Eye, Settings, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const columns: ColumnDef<Tenant>[] = [
  { id: 'select' /* checkbox */ },
  {
    accessorKey: 'name',
    header: 'Tenant',
    cell: ({ row }) => (
      <div>
        <div className="font-medium">🦷 {row.original.name}</div>
        <div className="text-xs text-gray-500">{row.original.slug}</div>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      const variant =
        status === 'active' ? 'success' : status === 'trial' ? 'warning' : 'destructive';
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    accessorKey: 'country',
    header: 'Country',
    cell: ({ row }) => (
      <span>
        {row.original.countryFlag} {row.original.countryCode}
      </span>
    ),
  },
  {
    accessorKey: 'users',
    header: 'Users',
    cell: ({ row }) => `${row.original.userCount}/${row.original.userLimit}`,
  },
  {
    accessorKey: 'mrr',
    header: 'MRR',
    cell: ({ row }) => `$${row.original.mrr}`,
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <Eye className="me-2 h-4 w-4" /> View
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="me-2 h-4 w-4" /> Settings
          </DropdownMenuItem>
          <DropdownMenuItem className="text-red-500">
            <Trash2 className="me-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
```

---

## 4. Tenant Detail (10 Tabs)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back    Cairo Smile Dental Clinic       🟢 Active    [⚡ Impersonate]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Overview] [Modules] [Users] [Billing] [Channels] [Settings]              │
│  [Branding] [Workflows] [Support] [Database]                               │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  ┌── Overview Tab ──────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │   │
│  │  │ 1,247       │ │ 342         │ │ 8           │ │ $189/mo     │  │   │
│  │  │ Patients    │ │ Appointments│ │ Active      │ │ MRR         │  │   │
│  │  │ this month  │ │ this month  │ │ Modules     │ │ ↑ 12%       │  │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘  │   │
│  │                                                                      │   │
│  │  ┌─── Quick Info ─────────────────────────────────────────────────┐ │   │
│  │  │  Slug:       clinic-cairo                                      │ │   │
│  │  │  Country:    🇪🇬 Egypt                                          │ │   │
│  │  │  Language:   Arabic (RTL)                                      │ │   │
│  │  │  Currency:   EGP (Egyptian Pound)                              │ │   │
│  │  │  Created:    2025-06-15                                        │ │   │
│  │  │  Version:    v2.1.3                                            │ │   │
│  │  │  Last Login: 2 hours ago                                       │ │   │
│  │  │  DB Size:    2.4 GB                                            │ │   │
│  │  └───────────────────────────────────────────────────────────────┘ │   │
│  │                                                                      │   │
│  │  ┌─── Recent Errors ─────────────────────────────────────────────┐ │   │
│  │  │  🔴 TypeError: Cannot read property 'id' — 3 min ago         │ │   │
│  │  │  🟡 Slow query: appointments (>500ms) — 1 hr ago             │ │   │
│  │  │  🔴 Payment callback failed — 5 hr ago                       │ │   │
│  │  └───────────────────────────────────────────────────────────────┘ │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Shadcn Tabs

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function TenantDetail({ tenant }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="me-2 h-4 w-4" /> Back
          </Button>
          <h1 className="text-2xl font-bold">{tenant.name}</h1>
          <Badge variant="success">Active</Badge>
        </div>
        <Button variant="destructive">
          <Zap className="me-2 h-4 w-4" /> Impersonate
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TenantOverview tenant={tenant} />
        </TabsContent>
        <TabsContent value="modules">
          <TenantModules tenant={tenant} />
        </TabsContent>
        {/* ... */}
      </Tabs>
    </div>
  );
}
```

---

## 5. Modules List

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Modules                                                    [+ New Module] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [🔍 Search...]  [Category ▾]  [Status ▾]                                 │
│                                                                             │
│  ┌─── Clinical ─────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │  │ 🦷          │  │ 📋          │  │ 🔬          │  │ 💊          │    │  │
│  │  │ Dental      │  │ Treatment  │  │ Lab Orders │  │ Prescr.    │    │  │
│  │  │ Charts      │  │ Plans      │  │            │  │            │    │  │
│  │  │             │  │            │  │            │  │            │    │  │
│  │  │ v2.1.0      │  │ v2.0.3     │  │ v2.1.0     │  │ v2.0.1     │    │  │
│  │  │ 72 tenants  │  │ 45 tenants │  │ 38 tenants │  │ 89 tenants │    │  │
│  │  │ $29/mo      │  │ $19/mo     │  │ $19/mo     │  │ FREE       │    │  │
│  │  │ 🟢 Stable    │  │ 🟢 Stable   │  │ 🟡 Canary   │  │ 🟢 Stable   │    │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘    │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─── Financial ────────────────────────────────────────────────────────┐  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │  │ 💰 Invoices │  │ 🏦 Payments │  │ 🛡️ Insurance│  │ 📊 Commiss. │    │  │
│  │  │ v2.0.2      │  │ v2.1.0     │  │ v2.0.0     │  │ v2.0.1     │    │  │
│  │  │ 128 tenants │  │ 128 tenants│  │ 22 tenants │  │ 15 tenants │    │  │
│  │  │ FREE        │  │ FREE       │  │ $19/mo     │  │ $9/mo      │    │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Monitoring

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Monitoring                                                  Last 24h ▾    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ 23            │  │ 99.8%        │  │ 142ms        │  │ 3            │  │
│  │ Errors        │  │ Uptime       │  │ Avg Response │  │ Alerts       │  │
│  │ (24h)         │  │ (30d)        │  │ Time         │  │ Active       │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                             │
│  ┌─── Error Timeline ────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  30 ┤                                                                 │ │
│  │  20 ┤              █                                                  │ │
│  │  10 ┤    ░░   ░░░  ██  ░░   ░░░  ░░   ░░░  ░░                      │ │
│  │   0 ┤────────────────────────────────────────────                     │ │
│  │      00   03   06   09   12   15   18   21   00                      │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─── Recent Errors ─────────────────────────────────────────────────────┐ │
│  │  🔴 TypeError       │ clinic-cairo │ payments.js:142  │ 3 min ago    │ │
│  │  🔴 MongoError      │ clinic-riyadh│ patients.js:89   │ 15 min ago   │ │
│  │  🟡 TimeoutError    │ clinic-dubai │ webhooks.js:201  │ 1 hr ago     │ │
│  │  🔴 ValidationError │ clinic-cairo │ invoices.js:67   │ 3 hr ago     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Billing

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Billing                                                     This Month ▾  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ $12,450      │  │ $11,230      │  │ 97.2%        │  │ 3            │  │
│  │ MRR          │  │ Collected    │  │ Collection   │  │ Overdue      │  │
│  │ ↑ 8.2%       │  │ this month   │  │ Rate         │  │ Invoices     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                             │
│  [Revenue]  [Invoices]  [Payments]  [Dunning]                              │
│  ═══════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  ┌─── Revenue Tab ───────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  Revenue Breakdown by Module:                                         │ │
│  │  ┌───────────────────┬──────────┬──────────┬───────────────────────┐  │ │
│  │  │ Module            │ Tenants  │ Price    │ Revenue               │  │ │
│  │  ├───────────────────┼──────────┼──────────┼───────────────────────┤  │ │
│  │  │ 📅 Appointments    │ 128      │ $39/mo   │ $4,992    ████████▓  │  │ │
│  │  │ 🦷 Dental Charts   │ 72       │ $29/mo   │ $2,088    █████▒     │  │ │
│  │  │ 📦 Inventory       │ 45       │ $29/mo   │ $1,305    ███▒       │  │ │
│  │  │ 🔬 Lab Orders      │ 38       │ $19/mo   │ $722      ██▒        │  │ │
│  │  │ 🛡️ Insurance       │ 22       │ $19/mo   │ $418      █▒         │  │ │
│  │  └───────────────────┴──────────┴──────────┴───────────────────────┘  │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Support (Sessions + Tickets)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Support                                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Sessions]  [Tickets]                                                     │
│  ═══════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│  ┌─── Active Sessions ──────────────────────────────────────────────────┐  │
│  │                                                     [🔴 End All]     │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │ ⚡ Dr. Ahmed (clinic-cairo)                                    │  │  │
│  │  │    Reason: Patient data migration issue                        │  │  │
│  │  │    Started: 15 min ago        Expires: 45 min                  │  │  │
│  │  │    [🔴 End Session]  [📋 View Actions]                         │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─── Past Sessions ────────────────────────────────────────────────────┐  │
│  │  ┌──────────┬─────────────────┬────────────────┬──────────┬───────┐ │  │
│  │  │ DATE     │ TENANT          │ REASON         │ DURATION │ BY    │ │  │
│  │  ├──────────┼─────────────────┼────────────────┼──────────┼───────┤ │  │
│  │  │ Feb 25   │ clinic-riyadh   │ Billing fix    │ 23 min   │ Admin │ │  │
│  │  │ Feb 24   │ clinic-cairo    │ Data migration │ 45 min   │ Admin │ │  │
│  │  │ Feb 22   │ clinic-dubai    │ Module setup   │ 12 min   │ Admin │ │  │
│  │  └──────────┴─────────────────┴────────────────┴──────────┴───────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Backup-Historie

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Backups                                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─── Backup Configuration ─────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  Schedule:       [Daily at 03:00 UTC ▾]                              │  │
│  │  Retention:      [30 days ▾]                                         │  │
│  │  Encryption:     🟢 Enabled (AES-256)                                │  │
│  │  Storage:        Cloudflare R2 (dento-backups)                       │  │
│  │  Last Success:   2026-02-25 03:00 UTC (2 hours ago)                  │  │
│  │                                                                       │  │
│  │  [💾 Save Config]                                                     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─── Backup History ───────────────────────────────────────────────────┐  │
│  │  [🔍 Filter by tenant...]  [Status ▾]  [Type ▾]                     │  │
│  │                                                                       │  │
│  │  ┌──────────┬────────────────┬───────────┬───────┬────────┬────────┐ │  │
│  │  │ STATUS   │ TENANT         │ TYPE      │ SIZE  │ DATE   │        │ │  │
│  │  ├──────────┼────────────────┼───────────┼───────┼────────┼────────┤ │  │
│  │  │ ✅ Done   │ clinic-cairo   │ Scheduled │ 142MB │ 03:00  │ [⬇]   │ │  │
│  │  │ ✅ Done   │ clinic-riyadh  │ Scheduled │ 98MB  │ 03:02  │ [⬇]   │ │  │
│  │  │ ✅ Done   │ clinic-dubai   │ Manual    │ 45MB  │ 15:30  │ [⬇]   │ │  │
│  │  │ ❌ Failed │ clinic-amman   │ Scheduled │ —     │ 03:05  │ [🔄]  │ │  │
│  │  │ ✅ Done   │ clinic-cairo   │ Scheduled │ 139MB │ Feb 24 │ [⬇]   │ │  │
│  │  └──────────┴────────────────┴───────────┴───────┴────────┴────────┘ │  │
│  │                                                                       │  │
│  │  ← 1 2 3 ... →                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. API Keys

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  API Keys                                                  [+ Create Key]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🔑 Production Key                                                  │   │
│  │     pk_live_a8f3...b2c1                              [👁 Show] [📋] │   │
│  │     Created: Jan 15, 2026  •  Last used: 2 min ago                  │   │
│  │     Scopes: tenants.read, modules.write, billing.read               │   │
│  │     Usage: 12,450 requests (this month)                             │   │
│  │     [⚙️ Edit Scopes]  [🔴 Revoke]                                   │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  🔑 Staging Key                                                     │   │
│  │     pk_test_c4d2...e7f8                              [👁 Show] [📋] │   │
│  │     Created: Feb 1, 2026  •  Last used: 3 days ago                  │   │
│  │     Scopes: tenants.read, modules.read                              │   │
│  │     Usage: 342 requests (this month)                                │   │
│  │     [⚙️ Edit Scopes]  [🔴 Revoke]                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─── API Catalog ──────────────────────────────────────────────────────┐  │
│  │  Auto-generated from OpenAPI spec (@fastify/swagger)                 │  │
│  │  📄 Swagger UI:  /api/docs                                          │  │
│  │  📋 OpenAPI JSON: /api/docs/json                                    │  │
│  │  [🔗 Open Swagger UI]                                                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Audit Logs

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Audit Logs                                            [⬇ Export CSV]      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [🔍 Search...]  [Tenant ▾]  [Action ▾]  [User ▾]  [Date Range 📅]       │
│                                                                             │
│  ┌──────────┬─────────────────┬───────────────────┬────────────┬──────┐   │
│  │ TIME     │ USER            │ ACTION            │ RESOURCE   │TENANT│   │
│  ├──────────┼─────────────────┼───────────────────┼────────────┼──────┤   │
│  │ 14:32    │ admin@dento.app │ module.enabled    │ CBCT       │ cairo│   │
│  │ 14:28    │ admin@dento.app │ tenant.updated    │ Settings   │ cairo│   │
│  │ 14:15    │ system          │ backup.completed  │ clinic-riy │ riy  │   │
│  │ 13:50    │ admin@dento.app │ user.invited      │ dr.sarah   │ cairo│   │
│  │ 13:45    │ admin@dento.app │ impersonate.start │ clinic-dub │ dubai│   │
│  │ 13:22    │ system          │ dunning.sent      │ INV-00234  │ amman│   │
│  └──────────┴─────────────────┴───────────────────┴────────────┴──────┘   │
│                                                                             │
│  Showing 1-25 of 12,450        ← 1 2 3 ... →                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. User Sessions (NEU — Section 27 Gap Fix)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  User Sessions                                          Platform-wide      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [🔍 Search user...]  [Tenant ▾]  [Status ▾: Active]                      │
│                                                                             │
│  ┌──────────────────┬──────────────────┬──────────────┬─────────┬────────┐ │
│  │ USER             │ DEVICE           │ IP / LOCATION│ LAST    │        │ │
│  ├──────────────────┼──────────────────┼──────────────┼─────────┼────────┤ │
│  │ admin@dento.app  │ Chrome · Win 11  │ 41.35.x.x   │ 2 min   │ [🔴]  │ │
│  │ (platform_admin) │ Desktop          │ Cairo, EG    │         │        │ │
│  ├──────────────────┼──────────────────┼──────────────┼─────────┼────────┤ │
│  │ dr.ahmed@clinic  │ Safari · iOS 17  │ 156.xx.x.x  │ 15 min  │ [🔴]  │ │
│  │ clinic-cairo     │ Mobile           │ Cairo, EG    │         │        │ │
│  ├──────────────────┼──────────────────┼──────────────┼─────────┼────────┤ │
│  │ reception@clinic │ Firefox · macOS  │ 37.xx.x.x   │ 1 hr    │ [🔴]  │ │
│  │ clinic-riyadh    │ Desktop          │ Riyadh, SA   │         │        │ │
│  └──────────────────┴──────────────────┴──────────────┴─────────┴────────┘ │
│                                                                             │
│  Active Sessions: 47  •  Unique Users: 32  •  Tenants: 12                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Dark Mode Variante (TailAdmin native)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────┐                                                    🔔  👤 Admin │
│ │    D     │  DENTO Platform                         [Search ⌘K]   ☀ Light  │
│ └─────────┘                                          ───────────────────────│
├──────────────┬───────────────────────────────────────────────────────────────┤
│ ░░░░░░░░░░░░ │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░           ░│  ░ DARK BACKGROUND (#1a1c23)                              ░ │
│ ░ SIDEBAR   ░│  ░                                                        ░ │
│ ░ (#1e2028) ░│  ░  ┌─────────────┐  ┌─────────────┐  (Cards: #252830)  ░ │
│ ░           ░│  ░  │ 128         │  │ $12,450     │                      ░ │
│ ░ Text:     ░│  ░  │ Tenants     │  │ MRR         │  Text: #e4e4e7     ░ │
│ ░ #94a3b8   ░│  ░  └─────────────┘  └─────────────┘                      ░ │
│ ░           ░│  ░                                                        ░ │
│ ░ Active:   ░│  ░  Borders: #374151    Accent: #6366f1                  ░ │
│ ░ #6366f1   ░│  ░                                                        ░ │
│ ░░░░░░░░░░░░ │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Tailwind Dark Mode Classes

```tsx
// TailAdmin Dark Mode — automatic via class strategy
// tailwind.config.ts: darkMode: 'class'

<Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
  <CardHeader>
    <CardTitle className="text-gray-900 dark:text-gray-100">
      Tenants
    </CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-gray-500 dark:text-gray-400">128 active</p>
  </CardContent>
</Card>

// Sidebar
<aside className="bg-white dark:bg-[#1e2028] border-e border-gray-200 dark:border-gray-700">
  <NavItem className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800
                       data-[active]:text-indigo-600 data-[active]:dark:text-indigo-400" />
</aside>
```

---

## Zusammenfassung — Dev Portal Screens

| #   | Screen        | Shadcn Komponenten                    | Status  |
| --- | ------------- | ------------------------------------- | ------- |
| 1   | Layout        | Sidebar, Header, Breadcrumb           | Basis   |
| 2   | Dashboard     | Card, AreaChart (Recharts), Table     | Haupt   |
| 3   | Tenant List   | DataTable, Badge, DropdownMenu, Input | Haupt   |
| 4   | Tenant Detail | Tabs (10), Card, Badge, Button        | Haupt   |
| 5   | Modules List  | Card (Grid), Badge, Input             | Haupt   |
| 6   | Monitoring    | Card, BarChart, Table, Badge          | Haupt   |
| 7   | Billing       | Card, Tabs, Table, BarChart           | Haupt   |
| 8   | Support       | Card, Table, Badge, Button            | Haupt   |
| 9   | Backups       | Card, Table, Badge, Select, Button    | NEU     |
| 10  | API Keys      | Card, Badge, Button, Dialog           | Haupt   |
| 11  | Audit Logs    | DataTable, Input, Select, DatePicker  | Haupt   |
| 12  | User Sessions | DataTable, Badge, Button              | NEU     |
| 13  | Dark Mode     | Alle oben — dark: Varianten           | Variant |
