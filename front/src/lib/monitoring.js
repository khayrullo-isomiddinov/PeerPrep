// The single place the app reports unexpected errors. Today they go to the browser console; to use an
// error-tracking service (Sentry, Bugsnag, ...), initialise it in installErrorReporting and forward from reportError.
// Never include tokens, passwords or message contents in `context`.

export function reportError(error, context = {}) {
  console.error("[PeerPrep]", error, context)
}

export function installErrorReporting() {
  window.addEventListener("error", (event) => reportError(event.error ?? event.message, { source: "window.error" }))
  window.addEventListener("unhandledrejection", (event) => reportError(event.reason, { source: "unhandledrejection" }))
}
