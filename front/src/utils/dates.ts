import type { PeerEvent } from "../types/api"

type DateInput = string | null | undefined

export interface EventTiming {
  hasStarted: boolean
  isOngoing: boolean
  isPast: boolean
  isUpcoming: boolean
}

// The API returns UTC timestamps, sometimes without a "Z"; treat those as UTC too.
export function parseUTCDate(value: DateInput): Date | null {
  if (!value) return null
  const text = String(value)
  const hasZone = text.includes("Z") || text.includes("+") || /-\d{2}:\d{2}$/.test(text)
  const date = new Date(hasZone ? text : `${text}Z`)
  return isNaN(date.getTime()) ? null : date
}

// Where an event is in its lifecycle right now
export function getEventTiming(
  event: Pick<PeerEvent, "starts_at" | "duration"> & Partial<Pick<PeerEvent, "ends_at" | "is_ongoing" | "is_past" | "is_upcoming">>,
  now: Date = new Date()
): EventTiming {
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

export function formatLongDate(value: DateInput): string {
  const date = parseUTCDate(value)
  return date ? date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "Not set"
}

export function formatClockTime(value: DateInput): string {
  const date = parseUTCDate(value)
  return date ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "Not set"
}

// "Just now", "5m ago", "3h ago", "2d ago", then a short date
export function formatRelativeTime(value: DateInput, now: Date = new Date()): string {
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

// Short day label for event cards: "Today", "Tomorrow", or "Tue, Oct 28" (adds the year if it differs)
export function formatEventDay(value: DateInput, now: Date = new Date()): string {
  const date = parseUTCDate(value)
  if (!date) return ""
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000)
  if (days === 0) return "Today"
  if (days === 1) return "Tomorrow"
  if (days === -1) return "Yesterday"
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() && { year: "numeric" }),
  })
}

// "Today · 6:00 PM"
export function formatEventWhen(value: DateInput, now: Date = new Date()): string {
  const day = formatEventDay(value, now)
  return day ? `${day} · ${formatClockTime(value)}` : "Date to be announced"
}

// Soonest first (the API lists newest-created first)
export function sortByStart<T extends { starts_at: string }>(events: T[]): T[] {
  return [...events].sort((a, b) => (parseUTCDate(a.starts_at)?.getTime() ?? 0) - (parseUTCDate(b.starts_at)?.getTime() ?? 0))
}
