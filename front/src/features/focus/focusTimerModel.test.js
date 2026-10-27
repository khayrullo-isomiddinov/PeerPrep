import { describe, expect, it } from "vitest"
import {
  DEFAULT_SETTINGS, IDLE_TIMER, addToLog, complete, formatClock, formatMinutes, normalizeSettings, normalizeTimer,
  pause, progress, recentDays, remainingMs, reset, skip, start,
} from "./focusTimerModel"

const settings = DEFAULT_SETTINGS
const MIN = 60 * 1000
const T0 = new Date(2026, 9, 25, 9, 0).getTime()

describe("focus timer", () => {
  it("counts down from the end time, not from ticks", () => {
    const running = start(IDLE_TIMER, settings, T0)
    expect(running.endsAt).toBe(T0 + 25 * MIN)
    // However long the tab slept, the remaining time is just the difference
    expect(remainingMs(running, settings, T0 + 10 * MIN)).toBe(15 * MIN)
    expect(remainingMs(running, settings, T0 + 99 * MIN)).toBe(0)
    expect(progress(running, settings, T0 + 12.5 * MIN)).toBeCloseTo(0.5)
  })

  it("pauses and resumes with the time that was left", () => {
    const paused = pause(start(IDLE_TIMER, settings, T0), T0 + 5 * MIN)
    expect(paused).toMatchObject({ status: "paused", remainingMs: 20 * MIN, endsAt: null })
    // Time passing while paused doesn't count
    const resumed = start(paused, settings, T0 + 60 * MIN)
    expect(resumed.endsAt).toBe(T0 + 80 * MIN)
  })

  it("resets to the full phase length", () => {
    const paused = pause(start(IDLE_TIMER, settings, T0), T0 + 5 * MIN)
    expect(remainingMs(reset(paused), settings, T0)).toBe(25 * MIN)
  })

  it("completes only once the end time has passed, recording when it really ended", () => {
    const running = start(IDLE_TIMER, settings, T0)
    expect(complete(running, settings, T0 + 24 * MIN).completed).toBeNull()

    const { timer, completed } = complete(running, settings, T0 + 40 * MIN)
    expect(completed).toEqual({ phase: "focus", minutes: 25, endedAt: T0 + 25 * MIN })
    expect(timer).toMatchObject({ phase: "short", status: "idle", round: 1 })
  })

  it("auto-starts the next phase from the moment it's noticed", () => {
    const auto = { ...settings, autoStart: true }
    const { timer } = complete(start(IDLE_TIMER, auto, T0), auto, T0 + 40 * MIN)
    expect(timer).toMatchObject({ phase: "short", status: "running", endsAt: T0 + 45 * MIN })
  })

  it("gives a long break after every fourth focus block, then starts a new cycle", () => {
    let timer = IDLE_TIMER
    const phases = []
    for (let i = 0; i < 9; i++) {
      timer = skip(timer, settings)
      phases.push(timer.phase)
    }
    expect(phases).toEqual(["short", "focus", "short", "focus", "short", "focus", "long", "focus", "short"])
  })

  it("repairs saved data from older or tampered versions", () => {
    expect(normalizeSettings({ focus: 999, short: "x" })).toMatchObject({ focus: 120, short: 1, long: 15, sound: true })
    expect(normalizeTimer({ phase: "nap", status: "running" })).toEqual(IDLE_TIMER)
    expect(normalizeTimer({ phase: "short", status: "paused", remainingMs: -5 })).toMatchObject({ phase: "short", status: "idle" })
  })

  it("formats clocks", () => {
    expect(formatClock(25 * MIN)).toBe("25:00")
    expect(formatClock(61_001)).toBe("01:02")
    expect(formatClock(90 * MIN)).toBe("1:30:00")
    expect(formatMinutes(85)).toBe("1h 25m")
    expect(formatMinutes(40)).toBe("40m")
  })
})

describe("focus log", () => {
  it("adds focus blocks to their day and ignores breaks", () => {
    let log = addToLog([], { phase: "focus", minutes: 25, endedAt: T0 }, T0)
    log = addToLog(log, { phase: "focus", minutes: 25, endedAt: T0 + 30 * MIN }, T0)
    log = addToLog(log, { phase: "short", minutes: 5, endedAt: T0 + 35 * MIN }, T0)
    expect(log).toEqual([{ day: "2026-10-25", minutes: 50, blocks: 2 }])
  })

  it("keeps two weeks and fills gaps with zeroes", () => {
    const old = [{ day: "2026-09-01", minutes: 25, blocks: 1 }, { day: "2026-10-24", minutes: 50, blocks: 2 }]
    const log = addToLog(old, { phase: "focus", minutes: 25, endedAt: T0 }, T0)
    expect(log.map((d) => d.day)).toEqual(["2026-10-24", "2026-10-25"])
    const week = recentDays(log, T0, 7)
    expect(week).toHaveLength(7)
    expect(week.map((d) => d.minutes)).toEqual([0, 0, 0, 0, 0, 50, 25])
  })
})
