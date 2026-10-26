import { Outlet } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader.js';
import { Backdrop } from '../components/Backdrop.js';
import { SidebarProvider } from '../context/SidebarContext.js';
import { Sidebar } from './Sidebar/Sidebar.js';
import { useSidebarStore } from '../stores/sidebar.store.js';

function DevPortalLayoutInner() {
  const { isCollapsed } = useSidebarStore();

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Backdrop for mobile */}
      <Backdrop />

      {/* Sidebar — permission-aware, reads from sidebar-config */}
      <div className="fixed inset-y-0 inset-s-0 z-40 hidden lg:block">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:ms-16' : 'lg:ms-64'
        }`}
      >
        {/* Header */}
        <AppHeader />

        {/* Page Content */}
        <main className="mx-auto max-w-screen-2xl p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function DevPortalLayout() {
  return (
    <SidebarProvider>
      <DevPortalLayoutInner />
    </SidebarProvider>
  );
}

export default DevPortalLayout;
