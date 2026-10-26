/**
 * RoleGate — Route-level RBAC guard.
 *
 * Checks if the current user's role has access to the specified module.
 * Redirects to "/" if the role is not allowed, preventing direct URL navigation
 * to pages the role shouldn't access.
 *
 * Usage in router:
 *   { path: '/users', element: roleGated('users', gated('users', <UserListPage />)) }
 *
 * Or wrap with ModuleGate:
 *   { path: '/users', element: guarded('users', <UserListPage />) }
 */

import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store.js';
import { canAccessModule } from '../layouts/Sidebar/sidebar-permissions.js';

interface RoleGateProps {
  module: string;
  children: ReactNode;
}

export function RoleGate({ module, children }: RoleGateProps) {
  const role = useAuthStore((s) => s.user?.role);

  if (!canAccessModule(role, module)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
