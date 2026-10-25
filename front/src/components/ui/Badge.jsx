import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

const TONES = {
  neutral: "bg-surface-2 text-fg-muted border-line",
  accent: "bg-accent-soft text-accent-text border-transparent",
  aqua: "bg-aqua-soft text-aqua border-transparent",
  volt: "bg-volt-soft text-volt border-transparent",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
}

// <Badge tone="success" dot>Live</Badge>. `dot` adds a pulsing indicator (for live state).
export default function Badge({ tone = "neutral", icon, dot = false, className = "", children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border text-xs font-semibold whitespace-nowrap ${TONES[tone]} ${className}`}>
      {dot && (
        <span className="relative flex size-1.5" aria-hidden>
          <span className="absolute inset-0 rounded-full bg-current opacity-60 animate-ping" />
          <span className="relative size-1.5 rounded-full bg-current" />
        </span>
      )}
      {icon && <FontAwesomeIcon icon={icon} className="text-[0.7rem]" />}
      {children}
    </span>
  )
}
