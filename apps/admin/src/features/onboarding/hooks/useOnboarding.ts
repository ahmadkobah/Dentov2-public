/**
 * useOnboarding — React Query mutation for tenant onboarding
 *
 * Per MOCK_DATA_REMOVAL_PLAN.md Step 3.1b
 * POST /api/onboarding — public endpoint, no auth needed.
 *
 * Uses a raw fetch (not apiClient) because there is no access token
 * or tenant slug at the time of onboarding.
 */

import { useMutation } from '@tanstack/react-query';
import { toast } from '@dento/ui';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface OnboardingPayload {
  clinic: {
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
  };
  branch: {
    name: string;
    phone: string;
    email?: string;
    isMainBranch?: boolean;
    workingHours?: {
      day: number;
      startTime: string;
      endTime: string;
      isOpen: boolean;
    }[];
    address: {
      street: string;
      city: string;
      state?: string;
      country: string;
      postalCode?: string;
    };
  };
  admin: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
  };
  settings?: {
    locale?: 'en' | 'ar';
    country?: string;
    currency?: string;
    timezone?: string;
    dateFormat?: string;
    appointmentDuration?: number;
  };
}

export interface OnboardingResult {
  tenant: {
    slug: string;
    name: { en: string; ar?: string };
    status: string;
  };
  user: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface OnboardingResponse {
  success: boolean;
  data: OnboardingResult;
  message?: string;
}

/* ------------------------------------------------------------------ */
/*  API helper (raw fetch — no auth token available)                   */
/* ------------------------------------------------------------------ */

const API_BASE = import.meta.env.VITE_API_URL || '';

async function postOnboarding(payload: OnboardingPayload): Promise<OnboardingResult> {
  const res = await fetch(`${API_BASE}/api/onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = (await res.json()) as OnboardingResponse | { message?: string };

  if (!res.ok) {
    throw new Error((body as { message?: string }).message || 'Onboarding failed');
  }

  return (body as OnboardingResponse).data;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/** Mutation to create a new tenant via the onboarding wizard. */
export function useOnboarding() {
  return useMutation({
    mutationFn: postOnboarding,
    onSuccess: () => {
      toast.success('Clinic created successfully!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create clinic');
    },
  });
}
