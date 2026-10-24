import { QueryClient } from '@tanstack/react-query'

// Configure React Query with professional defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 60 seconds - data is fresh for 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes - cache persists for 5 minutes (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus (we handle this manually)
      // Retry network/server failures once; 4xx errors (not found, forbidden...) won't change on retry
      retry: (failureCount, error) => {
        const status = error?.response?.status
        if (status >= 400 && status < 500) return false
        return failureCount < 1
      },
      refetchOnMount: true, // Refetch when component mounts if data is stale
    },
  },
})

