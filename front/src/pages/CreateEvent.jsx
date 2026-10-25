import { useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../features/auth/authContextValue"
import { useCreateEvent } from "../hooks/useEvents"
import { getErrorMessage } from "../utils/api"
import { useToast } from "../components/ui/toastContext"
import PageHeader from "../components/ui/PageHeader"
import EventForm from "../features/events/form/EventForm"
import { emptyValues } from "../features/events/form/eventFormModel"

export default function CreateEvent() {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const createEvent = useCreateEvent()
  const initialValues = useMemo(() => emptyValues(), [])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/login")
  }, [isLoading, isAuthenticated, navigate])

  if (!isAuthenticated) return null

  async function handleSubmit(payload) {
    try {
      const event = await createEvent.mutateAsync(payload)
      toast.success("Your session is live. Share it with your classmates!")
      navigate(`/events/${event.id}`, { replace: true })
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't create the session."))
    }
  }

  return (
    <div className="page-container py-8 sm:py-12">
      <PageHeader title="Host a study session" description="It takes about a minute. You can edit everything until the session starts." className="mb-8" />
      <EventForm
        initialValues={initialValues}
        minCapacity={2}
        submitLabel="Publish session"
        busy={createEvent.isPending}
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
      />
    </div>
  )
}
