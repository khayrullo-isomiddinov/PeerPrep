import { Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPause, faStopwatch } from "@fortawesome/free-solid-svg-icons"
import { PHASES, formatClock } from "./focusTimerModel"
import { useFocusClock } from "./useFocus"

// Navbar reminder of a running or paused timer, linking back to the focus room
export default function FocusPill() {
  const { timer, remaining } = useFocusClock()
  if (timer.status === "idle") return null
  const paused = timer.status === "paused"
  return (
    <Link
      to="/focus"
      aria-label={`${PHASES[timer.phase].label} ${paused ? "paused" : "running"}, ${formatClock(remaining)} left. Open the focus room`}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 font-mono text-xs font-medium tabular-nums transition-colors ${
        timer.phase === "focus" && !paused ? "border-fg bg-fg text-canvas" : "border-line-strong text-fg hover:bg-surface-2"
      }`}
    >
      <FontAwesomeIcon icon={paused ? faPause : faStopwatch} className="text-[0.65rem]" />
      {formatClock(remaining)}
    </Link>
  )
}
