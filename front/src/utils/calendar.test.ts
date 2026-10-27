import { describe, expect, it } from "vitest"
import { eventToIcs, icsFileName } from "./calendar"

describe("eventToIcs", () => {
  const event = {
    id: 7, title: "Calculus; limits, part 2", starts_at: "2026-11-02T17:00:00", duration: 2,
    location: "Library, room 3", description: "Bring past papers\nand a calculator",
  }

  it("writes a valid single-event calendar in UTC with a 30-minute reminder", () => {
    const ics = eventToIcs(event, "https://example.com/events/7", new Date("2026-10-25T10:00:00Z"))!
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true)
    expect(ics).toContain("DTSTART:20261102T170000Z")
    expect(ics).toContain("DTEND:20261102T190000Z")
    expect(ics).toContain("SUMMARY:Calculus\\; limits\\, part 2")
    expect(ics).toContain("LOCATION:Library\\, room 3")
    expect(ics).toContain("DESCRIPTION:Bring past papers\\nand a calculator")
    expect(ics).toContain("TRIGGER:-PT30M")
    expect(ics.split("\r\n").every((line) => line.length <= 75)).toBe(true)
  })

  it("names the file after the session", () => {
    expect(icsFileName("Calculus; limits, part 2")).toBe("calculus-limits-part-2.ics")
    expect(icsFileName("???")).toBe("study-session.ics")
  })
})
