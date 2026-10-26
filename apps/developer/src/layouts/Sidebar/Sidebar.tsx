import { NavLink, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@dento/ui';
import { DEV_SIDEBAR_CONFIG, type SidebarSection } from '../../config/sidebar-config.js';
import { useSidebarStore } from '../../stores/sidebar.store.js';
import { hasPlatformPerm } from '../../stores/auth.store.js';
import { useBranding } from '../../features/settings/hooks/useSystemSettings.js';

/** Filter sidebar sections to only include items the user has permission to see. */
function filterSidebarItems(sections: SidebarSection[]): SidebarSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.requiredPermission || hasPlatformPerm(item.requiredPermission),
      ),
    }))
    .filter((section) => section.items.length > 0);
}

export function Sidebar() {
  const { isCollapsed, collapse, expand } = useSidebarStore();
  const location = useLocation();
  const filteredSections = filterSidebarItems(DEV_SIDEBAR_CONFIG);
  const { data: branding } = useBranding();
  const logoUrl = branding?.logoUrl;
  const platformName = branding?.platformName || 'DENTO';

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-e border-gray-200 bg-white transition-all duration-300 dark:border-gray-700 dark:bg-gray-800',
        isCollapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={platformName} className="h-8 w-8 rounded object-contain" />
            ) : (
              <span className="text-2xl">🦷</span>
            )}
            <span className="font-bold text-primary">{platformName}</span>
            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              Platform
            </span>
          </div>
        )}
        {isCollapsed &&
          (logoUrl ? (
            <img
              src={logoUrl}
              alt={platformName}
              className="mx-auto h-8 w-8 rounded object-contain"
            />
          ) : (
            <span className="mx-auto text-2xl">🦷</span>
          ))}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        {filteredSections.map((section) => (
          <div key={section.label} className="mb-6">
            {!isCollapsed && (
              <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {section.label}
              </h3>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <NavLink
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary dark:bg-primary/20'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white',
                        isCollapsed && 'justify-center',
                      )}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {item.badge !== undefined && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-700">
        <button
          onClick={() => (isCollapsed ? expand() : collapse())}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse'}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
