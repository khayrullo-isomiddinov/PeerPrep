import { useState } from "react"
import { Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlay, faPause, faRotateLeft, faForwardStep, faSliders, faArrowRight } from "@fortawesome/free-solid-svg-icons"
import Button from "../../components/ui/Button"
import IconButton from "../../components/ui/IconButton"
import Card from "../../components/ui/Card"
import SegmentedControl from "../../components/ui/SegmentedControl"
import { PHASES, formatClock } from "./focusTimerModel"
import { primeChime } from "./chime"
import { useFocusClock } from "./useFocus"
import FocusSettingsDialog from "./FocusSettingsDialog"

// Short labels so all three fit on a 320 px phone
const PHASE_OPTIONS = Object.entries(PHASES).map(([value, p]) => ({ value, label: p.short }))

function primaryLabel(status) {
  return status === "running" ? "Pause" : status === "paused" ? "Resume" : "Start"
}

function TimerControls({ timer, actions, size = "lg" }) {
  const running = timer.status === "running"
  return (
    <div className="flex items-center justify-center gap-2">
      <IconButton icon={faRotateLeft} label="Reset timer" variant="outline" onClick={actions.reset} disabled={timer.status === "idle"} />
      <Button
        size={size}
        variant={running ? "secondary" : "primary"}
        className="min-w-36"
        onClick={() => {
          if (running) return actions.pause()
          primeChime()
          actions.start()
        }}
      >
        <FontAwesomeIcon icon={running ? faPause : faPlay} />
        {primaryLabel(timer.status)}
      </Button>
      <IconButton
        icon={faForwardStep}
        label={timer.phase === "focus" ? "Skip to break" : "Skip to focus"}
        variant="outline"
        onClick={actions.skip}
      />
    </div>
  )
}

// A thin progress ring around the clock. Decorative: the clock text carries the information.
function Ring({ fraction, children }) {
  const r = 46
  const c = 2 * Math.PI * r
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[17rem]">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--line)" strokeWidth="1.5" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke="var(--fg)" strokeWidth="2" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - fraction)}
          className="transition-[stroke-dashoffset] duration-300 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

function RoundDots({ round, every, phase }) {
  // Filled = focus blocks done in this cycle; during a long break the whole cycle is done
  const done = phase === "long" ? every : round
  return (
    <span className="flex items-center gap-1.5" aria-label={`${done} of ${every} focus blocks before a long break`}>
      {Array.from({ length: every }, (_, i) => (
        <span key={i} className={`size-1.5 rounded-full ${i < done ? "bg-fg" : "border border-line-strong"}`} aria-hidden />
      ))}
    </span>
  )
}

// The full timer, for the focus room
export default function FocusTimer() {
  const { timer, settings, actions, currentTask, remaining, fraction } = useFocusClock()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <Card className="flex flex-col gap-6">
      <SegmentedControl
        label="Timer phase"
        options={PHASE_OPTIONS}
        value={timer.phase}
        onChange={actions.setPhase}
        className="w-full"
      />
      {timer.status === "running" && <p className="-mt-3 text-center text-xs text-fg-subtle">Pause or reset to switch phase.</p>}

      <Ring fraction={fraction}>
        <p className="label text-fg-subtle">{PHASES[timer.phase].label}{timer.status === "paused" ? " · Paused" : ""}</p>
        <p className="mt-2 font-mono text-[clamp(3rem,15vw,4.25rem)] font-medium leading-none tracking-[-0.04em] text-fg tabular-nums" role="timer" aria-live="off">
          {formatClock(remaining)}
        </p>
        <div className="mt-4"><RoundDots round={timer.round} every={settings.longEvery} phase={timer.phase} /></div>
      </Ring>

      <p className="min-h-5 text-center text-sm text-fg-muted">
        {timer.phase === "focus"
          ? currentTask
            ? <>Working on <span className="font-semibold text-fg">{currentTask.text}</span></>
            : "Pick a task from your plan to stay on track."
          : "Stand up, stretch, look away from the screen."}
      </p>

      <TimerControls timer={timer} actions={actions} />

      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        className="mx-auto -mt-2 inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium text-fg-subtle hover:text-fg"
      >
        <FontAwesomeIcon icon={faSliders} />
        {settings.focus} / {settings.short} / {settings.long} min · Settings
      </button>

      {settingsOpen && <FocusSettingsDialog settings={settings} onSave={actions.setSettings} onClose={() => setSettingsOpen(false)} />}
    </Card>
  )
}

// A small timer card for the dashboard and live sessions
export function FocusTimerCompact({ title = "Focus timer", hint }) {
  const { timer, actions, remaining, fraction } = useFocusClock()
  const running = timer.status === "running"
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-fg">{title}</h2>
        <Link to="/focus" className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-text hover:underline">
          Focus room <FontAwesomeIcon icon={faArrowRight} className="text-[0.6rem]" />
        </Link>
      </div>
      {hint && <p className="mt-1 text-sm text-fg-muted">{hint}</p>}
      <div className="mt-4 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="label text-fg-subtle">{PHASES[timer.phase].label}{timer.status === "paused" ? " · Paused" : ""}</p>
          <p className="mt-1 font-mono text-3xl font-medium leading-none tracking-[-0.03em] text-fg tabular-nums">{formatClock(remaining)}</p>
        </div>
        <Button
          variant={running ? "secondary" : "primary"}
          onClick={() => {
            if (running) return actions.pause()
            primeChime()
            actions.start()
          }}
        >
          <FontAwesomeIcon icon={running ? faPause : faPlay} />
          {primaryLabel(timer.status)}
        </Button>
      </div>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-surface-3" aria-hidden>
        <div className="h-full rounded-full bg-fg transition-[width] duration-300 ease-linear" style={{ width: `${fraction * 100}%` }} />
      </div>
    </Card>
  )
}
