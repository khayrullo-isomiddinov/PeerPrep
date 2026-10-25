import { Component } from "react"
import { reportError } from "../lib/monitoring"
import { buttonClasses } from "./ui/buttonStyles"

const RELOADED_KEY = "peerprep-chunk-reload"

// After a new deploy, an open tab may ask for code files that no longer exist
function isStaleBundle(error) {
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    String(error?.message || error)
  )
}

// Catches render errors so one broken component shows a friendly page instead of a blank screen.
// Uses plain links (no router), so it also works around the providers. Give it a `key` to reset it.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    if (isStaleBundle(error)) {
      // Reload once to pick up the new version. A reload in the last few seconds means the files really
      // are missing, so show the page below rather than reloading in a loop.
      let reloadedJustNow = false
      try {
        reloadedJustNow = Date.now() - Number(sessionStorage.getItem(RELOADED_KEY) || 0) < 10_000
        sessionStorage.setItem(RELOADED_KEY, String(Date.now()))
      } catch { /* storage unavailable */ }
      if (!reloadedJustNow) {
        window.location.reload()
        return
      }
    }
    reportError(error, { source: "ErrorBoundary", componentStack: info.componentStack })
  }

  render() {
    if (!this.state.error) return this.props.children
    const stale = isStaleBundle(this.state.error)
    return (
      <div role="alert" className="page-container flex flex-1 flex-col items-center justify-center py-24 text-center">
        <p className="label text-fg-subtle">{stale ? "New version available" : "Something went wrong"}</p>
        <h1 className="mt-4 text-2xl tracking-[-0.03em] text-fg sm:text-3xl">
          {stale ? <>PeerPrep was just <span className="serif">updated.</span></> : <>This page hit a <span className="mark">snag</span>.</>}
        </h1>
        <p className="mt-2 max-w-sm text-fg-muted">
          {stale
            ? "Reload to get the latest version. Nothing you saved is lost."
            : "It's not you, it's us. Reloading usually fixes it; if it keeps happening, let us know."}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => window.location.reload()} className={buttonClasses()}>Reload page</button>
          <a href="/" className={buttonClasses({ variant: "secondary" })}>Go home</a>
          {!stale && <a href="/contact" className={buttonClasses({ variant: "ghost" })}>Report a problem</a>}
        </div>
      </div>
    )
  }
}
