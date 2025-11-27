import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listEvents, getEvent, getMyEvents, getMyEventsCount, createEvent, updateEvent, deleteEvent, joinEvent, leaveEvent } from '../utils/api'

// Query keys - centralized for consistency
export const eventKeys = {
  all: ['events'],
  lists: () => [...eventKeys.all, 'list'],
  list: (params) => [...eventKeys.lists(), params],
  details: () => [...eventKeys.all, 'detail'],
  detail: (id) => [...eventKeys.details(), id],
  myEvents: (params) => [...eventKeys.all, 'my-events', params],
  myEventsCount: (params) => [...eventKeys.all, 'my-events-count', params],
}

// Events list query - cached for 60s
export function useEvents(params = {}, options = {}) {
  return useQuery({
    queryKey: eventKeys.list(params),
    queryFn: () => listEvents(params),
    staleTime: 60 * 1000, // 60 seconds
    ...options,
  })
}

// Single event query - cached for 30s
export function useEvent(id, options = {}) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => getEvent(id),
    enabled: !!id, // Only run if id exists
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  })
}

// My events query
export function useMyEvents(params = {}, options = {}) {
  return useQuery({
    queryKey: eventKeys.myEvents(params),
    queryFn: () => getMyEvents(params),
    staleTime: 60 * 1000,
    ...options,
  })
}

// My events count query
export function useMyEventsCount(params = {}, options = {}) {
  return useQuery({
    queryKey: eventKeys.myEventsCount(params),
    queryFn: () => getMyEventsCount(params),
    staleTime: 30 * 1000,
    ...options,
  })
}

// Mutations
export function useCreateEvent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      // Invalidate events lists to refetch
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
      queryClient.invalidateQueries({ queryKey: eventKeys.myEvents() })
    },
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }) => updateEvent(id, data),
    onSuccess: (data, variables) => {
      // Update the specific event in cache
      queryClient.setQueryData(eventKeys.detail(variables.id), data)
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
    },
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: (_, eventId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: eventKeys.detail(eventId) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
      queryClient.invalidateQueries({ queryKey: eventKeys.myEvents() })
    },
  })
}

export function useJoinEvent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: joinEvent,
    onSuccess: (result, eventId) => {
      // Invalidate event detail and lists
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) })
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
      queryClient.invalidateQueries({ queryKey: eventKeys.myEvents() })
    },
  })
}

export function useLeaveEvent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: leaveEvent,
    onSuccess: (result, eventId) => {
      // Invalidate event detail and lists
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) })
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
      queryClient.invalidateQueries({ queryKey: eventKeys.myEvents() })
    },
  })
}

