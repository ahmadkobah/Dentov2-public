import { Outlet } from 'react-router-dom';

/**
 * Auth layout — passthrough wrapper for login/auth pages.
 * Login page handles its own full-page layout and styling.
 */
export default function AuthLayout() {
  return <Outlet />;
}
