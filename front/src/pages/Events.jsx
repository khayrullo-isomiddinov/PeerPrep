import { useEffect, useState, useMemo, useCallback } from "react"
import { useSearchParams, useLocation, Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faCalendarAlt, faSearch, faChevronDown, faChevronUp
} from "@fortawesome/free-solid-svg-icons"
import EventList from "../features/events/EventList"
import EditEventForm from "../features/events/EditEventForm"
import { useAuth } from "../features/auth/AuthContext"
import { useEvents, useMyEvents, useMyEventsCount, useUpdateEvent } from "../hooks/useEvents"
import { queryClient } from "../lib/queryClient"

export default function Events() {
  const { isAuthenticated } = useAuth()
  const [params] = useSearchParams()
  const location = useLocation()

  const [statusView, setStatusView] = useState("upcoming")

  const currentParams = useMemo(() => ({
    q: params.get('q') || undefined,
    location: params.get('location') || undefined,
    exam: params.get('exam') || undefined,
    status: statusView
  }), [params, statusView])

  // State declarations - must come before React Query hooks that use them
  const [searchQuery, setSearchQuery] = useState("")
  const [showMyEvents, setShowMyEvents] = useState(false)
  const [timeFilter, setTimeFilter] = useState("all")
  const [examFilter, setExamFilter] = useState("all")
  const [editingEvent, setEditingEvent] = useState(null)

  // React Query hooks - handles caching automatically
  const { data: events = [], isLoading: loading, refetch } = useEvents(currentParams)
  const { data: myEvents = [], isLoading: loadingMyEvents } = useMyEvents(
    { status: statusView },
    { enabled: isAuthenticated && showMyEvents }
  )
  const { data: myEventsCount = 0, isLoading: loadingMyEventsCount } = useMyEventsCount(
    { status: statusView },
    { enabled: isAuthenticated }
  )
  const updateEventMutation = useUpdateEvent()

  const statusLabel = statusView === "past" ? "Past" : statusView === "ongoing" ? "Ongoing" : "Upcoming"

  function handleStatusChange(next) {
    if (next === statusView) return
    setStatusView(next)
    // React Query will automatically refetch with new params
  }

  useEffect(() => {
    setTimeFilter("all")
  }, [statusView])

  // Handle event join state changes from WebSocket/other sources
  useEffect(() => {
    const handleEventJoinStateChange = (e) => {
      const eventUpdate = e.detail
      if (eventUpdate?.eventId) {
        // Update React Query cache directly
        queryClient.setQueryData(['events', 'list', currentParams], (oldData) => {
          if (!oldData) return oldData
          return oldData.map(event => {
            if (event.id === eventUpdate.eventId) {
              return {
                ...event,
                is_joined: eventUpdate.isJoined,
                attendee_count: eventUpdate.attendeeCount
              }
            }
            return event
          })
        })
      }
    }

    window.addEventListener('eventJoinStateChanged', handleEventJoinStateChange)
    return () => {
      window.removeEventListener('eventJoinStateChanged', handleEventJoinStateChange)
    }
  }, [currentParams])

  // Handle new event creation
  useEffect(() => {
    if (location.state?.newEvent) {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ['events'] })
      window.history.replaceState({}, document.title)
    }
    setSearchQuery(params.get('q') || "")
  }, [location.state, params])


  // Background refresh when tab becomes visible (React Query handles this better)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && statusView !== "past") {
        refetch()
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Reduced polling frequency - React Query handles stale-while-revalidate
    const pollInterval = setInterval(() => {
      if (statusView === "past") return;
      if (!document.hidden && events.length > 0) {
        refetch()
      }
    }, 60000); // 60 seconds

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(pollInterval);
    };
  }, [statusView, events.length, refetch])

  const parseUTCDate = (dateString) => {
    if (!dateString) return null
    if (dateString.includes('Z') || dateString.includes('+') || dateString.match(/-\d{2}:\d{2}$/)) {
      return new Date(dateString)
    }
    return new Date(dateString + 'Z')
  }

  const filteredEvents = useMemo(() => {
    let filtered = events
    const now = new Date()
    if (statusView === "upcoming" && timeFilter !== "all") {
      if (timeFilter === "today") {
        const todayStart = new Date(now)
        todayStart.setHours(0, 0, 0, 0)
        const todayEnd = new Date(now)
        todayEnd.setHours(23, 59, 59, 999)

        filtered = filtered.filter(event => {
          const eventDate = parseUTCDate(event.starts_at)
          if (!eventDate) return false
          return eventDate >= todayStart && eventDate <= todayEnd
        })
      } else if (timeFilter === "week") {
        const weekEnd = new Date(now)
        weekEnd.setDate(weekEnd.getDate() + 7)

        filtered = filtered.filter(event => {
          const eventDate = parseUTCDate(event.starts_at)
          if (!eventDate) return false
          return eventDate > now && eventDate <= weekEnd
        })
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.location.toLowerCase().includes(query) ||
        (event.exam && event.exam.toLowerCase().includes(query))
      )
    }

    if (examFilter !== "all" && examFilter.trim()) {
      filtered = filtered.filter(event =>
        event.exam && event.exam.toLowerCase().includes(examFilter.toLowerCase())
      )
    }

    return filtered
  }, [events, searchQuery, timeFilter, examFilter, statusView])

  function onChanged(updated) {
    if (!updated) {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ['events'] })
      return
    }

    // Update React Query cache optimistically
    queryClient.setQueryData(['events', 'list', currentParams], (oldData) => {
      if (!oldData) return oldData
      return oldData.map(e => {
        if (e.id === updated.id) {
          return {
            ...e,
            is_joined: updated.is_joined !== undefined ? updated.is_joined : e.is_joined,
            attendee_count: updated.attendee_count !== undefined ? updated.attendee_count : e.attendee_count
          }
        }
        return e
      })
    })
  }

  function handleDelete(eventId) {
    // Remove from cache - mutations handle this automatically
    queryClient.removeQueries({ queryKey: ['events', 'detail', eventId] })
    queryClient.invalidateQueries({ queryKey: ['events'] })
  }

  async function handleUpdateEvent(eventId, updatedData) {
    const data = await updateEventMutation.mutateAsync({ id: eventId, data: updatedData })
    setEditingEvent(null)
    return data
  }

  if (loading && events.length === 0) {
    return null
  }

  return (
    <div className="min-h-screen tap-safe premium-scrollbar route-transition bg-gray-50 relative">
      <div className="nav-spacer" />

      <section className="container-page pt-4 pb-6">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 pb-4 border-b border-gray-200">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 whitespace-nowrap">Events</h1>
              <div className="inline-flex border border-gray-300 bg-white shadow-sm" style={{ borderRadius: 9999 }}>
                <button
                  onClick={() => handleStatusChange("upcoming")}
                  className={`px-4 py-1.5 text-xs font-semibold ${statusView === "upcoming" ? "bg-indigo-600 text-white" : "text-gray-600"}`}
                  style={{ borderRadius: 9999 }}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => handleStatusChange("ongoing")}
                  className={`px-4 py-1.5 text-xs font-semibold ${statusView === "ongoing" ? "bg-indigo-600 text-white" : "text-gray-600"}`}
                  style={{ borderRadius: 9999 }}
                >
                  Ongoing
                </button>
                <button
                  onClick={() => handleStatusChange("past")}
                  className={`px-4 py-1.5 text-xs font-semibold ${statusView === "past" ? "bg-indigo-600 text-white" : "text-gray-600"}`}
                  style={{ borderRadius: 9999 }}
                >
                  Past
                </button>
              </div>
              <span className="text-xs uppercase tracking-wide text-gray-500">
                {statusLabel} view
              </span>
              <div className="flex items-center gap-2 ml-auto">
                {isAuthenticated && (
                  <>
                    <button
                      onClick={() => {
                        setShowMyEvents(!showMyEvents)
                      }}
                      className="flex items-center justify-between gap-2 px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 group shadow-sm"
                      style={{ borderRadius: '0' }}
                    >
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4 text-gray-600" />
                        <span className="font-medium text-gray-900 text-sm">
                          {statusView === "past" ? "My Past Events" : statusView === "ongoing" ? "My Ongoing Events" : "My Events"}
                        </span>
                        {loadingMyEventsCount ? (
                          <span className="px-1.5 py-0.5 bg-gray-200 text-gray-400 text-xs font-semibold">
                            ...
                          </span>
                        ) : myEventsCount > 0 ? (
                          <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-xs font-semibold">
                            {myEventsCount}
                          </span>
                        ) : null}
                      </div>
                      <FontAwesomeIcon
                        icon={showMyEvents ? faChevronUp : faChevronDown}
                        className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 ml-1"
                      />
                    </button>
                    <Link
                      to="/events/create"
                      className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 font-medium text-sm shadow-sm"
                      style={{ borderRadius: '0' }}
                    >
                      <FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4" />
                      <span>Create</span>
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px] max-w-xl">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <FontAwesomeIcon icon={faSearch} className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder={`Search ${statusLabel.toLowerCase()} events...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 text-sm shadow-sm"
                  style={{ borderRadius: '0' }}
                />
              </div>

              <div className="flex items-center gap-1 flex-wrap">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Filter by exam..."
                    value={examFilter === "all" ? "" : examFilter}
                    onChange={(e) => setExamFilter(e.target.value || "all")}
                    className="px-3 py-2 text-xs border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-700 w-32"
                    style={{ borderRadius: '0' }}
                  />
                </div>
                {statusView === "upcoming" || statusView === "ongoing" ? (
                  <>
                    <button
                      onClick={() => setTimeFilter("all")}
                      className={`px-3 py-2 text-xs font-semibold ${timeFilter === "all"
                          ? "bg-indigo-600 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                        }`}
                      style={{ borderRadius: '0' }}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setTimeFilter("upcoming")}
                      className={`px-3 py-2 text-xs font-semibold transition-colors ${timeFilter === "upcoming"
                          ? "bg-indigo-600 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                        }`}
                      style={{ borderRadius: '0' }}
                    >
                      Soon
                    </button>
                    <button
                      onClick={() => setTimeFilter("today")}
                      className={`px-3 py-2 text-xs font-semibold transition-colors ${timeFilter === "today"
                          ? "bg-indigo-600 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                        }`}
                      style={{ borderRadius: '0' }}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setTimeFilter("week")}
                      className={`px-3 py-2 text-xs font-semibold transition-colors ${timeFilter === "week"
                          ? "bg-indigo-600 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                        }`}
                      style={{ borderRadius: '0' }}
                    >
                      This Week
                    </button>
                  </>
                ) : (
                  <div className="px-3 py-2 text-xs bg-white border border-gray-200 text-gray-600">
                    Completed events are archived here
                  </div>
                )}
              </div>
            </div>
          </div>

          {isAuthenticated && showMyEvents && (
            <div className="pt-2">
              {loadingMyEvents ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="space-y-4">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : myEvents.length > 0 ? (
                <EventList events={myEvents} onChanged={onChanged} onDelete={handleDelete} onEdit={setEditingEvent} />
              ) : (
                <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                  <p className="text-gray-600 text-sm">
                    {statusView === "past" ? "No past events yet" : "No events yet"}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{statusLabel} Events</h2>
              {filteredEvents.length > 0 && (
                <span className="text-sm text-gray-500">
                  {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
                </span>
              )}
            </div>

            {loading && events.length === 0 ? (
              null
            ) : filteredEvents.length > 0 ? (
              <EventList events={filteredEvents} onChanged={onChanged} onDelete={handleDelete} onEdit={setEditingEvent} />
            ) : (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <FontAwesomeIcon icon={faCalendarAlt} className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {statusView === "past" ? "No past events yet" : "No events found"}
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {statusView === "past"
                    ? "Events drop out of the main feed when they end. You'll see completed sessions here."
                    : searchQuery
                      ? "Try adjusting your search to find more events."
                      : "No events available at the moment. Be the first to create one!"
                  }
                </p>
                {isAuthenticated && (
                  <Link
                    to="/events/create"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold shadow-sm hover:shadow-md"
                  >
                    <FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4" />
                    Create Event
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {editingEvent && (
        <EditEventForm
          event={editingEvent}
          onUpdate={handleUpdateEvent}
          onCancel={() => setEditingEvent(null)}
        />
      )}
    </div>
  )
}
