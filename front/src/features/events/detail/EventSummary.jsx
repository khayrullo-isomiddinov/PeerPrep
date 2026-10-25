import { Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faUserPlus, faUserMinus, faChalkboard, faPen, faTrash, faEllipsis } from "@fortawesome/free-solid-svg-icons"
import { formatLongDate, formatClockTime } from "../../../utils/dates"
import Badge from "../../../components/ui/Badge"
import Button from "../../../components/ui/Button"
import Card from "../../../components/ui/Card"
import { Menu, MenuItem } from "../../../components/ui/Menu"
import EventCover from "../EventCover"
import SeatTicks from "../SeatTicks"

// One column of the timetable row under the title
function Fact({ label, children }) {
  return (
    <div className="min-w-0 border-line py-3 sm:border-l sm:py-0 sm:pl-5 sm:first:border-l-0 sm:first:pl-0">
      <dt className="label text-fg-subtle">{label}</dt>
      <dd className="mt-1.5 break-words text-[0.9375rem] font-medium text-fg">{children}</dd>
    </div>
  )
}

function durationLabel(hours) {
  if (hours === 8) return "All day"
  return `${hours} hour${hours === 1 ? "" : "s"}`
}

export default function EventSummary({ event, memberCount, isOwner, isMember, timing, joinBusy, onJoinLeave, onDelete }) {
  const isFull = memberCount >= event.capacity

  return (
    <Card padded={false}>
      <EventCover event={event} eager size="lg" className="h-40 w-full border-b border-line sm:h-56" />
      <div className="p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          {timing.isOngoing && <Badge tone="highlight" dot>Live now</Badge>}
          {timing.isPast && <Badge tone="neutral">Ended</Badge>}
          {isOwner && <Badge tone="accent">You're hosting</Badge>}
          {isMember && !isOwner && <Badge tone="accent">You're going</Badge>}
          {isFull && !timing.isPast && <Badge tone="warning">Full</Badge>}
        </div>

        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-[1.9rem] leading-[1.08] tracking-[-0.04em] text-fg sm:text-[2.75rem]">{event.title}</h1>
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

        <dl className="mt-7 grid grid-cols-1 divide-y divide-line border-t border-line pt-4 sm:grid-cols-2 sm:gap-y-5 sm:divide-y-0 sm:pt-6 lg:grid-cols-4">
          <Fact label="Date">{formatLongDate(event.starts_at)}</Fact>
          <Fact label="Time">{formatClockTime(event.starts_at)} · {durationLabel(event.duration)}</Fact>
          <Fact label="Where">{event.location}</Fact>
          <Fact label={event.exam ? `For ${event.exam}` : "Seats"}>
            <SeatTicks taken={memberCount} capacity={event.capacity} className="mt-1" />
          </Fact>
        </dl>
      </div>
    </Card>
  )
}
