import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { subjectIcon } from "./eventVisuals"

// The event's cover photo, or a branded tile with a subject icon when there isn't one
export default function EventCover({ event, className = "", iconClassName = "text-3xl", eager = false }) {
  if (event.cover_image_url) {
    return (
      <img
        src={event.cover_image_url}
        alt=""
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={`object-cover bg-surface-3 ${className}`}
      />
    )
  }
  return (
    <div aria-hidden className={`relative grid place-items-center overflow-hidden ${className}`} style={{ background: "var(--brand-gradient)" }}>
      <div className="absolute inset-0 bg-grid opacity-60 [--grid-line:rgb(255_255_255/0.09)]" />
      <FontAwesomeIcon icon={subjectIcon(event)} className={`relative text-white/90 ${iconClassName}`} />
    </div>
  )
}
