import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowRight, faXmark, faRotateRight } from "@fortawesome/free-solid-svg-icons"
import { useNow } from "../../hooks/useNow"
import { LogoMark } from "../Logo"
import { STUDY_TIPS } from "./studyTips"

const TIP_MS = 8000
// Past this, a cold start is unusually slow and reloading is worth suggesting
const LONG_WAIT_S = 75

// The logo, dozing: a few "z"s drift up from it
function SleepyMark({ size = "size-14" }) {
  return (
    <span className="relative inline-block text-fg" aria-hidden>
      <LogoMark className={size} />
      {[0, 0.8, 1.6].map((delay) => (
        <span
          key={delay}
          className="serif absolute -right-3 -top-1 text-lg leading-none text-fg-muted opacity-0 animate-doze"
          style={{ animationDelay: `${delay}s` }}
        >
          z
        </span>
      ))}
    </span>
  )
}

function useRotatingTip() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * STUDY_TIPS.length))
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % STUDY_TIPS.length), TIP_MS)
    return () => clearInterval(t)
  }, [index])
  return [STUDY_TIPS[index], () => setIndex((i) => (i + 1) % STUDY_TIPS.length)]
}

// Explains the wait while the free-tier server wakes up, with a study tip to read meanwhile.
// `compact` is the small floating version; `onDismiss` adds a close button. `focusLink` offers the focus room,
// which works without the server (turn it off where routes can't render yet).
export default function WakeUpPanel({ since, compact = false, onDismiss, focusLink = true }) {
  const now = useNow(1000)
  const seconds = Math.max(0, Math.round((now - (since || now)) / 1000))
  const [tip, nextTip] = useRotatingTip()
  const slowerThanUsual = seconds > LONG_WAIT_S

  const tipBlock = (
    <div className={`rounded-lg border border-line bg-surface-2 ${compact ? "mt-3 p-3" : "mt-8 p-4 text-left"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="label text-fg-subtle">While you wait</p>
        <button type="button" onClick={nextTip} className="text-xs font-semibold text-accent-text hover:underline">
          Next tip
        </button>
      </div>
      <p key={tip} className={`mt-1.5 animate-fade-in text-fg ${compact ? "text-sm" : "text-[0.9375rem] leading-relaxed"}`}>{tip}</p>
    </div>
  )

  if (compact) {
    return (
      <div className="flex gap-3">
        <div className="pt-1"><SleepyMark size="size-8" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-fg" role="status">
              Waking up the server <span className="font-mono font-normal text-fg-subtle tabular-nums">{seconds}s</span>
            </p>
            {onDismiss && (
              <button type="button" onClick={onDismiss} aria-label="Hide this message" className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-md text-fg-subtle hover:bg-surface-2 hover:text-fg">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            )}
          </div>
          <p className="mt-0.5 text-sm text-fg-muted">
            {slowerThanUsual
              ? "Taking longer than usual. If nothing loads soon, try reloading."
              : "Free hosting naps when it's quiet. The first load can take up to a minute."}
          </p>
          {tipBlock}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md text-center">
      <SleepyMark />
      <p className="label mt-6 text-fg-subtle" role="status">
        Waking up the server · <span className="tabular-nums">{seconds}s</span>
      </p>
      <h1 className="mt-3 text-2xl tracking-[-0.03em] text-fg sm:text-3xl">
        Hang tight, PeerPrep is <span className="serif text-[1.1em]">waking up.</span>
      </h1>
      <p className="mt-3 text-fg-muted">
        PeerPrep runs on free hosting, so the server and database take a nap when nobody&apos;s around.
        The first visit after a quiet spell can take up to a minute. After that, everything is quick.
      </p>
      {slowerThanUsual && (
        <div className="mt-5 flex flex-col items-center gap-3">
          <p className="text-sm text-fg-muted">This is taking longer than usual.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-accent-text hover:underline"
          >
            <FontAwesomeIcon icon={faRotateRight} className="text-xs" />
            Reload the page
          </button>
        </div>
      )}
      {tipBlock}
      {focusLink && <Link to="/focus" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-fg hover:underline hover:underline-offset-4">
        Start a focus block while you wait
        <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
      </Link>}
    </div>
  )
}
