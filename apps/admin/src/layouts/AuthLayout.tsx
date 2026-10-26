import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  // Login page handles its own layout/styling
  return <Outlet />;
}
