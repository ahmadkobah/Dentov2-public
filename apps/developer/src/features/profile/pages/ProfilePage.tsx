import { useState, useEffect } from 'react';
import { Button, Input, Label, Separator } from '@dento/ui';
import {
  User,
  Mail,
  Shield,
  Clock,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Save,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useMyProfile, useUpdateMyProfile, useChangePassword } from '../hooks/useProfile.js';
import { formatDateFull as formatDate } from '../../../lib/date.js';

export default function ProfilePage() {
  const { data: profile, isLoading, isError } = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const changePassword = useChangePassword();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (profile) {
      setFirstName(profile.profile?.firstName?.en ?? '');
      setLastName(profile.profile?.lastName?.en ?? '');
      setDisplayName(profile.profile?.displayName ?? '');
      setPhone(profile.profile?.phone ?? '');
      setBio(profile.profile?.bio?.en ?? '');
    }
  }, [profile]);

  async function handleSave() {
    try {
      await updateProfile.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: displayName.trim() || undefined,
        phone: phone.trim() || undefined,
        bio: bio.trim() || undefined,
      });
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
        <p className="text-gray-500">Failed to load profile.</p>
      </div>
    );
  }

  const fullName =
    [profile.profile?.firstName?.en, profile.profile?.lastName?.en].filter(Boolean).join(' ') ||
    profile.email;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          View and update your account information
        </p>
      </div>

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
                {(profile.platformRole || profile.role)?.replace(/_/g, ' ')}
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
                  <User className="h-4 w-4 shrink-0" />
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

        {/* ── Right: Edit Form + Password ─────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit Profile */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Profile</h3>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
              Update your personal information
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="profile-first-name">First Name</Label>
                <Input
                  id="profile-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-last-name">Last Name</Label>
                <Input
                  id="profile-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-display-name">Display Name</Label>
                <Input
                  id="profile-display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Optional display name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-phone">Phone</Label>
                <Input
                  id="profile-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="profile-bio">Bio</Label>
                <textarea
                  id="profile-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short bio about yourself"
                  rows={3}
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:ring-offset-gray-900"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button className="gap-2" onClick={handleSave} disabled={updateProfile.isPending}>
                <Save className="h-4 w-4" />
                {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>

          {/* Change Password */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h3>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
              Enter your current password and choose a new one
            </p>

            {passwordError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {passwordError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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

            <div className="mt-6 flex justify-end">
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleChangePassword}
                disabled={changePassword.isPending}
              >
                <Lock className="h-4 w-4" />
                {changePassword.isPending ? 'Changing…' : 'Change Password'}
              </Button>
            </div>
          </div>

          {/* Account Info (read-only) */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Account Information
            </h3>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              These details are managed by your organization
            </p>
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Email</span>
                <p className="font-medium text-gray-900 dark:text-white">{profile.email}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Platform Role</span>
                <p className="font-medium capitalize text-gray-900 dark:text-white">
                  {(profile.platformRole || profile.role)?.replace(/_/g, ' ')}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Status</span>
                <p className="font-medium capitalize text-gray-900 dark:text-white">
                  {profile.status}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Email Verified</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {profile.isEmailVerified ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
