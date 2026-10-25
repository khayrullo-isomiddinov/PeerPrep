import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faMagnifyingGlass, faPlus, faXmark, faCalendarDays, faFilter } from "@fortawesome/free-solid-svg-icons"
import { useAuth } from "../features/auth/authContextValue"
import { useEvents, useMyEvents } from "../hooks/useEvents"
import EventList, { EventGridSkeleton } from "../features/events/EventList"
import PageHeader from "../components/ui/PageHeader"
import SegmentedControl from "../components/ui/SegmentedControl"
import Button from "../components/ui/Button"
import { EmptyState } from "../components/ui/Feedback"
import { controlClasses } from "../components/ui/fieldStyles"
import { parseUTCDate } from "../utils/dates"
import { usePageTitle } from "../hooks/usePageTitle"

const STATUS_OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "ongoing", label: "Live" },
  { value: "past", label: "Past" },
]
const WHEN_OPTIONS = [
  { value: "any", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "week", label: "Next 7 days" },
]

function withinWindow(event, when) {
  if (when === "any") return true
  const start = parseUTCDate(event.starts_at)
  if (!start) return false
  const end = new Date()
  if (when === "today") end.setHours(23, 59, 59, 999)
  else end.setDate(end.getDate() + 7)
  return start <= end
}

// Keeps a text box responsive while only updating the URL (and refetching) after typing pauses
function useDebouncedParam(value, onCommit, delay = 300) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  useEffect(() => {
    if (draft === value) return
    const t = setTimeout(() => onCommit(draft), delay)
    return () => clearTimeout(t)
  }, [draft, value, onCommit, delay])
  return [draft, setDraft]
}

function emptyCopy(scope, status) {
  if (status === "past") {
    return { title: scope === "mine" ? "No past sessions yet" : "No past events yet", description: "Sessions show up here once they've ended." }
  }
  if (status === "ongoing") {
    return {
      title: scope === "mine" ? "None of your sessions are live" : "Nothing is live right now",
      description: "Live sessions appear here while they're happening.",
    }
  }
  return scope === "mine"
    ? { title: "You haven't joined any upcoming sessions", description: "Browse what other students are hosting, or host your own." }
    : { title: "No upcoming events yet", description: "Be the first: host a session and invite your classmates." }
}

