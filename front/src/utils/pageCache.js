const pageCache = new Map()
const CACHE_DURATION = 15 * 60 * 1000 
const PREFETCH_DELAY = 100 

export function getCachedPage(key, params = {}) {
  const cacheKey = `${key}:${JSON.stringify(params)}`
  const cached = pageCache.get(cacheKey)
  
  if (!cached) return null
  const isExpired = Date.now() - cached.timestamp > CACHE_DURATION
  
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
  
  for (const [cacheKey] of pageCache.entries()) {
    if (cacheKey.startsWith(`${key}:`) || cacheKey === key) {
      pageCache.delete(cacheKey)
    }
  }
}

const prefetchQueue = new Map()
let prefetchTimer = null

export function prefetchPage(key, fetchFn, params = {}) {
  const cacheKey = `${key}:${JSON.stringify(params)}`
  const cached = getCachedPage(key, params)
  if (cached && !cached.isExpired) {
    return Promise.resolve(cached.data)
  }
  if (prefetchQueue.has(cacheKey)) {
    return prefetchQueue.get(cacheKey)
  }
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

export function getCacheStats() {
  return {
    size: pageCache.size,
    keys: Array.from(pageCache.keys())
  }
}




