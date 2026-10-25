import { memo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faLocationDot, faEllipsis, faPen, faTrash, faGraduationCap } from "@fortawesome/free-solid-svg-icons"
import { getErrorMessage } from "../../utils/api"
import { formatEventWhen, getEventTiming } from "../../utils/dates"
import { useAuth } from "../auth/authContextValue"
import { useJoinEvent, useLeaveEvent, useDeleteEvent, usePrefetchEvents } from "../../hooks/useEvents"
import Badge from "../../components/ui/Badge"
import Button from "../../components/ui/Button"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import { Menu, MenuItem } from "../../components/ui/Menu"
import { useToast } from "../../components/ui/toastContext"
import EventCover from "./EventCover"

function StatusBadge({ timing, isFull, mine }) {
  if (timing.isOngoing) return <Badge tone="success" dot>Live now</Badge>
  if (timing.isPast) return <Badge tone="neutral">Ended</Badge>
  if (mine) return <Badge tone="accent">Hosting</Badge>
  if (isFull) return <Badge tone="warning">Full</Badge>
  return null
}

function EventCard({ event }) {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { prefetchEvent } = usePrefetchEvents()
  const joinMutation = useJoinEvent()
  const leaveMutation = useLeaveEvent()
  const deleteMutation = useDeleteEvent()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const timing = getEventTiming(event)
  const mine = !!user && event.created_by === user.id
  const joined = mine || !!event.is_joined
  const count = event.attendee_count ?? 0
  const isFull = count >= event.capacity
  const busy = joinMutation.isPending || leaveMutation.isPending
  const fill = Math.min(100, Math.round((count / Math.max(event.capacity, 1)) * 100))

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
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-raised focus-within:border-line-strong"
      onMouseEnter={() => isAuthenticated && prefetchEvent(event.id)}
    >
      <div className="relative">
        <EventCover event={event} className="aspect-[16/8] w-full" />
        <div className="absolute left-3 top-3">
          <StatusBadge timing={timing} isFull={isFull} mine={mine} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-text">{formatEventWhen(event.starts_at)}</p>
        <h3 className="mt-1.5 line-clamp-2 text-base font-semibold leading-snug text-fg">
          {/* Stretched link: the whole card is clickable, while the buttons below stay separately focusable */}
          <Link to={`/events/${event.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {event.title}
          </Link>
        </h3>
        <div className="mt-2 flex flex-col gap-1 text-sm text-fg-muted">
          <span className="flex min-w-0 items-center gap-2">
            <FontAwesomeIcon icon={faLocationDot} className="w-3.5 shrink-0 text-fg-subtle" />
            <span className="truncate">{event.location}</span>
          </span>
          {event.exam && (
            <span className="flex min-w-0 items-center gap-2">
              <FontAwesomeIcon icon={faGraduationCap} className="w-3.5 shrink-0 text-fg-subtle" />
              <span className="truncate">{event.exam}</span>
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center gap-3 pt-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold text-fg">{count} going</span>
              <span className="text-fg-subtle">{event.capacity} spots</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
              <div className={`h-full rounded-full ${isFull ? "bg-warning" : "bg-accent"}`} style={{ width: `${fill}%` }} />
            </div>
          </div>

          <div className="relative z-10 shrink-0">
            {mine ? (
              <Menu
                label={`Manage ${event.title}`}
                width="w-44"
                buttonClassName="inline-grid size-9 place-items-center rounded-lg border border-line text-fg-muted hover:border-line-strong hover:text-fg"
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
