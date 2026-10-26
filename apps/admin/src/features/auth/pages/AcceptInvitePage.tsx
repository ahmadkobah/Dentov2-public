import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { acceptInviteSchema } from '@dento/shared';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldAlert,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { apiClient, ApiError } from '../../../lib/api-client.js';
import { useAuthStore } from '../../../stores/auth.store.js';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Types ──────────────────────────────────────────────────

interface VerifyResponse {
  success: true;
  data: {
    email: string;
    firstName: { en: string };
    lastName: { en: string };
    role: string;
  };
}

interface AcceptResponse {
  success: true;
  data: {
    accessToken: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      tenantSlug: string;
    };
  };
}

// ── Password Rules ─────────────────────────────────────────

interface PasswordCheck {
  label: string;
  test: (pw: string) => boolean;
}

const passwordChecks: PasswordCheck[] = [
  { label: 'auth.invite.check.minLength', test: (pw) => pw.length >= 8 },
  { label: 'auth.invite.check.uppercase', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'auth.invite.check.digit', test: (pw) => /[0-9]/.test(pw) },
  { label: 'auth.invite.check.special', test: (pw) => /[^a-zA-Z0-9]/.test(pw) },
];

const ROLE_LABELS: Record<string, string> = {
  tenant_admin: 'auth.role.admin',
  dentist: 'auth.role.dentist',
  receptionist: 'auth.role.receptionist',
  assistant: 'auth.role.assistant',
  accountant: 'auth.role.accountant',
  lab_tech: 'auth.role.labTechnician',
  hygienist: 'auth.role.hygienist',
};

// ── Form Schema ────────────────────────────────────────────

const acceptInviteFormSchema = acceptInviteSchema
  .omit({ token: true })
  .extend({
    confirmPassword: acceptInviteSchema.shape.password,
  })
  .refine(
    (data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword,
    {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    },
  );

type AcceptInviteFormValues = { password: string; confirmPassword: string };

// ── Component ──────────────────────────────────────────────

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { t } = useTranslation();

  // States
  const [verifying, setVerifying] = useState(true);
  const [inviteValid, setInviteValid] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<VerifyResponse['data'] | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Password form (RHF + Zod)
  const form = useForm<AcceptInviteFormValues>({
    resolver: zodFormResolver(acceptInviteFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onChange',
  });

  const watchedPassword = form.watch('password');
  const watchedConfirm = form.watch('confirmPassword');

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setInviteError('No invitation token provided');
      setVerifying(false);
      return;
    }

    apiClient
      .post<VerifyResponse>('/api/auth/verify-invite', { token })
      .then((res) => {
        setInviteData(res.data);
        setInviteValid(true);
      })
      .catch((err) => {
        setInviteError(
          err instanceof ApiError ? err.message : 'Invalid or expired invitation link',
        );
      })
      .finally(() => setVerifying(false));
  }, [token]);

  // Validation
  const allChecksPassing = passwordChecks.every((c) => c.test(watchedPassword));
  const passwordsMatch = watchedPassword === watchedConfirm && watchedPassword.length > 0;
  const canSubmit = allChecksPassing && passwordsMatch && !submitting;

  // Submit handler
  async function onSubmit(values: AcceptInviteFormValues) {
    if (!token) return;

    setSubmitting(true);
    try {
      const res = await apiClient.post<AcceptResponse>('/api/auth/accept-invite', {
        token,
        password: values.password,
      });

      // Auto-login (admin store needs tenantSlug)
      setAuth(res.data.user, res.data.accessToken, res.data.user.tenantSlug);
      navigate('/', { replace: true });
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : t('auth.invite.activateFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading state ────────────────────────────────────────

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-500" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {t('auth.invite.verifying')}
          </p>
        </div>
      </div>
    );
  }

  // ── Invalid / expired token ──────────────────────────────

  if (!inviteValid || inviteError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-md text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/20">
            <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            {t('auth.invite.invalidTitle')}
          </h1>
          <p className="mb-6 text-gray-500 dark:text-gray-400">
            {inviteError ?? t('auth.invite.invalidFallback')}
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400"
          >
            {t('auth.invite.goToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  // ── Accept invite form ───────────────────────────────────

  const roleKey = ROLE_LABELS[inviteData?.role ?? ''];
  const roleDisplay = roleKey ? t(roleKey) : (inviteData?.role ?? '');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-500/20">
            <span className="text-3xl">🦷</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('auth.invite.welcomeName', { name: inviteData?.firstName?.en ?? '' })}
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {t('auth.invite.setPassword', { role: roleDisplay })}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Email (read-only) */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('auth.invite.email')}
              </label>
              <input
                value={inviteData?.email ?? ''}
                disabled
                className="h-12 w-full rounded-lg border border-gray-200 bg-gray-100 px-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t('auth.invite.password')}
              </label>
              <div className="relative">
                <Lock className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.invite.passwordPlaceholder')}
                  {...form.register('password')}
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

              {/* Password strength checks */}
              {watchedPassword.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {passwordChecks.map((check) => {
                    const pass = check.test(watchedPassword);
                    return (
                      <li
                        key={check.label}
                        className={`flex items-center gap-2 text-xs ${
                          pass
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        {pass ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        {t(check.label)}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t('auth.invite.confirmPassword')}
              </label>
              <div className="relative">
                <Lock className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder={t('auth.invite.confirmPlaceholder')}
                  {...form.register('confirmPassword')}
                  className="h-12 w-full rounded-lg border border-gray-200 bg-gray-50 ps-12 pe-12 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute end-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {form.formState.errors.confirmPassword && watchedConfirm.length > 0 && (
                <p className="mt-1 text-xs text-red-500">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Error */}
            {form.formState.errors.root && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {form.formState.errors.root.message}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-500 text-sm font-medium text-white transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              {t('auth.invite.activateBtn')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
