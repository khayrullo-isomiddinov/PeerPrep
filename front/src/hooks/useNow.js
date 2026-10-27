import { useEffect, useState } from "react"

// The current time, refreshed every `intervalMs` (pass null to stop) and as soon as the tab becomes visible
// again. Use it to re-render time-based UI; derive the actual time from timestamps, not from tick counts.
export function useNow(intervalMs = 60 * 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (intervalMs == null) return
    const tick = () => setNow(Date.now())
    tick()
    const timer = setInterval(tick, intervalMs)
    const onVisible = () => document.visibilityState === "visible" && tick()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [intervalMs])
  return now
}
