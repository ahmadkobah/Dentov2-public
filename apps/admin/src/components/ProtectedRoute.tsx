import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store.js';
import { useMyPermissions } from '../features/users/hooks/useRolePermissions.js';
import { setApiPermissions } from '../layouts/Sidebar/sidebar-permissions.js';

/**
 * Route guard — redirects unauthenticated users to /login.
 * Also fetches the current user's effective permissions for sidebar/route gating.
 * Waits for auth bootstrap (silent refresh) before deciding.
 */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const location = useLocation();

  // Fetch effective permissions for the current user's role
  const { data: permData } = useMyPermissions();

  // Sync API permissions into the sidebar module
  useEffect(() => {
    if (permData?.permissions) {
      setApiPermissions(permData.permissions);
    }
    return () => setApiPermissions(null);
  }, [permData]);

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}

/**
 * Guest-only guard — redirects authenticated users to /.
 * Waits for bootstrap before deciding.
 */
export function GuestRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
