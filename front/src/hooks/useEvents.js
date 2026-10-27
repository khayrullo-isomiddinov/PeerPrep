import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listEvents, getEvent, getMyEvents, getMyEventsCount, createEvent, updateEvent, deleteEvent, joinEvent, leaveEvent } from '../utils/api'

// Query keys - centralized for consistency.
// Event ids are normalized to strings: route params are strings, API objects have numbers,
// and both must hit the same cache entry.
export const eventKeys = {
  all: ['events'],
  lists: () => [...eventKeys.all, 'list'],
  list: (params) => [...eventKeys.lists(), params],
  details: () => [...eventKeys.all, 'detail'],
  detail: (id) => [...eventKeys.details(), String(id)],
  myEventsAll: () => [...eventKeys.all, 'my-events'],
  myEvents: (params) => [...eventKeys.myEventsAll(), params],
  myEventsCountAll: () => [...eventKeys.all, 'my-events-count'],
  myEventsCount: (params) => [...eventKeys.myEventsCountAll(), params],
}

// The default list shown on /events, shared with prefetching so hovering a link warms the real cache entry
export const DEFAULT_EVENTS_PARAMS = { status: 'upcoming', sort: 'soonest' }

export function useEvents(params = {}, options = {}) {
  return useQuery({
    queryKey: eventKeys.list(params),
    queryFn: ({ signal }) => listEvents(params, { signal }),
    staleTime: 60 * 1000,
    ...options,
  })
}

export function useEvent(id, options = {}) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => getEvent(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    ...options,
  })
}

export function useMyEvents(params = {}, options = {}) {
  return useQuery({
    queryKey: eventKeys.myEvents(params),
    queryFn: () => getMyEvents(params),
    staleTime: 60 * 1000,
    ...options,
  })
}

export function useMyEventsCount(params = {}, options = {}) {
  return useQuery({
    queryKey: eventKeys.myEventsCount(params),
    queryFn: () => getMyEventsCount(params),
    staleTime: 30 * 1000,
    ...options,
  })
}

// Prefetch helpers: call on hover so the page opens instantly
export function usePrefetchEvents() {
  const queryClient = useQueryClient()
  return {
    prefetchEvent: (id) => queryClient.prefetchQuery({
      queryKey: eventKeys.detail(id),
      queryFn: () => getEvent(id),
      staleTime: 30 * 1000,
    }),
    prefetchEventList: (params = DEFAULT_EVENTS_PARAMS) => queryClient.prefetchQuery({
      queryKey: eventKeys.list(params),
      queryFn: () => listEvents(params),
      staleTime: 60 * 1000,
    }),
  }
}

// Patch one event everywhere it's cached (lists, my-events, detail) so the UI updates immediately
function patchEventInCache(queryClient, eventId, patch) {
  const apply = (event) => (String(event?.id) === String(eventId) ? { ...event, ...patch } : event)
  queryClient.setQueriesData({ queryKey: eventKeys.lists() }, (old) => (Array.isArray(old) ? old.map(apply) : old))
  queryClient.setQueriesData({ queryKey: eventKeys.myEventsAll() }, (old) => (Array.isArray(old) ? old.map(apply) : old))
  queryClient.setQueryData(eventKeys.detail(eventId), (old) => (old ? apply(old) : old))
}

// Mutations

export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventKeys.all }),
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => updateEvent(id, data),
    onSuccess: (data, variables) => {
      patchEventInCache(queryClient, variables.id, data)
      queryClient.invalidateQueries({ queryKey: eventKeys.all })
    },
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: (_, eventId) => {
      const remove = (old) => (Array.isArray(old) ? old.filter((e) => String(e.id) !== String(eventId)) : old)
      queryClient.setQueriesData({ queryKey: eventKeys.lists() }, remove)
      queryClient.setQueriesData({ queryKey: eventKeys.myEventsAll() }, remove)
      queryClient.removeQueries({ queryKey: eventKeys.detail(eventId) })
      queryClient.invalidateQueries({ queryKey: eventKeys.all })
    },
  })
}

function useMembershipMutation(mutationFn, isJoined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (result, eventId) => {
      patchEventInCache(queryClient, eventId, {
        is_joined: isJoined,
        ...(result?.attendee_count != null && { attendee_count: result.attendee_count }),
      })
      // Refetch anything derived from membership: my-events, counts, attendees, chat access
      queryClient.invalidateQueries({ queryKey: eventKeys.all })
    },
  })
}

export function useJoinEvent() {
  return useMembershipMutation(joinEvent, true)
}

export function useLeaveEvent() {
  return useMembershipMutation(leaveEvent, false)
}
