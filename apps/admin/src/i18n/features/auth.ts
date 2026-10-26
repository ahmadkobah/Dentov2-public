export const auth = {
  // ── Login Page ──
  'auth.login.welcome': 'Welcome to Dento',
  'auth.login.subtitle': 'Sign in to your dental practice dashboard',
  'auth.login.email': 'Email Address',
  'auth.login.emailPlaceholder': 'doctor@clinic.com',
  'auth.login.password': 'Password',
  'auth.login.rememberMe': 'Remember me',
  'auth.login.forgotPassword': 'Forgot password?',
  'auth.login.signIn': 'Sign In',
  'auth.login.or': 'or',
  'auth.login.noAccount': "Don't have an account?",
  'auth.login.register': 'Register your clinic',
  'auth.login.copyright': '© 2026 Dento. All rights reserved.',
  'auth.login.unexpectedError': 'An unexpected error occurred. Please try again.',

  // 2FA
  'auth.twoFactor.title': 'Two-Factor Authentication',
  'auth.twoFactor.subtitle': 'Enter the 6-digit code from your authenticator app',
  'auth.twoFactor.label': 'Verification Code',
  'auth.twoFactor.placeholder': '000000',
  'auth.twoFactor.verify': 'Verify',
  'auth.twoFactor.backToLogin': 'Back to login',
  'auth.twoFactor.invalidCode': 'Invalid verification code. Please try again.',
  'auth.twoFactor.useRecoveryCode': 'Lost your device? Use a recovery code',

  // 2FA Setup (first-time enrollment)
  'auth.twoFactorSetup.title': 'Set Up Two-Factor Authentication',
  'auth.twoFactorSetup.subtitle':
    'Your organization requires 2FA. Scan the QR code with your authenticator app.',
  'auth.twoFactorSetup.scanInstructions':
    'Scan this QR code with Google Authenticator, Authy, or any TOTP app.',
  'auth.twoFactorSetup.next': "I've Scanned the Code",
  'auth.twoFactorSetup.verifyLabel': 'Enter the 6-digit code from your app',
  'auth.twoFactorSetup.verify': 'Verify & Activate',
  'auth.twoFactorSetup.backToQR': 'Back to QR Code',
  'auth.twoFactorSetup.saveCodesWarning':
    'Save these recovery codes in a safe place. You will need them if you lose access to your authenticator app.',
  'auth.twoFactorSetup.continue': "I've Saved My Codes — Continue",

  // Recovery Code
  'auth.recovery.title': 'Recovery Code',
  'auth.recovery.subtitle': 'Enter one of your recovery codes to sign in.',
  'auth.recovery.label': 'Recovery Code',
  'auth.recovery.placeholder': 'XXXX-XXXX-XXXX',
  'auth.recovery.submit': 'Sign In with Recovery Code',
  'auth.recovery.backToTotp': 'Use authenticator code instead',

  // ── Forgot Password Page ──
  'auth.forgot.title': 'Forgot Password',
  'auth.forgot.subtitle':
    "Enter your email address and we'll send you a link to reset your password.",
  'auth.forgot.email': 'Email Address',
  'auth.forgot.sendLink': 'Send Reset Link',
  'auth.forgot.successTitle': 'Check Your Email',
  'auth.forgot.successDesc':
    "We've sent a password reset link to your email address. Please check your inbox.",
  'auth.forgot.backToLogin': 'Back to Login',

  // ── Reset Password Page ──
  'auth.reset.title': 'Reset Password',
  'auth.reset.subtitle': 'Enter your new password below.',
  'auth.reset.invalidTitle': 'Invalid Reset Link',
  'auth.reset.invalidDesc':
    'This password reset link is invalid or has expired. Please request a new one.',
  'auth.reset.requestNewLink': 'Request New Link',
  'auth.reset.newPassword': 'New Password',
  'auth.reset.confirmPassword': 'Confirm Password',
  'auth.reset.resetBtn': 'Reset Password',
  'auth.reset.successTitle': 'Password Reset Successfully',
  'auth.reset.successDesc':
    'Your password has been reset. You will be redirected to the login page.',
  'auth.reset.goToLogin': 'Go to Login',
  'auth.reset.backToLogin': 'Back to Login',
  'auth.reset.mismatch': 'Passwords do not match.',
  'auth.reset.tooShort': 'Password must be at least 8 characters.',

  // ── Accept Invite Page ──
  'auth.invite.verifying': 'Verifying invitation...',
  'auth.invite.invalidTitle': 'Invalid Invitation',
  'auth.invite.invalidFallback': 'This invitation link is invalid or has expired.',
  'auth.invite.goToLogin': 'Go to Login',
  'auth.invite.welcomeName': 'Welcome, {{name}}!',
  'auth.invite.setPassword': 'Set your password to activate your {{role}} account.',
  'auth.invite.email': 'Email',
  'auth.invite.password': 'Password',
  'auth.invite.passwordPlaceholder': 'Create a strong password',
  'auth.invite.confirmPassword': 'Confirm Password',
  'auth.invite.confirmPlaceholder': 'Re-enter your password',
  'auth.invite.activateBtn': 'Activate Account',
  'auth.invite.activateFailed': 'Failed to activate account',

  // Password checks
  'auth.invite.check.minLength': 'At least 8 characters',
  'auth.invite.check.uppercase': 'One uppercase letter',
  'auth.invite.check.digit': 'One digit',
  'auth.invite.check.special': 'One special character',

  // Role labels
  'auth.role.admin': 'Admin',
  'auth.role.dentist': 'Dentist',
  'auth.role.receptionist': 'Receptionist',
  'auth.role.assistant': 'Assistant',
  'auth.role.accountant': 'Accountant',
  'auth.role.labTechnician': 'Lab Technician',
  'auth.role.hygienist': 'Hygienist',

  // ── Impersonate Page ──
  'auth.impersonate.loading': 'Starting impersonation session…',

  // ── Session Conflict ──
  'auth.sessionConflict.title': 'Active Session Detected',
  'auth.sessionConflict.description':
    'You are already logged in on another device. Continuing will end that session.',
  'auth.sessionConflict.device': 'Device',
  'auth.sessionConflict.browser': 'Browser',
  'auth.sessionConflict.os': 'OS',
  'auth.sessionConflict.lastActive': 'Last Active',
  'auth.sessionConflict.confirm': 'Continue & End Other Session',
  'auth.sessionConflict.cancel': 'Cancel',
} as const;
