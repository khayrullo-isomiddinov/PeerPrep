// Notices when the API is waking up. The backend runs on a free plan that sleeps after ~15 minutes without
// traffic, and the first request afterwards can take up to a minute. A request counts as a "cold start" if the
// server hasn't answered anything for a while; if it then takes longer than SLOW_AFTER_MS, the app explains the
// wait. Any response from the server means it's awake again.
//
// Fed by the axios interceptors in utils/api.ts; read with useServerStatus(). Kept in memory only.

const SLOW_AFTER_MS = 2500
// Render sleeps after 15 idle minutes; after 10 without hearing back, assume the next request may be cold
const COLD_AFTER_IDLE_MS = 10 * 60 * 1000

let lastResponseAt = 0
let slowTimer = null
let state = { waking: false, since: null, inlineLoaders: 0 }
const listeners = new Set()

function setState(patch) {
  state = { ...state, ...patch }
  listeners.forEach((fn) => fn())
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getServerStatus() {
  return state
}

// `background` requests (the warm-up ping) wake the server without showing anything
export function requestSent({ background = false } = {}) {
  if (background || state.since || Date.now() - lastResponseAt < COLD_AFTER_IDLE_MS) return
  setState({ since: Date.now() })
  slowTimer = setTimeout(() => setState({ waking: true }), SLOW_AFTER_MS)
}

function stopWaiting() {
  clearTimeout(slowTimer)
  slowTimer = null
  if (state.since || state.waking) setState({ waking: false, since: null })
}

// The server answered (with any status), so it's awake
export function responseReceived() {
  lastResponseAt = Date.now()
  stopWaiting()
}

// No answer at all (offline, blocked): stop saying "waking up"; the page shows its own error
export function requestFailed() {
  stopWaiting()
}

// A full-page loader that shows the wake-up message itself, so the floating notice can stay hidden
export function registerInlineLoader() {
  setState({ inlineLoaders: state.inlineLoaders + 1 })
  return () => setState({ inlineLoaders: state.inlineLoaders - 1 })
}
