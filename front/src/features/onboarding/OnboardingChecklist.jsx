import { Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCheck, faXmark, faArrowRight } from "@fortawesome/free-solid-svg-icons"
import Card from "../../components/ui/Card"
import IconButton from "../../components/ui/IconButton"

// steps: [{ id, title, description, done, action: { to, label } | null, hint? }]
export default function OnboardingChecklist({ steps, onDismiss }) {
  const completed = steps.filter((s) => s.done).length
  const next = steps.find((s) => !s.done)

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-surface-3" aria-hidden>
        <div className="h-full transition-[width] duration-500" style={{ width: `${(completed / steps.length) * 100}%`, background: "var(--brand-gradient)" }} />
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-text">Getting started · {completed}/{steps.length}</p>
          <h2 className="mt-1 text-lg font-semibold text-fg">Set up your study routine</h2>
        </div>
        <IconButton icon={faXmark} label="Hide getting started" size="sm" onClick={onDismiss} className="-mr-2 -mt-1" />
      </div>

      <ol className="mt-4 space-y-1">
        {steps.map((step, index) => {
          const isNext = step === next
          return (
            <li key={step.id} className={`flex gap-3 rounded-xl p-2.5 ${isNext ? "bg-surface-2" : ""}`}>
              <span
                className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  step.done ? "bg-success text-surface" : isNext ? "bg-accent text-accent-fg" : "border border-line-strong text-fg-subtle"
                }`}
                aria-hidden
              >
                {step.done ? <FontAwesomeIcon icon={faCheck} /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${step.done ? "text-fg-subtle line-through decoration-fg-subtle/50" : "text-fg"}`}>
                  {step.title}
                  <span className="sr-only">{step.done ? " (done)" : " (to do)"}</span>
                </p>
                {!step.done && <p className="mt-0.5 text-xs text-fg-muted">{step.description}</p>}
                {isNext && step.action && (
                  <Link to={step.action.to} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-text hover:underline">
                    {step.action.label}
                    <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                  </Link>
                )}
                {isNext && !step.action && step.hint && <p className="mt-2 text-xs text-fg-subtle">{step.hint}</p>}
              </div>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
