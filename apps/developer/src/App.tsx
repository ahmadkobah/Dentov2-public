import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@dento/ui';
import { Sentry } from './lib/sentry.js';
import { useAuthStore } from './stores/auth.store.js';
import router from './router.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  useEffect(() => {
    useAuthStore.getState().bootstrap();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Sentry.ErrorBoundary fallback={<SentryFallback />}>
        <RouterProvider router={router} />
      </Sentry.ErrorBoundary>
      {/* TODO: Sonner doesn't support logical positions (top-end); using physical top-right */}
      <Toaster richColors position="top-right" />
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
          // Intentional: full page reload is the standard recovery for error boundaries
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
