import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@dento/ui';
import { X, ChevronDown } from 'lucide-react';
import { sidebarConfig, type SidebarItem } from './sidebar-config.js';
import { canAccessModule } from './sidebar-permissions.js';
import { useBrandingStore } from '../../stores/branding.store.js';
import { useThemeStore } from '../../stores/theme.store.js';
import { useAuthStore } from '../../stores/auth.store.js';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { logoUrl, logoDarkUrl, clinicName, logoSize, logoAlignment, logoLayout } =
    useBrandingStore();
  const { isDark, isRTL } = useThemeStore();
  const user = useAuthStore((s) => s.user);

  // Track which collapsible parents are expanded
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Dynamic logo: use dark logo in dark mode, fall back to light logo
  const displayLogo = isDark && logoDarkUrl ? logoDarkUrl : logoUrl;
  const displayName = clinicName.en || 'Dento';

  // Logo display settings
  const sizeClass = { small: 'h-6 w-6', medium: 'h-8 w-8', large: 'h-12 w-12' }[logoSize];
  const alignClass = { left: 'justify-start', center: 'justify-center', right: 'justify-end' }[
    logoAlignment
  ];
  const isStacked = logoLayout === 'logo-top';
  const isLogoOnly = logoLayout === 'logo-only';

  // RBAC: filter sidebar items by user role
  const visibleItems = sidebarConfig.filter((item) => canAccessModule(user?.role, item.module));

  // Group items by category
  const groups = visibleItems.reduce(
    (acc, item) => {
      if (!acc[item.group]) acc[item.group] = [];
      acc[item.group].push(item);
      return acc;
    },
    {} as Record<string, typeof visibleItems>,
  );

  // Auto-expand parent if a child is currently active
  const isChildActive = (item: SidebarItem) =>
    item.children?.some((child) => location.pathname === child.path) ?? false;

  const toggleExpanded = (path: string) =>
    setExpanded((prev) => ({ ...prev, [path]: !prev[path] }));

  const renderItem = (item: SidebarItem) => {
    const hasChildren = item.children && item.children.length > 0;
    const isActive = location.pathname === item.path;
    const childActive = hasChildren && isChildActive(item);
    const isOpen = expanded[item.path] ?? childActive;

    if (hasChildren) {
      return (
        <li key={item.path}>
          <button
            onClick={() => toggleExpanded(item.path)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive || childActive
                ? 'bg-primary/10 font-medium text-primary'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="flex-1 text-start">{item.label}</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 transition-transform duration-200',
                isOpen && 'rotate-180',
              )}
            />
          </button>
          {isOpen && (
            <ul className="mt-1 ms-4 space-y-1 border-s border-gray-200 dark:border-gray-700 ps-3">
              {item.children!.map((child) => {
                const childIsActive = location.pathname === child.path;
                return (
                  <li key={child.path}>
                    <Link
                      to={child.path}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors',
                        childIsActive
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
                      )}
                    >
                      <child.icon className="h-4 w-4 shrink-0" />
                      <span>{child.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </li>
      );
    }

    return (
      <li key={item.path}>
        <Link
          to={item.path}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
            isActive
              ? 'bg-primary/10 font-medium text-primary'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
          )}
        >
          <item.icon className="h-5 w-5 shrink-0" />
          <span>{item.label}</span>
        </Link>
      </li>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed start-0 top-0 z-50 flex h-screen w-[280px] flex-col border-e bg-white transition-transform duration-300 dark:border-gray-700 dark:bg-gray-800 lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full',
        )}
      >
        {/* Logo — §14 Dynamic from Branding */}
        <div className="flex h-16 items-center justify-between border-b px-6 dark:border-gray-700">
          <Link
            to="/"
            className={cn(
              'flex gap-2',
              isStacked ? 'flex-col items-center' : 'items-center',
              alignClass,
              'flex-1 min-w-0',
            )}
          >
            {displayLogo ? (
              <img
                src={displayLogo}
                alt={displayName}
                className={cn(sizeClass, 'object-contain')}
              />
            ) : (
              <span className="text-2xl">🦷</span>
            )}
            {!isLogoOnly && (
              <span
                className={cn(
                  'text-xl font-bold text-primary truncate max-w-[160px]',
                  isStacked && 'text-sm',
                )}
              >
                {displayName}
              </span>
            )}
          </Link>
          <button onClick={onClose} className="lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-4">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="mb-4">
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </h3>
              <ul className="space-y-1">{items.map((item) => renderItem(item))}</ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