export default function Events() {
  usePageTitle("Events")
  const { isAuthenticated } = useAuth()
  const [params, setParams] = useSearchParams()

  const status = STATUS_OPTIONS.some((o) => o.value === params.get("status")) ? params.get("status") : "upcoming"
  const scope = isAuthenticated && params.get("scope") === "mine" ? "mine" : "all"
  const when = status === "upcoming" && WHEN_OPTIONS.some((o) => o.value === params.get("when")) ? params.get("when") : "any"
  const q = params.get("q") || ""
  const exam = params.get("exam") || ""
  const location = params.get("location") || ""

  const updateParam = useMemo(() => (key, value) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    }, { replace: true })
  }, [setParams])

  const commitSearch = useMemo(() => (v) => updateParam("q", v.trim()), [updateParam])
  const commitExam = useMemo(() => (v) => updateParam("exam", v.trim()), [updateParam])
  const [search, setSearch] = useDebouncedParam(q, commitSearch)
  const [examDraft, setExamDraft] = useDebouncedParam(exam, commitExam)

  const listParams = useMemo(
    () => ({ status, q: q || undefined, exam: exam || undefined, location: location || undefined }),
    [status, q, exam, location]
  )
  const allEvents = useEvents(listParams, {
    enabled: scope === "all",
    refetchInterval: status === "past" ? false : 60 * 1000,
    refetchOnWindowFocus: status !== "past",
  })
  const myEvents = useMyEvents({ status }, { enabled: scope === "mine" })
  const active = scope === "mine" ? myEvents : allEvents

  const events = useMemo(() => {
    let list = active.data || []
    if (scope === "mine") {
      // The my-events endpoint doesn't search, so filter locally
      const needle = q.toLowerCase()
      const examNeedle = exam.toLowerCase()
      list = list.filter((e) =>
        (!needle || `${e.title} ${e.description || ""} ${e.location}`.toLowerCase().includes(needle)) &&
        (!examNeedle || (e.exam || "").toLowerCase().includes(examNeedle))
      )
    }
    return list.filter((e) => withinWindow(e, when))
  }, [active.data, scope, q, exam, when])

  const hasFilters = !!(q || exam || location || when !== "any")
  function clearFilters() {
    setParams((prev) => {
      const next = new URLSearchParams()
      for (const key of ["status", "scope"]) if (prev.get(key)) next.set(key, prev.get(key))
      return next
    }, { replace: true })
  }

  const empty = emptyCopy(scope, status)

  return (
    <div className="page-container py-8 sm:py-12">
      <PageHeader
        title="Events"
        description="Study sessions hosted by students. Join one, or host your own."
      />

      <div className="mt-8 flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search events</span>
            <FontAwesomeIcon icon={faMagnifyingGlass} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-fg-subtle" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by topic, course or place"
              className={`${controlClasses} h-11 pl-10`}
            />
          </label>
          <label className="relative lg:w-56">
            <span className="sr-only">Filter by exam</span>
            <FontAwesomeIcon icon={faFilter} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-fg-subtle" />
            <input
              value={examDraft}
              onChange={(e) => setExamDraft(e.target.value)}
              placeholder="Exam, e.g. MCAT"
              className={`${controlClasses} h-11 pl-9`}
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SegmentedControl
            label="Event status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(v) => updateParam("status", v === "upcoming" ? "" : v)}
            className="w-full sm:w-auto"
          />
          {isAuthenticated && (
            <SegmentedControl
              label="Whose events"
              options={[{ value: "all", label: "All events" }, { value: "mine", label: "My events" }]}
              value={scope}
              onChange={(v) => updateParam("scope", v === "mine" ? "mine" : "")}
              className="w-full sm:w-auto"
            />
          )}
          {status === "upcoming" && (
            <div className="flex flex-wrap gap-2 sm:ml-auto" role="group" aria-label="When">
              {WHEN_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={when === o.value}
                  onClick={() => updateParam("when", o.value === "any" ? "" : o.value)}
                  className={`h-8 rounded-full border px-3 text-xs font-semibold transition-colors ${
                    when === o.value ? "border-accent bg-accent-soft text-accent-text" : "border-line text-fg-muted hover:border-line-strong hover:text-fg"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {location && (
          <div>
            <button
              type="button"
              onClick={() => updateParam("location", "")}
              aria-label={`Remove location filter: ${location}`}
              className="inline-flex h-8 items-center gap-2 rounded-full bg-accent-soft px-3 text-xs font-semibold text-accent-text"
            >
              Near “{location}”
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        )}
      </div>

      <section className="mt-8" aria-live="polite" aria-busy={active.isLoading}>
        {active.isLoading ? (
          <EventGridSkeleton />
        ) : active.isError ? (
          <EmptyState
            icon={faCalendarDays}
            title="Couldn't load events"
            description="Check your connection and try again."
            action={<Button variant="secondary" onClick={() => active.refetch()}>Try again</Button>}
          />
        ) : events.length > 0 ? (
          <>
            <p className="mb-4 text-sm text-fg-subtle">{events.length} {events.length === 1 ? "event" : "events"}</p>
            <EventList events={events} />
          </>
        ) : hasFilters ? (
          <EmptyState
            icon={faMagnifyingGlass}
            title="No events match your filters"
            description="Try a different search, or clear the filters to see everything."
            action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
          />
        ) : (
          <EmptyState
            icon={faCalendarDays}
            title={empty.title}
            description={empty.description}
            action={isAuthenticated ? (
              <>
                {scope === "mine" && <Button variant="secondary" onClick={() => updateParam("scope", "")}>Browse all events</Button>}
                {status !== "past" && <Button as={Link} to="/events/create"><FontAwesomeIcon icon={faPlus} />Host an event</Button>}
              </>
            ) : (
              <Button as={Link} to="/register">Create a free account</Button>
            )}
          />
        )}
      </section>
    </div>
  )
}
