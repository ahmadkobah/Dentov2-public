/**
 * Subscription feature — Translation keys
 * Source: SubscriptionPage.tsx
 */

export const subscription = {
  page: {
    title: 'Subscription & Billing',
    description: 'Manage your plan and billing',
  },
  currentPlan: 'Current Plan',
  usage: 'Usage',
  modules: 'Modules',
  meters: {
    users: 'Users',
    branches: 'Branches',
    storage: 'Storage',
    modules: 'Modules',
  },
  billingHistory: 'Billing History',
  noBillingHistory: 'No billing history available.',
  errorLoading: 'Failed to load subscription',
} as const;
