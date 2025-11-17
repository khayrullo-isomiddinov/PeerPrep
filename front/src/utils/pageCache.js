/**
 * Global Page Cache System - Instagram/Google-level performance
 * Caches all page data for instant navigation
 */

const pageCache = new Map()
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes
const PREFETCH_DELAY = 100 // ms to wait before prefetching

// Cache structure: { data, timestamp, params }

export function getCachedPage(key, params = {}) {
  const cacheKey = `${key}:${JSON.stringify(params)}`
  const cached = pageCache.get(cacheKey)
  
  if (!cached) return null
  
  const isExpired = Date.now() - cached.timestamp > CACHE_DURATION
  
  // Return cached data even if expired (for instant display)
  return {
    data: cached.data,
    isExpired,
    timestamp: cached.timestamp
  }
}

export function setCachedPage(key, data, params = {}) {
  const cacheKey = `${key}:${JSON.stringify(params)}`
  pageCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    params
  })
}

export function invalidateCache(key) {
  if (!key) {
    pageCache.clear()
    return
  }
  
  // Remove all entries starting with key
  for (const [cacheKey] of pageCache.entries()) {
    if (cacheKey.startsWith(`${key}:`) || cacheKey === key) {
      pageCache.delete(cacheKey)
    }
  }
}

// Prefetch queue to batch requests
const prefetchQueue = new Map()
let prefetchTimer = null

export function prefetchPage(key, fetchFn, params = {}) {
  const cacheKey = `${key}:${JSON.stringify(params)}`
  
  // Already cached and fresh
  const cached = getCachedPage(key, params)
  if (cached && !cached.isExpired) {
    return Promise.resolve(cached.data)
  }
  
  // Already in queue
  if (prefetchQueue.has(cacheKey)) {
    return prefetchQueue.get(cacheKey)
  }
  
  // Add to queue with delay
  const promise = new Promise((resolve) => {
    if (prefetchTimer) {
      clearTimeout(prefetchTimer)
    }
    
    prefetchTimer = setTimeout(async () => {
      try {
        const data = await fetchFn()
        setCachedPage(key, data, params)
        resolve(data)
      } catch (error) {
        console.error(`Prefetch failed for ${key}:`, error)
        resolve(null)
      } finally {
        prefetchQueue.delete(cacheKey)
        if (prefetchQueue.size === 0) {
          prefetchTimer = null
        }
      }
    }, PREFETCH_DELAY)
  })
  
  prefetchQueue.set(cacheKey, promise)
  return promise
}

// Get cache stats (for debugging)
export function getCacheStats() {
  return {
    size: pageCache.size,
    keys: Array.from(pageCache.keys())
  }
}




