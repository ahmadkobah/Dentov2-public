import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

/**
 * Per MASTER_PLAN §25 - Tenant Onboarding Wizard
 *
 * 4-Step wizard:
 * 1. Clinic Info (name, phone, email, address)
 * 2. Branch Setup (main branch details)
 * 3. Admin User (first clinic user)
 * 4. Settings (language, currency, timezone)
 */

// ── Step Types ────────────────────────────────────────────

export interface ClinicInfo {
  name: string;
  phone: string;
  email: string;
  website?: string;
  address: {
    street: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
  };
  logo?: File;
}

export interface BranchInfo {
  name: string;
  phone: string;
  email?: string;
  isMainBranch: boolean;
  workingHours: {
    day: number; // 0=Sun, 6=Sat
    startTime: string; // "09:00"
    endTime: string; // "17:00"
    isOpen: boolean;
  }[];
  address: {
    street: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
  };
}

export interface AdminUser {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface ClinicSettings {
  locale: 'en' | 'ar';
  country: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  appointmentDuration: number; // minutes
}

export interface OnboardingState {
  currentStep: number;
  completedSteps: number[];

  // Step data
  clinicInfo: Partial<ClinicInfo>;
  branchInfo: Partial<BranchInfo>;
  adminUser: Partial<AdminUser>;
  settings: Partial<ClinicSettings>;

  // Submission state
  isSubmitting: boolean;
  error: string | null;

  // Actions
  setCurrentStep: (step: number) => void;
  markStepComplete: (step: number) => void;
  updateClinicInfo: (data: Partial<ClinicInfo>) => void;
  updateBranchInfo: (data: Partial<BranchInfo>) => void;
  updateAdminUser: (data: Partial<AdminUser>) => void;
  updateSettings: (data: Partial<ClinicSettings>) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  canProceed: (step: number) => boolean;
  goNext: () => void;
  goPrev: () => void;
}

// ── Default Working Hours (Sun-Thu 9-5, Fri-Sat closed) ───

const defaultWorkingHours = [
  { day: 0, startTime: '09:00', endTime: '17:00', isOpen: true }, // Sunday
  { day: 1, startTime: '09:00', endTime: '17:00', isOpen: true }, // Monday
  { day: 2, startTime: '09:00', endTime: '17:00', isOpen: true }, // Tuesday
  { day: 3, startTime: '09:00', endTime: '17:00', isOpen: true }, // Wednesday
  { day: 4, startTime: '09:00', endTime: '17:00', isOpen: true }, // Thursday
  { day: 5, startTime: '09:00', endTime: '13:00', isOpen: false }, // Friday
  { day: 6, startTime: '09:00', endTime: '13:00', isOpen: false }, // Saturday
];

const initialState = {
  currentStep: 1,
  completedSteps: [],
  clinicInfo: {},
  branchInfo: {
    isMainBranch: true,
    workingHours: defaultWorkingHours,
  },
  adminUser: {},
  settings: {
    locale: 'en' as const,
    country: 'EG',
    currency: 'EGP',
    timezone: 'Africa/Cairo',
    dateFormat: 'DD/MM/YYYY',
    appointmentDuration: 30,
  },
  isSubmitting: false,
  error: null,
};

// ── Zustand Store ─────────────────────────────────────────

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  ...initialState,

  setCurrentStep: (step) => set({ currentStep: step }),

  markStepComplete: (step) =>
    set((state) => ({
      completedSteps: state.completedSteps.includes(step)
        ? state.completedSteps
        : [...state.completedSteps, step],
    })),

  updateClinicInfo: (data) =>
    set((state) => ({
      clinicInfo: { ...state.clinicInfo, ...data },
    })),

  updateBranchInfo: (data) =>
    set((state) => ({
      branchInfo: { ...state.branchInfo, ...data },
    })),

  updateAdminUser: (data) =>
    set((state) => ({
      adminUser: { ...state.adminUser, ...data },
    })),

  updateSettings: (data) =>
    set((state) => ({
      settings: { ...state.settings, ...data },
    })),

  setSubmitting: (isSubmitting) => set({ isSubmitting }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),

  canProceed: (step) => {
    const state = get();

    switch (step) {
      case 1: {
        const { name, phone, email, address } = state.clinicInfo;
        return !!(name && phone && email && address?.street && address?.city && address?.country);
      }
      case 2: {
        const { name, phone, address } = state.branchInfo;
        return !!(name && phone && address?.street && address?.city && address?.country);
      }
      case 3: {
        const { firstName, lastName, email, phone, password, confirmPassword } = state.adminUser;
        return !!(
          firstName &&
          lastName &&
          email &&
          phone &&
          password &&
          confirmPassword &&
          password === confirmPassword &&
          password.length >= 8
        );
      }
      case 4: {
        const { locale, country, currency, timezone } = state.settings;
        return !!(locale && country && currency && timezone);
      }
      default:
        return false;
    }
  },

  goNext: () => {
    const { currentStep } = get();
    if (currentStep < 4) {
      get().markStepComplete(currentStep);
      set({ currentStep: currentStep + 1 });
    }
  },

  goPrev: () => {
    const { currentStep } = get();
    if (currentStep > 1) {
      set({ currentStep: currentStep - 1 });
    }
  },
}));

// ── Helper Hooks ──────────────────────────────────────────

export function useOnboardingStep() {
  return useOnboardingStore(
    useShallow((s) => ({
      step: s.currentStep,
      total: 4,
      isFirst: s.currentStep === 1,
      isLast: s.currentStep === 4,
      canProceed: s.canProceed(s.currentStep),
      goNext: s.goNext,
      goPrev: s.goPrev,
      goTo: s.setCurrentStep,
    })),
  );
}

export function useOnboardingProgress() {
  return useOnboardingStore(
    useShallow((s) => ({
      completed: s.completedSteps,
      percentage: (s.completedSteps.length / 4) * 100,
      isComplete: s.completedSteps.length === 4,
    })),
  );
}
