import { useState, useEffect } from 'react';
import { PageHeader, Button, Input, Label, Separator, PhoneInput, toast } from '@dento/ui';
import { useTenantCountry } from '@/hooks/useTenantCountry.js';
import { useSupportedLanguages } from '@/hooks/useSupportedLanguages.js';
import { useThemeStore } from '@/stores/theme.store.js';
import { useAuthStore } from '@/stores/auth.store.js';
import {
  User,
  Mail,
  Phone,
  Shield,
  Clock,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Save,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldOff,
  KeyRound,
  Copy,
} from 'lucide-react';
import {
  useMyProfile,
  useUpdateMyProfile,
  useChangePassword,
  use2FAStatus,
  useSetup2FA,
  useVerify2FA,
  useDisable2FA,
  useRegenerateRecoveryCodes,
} from '../hooks/useProfile.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDateTime } from '@/lib/date.js';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return formatDateTime(iso);
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const tenantCountry = useTenantCountry();
  const { supportedLanguages, isMultiLang } = useSupportedLanguages();
  const { data: profile, isLoading, isError } = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const changePassword = useChangePassword();

  const [firstName, setFirstName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [bio, setBio] = useState('');
  const [languagePreference, setLanguagePreference] = useState('en');

  // ── 2FA state ───────────────────────────────────────────
  const tfaStatus = use2FAStatus();
  const setup2FA = useSetup2FA();
  const verify2FA = useVerify2FA();
  const disable2FA = useDisable2FA();
  const regenerateCodes = useRegenerateRecoveryCodes();

  const [tfaStep, setTfaStep] = useState<'idle' | 'qr' | 'codes'>('idle');
  const [tfaCode, setTfaCode] = useState('');
  const [tfaRecoveryCodes, setTfaRecoveryCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.profile?.firstName?.en ?? '');
      setLastName(profile.profile?.lastName?.en ?? '');
      setDisplayName(profile.profile?.displayName ?? '');
      setPhone(profile.profile?.phone ?? '');
      setGender(profile.profile?.gender ?? '');
      setBio(profile.profile?.bio?.en ?? '');
      setLanguagePreference(profile.profile?.languagePreference ?? 'en');
    }
  }, [profile]);

  async function handleSave() {
    try {
      await updateProfile.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: displayName.trim() || undefined,
        phone: phone.trim() || undefined,
        gender: gender || undefined,
        bio: bio.trim() || undefined,
        languagePreference,
      });
      // Sync locale and auth store
      useThemeStore.getState().setLocale(languagePreference as 'en' | 'ar');
      useAuthStore.setState((s) => ({
        user: s.user ? { ...s.user, languagePreference } : s.user,
      }));
    } catch {
      // toast handled by hook
    }
  }

  function handleChangePassword() {
    setPasswordError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPasswordError('');
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <p className="text-gray-500">{t('profile.loadFailed')}</p>
      </div>
    );
  }

  const fullName =
    [profile.profile?.firstName?.en, profile.profile?.lastName?.en].filter(Boolean).join(' ') ||
    profile.email;

  return (
    <div className="space-y-6">
      <PageHeader title={t('profile.title')} description={t('profile.subtitle')} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left: Info Card ─────────────────────────── */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                {(profile.profile?.firstName?.en?.[0] ?? '').toUpperCase()}
                {(profile.profile?.lastName?.en?.[0] ?? '').toUpperCase()}
              </div>
              <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
                {fullName}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700 capitalize dark:bg-brand-500/20 dark:text-brand-400">
                <Shield className="h-3 w-3" />
                {profile.role?.replace('_', ' ')}
              </span>
            </div>

            <Separator className="my-4" />

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{profile.email}</span>
                {profile.isEmailVerified && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                )}
              </div>
              {profile.profile?.phone && (
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{profile.profile.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Last login: {formatDate(profile.lastLoginAt)}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <User className="h-4 w-4 shrink-0" />
                <span>Joined: {formatDate(profile.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Edit Form ────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('profile.edit.title')}
            </h3>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
              {t('profile.edit.subtitle')}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="profile-first-name">{t('profile.edit.firstName')}</Label>
                <Input
                  id="profile-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-last-name">{t('profile.edit.lastName')}</Label>
                <Input
                  id="profile-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-display-name">{t('profile.edit.displayName')}</Label>
                <Input
                  id="profile-display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Optional display name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-phone">{t('profile.edit.phone')}</Label>
                <PhoneInput
                  value={phone}
                  onChange={(v) => setPhone(v)}
                  defaultCountry={tenantCountry}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-gender">{t('profile.edit.gender')}</Label>
                <select
                  id="profile-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:ring-offset-gray-900"
                >
                  <option value="">{t('profile.edit.genderPreferNot')}</option>
                  <option value="male">{t('profile.edit.genderMale')}</option>
                  <option value="female">{t('profile.edit.genderFemale')}</option>
                  <option value="other">{t('profile.edit.genderOther')}</option>
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="profile-bio">{t('profile.edit.bio')}</Label>
                <textarea
                  id="profile-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short bio about yourself"
                  rows={3}
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:ring-offset-gray-900"
                />
              </div>
              {isMultiLang && (
                <div className="space-y-1.5">
                  <Label htmlFor="profile-language">{t('profile.edit.languagePreference')}</Label>
                  <select
                    id="profile-language"
                    value={languagePreference}
                    onChange={(e) => setLanguagePreference(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:ring-offset-gray-900"
                  >
                    {supportedLanguages.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang === 'en' ? 'English' : lang === 'ar' ? 'العربية (Arabic)' : lang}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end rtl:justify-start">
              <Button className="gap-2" onClick={handleSave} disabled={updateProfile.isPending}>
                <Save className="h-4 w-4" />
                {updateProfile.isPending ? t('profile.edit.saving') : t('profile.edit.save')}
              </Button>
            </div>
          </div>

          {/* ── Change Password ─────────────────────── */}
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('profile.password.title')}
            </h3>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
              {t('profile.password.subtitle')}
            </p>

            {passwordError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {passwordError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="current-password">{t('profile.password.current')}</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="ps-10 pe-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">{t('profile.password.new')}</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="ps-10 pe-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">{t('profile.password.confirm')}</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="ps-10 pe-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end rtl:justify-start">
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleChangePassword}
                disabled={changePassword.isPending}
              >
                <Lock className="h-4 w-4" />
                {changePassword.isPending
                  ? t('profile.password.changing')
                  : t('profile.password.change')}
              </Button>
            </div>
          </div>

          {/* ── Two-Factor Authentication ───────────── */}
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('profile.twoFactor.title')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('profile.twoFactor.subtitle')}
                </p>
              </div>
              {tfaStatus.data && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                    tfaStatus.data.enabled
                      ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {tfaStatus.data.enabled ? (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldOff className="h-3.5 w-3.5" />
                  )}
                  {tfaStatus.data.enabled
                    ? t('profile.twoFactor.enabled')
                    : t('profile.twoFactor.disabled')}
                </span>
              )}
            </div>

            <Separator className="my-4" />

            {tfaStatus.isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : tfaStatus.data?.enabled ? (
              /* ─── 2FA Enabled State ─── */
              <div className="space-y-4">
                {/* Regenerate codes */}
                {tfaStep === 'codes' && tfaRecoveryCodes.length > 0 ? (
                  <div className="rounded-lg border border-warning-200 bg-warning-50 p-4 dark:border-warning-800 dark:bg-warning-900/20">
                    <p className="mb-3 text-sm font-medium text-warning-800 dark:text-warning-300">
                      {t('profile.twoFactor.saveCodesWarning')}
                    </p>
                    <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                      {tfaRecoveryCodes.map((code) => (
                        <div
                          key={code}
                          className="rounded bg-white px-3 py-1.5 text-center dark:bg-gray-800"
                        >
                          {code}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(tfaRecoveryCodes.join('\n'));
                          toast.success('Codes copied');
                        }}
                      >
                        <Copy className="me-1.5 h-3.5 w-3.5" />
                        {t('profile.twoFactor.copyCodes')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTfaStep('idle');
                          setTfaRecoveryCodes([]);
                        }}
                      >
                        {t('profile.twoFactor.done')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={regenerateCodes.isPending}
                      onClick={() =>
                        regenerateCodes.mutate(undefined, {
                          onSuccess: (res) => {
                            setTfaRecoveryCodes(res.data?.recoveryCodes ?? []);
                            setTfaStep('codes');
                          },
                        })
                      }
                    >
                      <KeyRound className="me-1.5 h-4 w-4" />
                      {regenerateCodes.isPending
                        ? t('profile.twoFactor.regenerating')
                        : t('profile.twoFactor.regenerateCodes')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDisableConfirm(true)}
                    >
                      <ShieldOff className="me-1.5 h-4 w-4" />
                      {t('profile.twoFactor.disable')}
                    </Button>
                  </div>
                )}

                {/* Disable confirm */}
                {showDisableConfirm && (
                  <div className="rounded-lg border border-error-200 bg-error-50 p-4 dark:border-error-800 dark:bg-error-900/20">
                    <p className="mb-3 text-sm text-error-700 dark:text-error-400">
                      {t('profile.twoFactor.disableConfirm')}
                    </p>
                    <div className="flex items-end gap-3">
                      <div className="flex-1 space-y-1.5">
                        <Label htmlFor="disable-2fa-pw">{t('profile.password.current')}</Label>
                        <Input
                          id="disable-2fa-pw"
                          type="password"
                          value={disablePassword}
                          onChange={(e) => setDisablePassword(e.target.value)}
                          placeholder="Enter your password"
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={!disablePassword || disable2FA.isPending}
                        onClick={() =>
                          disable2FA.mutate(disablePassword, {
                            onSuccess: () => {
                              setShowDisableConfirm(false);
                              setDisablePassword('');
                            },
                          })
                        }
                      >
                        {disable2FA.isPending ? (
                          <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
                        ) : null}
                        {t('profile.twoFactor.confirmDisable')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowDisableConfirm(false);
                          setDisablePassword('');
                        }}
                      >
                        {t('profile.twoFactor.cancel')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ─── 2FA Disabled — Setup Flow ─── */
              <div className="space-y-4">
                {tfaStep === 'idle' && (
                  <div>
                    <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                      {t('profile.twoFactor.description')}
                    </p>
                    <Button
                      size="sm"
                      disabled={setup2FA.isPending}
                      onClick={() =>
                        setup2FA.mutate(undefined, {
                          onSuccess: () => setTfaStep('qr'),
                        })
                      }
                    >
                      <ShieldCheck className="me-1.5 h-4 w-4" />
                      {setup2FA.isPending
                        ? t('profile.twoFactor.settingUp')
                        : t('profile.twoFactor.enable')}
                    </Button>
                  </div>
                )}

                {tfaStep === 'qr' && setup2FA.data && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('profile.twoFactor.scanQR')}
                    </p>
                    <div className="flex justify-center rounded-lg bg-white p-4 dark:bg-gray-800">
                      <img
                        src={setup2FA.data.data.qrCode}
                        alt="2FA QR Code"
                        className="h-48 w-48"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="tfa-verify-code">{t('profile.twoFactor.verifyCode')}</Label>
                      <div className="flex gap-3">
                        <Input
                          id="tfa-verify-code"
                          value={tfaCode}
                          onChange={(e) =>
                            setTfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                          }
                          placeholder="000000"
                          className="w-40 font-mono tracking-widest"
                          maxLength={6}
                        />
                        <Button
                          size="sm"
                          disabled={tfaCode.length !== 6 || verify2FA.isPending}
                          onClick={() =>
                            verify2FA.mutate(tfaCode, {
                              onSuccess: (res) => {
                                setTfaRecoveryCodes(res.data?.recoveryCodes ?? []);
                                setTfaStep('codes');
                                setTfaCode('');
                              },
                            })
                          }
                        >
                          {verify2FA.isPending ? (
                            <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
                          ) : null}
                          {t('profile.twoFactor.verify')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTfaStep('idle');
                            setTfaCode('');
                          }}
                        >
                          {t('profile.twoFactor.cancel')}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {tfaStep === 'codes' && tfaRecoveryCodes.length > 0 && (
                  <div className="rounded-lg border border-warning-200 bg-warning-50 p-4 dark:border-warning-800 dark:bg-warning-900/20">
                    <p className="mb-3 text-sm font-medium text-warning-800 dark:text-warning-300">
                      {t('profile.twoFactor.saveCodesWarning')}
                    </p>
                    <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                      {tfaRecoveryCodes.map((code) => (
                        <div
                          key={code}
                          className="rounded bg-white px-3 py-1.5 text-center dark:bg-gray-800"
                        >
                          {code}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(tfaRecoveryCodes.join('\n'));
                          toast.success('Codes copied');
                        }}
                      >
                        <Copy className="me-1.5 h-3.5 w-3.5" />
                        {t('profile.twoFactor.copyCodes')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTfaStep('idle');
                          setTfaRecoveryCodes([]);
                        }}
                      >
                        {t('profile.twoFactor.done')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Account Info (read-only) */}
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('profile.account.title')}
            </h3>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {t('profile.account.subtitle')}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Email</span>
                <p className="font-medium text-gray-900 dark:text-white">{profile.email}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Role</span>
                <p className="font-medium capitalize text-gray-900 dark:text-white">
                  {profile.role?.replace('_', ' ')}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Tenant</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {profile.tenantSlug ?? '—'}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Profile Complete</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {profile.isProfileComplete ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
