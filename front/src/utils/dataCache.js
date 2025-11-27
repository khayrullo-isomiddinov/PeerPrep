const cache = {
  events: null,
  eventsParams: null,
  eventsTimestamp: null,
  groups: null,
  groupsParams: null,
  groupsTimestamp: null,
  attendees: new Map(), // eventId -> { data, timestamp }
  messages: new Map(), // eventId -> { data, timestamp }
  badges: new Map(), // userId -> { data, timestamp }
  presence: new Map(), // eventId -> { data, timestamp }
  CACHE_DURATION: 10 * 60 * 1000, // 10 minutes for events/groups
  SHORT_CACHE_DURATION: 2 * 60 * 1000, // 2 minutes for dynamic data (attendees, messages, presence)
  BADGE_CACHE_DURATION: 5 * 60 * 1000, // 5 minutes for badges
}

export function getCachedEvents(params) {
  const paramsKey = JSON.stringify(params || {})
  
  if (
    cache.events &&
    cache.eventsParams === paramsKey &&
    cache.eventsTimestamp &&
    Date.now() - cache.eventsTimestamp < cache.CACHE_DURATION
  ) {
    return cache.events
  }
  
  return null
}

export function setCachedEvents(events, params) {
  cache.events = events
  cache.eventsParams = JSON.stringify(params || {})
  cache.eventsTimestamp = Date.now()
}

export function getCachedGroups(params) {
  const paramsKey = JSON.stringify(params || {})
  
  if (
    cache.groups &&
    cache.groupsParams === paramsKey &&
    cache.groupsTimestamp &&
    Date.now() - cache.groupsTimestamp < cache.CACHE_DURATION
  ) {
    return cache.groups
  }
  return cache.groups && cache.groupsParams === paramsKey ? cache.groups : null
}

export function setCachedGroups(groups, params) {
  cache.groups = groups
  cache.groupsParams = JSON.stringify(params || {})
  cache.groupsTimestamp = Date.now()
}

// Attendees caching
export function getCachedAttendees(eventId) {
  const cached = cache.attendees.get(eventId)
  if (cached && Date.now() - cached.timestamp < cache.SHORT_CACHE_DURATION) {
    return cached.data
  }
  return null
}

export function setCachedAttendees(eventId, attendees) {
  cache.attendees.set(eventId, {
    data: attendees,
    timestamp: Date.now()
  })
}

// Messages caching
export function getCachedMessages(eventId) {
  const cached = cache.messages.get(eventId)
  if (cached && Date.now() - cached.timestamp < cache.SHORT_CACHE_DURATION) {
    return cached.data
  }
  return null
}

export function setCachedMessages(eventId, messages) {
  cache.messages.set(eventId, {
    data: messages,
    timestamp: Date.now()
  })
}

// Badges caching
export function getCachedBadge(userId) {
  const cached = cache.badges.get(userId)
  if (cached && Date.now() - cached.timestamp < cache.BADGE_CACHE_DURATION) {
    return cached.data
  }
  return null
}

export function setCachedBadge(userId, badge) {
  cache.badges.set(userId, {
    data: badge,
    timestamp: Date.now()
  })
}

// Presence caching
export function getCachedPresence(eventId) {
  const cached = cache.presence.get(eventId)
  if (cached && Date.now() - cached.timestamp < cache.SHORT_CACHE_DURATION) {
    return cached.data
  }
  return null
}

export function setCachedPresence(eventId, presence) {
  cache.presence.set(eventId, {
    data: presence,
    timestamp: Date.now()
  })
}

// Cache invalidation helpers
export function invalidateEventCache(eventId) {
  cache.attendees.delete(eventId)
  cache.messages.delete(eventId)
  cache.presence.delete(eventId)
}

export function invalidateBadgeCache(userId) {
  cache.badges.delete(userId)
}
