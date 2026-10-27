import { memo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEllipsis, faPen, faTrash } from "@fortawesome/free-solid-svg-icons"
import { getErrorMessage } from "../../utils/api"
import { describeEventTiming, formatEventWhen, getEventTiming, parseUTCDate } from "../../utils/dates"
import { useAuth } from "../auth/authContextValue"
import { useJoinEvent, useLeaveEvent, useDeleteEvent, usePrefetchEvents } from "../../hooks/useEvents"
import Badge from "../../components/ui/Badge"
import Button from "../../components/ui/Button"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import { Menu, MenuItem } from "../../components/ui/Menu"
import { useToast } from "../../components/ui/toastContext"
import EventCover from "./EventCover"
import SeatTicks from "./SeatTicks"

function StatusBadge({ timing, isFull, mine, joined }) {
  if (timing.isOngoing) return <Badge tone="highlight" dot>Live</Badge>
  if (timing.isPast) return <Badge tone="neutral" className="bg-surface">Ended</Badge>
  if (mine) return <Badge tone="accent" className="bg-surface">Hosting</Badge>
  if (joined) return <Badge tone="accent" className="bg-surface">Going</Badge>
  if (isFull) return <Badge tone="warning" className="bg-surface">Full</Badge>
  return null
}

const DAY_MS = 24 * 3600 * 1000

// `now` comes from the list (one clock for every card) so countdowns stay current
function EventCard({ event, now }) {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { prefetchEvent } = usePrefetchEvents()
  const joinMutation = useJoinEvent()
  const leaveMutation = useLeaveEvent()
  const deleteMutation = useDeleteEvent()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const timing = getEventTiming(event, now)
  const startsSoon = timing.isUpcoming && parseUTCDate(event.starts_at) - (now || new Date()) < DAY_MS
  const countdown = timing.isOngoing || startsSoon ? describeEventTiming(event, now) : null
  const mine = !!user && event.created_by === user.id
  const joined = mine || !!event.is_joined
  const count = event.attendee_count ?? 0
  const isFull = count >= event.capacity
  const busy = joinMutation.isPending || leaveMutation.isPending

  function toggleMembership() {
    if (!isAuthenticated) {
      navigate("/login")
      return
    }
    const mutation = joined ? leaveMutation : joinMutation
    mutation.mutate(event.id, {
      onSuccess: () => toast.success(joined ? `You left “${event.title}”` : `You're in! See you at “${event.title}”`),
      onError: (e) => toast.error(getErrorMessage(e, joined ? "Couldn't leave the event" : "Couldn't join the event")),
    })
  }

  function deleteEvent() {
    deleteMutation.mutate(event.id, {
      onSuccess: () => {
        setConfirmDelete(false)
        toast.success(`“${event.title}” was deleted`)
      },
      onError: (e) => {
        setConfirmDelete(false)
        toast.error(getErrorMessage(e, "Couldn't delete the event"))
      },
    })
  }

  return (
    <article
      className="card-hover group relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface"
      onMouseEnter={() => isAuthenticated && prefetchEvent(event.id)}
    >
      <div className="relative overflow-hidden border-b border-line">
        <EventCover event={event} className="h-28 w-full transition-transform duration-[900ms] ease-[var(--ease-out-soft)] group-hover:scale-[1.025]" />
        <div className="absolute right-3 top-3">
          <StatusBadge timing={timing} isFull={isFull} mine={mine} joined={joined} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="label text-fg-subtle">{formatEventWhen(event.starts_at)}</p>
        <h3 className="mt-1.5 line-clamp-2 text-[0.975rem] font-medium leading-snug tracking-[-0.01em] text-fg">
          {/* Stretched link: the whole card is clickable, while the buttons below stay separately focusable */}
          <Link to={`/events/${event.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {event.title}
          </Link>
        </h3>
        <p className="mt-1 truncate text-sm text-fg-muted">
          {event.exam && event.cover_image_url && <span className="font-medium text-fg">{event.exam} · </span>}
          {event.location}
        </p>
        {countdown && <p className={`mt-1.5 text-xs font-semibold ${timing.isOngoing ? "text-fg" : "text-fg-muted"}`}>{countdown}</p>}

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <SeatTicks taken={count} capacity={event.capacity} />
          <div className="relative z-10 shrink-0">
            {mine ? (
              <Menu
                label={`Manage ${event.title}`}
                width="w-44"
                buttonClassName="inline-grid size-8 place-items-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg"
                button={<FontAwesomeIcon icon={faEllipsis} />}
              >
                {!timing.hasStarted && <MenuItem as={Link} to={`/events/${event.id}/edit`} icon={faPen}>Edit</MenuItem>}
                <MenuItem icon={faTrash} danger onSelect={() => setConfirmDelete(true)}>Delete</MenuItem>
              </Menu>
            ) : !timing.hasStarted ? (
              <Button
                size="sm"
                variant={joined ? "secondary" : "primary"}
                loading={busy}
                disabled={!joined && isFull}
                onClick={toggleMembership}
                aria-label={`${joined ? "Leave" : "Join"} ${event.title}`}
              >
                {joined ? "Leave" : isFull ? "Full" : "Join"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this event?"
        description={<>“{event.title}” and its chat, members and whiteboard will be removed for everyone.</>}
        confirmLabel="Delete event"
        busy={deleteMutation.isPending}
        onConfirm={deleteEvent}
        onCancel={() => setConfirmDelete(false)}
      />
    </article>
  )
}

export default memo(EventCard)
