// The focus timer, today's plan and the focus log, kept in this browser only (one entry per account, or
// "guest" when signed out). Never sent to the server. Listed in the Privacy Policy as `peerprep-focus:…`.
//
// This isn't server data, so it doesn't belong in React Query. It lives in a tiny external store that
// survives navigation (a running timer keeps its end time) and follows changes made in other tabs.

import {
  DEFAULT_SETTINGS, IDLE_TIMER, LOG_DAYS, addToLog, complete, normalizeSettings, normalizeTimer, pause, reset, skip, start,
} from "./focusTimerModel"

export const FOCUS_STORAGE_PREFIX = "peerprep-focus:"
export const MAX_TASKS = 30
export const MAX_TASK_LENGTH = 200

const EMPTY = { settings: DEFAULT_SETTINGS, timer: IDLE_TIMER, tasks: [], currentTaskId: null, log: [] }

const cache = new Map()
const listeners = new Set()

function normalize(raw) {
  const tasks = Array.isArray(raw?.tasks)
    ? raw.tasks
        .filter((t) => t && typeof t.id === "string" && typeof t.text === "string")
        .slice(0, MAX_TASKS)
        .map((t) => ({ id: t.id, text: t.text.slice(0, MAX_TASK_LENGTH), done: !!t.done }))
    : []
  const log = Array.isArray(raw?.log)
    ? raw.log
        .filter((d) => d && typeof d.day === "string" && Number.isFinite(d.minutes))
        .slice(-LOG_DAYS)
        .map((d) => ({ day: d.day, minutes: d.minutes, blocks: d.blocks | 0 }))
    : []
  return {
    settings: normalizeSettings(raw?.settings),
    timer: normalizeTimer(raw?.timer),
    tasks,
    currentTaskId: tasks.some((t) => t.id === raw?.currentTaskId) ? raw.currentTaskId : null,
    log,
  }
}

function read(scope) {
  try {
    const raw = localStorage.getItem(FOCUS_STORAGE_PREFIX + scope)
    return raw ? normalize(JSON.parse(raw)) : EMPTY
  } catch {
    return EMPTY
  }
}

function write(scope, data) {
  try {
    localStorage.setItem(FOCUS_STORAGE_PREFIX + scope, JSON.stringify(data))
  } catch { /* storage full or blocked: the timer still works for this visit */ }
}

function emit() {
  listeners.forEach((fn) => fn())
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getFocusData(scope) {
  if (!cache.has(scope)) cache.set(scope, read(scope))
  return cache.get(scope)
}

function update(scope, change, { fresh = false } = {}) {
  // `fresh` re-reads storage first, so two open tabs don't both record the same finished block
  const current = fresh ? read(scope) : getFocusData(scope)
  const next = change(current)
  if (next === current) {
    if (fresh) { cache.set(scope, current); emit() }
    return
  }
  cache.set(scope, next)
  write(scope, next)
  emit()
}

// Another tab changed it: drop our cached copy
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === null) cache.clear()
    else if (e.key.startsWith(FOCUS_STORAGE_PREFIX)) cache.delete(e.key.slice(FOCUS_STORAGE_PREFIX.length))
    else return
    emit()
  })
}

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function focusActions(scope) {
  const setTimer = (fn) => update(scope, (d) => {
    const timer = fn(d.timer, d.settings)
    return timer === d.timer ? d : { ...d, timer }
  })
  return {
    start: () => setTimer((t, s) => start(t, s, Date.now())),
    pause: () => setTimer((t) => pause(t, Date.now())),
    reset: () => setTimer((t) => reset(t)),
    skip: () => setTimer((t, s) => skip(t, s)),
    // Choose a phase by hand; only while nothing is running
    setPhase: (phase) => setTimer((t) => (t.status === "running" || t.phase === phase ? t : { ...IDLE_TIMER, phase, round: t.round })),
    // Returns what finished (or null), so the caller can play a sound
    completeIfDue() {
      let finished = null
      update(scope, (d) => {
        const now = Date.now()
        const { timer, completed } = complete(d.timer, d.settings, now)
        if (!completed) return d
        finished = completed
        return { ...d, timer, log: addToLog(d.log, completed, now) }
      }, { fresh: true })
      return finished
    },
    setSettings: (patch) => update(scope, (d) => {
      const settings = normalizeSettings({ ...d.settings, ...patch })
      // A paused timer keeps its time; an idle one shows the new length straight away
      return { ...d, settings }
    }),
    addTask: (text) => update(scope, (d) => {
      const clean = text.trim().slice(0, MAX_TASK_LENGTH)
      if (!clean || d.tasks.length >= MAX_TASKS) return d
      const task = { id: newId(), text: clean, done: false }
      return { ...d, tasks: [...d.tasks, task], currentTaskId: d.currentTaskId ?? task.id }
    }),
    toggleTask: (id) => update(scope, (d) => {
      const tasks = d.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
      const finishedCurrent = d.currentTaskId === id && tasks.find((t) => t.id === id)?.done
      return { ...d, tasks, currentTaskId: finishedCurrent ? tasks.find((t) => !t.done)?.id ?? null : d.currentTaskId }
    }),
    removeTask: (id) => update(scope, (d) => ({
      ...d,
      tasks: d.tasks.filter((t) => t.id !== id),
      currentTaskId: d.currentTaskId === id ? null : d.currentTaskId,
    })),
    clearDone: () => update(scope, (d) => {
      const tasks = d.tasks.filter((t) => !t.done)
      return { ...d, tasks, currentTaskId: tasks.some((t) => t.id === d.currentTaskId) ? d.currentTaskId : null }
    }),
    setCurrentTask: (id) => update(scope, (d) => ({ ...d, currentTaskId: d.currentTaskId === id ? null : id })),
  }
}

// When an account is deleted, its local focus data goes too
export function clearFocusData(scope) {
  cache.delete(scope)
  try {
    localStorage.removeItem(FOCUS_STORAGE_PREFIX + scope)
  } catch { /* storage unavailable */ }
  emit()
}
