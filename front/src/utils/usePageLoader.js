import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Global page loader state manager
 * Tracks when pages are loading and coordinates the progress bar
 */
const loadingPages = new Set()
const listeners = new Set()

export function usePageLoader() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const location = useLocation()
  const progressIntervalRef = useRef(null)

  useEffect(() => {
    const updateLoading = () => {
      const hasLoading = loadingPages.size > 0
      setIsLoading(hasLoading)
      
      if (hasLoading && progress < 90) {
        // Start progress animation
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
        }
        
        progressIntervalRef.current = setInterval(() => {
          setProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressIntervalRef.current)
              return 90
            }
            // Fast start, slow down as it progresses (GitHub-style)
            const increment = prev < 30 ? 20 : prev < 60 ? 10 : 4
            return Math.min(prev + increment, 90)
          })
        }, 50)
      } else if (!hasLoading && progress > 0) {
        // Complete the progress
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
        }
        setProgress(100)
        setTimeout(() => {
          setProgress(0)
        }, 200)
      }
    }

    listeners.add(updateLoading)
    updateLoading()

    return () => {
      listeners.delete(updateLoading)
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [progress])

  // Reset on route change
  useEffect(() => {
    setProgress(0)
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }
  }, [location.pathname])

  return { isLoading, progress }
}

export function startPageLoad(pageId) {
  loadingPages.add(pageId)
  listeners.forEach(listener => listener())
}

export function endPageLoad(pageId) {
  loadingPages.delete(pageId)
  listeners.forEach(listener => listener())
}















