import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { acceptInviteSchema } from '@dento/shared';
import { Button, Input, Label, toast } from '@dento/ui';
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, ShieldAlert } from 'lucide-react';
import { apiClient } from '../../../lib/api-client.js';
import { useAuthStore } from '../../../stores/auth.store.js';

// ── Types ──────────────────────────────────────────────────

interface VerifyResponse {
  success: true;
  data: {
    email: string;
    firstName: { en: string };
    lastName: { en: string };
    platformRole: string;
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
      platformRole: 'platform_owner' | 'platform_admin' | 'platform_viewer';
      platformPermissions: string[];
    };
  };
}

// ── Password Rules ─────────────────────────────────────────

interface PasswordCheck {
  label: string;
  test: (pw: string) => boolean;
}

const passwordChecks: PasswordCheck[] = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'One digit', test: (pw) => /[0-9]/.test(pw) },
  { label: 'One special character', test: (pw) => /[^a-zA-Z0-9]/.test(pw) },
];

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

  // States
  const [verifying, setVerifying] = useState(true);
  const [inviteValid, setInviteValid] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<VerifyResponse['data'] | null>(null);

  const [showPassword, setShowPassword] = useState(false);
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
        setInviteError(err instanceof Error ? err.message : 'Invalid or expired invitation link');
      })
      .finally(() => setVerifying(false));
  }, [token]);

  // Password validation
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

      // Auto-login
      setAuth(res.data.user, res.data.accessToken);
      toast.success('Account activated! Welcome to DENTO.');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to activate account');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading state ────────────────────────────────────────

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  // ── Invalid / expired token ──────────────────────────────

  if (!inviteValid || inviteError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Invalid Invitation</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {inviteError ?? 'This invitation link is invalid, expired, or has already been used.'}
          </p>
          <Link to="/login">
            <Button variant="outline" className="mt-6">
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Accept invite form ───────────────────────────────────

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl">🦷</span>
            <span className="text-xl font-bold text-primary">DENTO</span>
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
            Welcome, {inviteData?.firstName?.en}!
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Set your password to activate your{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {inviteData?.platformRole === 'platform_admin' ? 'Admin' : 'Viewer'}
            </span>{' '}
            account.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={inviteData?.email ?? ''}
              disabled
              className="bg-gray-50 dark:bg-gray-700"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                {...form.register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-e-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password strength checks */}
            {watchedPassword.length > 0 && (
              <ul className="mt-2 space-y-1">
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
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {check.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Re-enter your password"
              {...form.register('confirmPassword')}
            />
            {form.formState.errors.confirmPassword && watchedConfirm.length > 0 && (
              <p className="text-xs text-red-500">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full gap-2" disabled={!canSubmit}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Activate Account
          </Button>
        </form>
      </div>
    </div>
  );
}
