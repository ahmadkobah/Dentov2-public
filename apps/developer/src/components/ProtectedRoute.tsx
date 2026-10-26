import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore, hasPlatformPerm } from '../stores/auth.store.js';
import ForbiddenPage from './ForbiddenPage.js';

/**
 * Route guard — redirects unauthenticated users to /login.
 * Waits for auth bootstrap (silent refresh) before deciding.
 */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const location = useLocation();

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

/**
 * Permission-gated route wrapper.
 * Renders <Outlet /> if the user has the required platform permission,
 * otherwise renders <ForbiddenPage />.
 *
 * Usage in router:
 *   { element: <PlatformRoute permission="platform_users.read" />, children: [...] }
 */
export function PlatformRoute({ permission }: { permission: string }) {
  if (!hasPlatformPerm(permission)) {
    return <ForbiddenPage />;
  }

  return <Outlet />;
}
