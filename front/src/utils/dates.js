// The API returns UTC timestamps, sometimes without a "Z"; treat those as UTC too.
export function parseUTCDate(value) {
  if (!value) return null
  const text = String(value)
  const hasZone = text.includes("Z") || text.includes("+") || /-\d{2}:\d{2}$/.test(text)
  const date = new Date(hasZone ? text : `${text}Z`)
  return isNaN(date.getTime()) ? null : date
}

// Where an event is in its lifecycle right now
export function getEventTiming(event, now = new Date()) {
  const start = parseUTCDate(event?.starts_at)
  if (!start) {
    return {
      hasStarted: !!(event?.is_ongoing || event?.is_past),
      isOngoing: !!event?.is_ongoing,
      isPast: !!event?.is_past,
      isUpcoming: !!event?.is_upcoming,
    }
  }
  const end = parseUTCDate(event.ends_at) || new Date(start.getTime() + (event.duration || 1) * 3600 * 1000)
  const hasStarted = now >= start
  const isPast = now >= end
  return { hasStarted, isPast, isOngoing: hasStarted && !isPast, isUpcoming: !hasStarted }
}

export function formatLongDate(value) {
  const date = parseUTCDate(value)
  return date ? date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "Not set"
}

export function formatClockTime(value) {
  const date = parseUTCDate(value)
  return date ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "Not set"
}

// "Just now", "5m ago", "3h ago", "2d ago", then a short date
export function formatRelativeTime(value, now = new Date()) {
  const date = parseUTCDate(value)
  if (!date) return "Just now"
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (seconds < 5) return "Just now"
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
