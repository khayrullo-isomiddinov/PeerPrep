import { describe, expect, it } from "vitest"
import { formatRelativeTime, getEventTiming, parseUTCDate } from "./dates"

describe("parseUTCDate", () => {
  it("treats timestamps without a timezone as UTC", () => {
    expect(parseUTCDate("2026-01-01T10:00:00")?.toISOString()).toBe("2026-01-01T10:00:00.000Z")
  })

  it("keeps explicit offsets", () => {
    expect(parseUTCDate("2026-01-01T10:00:00+02:00")?.toISOString()).toBe("2026-01-01T08:00:00.000Z")
    expect(parseUTCDate("2026-01-01T10:00:00Z")?.toISOString()).toBe("2026-01-01T10:00:00.000Z")
  })

  it("returns null for missing or invalid input", () => {
    expect(parseUTCDate(null)).toBeNull()
    expect(parseUTCDate("not a date")).toBeNull()
  })
})

describe("getEventTiming", () => {
  const event = { starts_at: "2026-05-10T10:00:00Z", duration: 2 }

  it("is upcoming before the start", () => {
    expect(getEventTiming(event, new Date("2026-05-10T09:59:00Z"))).toEqual({
      hasStarted: false, isOngoing: false, isPast: false, isUpcoming: true,
    })
  })

  it("is ongoing during the event", () => {
    const t = getEventTiming(event, new Date("2026-05-10T11:00:00Z"))
    expect(t.isOngoing && t.hasStarted && !t.isPast).toBe(true)
  })

  it("is past from the end time on (start + duration)", () => {
    expect(getEventTiming(event, new Date("2026-05-10T12:00:00Z")).isPast).toBe(true)
  })

  it("prefers an explicit ends_at", () => {
    const t = getEventTiming({ ...event, ends_at: "2026-05-10T10:30:00Z" }, new Date("2026-05-10T11:00:00Z"))
    expect(t.isPast).toBe(true)
  })
})

describe("formatRelativeTime", () => {
  const now = new Date("2026-05-10T12:00:00Z")
  it.each([
    ["2026-05-10T11:59:58Z", "Just now"],
    ["2026-05-10T11:59:30Z", "30s ago"],
    ["2026-05-10T11:55:00Z", "5m ago"],
    ["2026-05-10T09:00:00Z", "3h ago"],
    ["2026-05-08T12:00:00Z", "2d ago"],
  ])("%s → %s", (input, expected) => {
    expect(formatRelativeTime(input, now)).toBe(expected)
  })
})
