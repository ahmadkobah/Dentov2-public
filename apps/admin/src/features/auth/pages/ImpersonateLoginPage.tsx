import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../stores/auth.store.js';
import { useTranslation } from '../../../stores/locale.store.js';

/**
 * Auto-login page for platform support impersonation.
 * Reads a temp JWT from ?token=, sets auth state, and redirects to dashboard.
 */
export default function ImpersonateLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    try {
      // Decode JWT payload (no verification — API verifies on each request)
      const base64 = token.split('.')[1];
      const payload = JSON.parse(atob(base64));

      useAuthStore.setState({ isBootstrapping: false });
      useAuthStore.getState().setAuth(
        {
          id: payload.userId,
          email: payload.email,
          firstName: 'Support',
          lastName: 'Agent',
          role: payload.role,
        },
        token,
        payload.tenantSlug,
      );

      navigate('/', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">{t('auth.impersonate.loading')}</p>
      </div>
    </div>
  );
}
