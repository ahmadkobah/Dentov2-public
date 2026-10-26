import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  AlertCircle,
  ShieldCheck,
  Monitor,
  QrCode,
  KeyRound,
} from 'lucide-react';
import { apiClient, ApiError } from '../../../lib/api-client.js';
import { useAuthStore } from '../../../stores/auth.store.js';
import { useThemeStore } from '../../../stores/theme.store.js';
import { useTranslation } from '../../../stores/locale.store.js';

/** Shape returned by POST /auth/login (wrapped in { success, data }) */
interface LoginResponse {
  accessToken: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    role: string;
    tenantSlug: string;
    profile: {
      firstName?: { en?: string };
      lastName?: { en?: string };
      languagePreference?: string;
    };
    isProfileComplete: boolean;
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
    browser: string;
    os: string;
    lastActivityAt: string;
  };
}

interface TwoFactorSetupResponse {
  requires2FASetup: true;
  setupToken: string;
}

type LoginResult =
  | { data: LoginResponse }
  | { data: TwoFactorResponse }
  | { data: SessionConflictResponse }
  | { data: TwoFactorSetupResponse };

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');

  // 2FA setup state (first-time enrollment)
  const [requires2FASetup, setRequires2FASetup] = useState(false);
  const [setupToken, setSetupToken] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [setupStep, setSetupStep] = useState<'qr' | 'verify' | 'codes'>('qr');
  const [setupVerifyCode, setSetupVerifyCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  // Session conflict state
  const [sessionConflict, setSessionConflict] = useState(false);
  const [existingSessionInfo, setExistingSessionInfo] = useState<
    SessionConflictResponse['existingSession'] | null
  >(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await apiClient.post<LoginResult>('/api/auth/login', { email, password });

      const data = result.data;

      // Session conflict — show confirmation dialog
      if ('sessionConflict' in data && data.sessionConflict) {
        setSessionConflict(true);
        setExistingSessionInfo((data as SessionConflictResponse).existingSession);
        setIsLoading(false);
        return;
      }

      // 2FA setup required — show QR code enrollment
      if ('requires2FASetup' in data && data.requires2FASetup) {
        setRequires2FASetup(true);
        setSetupToken((data as TwoFactorSetupResponse).setupToken);
        setIsLoading(false);
        // Immediately fetch QR code
        try {
          const setupResult = await apiClient.post<{ data: { qrCode: string } }>(
            '/api/auth/2fa/setup',
            { setupToken: (data as TwoFactorSetupResponse).setupToken },
          );
          setQrCode(setupResult.data.qrCode);
          setSetupStep('qr');
        } catch {
          setError('Failed to load 2FA setup. Please try again.');
          setRequires2FASetup(false);
        }
        return;
      }

      // 2FA required — show TOTP input
      if ('requires2FA' in data && data.requires2FA) {
        setRequires2FA(true);
        setTempToken(data.tempToken);
        setIsLoading(false);
        return;
      }

      // Normal login success
      const loginData = data as LoginResponse;
      setAuth(
        {
          id: loginData.user.id,
          email: loginData.user.email,
          firstName: loginData.user.profile?.firstName?.en || '',
          lastName: loginData.user.profile?.lastName?.en || '',
          role: loginData.user.role,
          languagePreference: loginData.user.profile?.languagePreference,
        },
        loginData.accessToken,
        loginData.user.tenantSlug,
      );
      if (loginData.user.profile?.languagePreference) {
        useThemeStore
          .getState()
          .setLocale(loginData.user.profile.languagePreference as 'en' | 'ar');
      }

      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('auth.login.unexpectedError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceLogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await apiClient.post<{ data: LoginResponse }>('/api/auth/login', {
        email,
        password,
        forceLogin: true,
      });

      const loginData = result.data;
      setAuth(
        {
          id: loginData.user.id,
          email: loginData.user.email,
          firstName: loginData.user.profile?.firstName?.en || '',
          lastName: loginData.user.profile?.lastName?.en || '',
          role: loginData.user.role,
          languagePreference: loginData.user.profile?.languagePreference,
        },
        loginData.accessToken,
        loginData.user.tenantSlug,
      );
      if (loginData.user.profile?.languagePreference) {
        useThemeStore
          .getState()
          .setLocale(loginData.user.profile.languagePreference as 'en' | 'ar');
      }

      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('auth.login.unexpectedError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await apiClient.post<{ data: LoginResponse }>('/api/auth/2fa/validate', {
        tempToken,
        code: totpCode,
      });

      const loginData = result.data;
      setAuth(
        {
          id: loginData.user.id,
          email: loginData.user.email,
          firstName: loginData.user.profile?.firstName?.en || '',
          lastName: loginData.user.profile?.lastName?.en || '',
          role: loginData.user.role,
          languagePreference: loginData.user.profile?.languagePreference,
        },
        loginData.accessToken,
        loginData.user.tenantSlug,
      );
      if (loginData.user.profile?.languagePreference) {
        useThemeStore
          .getState()
          .setLocale(loginData.user.profile.languagePreference as 'en' | 'ar');
      }

      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('auth.twoFactor.invalidCode'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await apiClient.post<{ data: LoginResponse }>('/api/auth/2fa/recovery', {
        tempToken,
        recoveryCode: recoveryCode.trim(),
      });

      const loginData = result.data;
      setAuth(
        {
          id: loginData.user.id,
          email: loginData.user.email,
          firstName: loginData.user.profile?.firstName?.en || '',
          lastName: loginData.user.profile?.lastName?.en || '',
          role: loginData.user.role,
          languagePreference: loginData.user.profile?.languagePreference,
        },
        loginData.accessToken,
        loginData.user.tenantSlug,
      );
      if (loginData.user.profile?.languagePreference) {
        useThemeStore
          .getState()
          .setLocale(loginData.user.profile.languagePreference as 'en' | 'ar');
      }

      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Invalid recovery code');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASetupVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await apiClient.post<{
        data: LoginResponse & { recoveryCodes: string[] };
      }>('/api/auth/2fa/verify', {
        setupToken,
        token: setupVerifyCode,
      });

      const loginData = result.data;
      // Show recovery codes before completing login
      setRecoveryCodes(loginData.recoveryCodes || []);
      setSetupStep('codes');

      // Store auth data so we can navigate after user acknowledges codes
      setAuth(
        {
          id: loginData.user.id,
          email: loginData.user.email,
          firstName: loginData.user.profile?.firstName?.en || '',
          lastName: loginData.user.profile?.lastName?.en || '',
          role: loginData.user.role,
          languagePreference: loginData.user.profile?.languagePreference,
        },
        loginData.accessToken,
        loginData.user.tenantSlug,
      );
      if (loginData.user.profile?.languagePreference) {
        useThemeStore
          .getState()
          .setLocale(loginData.user.profile.languagePreference as 'en' | 'ar');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Invalid verification code');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── 2FA Setup Screen (first-time enrollment) ───────────────
  if (requires2FASetup) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-500/20">
              <QrCode className="h-8 w-8 text-brand-600 dark:text-brand-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('auth.twoFactorSetup.title')}
            </h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              {t('auth.twoFactorSetup.subtitle')}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {setupStep === 'qr' && (
              <div className="space-y-5">
                {qrCode ? (
                  <div className="flex justify-center">
                    <img src={qrCode} alt="2FA QR Code" className="h-48 w-48 rounded-lg border" />
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center">
                    <svg className="h-8 w-8 animate-spin text-brand-500" viewBox="0 0 24 24">
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
                  </div>
                )}
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  {t('auth.twoFactorSetup.scanInstructions')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSetupStep('verify');
                    setError(null);
                  }}
                  disabled={!qrCode}
                  className="flex h-12 w-full items-center justify-center rounded-lg bg-brand-500 text-sm font-medium text-white transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t('auth.twoFactorSetup.next')}
                </button>
              </div>
            )}

            {setupStep === 'verify' && (
              <form onSubmit={handle2FASetupVerify} className="space-y-5">
                <div>
                  <label
                    htmlFor="setupCode"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    {t('auth.twoFactorSetup.verifyLabel')}
                  </label>
                  <input
                    id="setupCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    required
                    value={setupVerifyCode}
                    onChange={(e) =>
                      setSetupVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    className="h-12 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 text-center text-lg tracking-[0.5em] text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || setupVerifyCode.length !== 6}
                  className="flex h-12 w-full items-center justify-center rounded-lg bg-brand-500 text-sm font-medium text-white transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:cursor-not-allowed disabled:opacity-60"
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
                    t('auth.twoFactorSetup.verify')
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSetupStep('qr');
                    setError(null);
                  }}
                  className="w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  {t('auth.twoFactorSetup.backToQR')}
                </button>
              </form>
            )}

            {setupStep === 'codes' && (
              <div className="space-y-5">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                  <p className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                    {t('auth.twoFactorSetup.saveCodesWarning')}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-lg border bg-gray-50 p-4 dark:bg-gray-800">
                  {recoveryCodes.map((code, i) => (
                    <code
                      key={i}
                      className="text-center text-sm font-mono text-gray-900 dark:text-gray-100"
                    >
                      {code}
                    </code>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/', { replace: true })}
                  className="flex h-12 w-full items-center justify-center rounded-lg bg-brand-500 text-sm font-medium text-white transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                >
                  {t('auth.twoFactorSetup.continue')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Session Conflict Screen ────────────────────────────────
  if (sessionConflict && existingSessionInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
                <Monitor className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('auth.sessionConflict.title', 'Active Session Detected')}
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t(
                  'auth.sessionConflict.description',
                  'You are already logged in on another device. Continuing will end that session.',
                )}
              </p>
            </div>

            <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('auth.sessionConflict.device', 'Device')}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white capitalize">
                    {existingSessionInfo.deviceType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('auth.sessionConflict.browser', 'Browser')}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {existingSessionInfo.browser}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('auth.sessionConflict.os', 'OS')}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {existingSessionInfo.os}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('auth.sessionConflict.lastActive', 'Last Active')}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(existingSessionInfo.lastActivityAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleForceLogin}
                disabled={isLoading}
                className="flex h-12 w-full items-center justify-center rounded-lg bg-brand-500 text-sm font-medium text-white transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:cursor-not-allowed disabled:opacity-60"
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
                  t('auth.sessionConflict.confirm', 'Continue & End Other Session')
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSessionConflict(false);
                  setExistingSessionInfo(null);
                  setError(null);
                }}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {t('auth.sessionConflict.cancel', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 2FA Verification Screen ───────────────────────────────
  if (requires2FA) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-500/20">
              {useRecoveryCode ? (
                <KeyRound className="h-8 w-8 text-brand-600 dark:text-brand-400" />
              ) : (
                <ShieldCheck className="h-8 w-8 text-brand-600 dark:text-brand-400" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {useRecoveryCode ? t('auth.recovery.title') : t('auth.twoFactor.title')}
            </h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              {useRecoveryCode ? t('auth.recovery.subtitle') : t('auth.twoFactor.subtitle')}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {useRecoveryCode ? (
              <form onSubmit={handleRecoverySubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="recovery"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    {t('auth.recovery.label')}
                  </label>
                  <input
                    id="recovery"
                    type="text"
                    placeholder={t('auth.recovery.placeholder')}
                    required
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    className="h-12 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 text-center text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !recoveryCode.trim()}
                  className="flex h-12 w-full items-center justify-center rounded-lg bg-brand-500 text-sm font-medium text-white transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:cursor-not-allowed disabled:opacity-60"
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
                    t('auth.recovery.submit')
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUseRecoveryCode(false);
                    setRecoveryCode('');
                    setError(null);
                  }}
                  className="w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  {t('auth.recovery.backToTotp')}
                </button>
              </form>
            ) : (
              <form onSubmit={handle2FASubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="totp"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    {t('auth.twoFactor.label')}
                  </label>
                  <input
                    id="totp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder={t('auth.twoFactor.placeholder')}
                    required
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-12 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 text-center text-lg tracking-[0.5em] text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || totpCode.length !== 6}
                  className="flex h-12 w-full items-center justify-center rounded-lg bg-brand-500 text-sm font-medium text-white transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:cursor-not-allowed disabled:opacity-60"
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
                    t('auth.twoFactor.verify')
                  )}
                </button>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUseRecoveryCode(true);
                      setTotpCode('');
                      setError(null);
                    }}
                    className="w-full text-center text-sm text-brand-600 hover:text-brand-500 dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    {t('auth.twoFactor.useRecoveryCode')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRequires2FA(false);
                      setTempToken('');
                      setTotpCode('');
                      setError(null);
                    }}
                    className="w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    {t('auth.twoFactor.backToLogin')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Main Login Screen ─────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-500/20">
            <span className="text-3xl">🦷</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('auth.login.welcome')}
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">{t('auth.login.subtitle')}</p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
          {/* Error Banner */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t('auth.login.email')}
              </label>
              <div className="relative">
                <Mail className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  placeholder={t('auth.login.emailPlaceholder')}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full rounded-lg border border-gray-200 bg-gray-50 ps-12 pe-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t('auth.login.password')}
              </label>
              <div className="relative">
                <Lock className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full rounded-lg border border-gray-200 bg-gray-50 ps-12 pe-12 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('auth.login.rememberMe')}
                </span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400"
              >
                {t('auth.login.forgotPassword')}
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex h-12 w-full items-center justify-center rounded-lg bg-brand-500 text-sm font-medium text-white transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:cursor-not-allowed disabled:opacity-60"
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
                t('auth.login.signIn')
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
            <span className="px-4 text-sm text-gray-400">{t('auth.login.or')}</span>
            <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            {t('auth.login.noAccount')}{' '}
            <a
              href="/register"
              className="font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400"
            >
              {t('auth.login.register')}
            </a>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-400">{t('auth.login.copyright')}</p>
      </div>
    </div>
  );
}
