// The focus timer as plain data and pure functions, so it's easy to test and to persist.
// Time is never counted by an interval: a running timer stores when it ends (`endsAt`, epoch ms) and the
// remaining time is always `endsAt - now`. That stays correct in background tabs and after the device sleeps.

export const PHASES = {
  focus: { label: "Focus", short: "Focus" },
  short: { label: "Short break", short: "Break" },
  long: { label: "Long break", short: "Long break" },
}

export const SETTING_LIMITS = {
  focus: [5, 120],
  short: [1, 30],
  long: [5, 60],
  longEvery: [2, 8],
}

export const DEFAULT_SETTINGS = { focus: 25, short: 5, long: 15, longEvery: 4, autoStart: false, sound: true }

export const IDLE_TIMER = { phase: "focus", status: "idle", endsAt: null, remainingMs: null, round: 0 }

const MINUTE = 60 * 1000
const clamp = (value, [min, max]) => Math.min(max, Math.max(min, Math.round(Number(value) || min)))

// Fills in and bounds anything missing or out of range (e.g. from an older saved version)
export function normalizeSettings(settings = {}) {
  const s = { ...DEFAULT_SETTINGS, ...settings }
  return {
    focus: clamp(s.focus, SETTING_LIMITS.focus),
    short: clamp(s.short, SETTING_LIMITS.short),
    long: clamp(s.long, SETTING_LIMITS.long),
    longEvery: clamp(s.longEvery, SETTING_LIMITS.longEvery),
    autoStart: !!s.autoStart,
    sound: s.sound !== false,
  }
}

export function normalizeTimer(timer) {
  if (!timer || !PHASES[timer.phase]) return IDLE_TIMER
  if (timer.status === "running" && Number.isFinite(timer.endsAt)) {
    return { ...IDLE_TIMER, phase: timer.phase, status: "running", endsAt: timer.endsAt, round: timer.round | 0 }
  }
  if (timer.status === "paused" && Number.isFinite(timer.remainingMs) && timer.remainingMs > 0) {
    return { ...IDLE_TIMER, phase: timer.phase, status: "paused", remainingMs: timer.remainingMs, round: timer.round | 0 }
  }
  return { ...IDLE_TIMER, phase: timer.phase, round: timer.round | 0 }
}

export function phaseDurationMs(settings, phase) {
  return settings[phase] * MINUTE
}

export function remainingMs(timer, settings, now) {
  if (timer.status === "running") return Math.max(0, timer.endsAt - now)
  if (timer.status === "paused") return timer.remainingMs
  return phaseDurationMs(settings, timer.phase)
}

// 0–1 of the current phase that has passed
export function progress(timer, settings, now) {
  const total = phaseDurationMs(settings, timer.phase)
  return total > 0 ? Math.min(1, Math.max(0, 1 - remainingMs(timer, settings, now) / total)) : 0
}

export function isDue(timer, now) {
  return timer.status === "running" && now >= timer.endsAt
}

export function start(timer, settings, now) {
  if (timer.status === "running") return timer
  return { ...timer, status: "running", endsAt: now + remainingMs(timer, settings, now), remainingMs: null }
}

export function pause(timer, now) {
  if (timer.status !== "running") return timer
  const left = Math.max(0, timer.endsAt - now)
  return left > 0 ? { ...timer, status: "paused", endsAt: null, remainingMs: left } : timer
}

// Back to the full length of the current phase
export function reset(timer) {
  return { ...timer, status: "idle", endsAt: null, remainingMs: null }
}

// Move on to the next phase without recording anything (e.g. skipping a break).
// `round` counts focus blocks in the current cycle; every `longEvery`-th block earns a long break.
export function skip(timer, settings) {
  if (timer.phase === "focus") {
    const round = timer.round + 1
    return { ...IDLE_TIMER, phase: round >= settings.longEvery ? "long" : "short", round }
  }
  return { ...IDLE_TIMER, phase: "focus", round: timer.phase === "long" ? 0 : timer.round }
}

// The running phase reached zero. Returns the next timer state and what was completed (for the log).
// `endedAt` is when the phase actually ended, even if we only noticed later (tab asleep). With auto-start,
// the next phase begins `now`, not at `endedAt`, so nobody wakes up to a break that already ran out.
export function complete(timer, settings, now) {
  if (!isDue(timer, now)) return { timer, completed: null }
  const completed = { phase: timer.phase, minutes: settings[timer.phase], endedAt: timer.endsAt }
  const next = skip(timer, settings)
  return { timer: settings.autoStart ? start(next, settings, now) : next, completed }
}

// mm:ss, or h:mm:ss past an hour
export function formatClock(ms) {
  const total = Math.ceil(Math.max(0, ms) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

// ---------- Focus log (minutes per local day) ----------

export const LOG_DAYS = 14

export function dayKey(time) {
  const d = new Date(time)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// Adds a completed focus block to its day and drops days older than LOG_DAYS
export function addToLog(log, completed, now) {
  if (!completed || completed.phase !== "focus") return log
  const key = dayKey(completed.endedAt)
  const existing = log.find((d) => d.day === key)
  const updated = existing
    ? log.map((d) => (d.day === key ? { ...d, minutes: d.minutes + completed.minutes, blocks: d.blocks + 1 } : d))
    : [...log, { day: key, minutes: completed.minutes, blocks: 1 }]
  const oldest = dayKey(now - (LOG_DAYS - 1) * 24 * 60 * MINUTE)
  return updated.filter((d) => d.day >= oldest).sort((a, b) => (a.day < b.day ? -1 : 1))
}

// The last `days` days, oldest first, with zeroes for days without focus
export function recentDays(log, now, days = 7) {
  return Array.from({ length: days }, (_, i) => {
    const time = now - (days - 1 - i) * 24 * 60 * MINUTE
    const key = dayKey(time)
    const entry = log.find((d) => d.day === key)
    return { day: key, date: new Date(time), minutes: entry?.minutes || 0, blocks: entry?.blocks || 0 }
  })
}

// "1h 25m", "40m", "0m"
export function formatMinutes(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`
}
