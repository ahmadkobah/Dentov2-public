import { Link, useLocation } from 'react-router-dom';
import { Button } from '@dento/ui';
import { HeadphonesIcon, X } from 'lucide-react';
import { useSidebar } from '../context/SidebarContext.js';
import { useBrandingStore } from '../stores/branding.store.js';
import { useAuthStore } from '../stores/auth.store.js';
import { useDocsConfig } from '../features/docs/hooks/useDocs.js';
import { sidebarConfig } from '../layouts/Sidebar/sidebar-config.js';
import { canAccessModule } from '../layouts/Sidebar/sidebar-permissions.js';
import { useTranslation } from '../stores/locale.store.js';

export function AppSidebar() {
  const { isExpanded, isMobileOpen, isHovered, toggleMobileSidebar, setIsHovered } = useSidebar();
  const location = useLocation();
  const { logoUrl, logoDarkUrl, clinicName } = useBrandingStore();
  const user = useAuthStore((s) => s.user);
  const { t, locale, isRTL } = useTranslation();
  const { data: docsConfig } = useDocsConfig();

  const isActive = (path?: string) => path && location.pathname === path;
  const showExpanded = isExpanded || isHovered;

  // RBAC: filter sidebar items by user role, plus always add Support
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

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={toggleMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          fixed start-0 top-0 z-50 flex h-screen flex-col border-e border-gray-200 bg-white transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900
          ${isMobileOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'}
          ${showExpanded ? 'w-[280px]' : 'w-[90px]'}
          lg:translate-x-0
        `}
      >
        {/* Logo — uses tenant branding if available (§14) */}
        <div className="flex h-[72px] items-center justify-between border-b border-gray-200 px-5 dark:border-gray-800">
          <Link to="/" className="flex items-center gap-3">
            {logoUrl ? (
              <>
                <img
                  src={logoUrl}
                  alt={clinicName.en}
                  className={`h-10 w-10 rounded-xl object-contain${logoDarkUrl ? ' dark:hidden' : ''}`}
                />
                {logoDarkUrl && (
                  <img
                    src={logoDarkUrl}
                    alt={clinicName.en}
                    className="hidden h-10 w-10 rounded-xl object-contain dark:block"
                  />
                )}
              </>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-500/20">
                <span className="text-xl">🦷</span>
              </div>
            )}
            {showExpanded && (
              <span className="text-xl font-bold text-brand-600 dark:text-brand-400">
                {(locale === 'ar' ? clinicName.ar : clinicName.en) || clinicName.en || 'Dento'}
              </span>
            )}
          </Link>
          {isMobileOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMobileSidebar}
              aria-label={t('app.sidebar.close', 'Close sidebar')}
              className="p-2 text-gray-500 lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-5">
          {Object.entries(groups).map(([groupName, items]) => (
            <div key={groupName} className="mb-6">
              {showExpanded && (
                <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {t(`app.group.${groupName}`)}
                </h3>
              )}
              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`
                        flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all
                        ${
                          isActive(item.path)
                            ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {showExpanded && <span>{t(`app.nav.${item.label}`)}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Support — always visible */}
          <div className="mb-6">
            {showExpanded && (
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {t('app.group.Support')}
              </h3>
            )}
            <ul className="space-y-1">
              <li>
                <Link
                  to="/support"
                  className={`
                    flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all
                    ${
                      isActive('/support')
                        ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  <HeadphonesIcon className="h-5 w-5 flex-shrink-0" />
                  {showExpanded && <span>{t('app.nav.Support')}</span>}
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* Bottom widget */}
        {showExpanded && (
          <div className="border-t border-gray-200 p-4 dark:border-gray-800">
            <div className="rounded-xl bg-brand-50 p-4 dark:bg-brand-500/10">
              <div className="mb-2 flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-brand-100 dark:bg-brand-500/20">
                {docsConfig?.headerLogo ? (
                  <img
                    src={docsConfig.headerLogo}
                    alt="Platform"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-xl">🦷</span>
                )}
              </div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                {t('app.sidebar.needHelp')}
              </h4>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('app.sidebar.needHelpDesc')}
              </p>
              <Link to="/docs">
                <Button variant="default" className="mt-3 w-full py-2 text-sm font-medium">
                  {t('app.sidebar.viewDocs')}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
