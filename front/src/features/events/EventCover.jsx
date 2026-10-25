// The event's cover photo, or a typographic "notebook" cover: the exam (or the session's
// subject) set large in italic serif on faintly ruled paper.
function coverWord(event) {
  if (event.exam) return event.exam
  const words = (event.title || "Study session").split(/[\s:—–-]+/).filter(Boolean)
  return words.slice(0, 2).join(" ")
}

export default function EventCover({ event, className = "", size = "md", eager = false }) {
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
  const text = size === "lg" ? "text-[clamp(2.75rem,8vw,5rem)]" : "text-[2.15rem]"
  return (
    <div aria-hidden className={`ruled relative overflow-hidden bg-surface-2 ${className}`}>
      {/* the red margin line of a notebook page */}
      <span className="absolute inset-y-0 left-7 w-px bg-danger/25" />
      <span className={`serif absolute bottom-3 left-11 right-4 truncate leading-[0.95] text-fg ${text}`}>{coverWord(event)}</span>
    </div>
  )
}
