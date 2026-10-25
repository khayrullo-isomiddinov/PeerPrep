import { useEffect, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowLeft, faCheckCircle, faComments } from "@fortawesome/free-solid-svg-icons"
import { getErrorMessage } from "../utils/api"
import { getEventTiming } from "../utils/dates"
import { useAuth } from "../features/auth/AuthContext"
import { useEvent, useJoinEvent, useLeaveEvent } from "../hooks/useEvents"
import { useEventAttendees } from "../hooks/useEventData"
import { useEventChat } from "../hooks/useEventChat"
import EventSummary from "../features/events/detail/EventSummary"
import MembersList from "../features/events/detail/MembersList"
import ChatPanel from "../features/events/detail/ChatPanel"
import StudyMaterials from "../features/events/detail/StudyMaterials"

const PAGE_CLASS = "min-h-screen tap-safe premium-scrollbar bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50/30 route-transition"

// Re-evaluate "upcoming / ongoing / past" every minute while the page is open
function useNow(intervalMs = 60 * 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

function LoadError({ error }) {
  const notFound = error?.response?.status === 404
  return (
    <div className={PAGE_CLASS}>
      <div className="nav-spacer" />
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{notFound ? "Event Not Found" : "Something Went Wrong"}</h2>
          <p className="text-gray-600 mb-6">
            {notFound ? "This event doesn't exist or has been deleted." : getErrorMessage(error, "We couldn't load this event.")}
          </p>
          <Link to="/events" className="btn-pink-pill">
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            Back to Events
          </Link>
        </div>
      </div>
    </div>
  )
}

function ChatLocked({ timing, canJoin, onJoin }) {
  const { title, text } = timing.isPast
    ? { title: "Event Ended", text: "Chat is closed for completed events." }
    : timing.hasStarted
      ? { title: "Members Only", text: "This event has already started, so only its members can see the chat." }
      : { title: "Join to Chat", text: canJoin ? "Join this event to participate in the group chat." : "This event is full." }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200/60 p-12 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
        <FontAwesomeIcon icon={timing.isPast ? faCheckCircle : faComments} className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-500 mb-6">{text}</p>
      {canJoin && (
        <button
          onClick={onJoin}
          className="touch-target bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 text-white font-bold rounded-xl px-6 py-3 shadow-lg hover:shadow-xl"
        >
          Join Event
        </button>
      )}
    </div>
  )
}

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const now = useNow()
  const [joinError, setJoinError] = useState("")

  const { data: event, error: eventError } = useEvent(id, { enabled: !!id && isAuthenticated })
  const { data: members = [] } = useEventAttendees(id, { enabled: !!id && isAuthenticated })
  const joinMutation = useJoinEvent()
  const leaveMutation = useLeaveEvent()

  const isOwner = !!user && event?.created_by === user.id
  const isMember = isOwner || !!event?.is_joined
  const chat = useEventChat(id, { enabled: isAuthenticated && !!event && isMember, userId: user?.id })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/login")
  }, [isAuthenticated, authLoading, navigate])

  useEffect(() => {
    if (!joinError) return
    const t = setTimeout(() => setJoinError(""), 5000)
    return () => clearTimeout(t)
  }, [joinError])

  if (authLoading || !isAuthenticated) return null
  if (eventError && !event) return <LoadError error={eventError} />
  if (!event) return null

  const timing = getEventTiming(event, now)

  function handleJoinLeave() {
    const mutation = isMember ? leaveMutation : joinMutation
    setJoinError("")
    mutation.mutate(id, {
      onError: (err) => setJoinError(getErrorMessage(err, isMember ? "Failed to leave event" : "Failed to join event")),
    })
  }

  return (
    <div className={PAGE_CLASS}>
      <div className="nav-spacer" />

      {event.cover_image_url && (
        <section className="relative w-full">
          <div className="h-48 md:h-56 relative overflow-hidden">
            <img src={event.cover_image_url} alt={`${event.title} cover`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </div>
        </section>
      )}

      <div className="container-page section space-y-6">
        <Link to="/events" className="inline-flex items-center gap-2 text-gray-700 hover:text-pink-600">
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back to Events</span>
        </Link>

        {joinError && (
          <div role="alert" className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{joinError}</div>
        )}

        <EventSummary
          event={event}
          memberCount={members.length}
          isOwner={isOwner}
          isMember={isMember}
          timing={timing}
          joinBusy={joinMutation.isPending || leaveMutation.isPending}
          onJoinLeave={handleJoinLeave}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <MembersList members={members} presence={chat.presence} currentUserId={user?.id} />
          </div>
          <div className="lg:col-span-2">
            {isMember ? (
              <ChatPanel eventId={id} currentUserId={user?.id} timing={timing} chat={chat} />
            ) : (
              <ChatLocked
                timing={timing}
                canJoin={!timing.hasStarted && members.length < event.capacity}
                onJoin={handleJoinLeave}
              />
            )}
          </div>
        </div>

        <StudyMaterials json={event.study_materials} />
      </div>
    </div>
  )
}
