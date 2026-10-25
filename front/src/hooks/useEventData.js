import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getEventAttendeesWithDetails, getEventMessages, postEventMessage, deleteEventMessage, getEventPresence } from '../utils/api'

// Query keys for event-related data
export const eventDataKeys = {
  attendees: (eventId) => ['events', eventId, 'attendees'],
  messages: (eventId) => ['events', eventId, 'messages'],
  presence: (eventId) => ['events', eventId, 'presence'],
}

// Attendees query - cached for 2 minutes
export function useEventAttendees(eventId, options = {}) {
  return useQuery({
    queryKey: eventDataKeys.attendees(eventId),
    queryFn: () => getEventAttendeesWithDetails(eventId),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  })
}

// Messages query - cached for 1 minute (more dynamic)
export function useEventMessages(eventId, options = {}) {
  return useQuery({
    queryKey: eventDataKeys.messages(eventId),
    queryFn: () => getEventMessages(eventId),
    enabled: !!eventId,
    staleTime: 60 * 1000, // 1 minute
    ...options,
  })
}

// Presence query - cached for 30 seconds (very dynamic)
export function useEventPresence(eventId, options = {}) {
  return useQuery({
    queryKey: eventDataKeys.presence(eventId),
    queryFn: () => getEventPresence(eventId),
    enabled: !!eventId,
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  })
}

// Mutations
export function usePostMessage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ eventId, content }) => postEventMessage(eventId, content),
    onSuccess: (data, variables) => {
      // Invalidate messages to refetch
      queryClient.invalidateQueries({ queryKey: eventDataKeys.messages(variables.eventId) })
    },
  })
}

export function useDeleteMessage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ eventId, messageId }) => deleteEventMessage(eventId, messageId),
    onSuccess: (data, variables) => {
      // Invalidate messages to refetch
      queryClient.invalidateQueries({ queryKey: eventDataKeys.messages(variables.eventId) })
    },
  })
}

