import { Outlet } from 'react-router-dom';
import { AppSidebar } from '../components/AppSidebar.js';
import { AppHeader } from '../components/AppHeader.js';
import { useSidebar, SidebarProvider } from '../context/SidebarContext.js';
import { useBrandingTheme } from '../hooks/useBrandingTheme.js';
import { ChatPanel } from './ChatPanel/ChatPanel.js';
import { SupportSessionBanner } from '../components/SupportSessionBanner.js';
import { useSettingsByKey } from '../features/settings/hooks/useTenantSettings.js';
import { useCurrencyStore } from '../lib/currency.js';
import { useDateFormatStore } from '../lib/date.js';
import { useEffect } from 'react';

function DashboardLayoutContent() {
  // Fetch tenant branding & inject CSS vars (§14 Branding Propagation)
  useBrandingTheme();

  // Sync tenant currency from API → persisted store
  const { data: clinicSettings } = useSettingsByKey('clinic');
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const setTax = useCurrencyStore((s) => s.setTax);
  const setDateFormat = useDateFormatStore((s) => s.setDateFormat);
  useEffect(() => {
    if (clinicSettings?.currency) {
      setCurrency(clinicSettings.currency);
    }
    if (clinicSettings?.dateFormat) {
      setDateFormat(clinicSettings.dateFormat);
    }
    // Sync tax settings — taxPercentage may be null (not yet configured)
    const enabled = clinicSettings?.taxEnabled ?? false;
    const pct = clinicSettings?.taxPercentage ?? 0;
    setTax(enabled, pct);
  }, [
    clinicSettings?.currency,
    clinicSettings?.dateFormat,
    clinicSettings?.taxEnabled,
    clinicSettings?.taxPercentage,
    setCurrency,
    setDateFormat,
    setTax,
  ]);

  const { isExpanded, isHovered } = useSidebar();
  const showExpanded = isExpanded || isHovered;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Content */}
      <div
        className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${
          showExpanded ? 'lg:ms-[280px]' : 'lg:ms-[90px]'
        }`}
      >
        <AppHeader />
        <SupportSessionBanner />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Chat Sidebar Panel — §14 / §37 */}
      <ChatPanel />
    </div>
  );
}

export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <DashboardLayoutContent />
    </SidebarProvider>
  );
}
