import { Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faUserPlus, faUserMinus, faChalkboard, faPen, faTrash, faEllipsis, faCalendarPlus, faShareNodes, faCircleDot, faClock, faLock,
} from "@fortawesome/free-solid-svg-icons"
import { describeEventTiming, formatLongDate, formatClockTime } from "../../../utils/dates"
import { eventToIcs, icsFileName } from "../../../utils/calendar"
import { useToast } from "../../../components/ui/toastContext"
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

// One line on where the session is in its life, and what that means for chat and whiteboard
function SessionStatus({ event, timing, isMember, now }) {
  const when = describeEventTiming(event, now)
  const status = timing.isOngoing
    ? { icon: faCircleDot, title: `Live now${when ? ` · ${when.toLowerCase()}` : ""}`, text: isMember ? "The chat and whiteboard are live. Jump in." : "It has started, so only members can take part." }
    : timing.isPast
      ? { icon: faLock, title: `Ended ${formatLongDate(event.ends_at || event.starts_at)}`, text: isMember ? "The chat and whiteboard stay readable, but can't be changed." : "This session is over." }
      : { icon: faClock, title: when || `Starts ${formatLongDate(event.starts_at)}`, text: isMember ? "Use the chat to agree what to cover. The whiteboard is ready when you meet." : "Join to plan in the group chat and use the shared whiteboard." }
  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${timing.isOngoing ? "border-fg bg-surface" : "border-line bg-surface-2"}`} role="status">
      <FontAwesomeIcon icon={status.icon} className={`mt-1 text-sm ${timing.isOngoing ? "text-fg" : "text-fg-subtle"}`} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-fg">{status.title}</p>
        <p className="text-sm text-fg-muted">{status.text}</p>
      </div>
    </div>
  )
}

// Add to calendar (.ics, made in the browser) and share the link
function ShareActions({ event, timing }) {
  const toast = useToast()
  const url = `${window.location.origin}/events/${event.id}`

  function downloadCalendar() {
    const ics = eventToIcs(event, url)
    if (!ics) return toast.error("This session has no start time yet.")
    const href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = href
    a.download = icsFileName(event.title)
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(href), 1000)
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, url })
        return
      } catch (e) {
        // Closing the share sheet isn't an error; anything else falls back to copying
        if (e?.name === "AbortError") return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied. Send it to your classmates.")
    } catch {
      toast.error("Couldn't copy the link. Copy it from the address bar instead.")
    }
  }

  return (
    <div className="flex flex-wrap gap-x-1 gap-y-1">
      {!timing.isPast && (
        <Button variant="ghost" size="sm" onClick={downloadCalendar}>
          <FontAwesomeIcon icon={faCalendarPlus} />
          Add to calendar
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={share}>
        <FontAwesomeIcon icon={faShareNodes} />
        Share
      </Button>
    </div>
  )
}

function durationLabel(hours) {
  if (hours === 8) return "All day"
  return `${hours} hour${hours === 1 ? "" : "s"}`
}

export default function EventSummary({ event, memberCount, isOwner, isMember, timing, now, joinBusy, onJoinLeave, onDelete }) {
  const isFull = memberCount >= event.capacity

  return (
    <Card padded={false}>
      <EventCover event={event} eager size="lg" className="h-40 w-full border-b border-line sm:h-56" />
      <div className="p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          {timing.isOngoing && <Badge tone="highlight" dot>Live now</Badge>}
          {isOwner && <Badge tone="accent">You're hosting</Badge>}
          {isMember && !isOwner && <Badge tone="accent">You're going</Badge>}
          {isFull && !timing.isPast && <Badge tone="warning">Full</Badge>}
        </div>

        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="break-words text-[1.9rem] leading-[1.08] tracking-[-0.04em] text-fg sm:text-[2.75rem]">{event.title}</h1>
            {event.description && <p className="mt-3 max-w-2xl whitespace-pre-line text-fg-muted">{event.description}</p>}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {isMember && (
              <Button as={Link} to={`/events/${event.id}/whiteboard`} variant={timing.isOngoing ? "primary" : "secondary"}>
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

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 sm:flex-1"><SessionStatus event={event} timing={timing} isMember={isMember} now={now} /></div>
          <ShareActions event={event} timing={timing} />
        </div>

        <dl className="mt-6 grid grid-cols-1 divide-y divide-line border-t border-line pt-4 sm:grid-cols-2 sm:gap-y-5 sm:divide-y-0 sm:pt-6 lg:grid-cols-4">
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
