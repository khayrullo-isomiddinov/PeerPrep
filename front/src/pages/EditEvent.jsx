import { useEffect, useMemo } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { faCalendarXmark, faLock } from "@fortawesome/free-solid-svg-icons"
import { useAuth } from "../features/auth/authContextValue"
import { useEvent, useUpdateEvent } from "../hooks/useEvents"
import { useEventAttendees } from "../hooks/useEventData"
import { getErrorMessage } from "../utils/api"
import { getEventTiming, parseUTCDate } from "../utils/dates"
import { useToast } from "../components/ui/toastContext"
import PageHeader from "../components/ui/PageHeader"
import Button from "../components/ui/Button"
import { EmptyState, PageLoader } from "../components/ui/Feedback"
import EventForm from "../features/events/form/EventForm"
import { LIMITS, valuesFromEvent } from "../features/events/form/eventFormModel"
import { usePageTitle } from "../hooks/usePageTitle"

export default function EditEvent() {
  usePageTitle("Edit event")
  const { id } = useParams()
  const { user, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: event, error } = useEvent(id, { enabled: isAuthenticated })
  const { data: members = [] } = useEventAttendees(id, { enabled: isAuthenticated })
  const updateEvent = useUpdateEvent()
  const initialValues = useMemo(() => (event ? valuesFromEvent(event, parseUTCDate) : null), [event])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/login")
  }, [isLoading, isAuthenticated, navigate])

  if (!isAuthenticated) return null
  if (error) {
    return (
      <div className="page-container py-16">
        <EmptyState icon={faCalendarXmark} title="Event not found" description={getErrorMessage(error, "This event doesn't exist anymore.")} action={<Button as={Link} to="/events" variant="secondary">Back to events</Button>} />
      </div>
    )
  }
  if (!event || !initialValues) return <PageLoader label="Loading event" />

  const canEdit = event.created_by === user?.id && !getEventTiming(event).hasStarted
  if (!canEdit) {
    return (
      <div className="page-container py-16">
        <EmptyState
          icon={faLock}
          title="You can't edit this session"
          description={event.created_by === user?.id ? "Sessions can't be changed once they've started." : "Only the host can edit a session."}
          action={<Button as={Link} to={`/events/${id}`} variant="secondary">Back to the session</Button>}
        />
      </div>
    )
  }

  async function handleSubmit(payload) {
    try {
      await updateEvent.mutateAsync({ id, data: payload })
      toast.success("Changes saved")
      navigate(`/events/${id}`, { replace: true })
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't save your changes."))
    }
  }

  return (
    <div className="page-container py-8 sm:py-12">
      <PageHeader eyebrow={<Link to={`/events/${id}`} className="hover:text-fg">← {event.title}</Link>} title="Edit session" className="mb-8" />
      <EventForm
        initialValues={initialValues}
        minCapacity={Math.max(LIMITS.minCapacity, members.length)}
        submitLabel="Save changes"
        busy={updateEvent.isPending}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/events/${id}`)}
      />
    </div>
  )
}
