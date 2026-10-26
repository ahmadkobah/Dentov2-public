/**
 * Users feature — Translation keys
 * Sources: UserListPage.tsx, RolePermissionsPanel.tsx
 */

export const users = {
  // ── Page-level ────────────────────────────────────────
  page: {
    title: 'Staff Management',
    description: 'Invite and manage clinic staff members',
    inviteUser: 'Invite User',
  },

  // ── Tabs ──────────────────────────────────────────────
  tabs: {
    staff: 'Staff',
    permissions: 'Permissions',
  },

  // ── Roles ─────────────────────────────────────────────
  roles: {
    admin: 'Admin',
    dentist: 'Dentist',
    receptionist: 'Receptionist',
    assistant: 'Assistant',
    accountant: 'Accountant',
    labTech: 'Lab Tech',
    hygienist: 'Hygienist',
  },

  // ── Table columns ─────────────────────────────────────
  columns: {
    user: 'User',
    role: 'Role',
    status: 'Status',
    twoFa: '2FA',
    lastLogin: 'Last Login',
  },

  // ── 2FA badges ────────────────────────────────────────
  twoFaBadges: {
    enabled: 'Enabled',
    off: 'Off',
    never: 'Never',
  },

  // ── Dropdown actions ──────────────────────────────────
  actions: {
    editProfile: 'Edit Profile',
    setPassword: 'Set Password',
    sendPasswordReset: 'Send Password Reset',
    disableTwoFa: 'Disable 2FA',
    suspend: 'Suspend',
    deactivate: 'Deactivate',
    reactivate: 'Reactivate',
    unlock: 'Unlock account',
    revokeSessions: 'Revoke Sessions',
  },

  // ── Filters ───────────────────────────────────────────
  filters: {
    searchPlaceholder: 'Search by name, email...',
    allRoles: 'All Roles',
    allStatuses: 'All Statuses',
    active: 'Active',
    invited: 'Invited',
    pending: 'Pending',
    suspended: 'Suspended',
    deactivated: 'Deactivated',
    locked: 'Locked',
  },

  // ── Empty state ───────────────────────────────────────
  empty: {
    title: 'No staff members found',
    description: 'Invite your first team member to get started.',
  },

  // ── Invite dialog ─────────────────────────────────────
  invite: {
    title: 'Invite Staff Member',
    description: 'Send an invitation email. The user will set their password upon activation.',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone (optional)',
    role: 'Role',
    cancel: 'Cancel',
    send: 'Send Invitation',
    sendInvitation: 'Send Invitation',
  },

  // ── Action confirmation dialogs ───────────────────────
  confirmations: {
    suspendTitle: 'Suspend user?',
    suspendDescription: 'The user will be temporarily locked out of the system.',
    deactivateTitle: 'Deactivate user?',
    deactivateDescription: 'The user will lose all access and their sessions will be revoked.',
    reactivateTitle: 'Reactivate user?',
    reactivateDescription: 'The user will regain access with their previous role and permissions.',
    unlockTitle: 'Unlock user account?',
    unlockDescription:
      ' was locked after too many failed login attempts. Unlocking restores access immediately.',
    revokeSessionsTitle: 'Revoke all sessions?',
    revokeSessionsDescription: 'All active sessions for this user will be terminated immediately.',
  },

  // ── Edit dialog ───────────────────────────────────────
  edit: {
    title: 'Edit User',
    description: 'Update profile information for',
    firstNameEn: 'First Name (EN)',
    lastNameEn: 'Last Name (EN)',
    firstNameAr: 'First Name (AR)',
    lastNameAr: 'Last Name (AR)',
    phone: 'Phone',
    gender: 'Gender',
    genderNotSet: 'Not set',
    genderMale: 'Male',
    genderFemale: 'Female',
    genderOther: 'Other',
    role: 'Role',
    email: 'Email',
    emailUnverifiedWarning: 'Changing email will mark it as unverified',
    status: 'Status',
    twoFa: '2FA',
    emailVerified: 'Email Verified',
    phoneVerified: 'Phone Verified',
    yes: 'Yes',
    markVerified: 'Mark Verified',
    noPhone: 'No phone',
    lastLogin: 'Last Login',
    save: 'Save Changes',
  },

  // ── Set Password dialog ───────────────────────────────
  setPassword: {
    title: 'Set Password',
    description: 'Set a new password for',
    newPassword: 'New Password',
    placeholder: 'Min 8 chars, uppercase, lowercase, number',
    minChars: 'At least 8 characters',
    uppercase: 'Uppercase letter',
    lowercase: 'Lowercase letter',
    number: 'Number',
  },

  // ── Invite Link dialog ────────────────────────────────
  inviteLink: {
    title: 'Invitation Sent',
    description: 'An invitation email has been sent. You can also share this link directly:',
    expiry: 'This link expires in 7 days. The user will set their password when they accept.',
  },

  // ── Common ────────────────────────────────────────────
  common: {
    cancel: 'Cancel',
    confirm: 'Confirm',
    done: 'Done',
  },

  // ── Error ─────────────────────────────────────────────
  error: {
    loadFailed: 'Failed to load staff',
  },

  // ── Toasts ────────────────────────────────────────────
  toast: {
    invitationSent: 'Invitation sent successfully',
    inviteFailed: 'Failed to invite user',
    userSuspended: 'User suspended',
    userDeactivated: 'User deactivated',
    userReactivated: 'User reactivated',
    userUnlocked: 'User account unlocked',
    sessionsRevoked: 'All sessions revoked',
    userUpdated: 'User updated successfully',
    updateFailed: 'Failed to update user',
    passwordSet: 'Password set successfully',
    passwordSetFailed: 'Failed to set password',
    passwordResetSent: 'Password reset email sent',
    passwordResetFailed: 'Failed to send reset email',
    twoFaDisabled: '2FA disabled',
    twoFaDisableFailed: 'Failed to disable 2FA',
    actionFailed: 'Action failed',
    emailVerified: 'Email marked as verified',
    emailVerifyFailed: 'Failed to verify email',
    phoneVerified: 'Phone marked as verified',
    phoneVerifyFailed: 'Failed to verify phone',
    linkCopied: 'Link copied to clipboard',
  },

  // ── Role Permissions Panel ────────────────────────────
  permissions: {
    title: 'Role Permissions',
    editing: 'Editing',
    edit: 'Edit',
    resetToDefaults: 'Reset to Defaults',
    cancel: 'Cancel',
    save: 'Save',

    // Module group labels
    groups: {
      core: 'Core',
      clinical: 'Clinical',
      medical: 'Medical',
      financial: 'Financial',
      operations: 'Operations',
      system: 'System',
    },

    // Module labels used in RBAC matrix
    modules: {
      dashboard: 'Dashboard',
      dailyOperations: 'Daily Operations',
      patients: 'Patients',
      appointments: 'Appointments',
      dentalCharts: 'Dental Charts',
      treatmentPlans: 'Treatment Plans',
      procedureNotes: 'Procedure Notes',
      prescriptions: 'Prescriptions',
      xrays: 'X-Rays',
      cbct: 'CBCT',
      labOrders: 'Lab Orders',
      consentForms: 'Consent Forms',
      invoices: 'Invoices',
      payments: 'Payments',
      insurance: 'Insurance',
      installments: 'Installments',
      commissions: 'Commissions',
      inventory: 'Inventory',
      branches: 'Branches',
      staffUsers: 'Staff / Users',
      doctors: 'Doctors',
      schedules: 'Schedules',
      leave: 'Leave',
      attendance: 'Attendance',
      reports: 'Reports',
      notifications: 'Notifications',
      webhooks: 'Webhooks',
      settings: 'Settings',
    },

    // CRUD labels
    crud: {
      read: 'Read',
      create: 'Create',
      update: 'Update',
      delete: 'Delete',
    },

    viewHint: 'View the permissions for each role. Click Edit to modify.',
    editHint: 'Click on any permission to toggle it on or off. Save when done.',
    defaultsOnly: 'Viewing system defaults only. Select a tenant context to edit permissions.',
    noTenantContext: 'Viewing system defaults only. Select a tenant context to edit permissions.',
    loadFailed: 'Failed to load permissions',
    errorLoading: 'Failed to load permissions:',
    unknownError: 'Unknown error',
    module: 'Module',
  },
} as const;
