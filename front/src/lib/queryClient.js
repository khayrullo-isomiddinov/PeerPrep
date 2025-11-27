import { QueryClient } from '@tanstack/react-query'

// Configure React Query with professional defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 60 seconds - data is fresh for 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes - cache persists for 5 minutes (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus (we handle this manually)
      retry: 1, // Retry failed requests once
      refetchOnMount: true, // Refetch when component mounts if data is stale
    },
  },
})

