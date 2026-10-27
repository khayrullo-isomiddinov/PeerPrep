import type { PeerEvent } from "../types/api"
import { parseUTCDate } from "./dates"

type CalendarEvent = Pick<PeerEvent, "id" | "title" | "starts_at" | "duration" | "location"> &
  Partial<Pick<PeerEvent, "ends_at" | "description">>

// 20261025T120000Z
function icsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

// RFC 5545 text: escape \ ; , and newlines, and fold lines longer than 75 octets
function icsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")
}

function fold(line: string): string {
  const parts = []
  let rest = line
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74))
    rest = " " + rest.slice(74)
  }
  parts.push(rest)
  return parts.join("\r\n")
}

// An .ics file for one session, so it can be added to any calendar app (with its own reminders).
// Built in the browser: nothing is sent anywhere.
export function eventToIcs(event: CalendarEvent, pageUrl: string, now: Date = new Date()): string | null {
  const start = parseUTCDate(event.starts_at)
  if (!start) return null
  const end = parseUTCDate(event.ends_at) || new Date(start.getTime() + (event.duration || 1) * 3600 * 1000)
  const description = [event.description?.trim(), `PeerPrep session: ${pageUrl}`].filter(Boolean).join("\n\n")
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PeerPrep//Study session//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:peerprep-event-${event.id}@peerprep`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(event.title)}`,
    `LOCATION:${icsText(event.location || "")}`,
    `DESCRIPTION:${icsText(description)}`,
    `URL:${pageUrl}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-PT30M",
    `DESCRIPTION:${icsText(event.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
  return lines.map(fold).join("\r\n") + "\r\n"
}

export function icsFileName(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)
  return `${slug || "study-session"}.ics`
}
