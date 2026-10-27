import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus, faComments, faChalkboard, faCalendarDays, faCompass, faArrowRight, faLocationDot } from "@fortawesome/free-solid-svg-icons"
import { useAuth } from "../auth/authContextValue"
import { describeEventTiming, formatEventWhen, sortByStart } from "../../utils/dates"
import { useNow } from "../../hooks/useNow"
import { useEvents, useMyEvents, useMyEventsCount } from "../../hooks/useEvents"
import { useUserBadge } from "../../hooks/useProfile"
import Card from "../../components/ui/Card"
import Badge from "../../components/ui/Badge"
import Button from "../../components/ui/Button"
import { EmptyState, Skeleton } from "../../components/ui/Feedback"
import EventList, { EventGridSkeleton } from "../events/EventList"
import SessionRow from "../events/SessionRow"
import LevelCard from "../profile/LevelCard"
import OnboardingChecklist from "../onboarding/OnboardingChecklist"
import { onboardingStorage } from "../onboarding/onboardingStorage"
import { FocusTimerCompact } from "../focus/FocusTimer"
import { useFocus } from "../focus/useFocus"

function greeting(now = new Date()) {
  const hour = now.getHours()
  if (hour < 5) return "Burning the midnight oil"
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

function LiveNow({ events }) {
  if (events.length === 0) return null
  return (
    <div className="space-y-3">
      {events.map((event) => (
        <Card key={event.id} tone="success">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <Badge tone="highlight" dot>Live now</Badge>
              <p className="mt-2 line-clamp-2 text-lg font-semibold leading-snug text-fg">{event.title}</p>
              <p className="truncate text-sm text-fg-muted">{event.location}</p>
            </div>
            <div className="flex gap-2">
              <Button as={Link} to={`/events/${event.id}`} variant="secondary" size="sm"><FontAwesomeIcon icon={faComments} />Chat</Button>
              <Button as={Link} to={`/events/${event.id}/whiteboard`} size="sm"><FontAwesomeIcon icon={faChalkboard} />Whiteboard</Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

// The one session to prepare for next, with a countdown
function NextUp({ event }) {
  const now = useNow()
  const countdown = describeEventTiming(event, new Date(now))
  return (
    <Card>
      <p className="label text-fg-subtle">Next up{countdown ? ` · ${countdown}` : ""}</p>
      <h2 className="mt-2 line-clamp-2 break-words text-xl font-semibold leading-snug tracking-[-0.02em] text-fg sm:text-2xl">
        <Link to={`/events/${event.id}`} className="hover:underline hover:decoration-line-strong hover:underline-offset-4">{event.title}</Link>
      </h2>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
        <span>{formatEventWhen(event.starts_at)}</span>
        <span className="inline-flex min-w-0 items-center gap-1.5"><FontAwesomeIcon icon={faLocationDot} className="text-xs text-fg-subtle" /><span className="truncate">{event.location}</span></span>
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button as={Link} to={`/events/${event.id}`} size="sm"><FontAwesomeIcon icon={faComments} />Plan in the chat</Button>
        <Button as={Link} to="/focus" variant="secondary" size="sm">Prepare in the focus room</Button>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const upcoming = useMyEvents({ status: "upcoming" })
  const live = useMyEvents({ status: "ongoing" })
  const totalMine = useMyEventsCount({ status: "all" })
  const discover = useEvents({ status: "upcoming", sort: "soonest", limit: 12 })
  const badge = useUserBadge(user.id)
  const focus = useFocus()
  const [dismissed, setDismissed] = useState(() => onboardingStorage.isDismissed(user.id))

  const discoverEvents = useMemo(
    () => sortByStart((discover.data || []).filter((e) => !e.is_joined && e.created_by !== user.id)).slice(0, 3),
    [discover.data, user.id]
  )

  const upcomingSorted = useMemo(() => sortByStart(upcoming.data || []), [upcoming.data])
  const liveEvents = live.data || []
  const nextUp = liveEvents.length === 0 ? upcomingSorted[0] : null
  const laterSessions = nextUp ? upcomingSorted.slice(1, 5) : upcomingSorted.slice(0, 4)
  const firstEvent = upcomingSorted[0] || liveEvents[0]
  const steps = [
    {
      id: "profile",
      title: "Add your name and a photo",
      description: "Help your study partners recognize you.",
      done: !!(user.name && user.photo_url),
      action: { to: "/profile", label: "Complete your profile" },
    },
    {
      id: "event",
      title: "Join or host your first session",
      description: "Find a session for your exam, or create one in a minute.",
      done: (totalMine.data || 0) > 0,
      action: { to: "/events", label: "Browse sessions" },
    },
    {
      id: "focus",
      title: "Finish one focus block",
      description: "Plan a task, start the timer and work until it rings.",
      done: focus.log.length > 0,
      action: { to: "/focus", label: "Open the focus room" },
    },
    {
      id: "whiteboard",
      title: "Open a group whiteboard",
      description: "Every session has a shared whiteboard for working through problems.",
      done: onboardingStorage.hasOpenedWhiteboard(user.id),
      action: firstEvent ? { to: `/events/${firstEvent.id}/whiteboard`, label: "Open your session's whiteboard" } : null,
      hint: "Join a session first. Its whiteboard unlocks for members.",
    },
  ]
  const onboardingDone = steps.every((s) => s.done)
  const showOnboarding = !dismissed && !onboardingDone && !totalMine.isLoading

  function setOnboardingDismissed(value) {
    onboardingStorage.setDismissed(user.id, value)
    setDismissed(value)
  }

  const firstName = (user.name || "").split(" ")[0]

  return (
    <div className="page-container py-8 sm:py-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label text-fg-subtle">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-2 text-[2rem] leading-tight tracking-[-0.04em] text-fg sm:text-[2.75rem]">
            {greeting()}{firstName ? <>, <span className="serif text-[1.12em]">{firstName}</span></> : ""}
          </h1>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          <LiveNow events={liveEvents} />
          {nextUp && <NextUp event={nextUp} />}

          <Card padded={false}>
            <div className="flex items-center justify-between px-5 pb-2 pt-5 sm:px-6">
              <h2 className="text-lg font-semibold text-fg">{nextUp ? "Later" : "Your upcoming sessions"}</h2>
              <Link to="/events?scope=mine" className="text-sm font-semibold text-accent-text hover:underline">See all</Link>
            </div>
            <div className="px-2 pb-3 sm:px-3">
              {upcoming.isLoading ? (
                <div className="space-y-2 p-3">{[0, 1].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : laterSessions.length > 0 ? (
                laterSessions.map((event) => <SessionRow key={event.id} event={event} />)
              ) : nextUp ? (
                <p className="px-3 pb-3 pt-1 text-sm text-fg-muted">Nothing else planned yet. <Link to="/events" className="font-semibold text-accent-text hover:underline">Find another session</Link></p>
              ) : (
                <EmptyState
                  icon={faCalendarDays}
                  title="Nothing on your calendar"
                  description="Join a session for an exam you're preparing for, or host one and invite your classmates."
                  action={<Button as={Link} to="/events" size="sm">Find a session</Button>}
                  className="!py-10"
                />
              )}
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          {showOnboarding && <OnboardingChecklist steps={steps} onDismiss={() => setOnboardingDismissed(true)} />}
          <FocusTimerCompact />
          <LevelCard stats={badge.data} loading={badge.isLoading} linkToProfile />
          {dismissed && !onboardingDone && (
            <button type="button" onClick={() => setOnboardingDismissed(false)} className="text-sm font-semibold text-accent-text hover:underline">
              Show the getting started guide
            </button>
          )}
        </aside>
      </div>

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl tracking-[-0.035em] text-fg">Discover <span className="serif text-[1.12em]">sessions</span></h2>
            <p className="mt-1 text-sm text-fg-muted">Coming up soon, hosted by other students.</p>
          </div>
          <Link to="/events" className="hidden items-center gap-1.5 text-sm font-semibold text-accent-text hover:underline sm:inline-flex">
            Browse all <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
          </Link>
        </div>
        {discover.isLoading ? (
          <EventGridSkeleton count={3} />
        ) : discoverEvents.length > 0 ? (
          <EventList events={discoverEvents} />
        ) : (
          <Card>
            <EmptyState
              icon={faCompass}
              title="You're caught up"
              description="There are no other upcoming sessions right now. Host one and others can join you."
              action={<Button as={Link} to="/events/create" size="sm"><FontAwesomeIcon icon={faPlus} />Host a session</Button>}
              className="!py-8"
            />
          </Card>
        )}
      </section>
    </div>
  )
}
