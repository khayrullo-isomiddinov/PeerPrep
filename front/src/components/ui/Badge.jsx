import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

const TONES = {
  neutral: "border-line-strong text-fg-muted",
  accent: "border-fg text-fg",
  // The highlighter: reserved for things that are happening now or earned
  highlight: "border-transparent bg-highlight text-[#141413]",
  success: "border-transparent bg-highlight text-[#141413]",
  volt: "border-transparent bg-highlight text-[#141413]",
  aqua: "border-aqua/40 text-aqua",
  warning: "border-warning/40 text-warning",
  danger: "border-danger/40 text-danger",
}

// Small mono label. <Badge tone="highlight" dot>Live</Badge>; `dot` adds a pulsing indicator.
export default function Badge({ tone = "neutral", icon, dot = false, className = "", children }) {
  return (
    <span className={`label inline-flex h-[1.375rem] items-center gap-1.5 whitespace-nowrap rounded-sm border px-2 ${TONES[tone]} ${className}`}>
      {dot && (
        <span className="relative flex size-1.5" aria-hidden>
          <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-50" />
          <span className="relative size-1.5 rounded-full bg-current" />
        </span>
      )}
      {icon && <FontAwesomeIcon icon={icon} className="text-[0.65rem]" />}
      {children}
    </span>
  )
}
