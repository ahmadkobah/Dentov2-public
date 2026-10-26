import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  Settings,
  Database,
  FolderArchive,
  Key,
  Webhook,
  Shield,
  Monitor,
  ChevronDown,
  MoreHorizontal,
  BookOpen,
  Languages as LanguagesIcon,
  type LucideIcon,
} from 'lucide-react';
import { useSidebar } from '../context/SidebarContext.js';
import { useBranding } from '../features/settings/hooks/useSystemSettings.js';

interface NavSubItem {
  name: string;
  path: string;
  pro?: boolean;
  new?: boolean;
}

interface NavItem {
  name: string;
  icon: LucideIcon;
  path?: string;
  subItems?: NavSubItem[];
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: 'Overview',
    items: [{ icon: LayoutDashboard, name: 'Dashboard', path: '/' }],
  },
  {
    label: 'SaaS',
    items: [
      { icon: Building2, name: 'Tenants', path: '/tenants' },
      { icon: Activity, name: 'Monitoring', path: '/monitoring' },
      { icon: Rocket, name: 'Deployments', path: '/deployments' },
      { icon: CreditCard, name: 'Billing', path: '/billing' },
      { icon: Globe, name: 'Domains', path: '/domains' },
      { icon: Headphones, name: 'Support', path: '/support' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { icon: Package, name: 'Modules', path: '/modules' },
      { icon: Tags, name: 'Pricing', path: '/pricing' },
      { icon: Flag, name: 'Feature Flags', path: '/flags' },
      { icon: FileText, name: 'Custom Fields', path: '/fields' },
      { icon: BookOpen, name: 'Documentation', path: '/docs' },
      { icon: LanguagesIcon, name: 'Languages', path: '/languages' },
    ],
  },
  {
    label: 'Config',
    items: [
      { icon: Settings, name: 'Settings', path: '/settings' },
      { icon: Database, name: 'Storage', path: '/storage' },
      { icon: FolderArchive, name: 'Backups', path: '/backups' },
    ],
  },
  {
    label: 'API',
    items: [
      { icon: Key, name: 'API Keys', path: '/api-keys' },
      { icon: Webhook, name: 'Webhooks', path: '/webhooks' },
    ],
  },
  {
    label: 'Logs',
    items: [
      { icon: Shield, name: 'Audit', path: '/audit' },
      { icon: Monitor, name: 'System', path: '/system-logs' },
    ],
  },
];

export function AppSidebar() {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();
  const { data: branding } = useBranding();
  const logoUrl = branding?.logoUrl;
  const platformName = branding?.platformName || 'DENTO';

  const [openSubmenu, setOpenSubmenu] = useState<{
    section: number;
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);

  // Auto-open submenu for active routes
  useEffect(() => {
    let submenuMatched = false;
    navSections.forEach((section, sectionIndex) => {
      section.items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({ section: sectionIndex, index });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]);

  // Calculate submenu height for animation
  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.section}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (sectionIndex: number, itemIndex: number) => {
    setOpenSubmenu((prev) => {
      if (prev && prev.section === sectionIndex && prev.index === itemIndex) {
        return null;
      }
      return { section: sectionIndex, index: itemIndex };
    });
  };

  const renderNavItem = (item: NavItem, sectionIndex: number, itemIndex: number) => {
    const Icon = item.icon;
    const isItemActive = item.path ? isActive(item.path) : false;
    const isSubmenuOpen = openSubmenu?.section === sectionIndex && openSubmenu?.index === itemIndex;
    const key = `${sectionIndex}-${itemIndex}`;

    if (item.subItems) {
      return (
        <li key={item.name}>
          <button
            onClick={() => handleSubmenuToggle(sectionIndex, itemIndex)}
            className={`menu-item group ${isSubmenuOpen ? 'menu-item-active' : 'menu-item-inactive'} 
              ${!isExpanded && !isHovered ? 'lg:justify-center' : 'lg:justify-start'}`}
          >
            <Icon
              className={`h-5 w-5 ${isSubmenuOpen ? 'menu-item-icon-active' : 'menu-item-icon-inactive'}`}
            />
            {(isExpanded || isHovered || isMobileOpen) && (
              <>
                <span className="flex-1 text-start">{item.name}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    isSubmenuOpen ? 'rotate-180 text-brand-500' : ''
                  }`}
                />
              </>
            )}
          </button>

          {/* Submenu */}
          <div
            ref={(el) => {
              subMenuRefs.current[key] = el;
            }}
            className="overflow-hidden transition-all duration-200"
            style={{
              height: isSubmenuOpen ? subMenuHeight[key] || 'auto' : 0,
            }}
          >
            <ul className="mt-2 space-y-1 ps-9">
              {item.subItems.map((subItem) => (
                <li key={subItem.path}>
                  <Link
                    to={subItem.path}
                    className={`menu-dropdown-item ${
                      isActive(subItem.path)
                        ? 'menu-dropdown-item-active'
                        : 'menu-dropdown-item-inactive'
                    }`}
                  >
                    <span className="flex-1">{subItem.name}</span>
                    {subItem.pro && (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
                        Pro
                      </span>
                    )}
                    {subItem.new && (
                      <span className="rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-500 dark:bg-success-500/10 dark:text-success-400">
                        New
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </li>
      );
    }

    return (
      <li key={item.name}>
        <Link
          to={item.path || '#'}
          className={`menu-item group ${isItemActive ? 'menu-item-active' : 'menu-item-inactive'}
            ${!isExpanded && !isHovered ? 'lg:justify-center' : 'lg:justify-start'}`}
        >
          <Icon
            className={`h-5 w-5 ${isItemActive ? 'menu-item-icon-active' : 'menu-item-icon-inactive'}`}
          />
          {(isExpanded || isHovered || isMobileOpen) && <span>{item.name}</span>}
        </Link>
      </li>
    );
  };

  return (
    <aside
      className={`fixed start-0 top-0 z-50 flex h-screen flex-col border-e border-gray-200 bg-white transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900
        ${isExpanded || isHovered ? 'w-[290px]' : 'w-[90px]'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div
        className={`flex h-[72px] items-center border-b border-gray-200 dark:border-gray-800
        ${isExpanded || isHovered ? 'justify-between px-6' : 'justify-center px-4'}`}
      >
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-xl text-white overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt={platformName} className="h-full w-full object-contain" />
            ) : (
              '🦷'
            )}
          </div>
          {(isExpanded || isHovered || isMobileOpen) && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {platformName}
              </span>
              <span className="text-xs font-medium text-brand-500">Platform</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6">
        {navSections.map((section, sectionIndex) => (
          <div key={section.label} className="mb-6">
            {(isExpanded || isHovered || isMobileOpen) && (
              <h3 className="mb-3 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <span>{section.label}</span>
                {!isExpanded && !isHovered && !isMobileOpen && (
                  <MoreHorizontal className="h-4 w-4" />
                )}
              </h3>
            )}
            <ul className="space-y-1">
              {section.items.map((item, index) => renderNavItem(item, sectionIndex, index))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom Widget */}
      {(isExpanded || isHovered || isMobileOpen) && (
        <div className="border-t border-gray-200 p-4 dark:border-gray-800">
          <div className="rounded-xl bg-brand-50 p-4 dark:bg-brand-500/10">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
                <Rocket className="h-4 w-4" />
              </div>
              <span className="font-semibold text-brand-600 dark:text-brand-400">Dento v2.0</span>
            </div>
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              Platform Admin Dashboard
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="flex h-2 w-2 rounded-full bg-success-500" />
              <span>128 Tenants · 0 Errors</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
