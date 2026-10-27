import { useEffect, useMemo, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faChevronRight, faComments, faLock, faCalendarXmark } from "@fortawesome/free-solid-svg-icons"
import { getErrorMessage } from "../utils/api"
import { getEventTiming } from "../utils/dates"
import { useAuth } from "../features/auth/authContextValue"
import { useEvent, useJoinEvent, useLeaveEvent, useDeleteEvent } from "../hooks/useEvents"
import { useEventAttendees } from "../hooks/useEventData"
import { useEventChat } from "../hooks/useEventChat"
import EventSummary from "../features/events/detail/EventSummary"
import MembersList from "../features/events/detail/MembersList"
import ChatPanel from "../features/events/detail/ChatPanel"
import StudyMaterials from "../features/events/detail/StudyMaterials"
import { useToast } from "../components/ui/toastContext"
import Button from "../components/ui/Button"
import Card from "../components/ui/Card"
import ConfirmDialog from "../components/ui/ConfirmDialog"
import { EmptyState, PageLoader } from "../components/ui/Feedback"
import { usePageTitle } from "../hooks/usePageTitle"
import { useNow } from "../hooks/useNow"
import { FocusTimerCompact } from "../features/focus/FocusTimer"

function ChatLocked({ timing, canJoin, onJoin, joinBusy }) {
  const copy = timing.isPast
    ? { title: "This session has ended", text: "The chat is only visible to people who attended." }
    : timing.hasStarted
      ? { title: "Members only", text: "This session has already started, so only its members can see the chat." }
      : { title: "Join to see the chat", text: canJoin ? "Members plan the session together here before it starts." : "This session is full." }
  return (
    <Card className="flex h-full min-h-[18rem] items-center justify-center">
      <EmptyState
        icon={timing.isPast ? faLock : faComments}
        title={copy.title}
        description={copy.text}
        action={!timing.hasStarted && canJoin && <Button onClick={onJoin} loading={joinBusy}>Join session</Button>}
      />
    </Card>
  )
}

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  // Re-evaluate "upcoming / live / ended" every minute while the page is open
  const nowMs = useNow()
  const now = useMemo(() => new Date(nowMs), [nowMs])
  const toast = useToast()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: event, error: eventError } = useEvent(id, { enabled: !!id && isAuthenticated })
  usePageTitle(event?.title || "Event")
  const { data: members = [] } = useEventAttendees(id, { enabled: !!id && isAuthenticated })
  const joinMutation = useJoinEvent()
  const leaveMutation = useLeaveEvent()
  const deleteMutation = useDeleteEvent()

  const isOwner = !!user && event?.created_by === user.id
  const isMember = isOwner || !!event?.is_joined
  const chat = useEventChat(id, { enabled: isAuthenticated && !!event && isMember, userId: user?.id })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/login")
  }, [isAuthenticated, authLoading, navigate])

  if (authLoading || !isAuthenticated) return null

  if (eventError && !event) {
    const notFound = eventError?.response?.status === 404
    return (
      <div className="page-container py-16">
        <EmptyState
          icon={faCalendarXmark}
          title={notFound ? "Event not found" : "Something went wrong"}
          description={notFound ? "This event doesn't exist or has been deleted." : getErrorMessage(eventError, "We couldn't load this event.")}
          action={<Button as={Link} to="/events" variant="secondary">Back to events</Button>}
        />
      </div>
    )
  }
  if (!event) return <PageLoader label="Loading event" />

  const timing = getEventTiming(event, now)
  const joinBusy = joinMutation.isPending || leaveMutation.isPending

  function handleJoinLeave() {
    const mutation = isMember ? leaveMutation : joinMutation
    mutation.mutate(id, {
      onSuccess: () => toast.success(isMember ? "You left the session" : "You're in! Say hi in the chat."),
      onError: (err) => toast.error(getErrorMessage(err, isMember ? "Couldn't leave the session" : "Couldn't join the session")),
    })
  }

  function handleDelete() {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success(`“${event.title}” was deleted`)
        navigate("/events", { replace: true })
      },
      onError: (err) => {
        setConfirmDelete(false)
        toast.error(getErrorMessage(err, "Couldn't delete the event"))
      },
    })
  }

  return (
    <div className="page-container py-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-sm text-fg-subtle">
        <Link to="/events" className="hover:text-fg">Events</Link>
        <FontAwesomeIcon icon={faChevronRight} className="text-[0.6rem]" />
        <span className="truncate text-fg-muted" aria-current="page">{event.title}</span>
      </nav>

      <EventSummary
        event={event}
        memberCount={members.length}
        isOwner={isOwner}
        isMember={isMember}
        timing={timing}
        now={now}
        joinBusy={joinBusy}
        onJoinLeave={handleJoinLeave}
        onDelete={() => setConfirmDelete(true)}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          {isMember ? (
            <ChatPanel eventId={id} currentUserId={user?.id} timing={timing} chat={chat} />
          ) : (
            <ChatLocked
              timing={timing}
              canJoin={members.length < event.capacity}
              onJoin={handleJoinLeave}
              joinBusy={joinBusy}
            />
          )}
        </div>
        <aside className="space-y-6">
          {isMember && timing.isOngoing && (
            <FocusTimerCompact title="Focus while you study" hint="Your own timer. It keeps running if you open the whiteboard." />
          )}
          <MembersList
            members={members}
            presence={chat.presence}
            currentUserId={user?.id}
            hostId={event.created_by}
            capacity={event.capacity}
          />
          <StudyMaterials json={event.study_materials} count={event.materials_count} isMember={isMember} canJoin={!timing.hasStarted} />
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this event?"
        description={<>“{event.title}” and its chat, members and whiteboard will be removed for everyone.</>}
        confirmLabel="Delete event"
        busy={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
