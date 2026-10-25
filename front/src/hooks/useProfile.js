import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUserProfile, updateProfile, getUserBadge, awardPastEventsXP } from '../utils/api'

// Query keys
export const profileKeys = {
  all: ['profile'],
  detail: (userId) => [...profileKeys.all, userId],
  badge: (userId) => [...profileKeys.all, userId, 'badge'],
}

// User profile query - cached for 5 minutes
export function useUserProfile(userId, options = {}) {
  return useQuery({
    queryKey: profileKeys.detail(userId),
    queryFn: () => getUserProfile(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

// User badge query - cached for 5 minutes
export function useUserBadge(userId, options = {}) {
  return useQuery({
    queryKey: profileKeys.badge(userId),
    queryFn: () => getUserBadge(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

// Prefetch on hover so profile pages open instantly. Your own profile reads you from auth,
// so only the badge needs warming; other people's profiles also need their user details.
export function usePrefetchProfile() {
  const queryClient = useQueryClient()
  return (userId, { own = false } = {}) => {
    if (!userId) return
    if (!own) {
      queryClient.prefetchQuery({
        queryKey: profileKeys.detail(userId),
        queryFn: () => getUserProfile(userId),
        staleTime: 5 * 60 * 1000,
      })
    }
    queryClient.prefetchQuery({
      queryKey: profileKeys.badge(userId),
      queryFn: () => getUserBadge(userId),
      staleTime: 5 * 60 * 1000,
    })
  }
}

// Mutations
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      // Invalidate badge in case XP changed
      queryClient.invalidateQueries({ queryKey: profileKeys.badge(data.id) })
    },
  })
}

export function useAwardPastEventsXP() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: awardPastEventsXP,
    onSuccess: (data) => {
      // Refresh badges to show updated XP (only if any was actually awarded)
      if (data?.total_xp_awarded) {
        queryClient.invalidateQueries({ queryKey: profileKeys.all })
      }
    },
  })
}

