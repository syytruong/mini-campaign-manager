import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s — list views feel "live" without hammering the API
      gcTime: 5 * 60_000, // 5min — cache survives quick navigations
      retry: (failureCount, error) => {
        // Don't retry 4xx — those are deterministic failures
        if (error instanceof Error && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
