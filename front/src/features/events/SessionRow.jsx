import { Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faChevronRight, faUsers } from "@fortawesome/free-solid-svg-icons"
import { formatClockTime, parseUTCDate } from "../../utils/dates"

// Compact list row for an event: date block, title, time and place
export default function SessionRow({ event }) {
  const start = parseUTCDate(event.starts_at)
  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-surface-2"
    >
      <div className="grid w-12 shrink-0 place-items-center rounded-xl border border-line bg-surface py-1.5 text-center">
        <span className="text-[0.65rem] font-bold uppercase tracking-wider text-accent-text">
          {start ? start.toLocaleDateString("en-US", { month: "short" }) : "—"}
        </span>
        <span className="font-display text-lg font-bold leading-none text-fg">{start ? start.getDate() : ""}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-fg">{event.title}</p>
        <p className="mt-0.5 truncate text-sm text-fg-muted">
          {start ? start.toLocaleDateString("en-US", { weekday: "short" }) : ""} · {formatClockTime(event.starts_at)} · {event.location}
        </p>
      </div>
      <span className="hidden shrink-0 items-center gap-1.5 text-xs text-fg-subtle sm:flex">
        <FontAwesomeIcon icon={faUsers} />
        {event.attendee_count ?? 0}
      </span>
      <FontAwesomeIcon icon={faChevronRight} className="shrink-0 text-xs text-fg-subtle transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}
