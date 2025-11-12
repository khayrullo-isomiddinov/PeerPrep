const cache = {
  events: null,
  eventsParams: null,
  eventsTimestamp: null,
  groups: null,
  groupsParams: null,
  groupsTimestamp: null,
  CACHE_DURATION: 5 * 60 * 1000,
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
  
  return null
}

export function setCachedGroups(groups, params) {
  cache.groups = groups
  cache.groupsParams = JSON.stringify(params || {})
  cache.groupsTimestamp = Date.now()
}

export function clearCache() {
  cache.events = null
  cache.eventsParams = null
  cache.eventsTimestamp = null
  cache.groups = null
  cache.groupsParams = null
  cache.groupsTimestamp = null
}



