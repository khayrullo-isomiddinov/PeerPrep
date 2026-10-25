import { Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faCalendarDays, faClock, faLocationDot, faGraduationCap, faUserPlus, faUserMinus, faChalkboard, faPen, faTrash, faEllipsis,
} from "@fortawesome/free-solid-svg-icons"
import { formatLongDate, formatClockTime } from "../../../utils/dates"
import Badge from "../../../components/ui/Badge"
import Button from "../../../components/ui/Button"
import Card from "../../../components/ui/Card"
import { Menu, MenuItem } from "../../../components/ui/Menu"
import EventCover from "../EventCover"

function Fact({ icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-fg-muted">
        <FontAwesomeIcon icon={icon} className="text-sm" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-fg-subtle">{label}</dt>
        <dd className="text-sm font-semibold text-fg break-words">{children}</dd>
      </div>
    </div>
  )
}

function durationLabel(hours) {
  if (hours === 8) return "All day"
  return `${hours} hour${hours === 1 ? "" : "s"}`
}

export default function EventSummary({ event, memberCount, isOwner, isMember, timing, joinBusy, onJoinLeave, onDelete }) {
  const isFull = memberCount >= event.capacity
  const fill = Math.min(100, Math.round((memberCount / Math.max(event.capacity, 1)) * 100))

  return (
    <Card padded={false}>
      <EventCover event={event} eager className="h-36 w-full sm:h-52" iconClassName="text-5xl" />
      <div className="p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          {timing.isOngoing && <Badge tone="success" dot>Live now</Badge>}
          {timing.isPast && <Badge tone="neutral">Ended</Badge>}
          {isOwner && <Badge tone="accent">You're hosting</Badge>}
          {isMember && !isOwner && <Badge tone="aqua">You're going</Badge>}
          {isFull && !timing.isPast && <Badge tone="warning">Full</Badge>}
        </div>

        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-[1.75rem] font-bold leading-tight text-fg sm:text-4xl">{event.title}</h1>
            {event.description && <p className="mt-3 max-w-2xl whitespace-pre-line text-fg-muted">{event.description}</p>}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {isMember && (
              <Button as={Link} to={`/events/${event.id}/whiteboard`} variant="secondary">
                <FontAwesomeIcon icon={faChalkboard} />
                Whiteboard
              </Button>
            )}
            {!isOwner && !timing.hasStarted && (
              <Button
                variant={isMember ? "secondary" : "primary"}
                loading={joinBusy}
                disabled={!isMember && isFull}
                onClick={onJoinLeave}
                className="min-w-32"
              >
                {!joinBusy && <FontAwesomeIcon icon={isMember ? faUserMinus : faUserPlus} />}
                {isMember ? "Leave" : isFull ? "Event full" : "Join session"}
              </Button>
            )}
            {isOwner && (
              <>
                {!timing.hasStarted && (
                  <Button as={Link} to={`/events/${event.id}/edit`} variant="secondary">
                    <FontAwesomeIcon icon={faPen} />
                    Edit
                  </Button>
                )}
                <Menu
                  label="More actions"
                  width="w-44"
                  buttonClassName="inline-grid size-10 place-items-center rounded-lg border border-line-strong text-fg-muted hover:bg-surface-2 hover:text-fg"
                  button={<FontAwesomeIcon icon={faEllipsis} />}
                >
                  <MenuItem icon={faTrash} danger onSelect={onDelete}>Delete event</MenuItem>
                </Menu>
              </>
            )}
          </div>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-line pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <Fact icon={faCalendarDays} label="Date">{formatLongDate(event.starts_at)}</Fact>
          <Fact icon={faClock} label="Time">{formatClockTime(event.starts_at)} · {durationLabel(event.duration)}</Fact>
          <Fact icon={faLocationDot} label="Location">{event.location}</Fact>
          {event.exam ? (
            <Fact icon={faGraduationCap} label="Preparing for">{event.exam}</Fact>
          ) : (
            <div className="flex flex-col justify-center">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-semibold text-fg">{memberCount} going</span>
                <span className="text-fg-subtle">{event.capacity} spots</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                <div className={`h-full rounded-full ${isFull ? "bg-warning" : "bg-accent"}`} style={{ width: `${fill}%` }} />
              </div>
            </div>
          )}
        </dl>
      </div>
    </Card>
  )
}
