import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import {
  loginSchema,
  totpVerifySchema,
  type LoginInput,
  type TotpVerifyInput,
} from '@dento/shared';
import { Eye, EyeOff, Mail, Lock, AlertCircle, ShieldCheck, Terminal } from 'lucide-react';
import { apiClient, ApiError } from '../../../lib/api-client.js';
import { useAuthStore } from '../../../stores/auth.store.js';

/** Shape returned by POST /auth/login (wrapped in { success, data }) */
interface LoginResponse {
  accessToken: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    role: string;
    tenantSlug: string;
    profile: { firstName?: { en?: string }; lastName?: { en?: string } };
    isProfileComplete: boolean;
    platformRole?: 'platform_owner' | 'platform_admin' | 'platform_viewer';
    platformPermissions?: string[];
  };
}

interface TwoFactorResponse {
  requires2FA: true;
  tempToken: string;
}

interface SessionConflictResponse {
  sessionConflict: true;
  existingSession: {
    deviceType: string;
    browser?: string;
    os?: string;
    lastActivityAt: string;
  };
}

interface TwoFactorSetupResponse {
  requires2FASetup: true;
  tempToken: string;
}

type LoginResult = {
  data: LoginResponse | TwoFactorResponse | SessionConflictResponse | TwoFactorSetupResponse;
};

export default function DevLoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login form (RHF + Zod)
  const loginForm = useForm<LoginInput>({
    resolver: zodFormResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // 2FA form (RHF + Zod)
  const totpForm = useForm<TotpVerifyInput>({
    resolver: zodFormResolver(totpVerifySchema),
    defaultValues: { code: '' },
  });

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');

  const onLoginSubmit = async (values: LoginInput, opts?: { forceLogin?: boolean }) => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await apiClient.post<LoginResult>('/api/auth/login', {
        email: values.email,
        password: values.password,
        ...(opts?.forceLogin ? { forceLogin: true } : {}),
      });

      const data = result.data;

      // 2FA required — show TOTP input
      if ('requires2FA' in data && data.requires2FA) {
        setRequires2FA(true);
        setTempToken(data.tempToken);
        setIsLoading(false);
        return;
      }

      // 2FA setup required by policy — block here with clear message
      if ('requires2FASetup' in data && data.requires2FASetup) {
        setError(
          'Your account requires two-factor authentication setup. Please contact your administrator or complete setup from a tenant portal.',
        );
        setIsLoading(false);
        return;
      }

      // Existing session on another device — auto-retry once with forceLogin to evict it
      if ('sessionConflict' in data && data.sessionConflict) {
        if (opts?.forceLogin) {
          // Already retried — give up to avoid loop
          setError('Could not establish session. Please try again in a moment.');
          setIsLoading(false);
          return;
        }
        const existing = data.existingSession;

        console.warn('[DevLoginPage] Existing session detected, forcing login', existing);
        return onLoginSubmit(values, { forceLogin: true });
      }

      // Normal login success — defensive guard against unexpected shapes
      const loginData = data as LoginResponse;
      if (!loginData?.user || !loginData?.accessToken) {
        console.error('[DevLoginPage] Unexpected login response shape', data);
        setError('Unexpected response from server. Please try again.');
        setIsLoading(false);
        return;
      }

      // Enforce platform_admin role
      if (loginData.user.role !== 'platform_admin') {
        setError('Access denied. This portal is for platform administrators only.');
        setIsLoading(false);
        return;
      }

      setAuth(
        {
          id: loginData.user.id,
          email: loginData.user.email,
          firstName: loginData.user.profile?.firstName?.en || '',
          lastName: loginData.user.profile?.lastName?.en || '',
          role: loginData.user.role,
          platformRole: loginData.user.platformRole ?? 'platform_admin',
          platformPermissions: loginData.user.platformPermissions ?? [],
        },
        loginData.accessToken,
      );

      navigate('/', { replace: true });
    } catch (err) {
      console.error('[DevLoginPage] Login failed', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof TypeError) {
        // Network/CORS failure — fetch itself failed (no response received)
        setError('Cannot reach the server. Check your connection and try again.');
      } else if (err instanceof Error) {
        setError(err.message || 'An unexpected error occurred. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const on2FASubmit = async (values: TotpVerifyInput) => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await apiClient.post<{ data: LoginResponse }>('/api/auth/2fa/validate', {
        tempToken,
        code: values.code,
      });

      const loginData = result.data;

      // Enforce platform_admin role
      if (loginData.user.role !== 'platform_admin') {
        setError('Access denied. This portal is for platform administrators only.');
        setIsLoading(false);
        return;
      }

      setAuth(
        {
          id: loginData.user.id,
          email: loginData.user.email,
          firstName: loginData.user.profile?.firstName?.en || '',
          lastName: loginData.user.profile?.lastName?.en || '',
          role: loginData.user.role,
          platformRole: loginData.user.platformRole ?? 'platform_admin',
          platformPermissions: loginData.user.platformPermissions ?? [],
        },
        loginData.accessToken,
      );

      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── 2FA Verification Screen ───────────────────────────────
  if (requires2FA) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/20">
              <ShieldCheck className="h-8 w-8 text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Two-Factor Authentication</h1>
            <p className="mt-2 text-gray-400">Enter the 6-digit code from your authenticator app</p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-900/20 px-4 py-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={totpForm.handleSubmit(on2FASubmit)} className="space-y-5">
              <div>
                <label htmlFor="totp" className="mb-2 block text-sm font-medium text-gray-300">
                  Verification Code
                </label>
                <input
                  id="totp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  {...totpForm.register('code', {
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                      const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
                      totpForm.setValue('code', cleaned);
                    },
                  })}
                  className="h-12 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 text-center text-lg tracking-[0.5em] text-white placeholder:text-gray-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
                {totpForm.formState.errors.code && (
                  <p className="mt-1 text-xs text-red-400">
                    {totpForm.formState.errors.code.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !totpForm.formState.isValid}
                className="flex h-12 w-full items-center justify-center rounded-lg bg-violet-600 text-sm font-medium text-white transition-colors hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  'Verify'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setRequires2FA(false);
                  setTempToken('');
                  totpForm.reset();
                  setError(null);
                }}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-300"
              >
                Back to login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Login Screen ─────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/20">
            <Terminal className="h-8 w-8 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Dento Developer Portal</h1>
          <p className="mt-2 text-gray-400">Platform administrator access</p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
          {/* Error Banner */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-900/20 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form
            onSubmit={loginForm.handleSubmit((values) => onLoginSubmit(values))}
            className="space-y-5"
          >
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-300">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                <input
                  id="email"
                  type="email"
                  placeholder="admin@dento.io"
                  {...loginForm.register('email')}
                  className="h-12 w-full rounded-lg border border-gray-700 bg-gray-800 ps-12 pe-4 text-sm text-white placeholder:text-gray-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
              {loginForm.formState.errors.email && (
                <p className="mt-1 text-xs text-red-400">
                  {loginForm.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...loginForm.register('password')}
                  className="h-12 w-full rounded-lg border border-gray-700 bg-gray-800 ps-12 pe-12 text-sm text-white placeholder:text-gray-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <p className="mt-1 text-xs text-red-400">
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex h-12 w-full items-center justify-center rounded-lg bg-violet-600 text-sm font-medium text-white transition-colors hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-600">
          &copy; 2026 Dento Platform. Authorized personnel only.
        </p>
      </div>
    </div>
  );
}
