import { useEffect, useRef } from "react"
import { prefetchPage } from "./pageCache"

export function usePrefetch() {
  const prefetchTimeouts = useRef(new Map())
  
  const prefetch = (key, fetchFn, params = {}) => {
    const existing = prefetchTimeouts.current.get(key)
    if (existing) {
      clearTimeout(existing)
    }
    
    const timeout = setTimeout(() => {
      prefetchPage(key, fetchFn, params)
      prefetchTimeouts.current.delete(key)
    }, 50) 
    
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
      prefetchTimeouts.current.forEach(timeout => clearTimeout(timeout))
      prefetchTimeouts.current.clear()
    }
  }, [])
  
  return { prefetch, cancel }
}

