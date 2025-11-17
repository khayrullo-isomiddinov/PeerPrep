import { useEffect, useRef } from "react"
import { prefetchPage } from "./pageCache"

/**
 * Hook to prefetch page data on link hover
 * Usage: <Link onMouseEnter={() => prefetchGroup(id)} />
 */
export function usePrefetch() {
  const prefetchTimeouts = useRef(new Map())
  
  const prefetch = (key, fetchFn, params = {}) => {
    // Clear any existing timeout for this key
    const existing = prefetchTimeouts.current.get(key)
    if (existing) {
      clearTimeout(existing)
    }
    
    // Prefetch after a short delay (user might not actually click)
    const timeout = setTimeout(() => {
      prefetchPage(key, fetchFn, params)
      prefetchTimeouts.current.delete(key)
    }, 50) // Very short delay - prefetch quickly
    
    prefetchTimeouts.current.set(key, timeout)
  }
  
  const cancel = (key) => {
    const timeout = prefetchTimeouts.current.get(key)
    if (timeout) {
      clearTimeout(timeout)
      prefetchTimeouts.current.delete(key)
    }
  }
  
  useEffect(() => {
    return () => {
      // Cleanup all timeouts on unmount
      prefetchTimeouts.current.forEach(timeout => clearTimeout(timeout))
      prefetchTimeouts.current.clear()
    }
  }, [])
  
  return { prefetch, cancel }
}

