import {
  LayoutDashboard,
  Building2,
  Activity,
  Rocket,
  CreditCard,
  Globe,
  Headphones,
  Package,
  Tags,
  Flag,
  FileText,
  MapPin,
  Settings,
  Database,
  FolderArchive,
  Key,
  Webhook,
  Shield,
  Monitor,
  BookOpen,
  Users,
  UserCheck,
  Gauge,
  CalendarCheck,
  type LucideIcon,
} from 'lucide-react';

export interface SidebarItem {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: number | string;
  /** Platform permission required to see this item (e.g. 'platform_tenants.read') */
  requiredPermission?: string;
}

export interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

export const DEV_SIDEBAR_CONFIG: SidebarSection[] = [
  {
    label: 'Overview',
    items: [{ icon: LayoutDashboard, label: 'Dashboard', href: '/' }],
  },
  {
    label: 'SaaS',
    items: [
      {
        icon: Building2,
        label: 'Tenants',
        href: '/tenants',
        requiredPermission: 'platform_tenants.read',
      },
      {
        icon: Activity,
        label: 'Monitoring',
        href: '/monitoring',
        requiredPermission: 'platform_tenants.read',
      },
      {
        icon: Gauge,
        label: 'Rate Limits',
        href: '/rate-limits',
        requiredPermission: 'platform_settings.read',
      },
      {
        icon: Rocket,
        label: 'Deployments',
        href: '/deployments',
        requiredPermission: 'platform_tenants.read',
      },
      {
        icon: CreditCard,
        label: 'Billing',
        href: '/billing',
        requiredPermission: 'platform_billing.read',
      },
      {
        icon: Globe,
        label: 'Domains',
        href: '/domains',
        requiredPermission: 'platform_tenants.read',
      },
      {
        icon: Headphones,
        label: 'Support',
        href: '/support',
        requiredPermission: 'platform_support.read',
      },
    ],
  },
  {
    label: 'Platform',
    items: [
      {
        icon: Package,
        label: 'Modules',
        href: '/modules',
        requiredPermission: 'platform_modules.read',
      },
      {
        icon: Tags,
        label: 'Pricing',
        href: '/pricing',
        requiredPermission: 'platform_pricing.read',
      },
      {
        icon: Flag,
        label: 'Feature Flags',
        href: '/flags',
        requiredPermission: 'platform_modules.read',
      },
      {
        icon: FileText,
        label: 'Custom Fields',
        href: '/fields',
        requiredPermission: 'platform_modules.read',
      },
      {
        icon: MapPin,
        label: 'Countries',
        href: '/countries',
        requiredPermission: 'platform_settings.read',
      },
    ],
  },
  {
    label: 'Team',
    items: [
      {
        icon: Users,
        label: 'Platform Users',
        href: '/users',
        requiredPermission: 'platform_users.read',
      },
      {
        icon: UserCheck,
        label: 'User Sessions',
        href: '/user-sessions',
        requiredPermission: 'platform_users.read',
      },
    ],
  },
  {
    label: 'Config',
    items: [
      {
        icon: Settings,
        label: 'Settings',
        href: '/settings',
        requiredPermission: 'platform_settings.read',
      },
      {
        icon: Database,
        label: 'Storage',
        href: '/storage',
        requiredPermission: 'platform_settings.read',
      },
      {
        icon: FolderArchive,
        label: 'Backups',
        href: '/backups',
        requiredPermission: 'platform_backups.read',
      },
    ],
  },
  {
    label: 'API',
    items: [
      {
        icon: BookOpen,
        label: 'API Catalog',
        href: '/api-catalog',
        requiredPermission: 'platform_api_keys.read',
      },
      {
        icon: CalendarCheck,
        label: 'Booking Guide',
        href: '/booking-guide',
        requiredPermission: 'platform_api_keys.read',
      },
      {
        icon: Key,
        label: 'API Keys',
        href: '/api-keys',
        requiredPermission: 'platform_api_keys.read',
      },
      {
        icon: Webhook,
        label: 'Webhooks',
        href: '/webhooks',
        requiredPermission: 'platform_webhooks.read',
      },
    ],
  },
  {
    label: 'Logs',
    items: [
      { icon: Shield, label: 'Audit', href: '/audit', requiredPermission: 'platform_audit.read' },
      {
        icon: Monitor,
        label: 'System',
        href: '/system-logs',
        requiredPermission: 'platform_settings.read',
      },
    ],
  },
];
