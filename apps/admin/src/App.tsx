import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@dento/ui';
import { Sentry } from './lib/sentry.js';
import { useThemeStore } from './stores/theme.store.js';
import { useLocaleStore } from './stores/locale.store.js';
import { useAuthStore } from './stores/auth.store.js';
import router from './router.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const isRTL = useThemeStore((s) => s.isRTL);
  const locale = useThemeStore((s) => s.locale);

  // Apply persisted locale & direction on mount
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }, [isRTL, locale]);

  // Sync locale store with theme store and load translations
  useEffect(() => {
    const localeStore = useLocaleStore.getState();
    if (localeStore.locale !== locale) {
      localeStore.setLocale(locale);
    }
  }, [locale]);

  useEffect(() => {
    useAuthStore.getState().bootstrap();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Sentry.ErrorBoundary fallback={<SentryFallback />}>
        <RouterProvider router={router} />
      </Sentry.ErrorBoundary>
      <Toaster richColors position="top-right" dir={isRTL ? 'rtl' : 'ltr'} />
    </QueryClientProvider>
  );
}

function SentryFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">
          The error has been reported. Please refresh the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
