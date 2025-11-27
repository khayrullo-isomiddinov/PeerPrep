import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProfile, getUserProfile, updateProfile, getUserBadge, awardPastEventsXP } from '../utils/api'

// Query keys
export const profileKeys = {
  all: ['profile'],
  detail: (userId) => [...profileKeys.all, userId],
  me: () => [...profileKeys.all, 'me'],
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

// Current user profile query
export function useMyProfile(options = {}) {
  return useQuery({
    queryKey: profileKeys.me(),
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000,
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

// Mutations
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      // Update my profile in cache
      queryClient.setQueryData(profileKeys.me(), data)
      // Invalidate badge in case XP changed
      queryClient.invalidateQueries({ queryKey: profileKeys.badge(data.id) })
    },
  })
}

export function useAwardPastEventsXP() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: awardPastEventsXP,
    onSuccess: () => {
      // Invalidate badge to show updated XP
      queryClient.invalidateQueries({ queryKey: profileKeys.badge() })
    },
  })
}

