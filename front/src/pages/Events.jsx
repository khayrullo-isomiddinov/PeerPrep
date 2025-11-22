import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { useSearchParams, useLocation } from "react-router-dom"
import { Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faCalendarAlt, faArrowsRotate, faSearch, faChevronDown, faChevronUp
} from "@fortawesome/free-solid-svg-icons"
import EventList from "../features/events/EventList"
import EditEventForm from "../features/events/EditEventForm"
import { listEvents, getMyEvents, getMyEventsCount, updateEvent } from "../utils/api"
import { useAuth } from "../features/auth/AuthContext"
import axios from "axios"
import { getCachedEvents, setCachedEvents } from "../utils/dataCache"
import { getCachedPage, setCachedPage } from "../utils/pageCache"
import { PageSkeleton } from "../components/SkeletonLoader"
import { startPageLoad, endPageLoad } from "../utils/usePageLoader"


export default function Events() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [params] = useSearchParams()
  const location = useLocation()

  const [statusView, setStatusView] = useState("upcoming")

  const currentParams = useMemo(() => ({
    q: params.get('q') || undefined,
    location: params.get('location') || undefined,
    exam: params.get('exam') || undefined,
    status: statusView
  }), [params, statusView])

  const cachedEvents = getCachedEvents(currentParams)
  const [events, setEvents] = useState(cachedEvents || [])
  const [myEvents, setMyEvents] = useState([])
  const [myEventsCount, setMyEventsCount] = useState(0)
  const [loading, setLoading] = useState(!cachedEvents || cachedEvents.length === 0)
  const [loadingMyEvents, setLoadingMyEvents] = useState(false)
  const [loadingMyEventsCount, setLoadingMyEventsCount] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showMyEvents, setShowMyEvents] = useState(false)
  const [timeFilter, setTimeFilter] = useState("all") // "all", "upcoming", "today", "week"
  const [examFilter, setExamFilter] = useState("all") // "all" or specific exam
  const [editingEvent, setEditingEvent] = useState(null)

  // --- Race condition prevention: request control ---
  const abortControllerRef = useRef(null)
  const requestSequenceRef = useRef(0)

  // Cleanup on unmount: abort any in-flight request
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const statusLabel = statusView === "past" ? "Past" : statusView === "ongoing" ? "Ongoing" : "Upcoming"

  async function fetchEventsWithGuard(cacheParams, nextStatus) {
    // Cancel previous request, if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    const seq = ++requestSequenceRef.current
    setLoading(true)

    try {
      const data = await listEvents(cacheParams, { signal: controller.signal })

      // If this request was aborted, or another request has started since, ignore
      if (controller.signal.aborted) return
      if (seq !== requestSequenceRef.current) return

      const safeData = Array.isArray(data) ? data : []
      setEvents(safeData)

      // Update cache
      setCachedPage("events", safeData, cacheParams)
      setCachedEvents(safeData, cacheParams)
    } catch (err) {
      if (err.name === "AbortError" || err.name === "CanceledError" || axios.isCancel(err)) {
        // Silent: this is an expected case when switching tabs quickly
        return
      }
      console.error("Failed to load events:", err)
      setEvents([])
    } finally {
      // Only clear loading if this is still the latest request
      if (seq === requestSequenceRef.current && !abortControllerRef.current?.signal.aborted) {
        setLoading(false)
      }
    }
  }

  function handleStatusChange(next) {
    if (next === statusView) return
    
    // 1) Set the new view immediately
    setStatusView(next)
    
    // 2) Build cache params
    const q = params.get('q') || undefined
    const location = params.get('location') || undefined
    const exam = params.get('exam') || undefined
    const cacheParams = { q, location, exam, status: next }
    
    // 3) Try to show cached data instantly (optimistic UX)
    const cached = getCachedPage("events", cacheParams)
    const cachedEvents = getCachedEvents(cacheParams) || cached?.data
    
    if (cachedEvents && cachedEvents.length > 0) {
      setEvents(cachedEvents)
    } else {
      // No cache: show empty state while fetching
      setEvents([])
    }
    
    // 4) Fetch fresh data with guarded request (prevents race conditions)
    fetchEventsWithGuard(cacheParams, next)
  }

  useEffect(() => {
    setTimeFilter("all")
  }, [statusView])

  const load = useCallback(async (showLoading = true, force = false) => {
    // Check page cache first (skip if force = true)
    const { getCachedPage, setCachedPage } = await import("../utils/pageCache")
    const q = params.get('q') || undefined
    const location = params.get('location') || undefined
    const exam = params.get('exam') || undefined
    const cacheParams = { q, location, exam, status: statusView }

    // Skip cache when force = true (for polling)
    if (!force) {
      const cached = getCachedPage("events", cacheParams)

      if (cached && cached.data && !showLoading) {
        // Background refresh - use cached data
        setEvents(cached.data)
        // Refresh in background if expired
        if (cached.isExpired) {
          setTimeout(async () => {
            try {
              const data = await listEvents(cacheParams)
              setEvents(data)
              setCachedPage("events", data, cacheParams)
              setCachedEvents(data, cacheParams)
            } catch (error) {
              console.error("Background refresh failed:", error)
            }
          }, 100)
        }
        return
      }
    }

    // No cache or initial load or forced refresh
    if (showLoading) {
      setLoading(true)
    }
    try {
      const data = await listEvents(cacheParams)
      setEvents(data)
      setCachedPage("events", data, cacheParams)
      setCachedEvents(data, cacheParams)
    } catch (error) {
      console.error("Failed to load events:", error)
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [params, statusView])

  const loadMyEventsCount = useCallback(async () => {
    if (!isAuthenticated) {
      setMyEventsCount(0)
      return
    }
    setLoadingMyEventsCount(true)
    try {
      const count = await getMyEventsCount({ status: statusView })
      setMyEventsCount(count)
    } catch (error) {
      console.error("Failed to load my events count:", error)
      setMyEventsCount(0)
    } finally {
      setLoadingMyEventsCount(false)
    }
  }, [isAuthenticated, statusView])

  const loadMyEvents = useCallback(async () => {
    if (!isAuthenticated) {
      setMyEvents([])
      return
    }
    setLoadingMyEvents(true)
    try {
      const data = await getMyEvents({ status: statusView })
      console.log("My Events API response:", data)
      if (data && data.length > 0) {
        console.log("First event sample:", {
          id: data[0].id,
          title: data[0].title,
          attendee_count: data[0].attendee_count,
          is_joined: data[0].is_joined,
          created_by: data[0].created_by
        })
      }
      setMyEvents(data || [])
      // Update count when full list loads
      setMyEventsCount(data?.length || 0)
    } catch (error) {
      console.error("Failed to load my events:", error)
      setMyEvents([])
    } finally {
      setLoadingMyEvents(false)
    }
  }, [isAuthenticated, statusView])

  useEffect(() => {
    if (isAuthenticated) {
      loadMyEventsCount()
    }
  }, [isAuthenticated, loadMyEventsCount])

  useEffect(() => {
    if (isAuthenticated && showMyEvents) {
      loadMyEvents()
    }
  }, [isAuthenticated, showMyEvents, loadMyEvents])

  useEffect(() => {
    const pageId = 'events'
    const cached = getCachedEvents(currentParams)

    if (location.state?.newEvent) {
      const newEvent = location.state.newEvent

      // Invalidate cache to force fresh data
      import("../utils/pageCache").then(({ invalidateCache }) => {
        invalidateCache("events")
        invalidateCache("home:events")
      })

      // Immediately refresh the list to get enriched data (attendee_count, is_joined)
      // This ensures the new event appears with all the data it needs
      setLoading(true)
      load(true).then(() => {
        // After refresh, the new event will be in the list with all enriched data
        setLoading(false)
      }).catch(() => {
        setLoading(false)
      })

      // Refresh my events if the section is open
      if (showMyEvents) {
        loadMyEvents()
      }
      if (isAuthenticated) {
        loadMyEventsCount()
      }
      window.history.replaceState({}, document.title)
      endPageLoad(pageId)
    } else if (cached && cached.length > 0) {
      setEvents(cached)
      setLoading(false)
      endPageLoad(pageId)
      if (statusView !== "past") {
        setTimeout(() => load(false), 100)
      }
      
    } else {
      startPageLoad(pageId)
      // Use guarded fetch for initial load too
      const q = params.get('q') || undefined
      const location = params.get('location') || undefined
      const exam = params.get('exam') || undefined
      const cacheParams = { q, location, exam, status: statusView }
      fetchEventsWithGuard(cacheParams, statusView).finally(() => {
        endPageLoad(pageId)
      })
      
      // Pre-cache other status views in background for instant switching
      const otherStatuses = ["ongoing", "past"].filter(s => s !== statusView)
      otherStatuses.forEach(status => {
        setTimeout(async () => {
          try {
            const data = await listEvents({ q, location, exam, status, limit: 50 })
            if (data && data.length > 0) {
              setCachedPage("events", data, { q, location, exam, status })
              setCachedEvents(data, { q, location, exam, status })
            }
          } catch (error) {
            // Silently fail - this is just pre-caching
          }
        }, 500) // Delay to not block initial load
      })
    }
    setSearchQuery(params.get('q') || "")
  }, [params, currentParams, location.state, showMyEvents, loadMyEvents, statusView])


  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && statusView !== "past") {
        load(false, true); 
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const pollInterval = setInterval(() => {
      if (statusView === "past") return;
      if (!document.hidden && events.length > 0) {
        load(false, true);
      }
    }, 5000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(pollInterval);
    };
  }, [statusView, events.length, load])



  // Helper to parse UTC datetime strings correctly
  // Backend sends UTC times, so if no timezone indicator, assume UTC
  const parseUTCDate = (dateString) => {
    if (!dateString) return null
    // If already has timezone info, use as-is
    if (dateString.includes('Z') || dateString.includes('+') || dateString.match(/-\d{2}:\d{2}$/)) {
      return new Date(dateString)
    }
    // Otherwise, treat as UTC by appending 'Z'
    return new Date(dateString + 'Z')
  }

  const filteredEvents = useMemo(() => {
    // Backend already filters by status, so we can trust the events array
    // Only apply client-side filters (search, time filter, exam filter)
    let filtered = events
    const now = new Date()

    // Only apply time filter for upcoming events
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



  const trendingEvents = useMemo(() => {
    if (statusView !== "upcoming") return []
    const now = new Date()
    return events
      .filter(event => {
        const start = parseUTCDate(event.starts_at)
        return start && start > now
      })
      .sort((a, b) => (b.attendees || 0) - (a.attendees || 0))
      .slice(0, 3)
  }, [events, statusView])

  function onChanged(updated) {
    if (!updated) {
      load(false)
      loadMyEvents()
      return
    }

    const updatedEvents = events.map(e => {
      if (e.id === updated.id) {
        return {
          ...e,
          is_joined: updated.is_joined !== undefined ? updated.is_joined : e.is_joined,
          attendee_count: updated.attendee_count !== undefined ? updated.attendee_count : e.attendee_count
        }
      }
      return e
    })
    setEvents(updatedEvents)

    const q = params.get('q') || undefined
    const location = params.get('location') || undefined
    const exam = params.get('exam') || undefined
    setCachedEvents(updatedEvents, { q, location, exam, status: statusView })
    setMyEvents(prev => prev.map(e => {
      if (e.id === updated.id) {
        return {
          ...e,
          is_joined: updated.is_joined !== undefined ? updated.is_joined : e.is_joined,
          attendee_count: updated.attendee_count !== undefined ? updated.attendee_count : e.attendee_count
        }
      }
      return e
    }))
    if (isAuthenticated) {
      loadMyEventsCount()
    }
  }

  function handleDelete(eventId) {
    const updatedEvents = events.filter(e => e.id !== eventId)
    setEvents(updatedEvents)
    const q = params.get('q') || undefined
    const location = params.get('location') || undefined
    const exam = params.get('exam') || undefined
    setCachedEvents(updatedEvents, { q, location, exam, status: statusView })
    setMyEvents(prev => prev.filter(e => e.id !== eventId))
    if (isAuthenticated) {
      loadMyEventsCount()
    }
  }

  async function handleUpdateEvent(eventId, updatedData) {
    const data = await updateEvent(eventId, updatedData)
    const updatedEvents = events.map(e => (e.id === eventId ? data : e))
    setEvents(updatedEvents)
    const q = params.get('q') || undefined
    const location = params.get('location') || undefined
    const exam = params.get('exam') || undefined
    setCachedEvents(updatedEvents, { q, location, exam, status: statusView })
    setMyEvents(prev => prev.map(e => (e.id === eventId ? data : e)))
    if (isAuthenticated) {
      loadMyEventsCount()
    }

    const { setCachedPage, invalidateCache } = await import("../utils/pageCache")
    setCachedPage(`event:${eventId}`, data)
    invalidateCache("events")
    invalidateCache("home:events")

    setEditingEvent(null)
    return data
  }

  if (loading && events.length === 0) {
    return <PageSkeleton />
  }

  return (
    <div className="min-h-screen tap-safe premium-scrollbar route-transition bg-gray-50">
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
                        if (!showMyEvents) {
                          loadMyEvents()
                        }
                        setShowMyEvents(!showMyEvents)
                      }}
                      className="flex items-center justify-between gap-2 px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 transition-colors group shadow-sm"
                      style={{ borderRadius: '0' }}
                    >
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4 text-gray-600" />
                        <span className="font-medium text-gray-900 text-sm">
                          {statusView === "past" ? "My Past Events" : statusView === "ongoing" ? "My Ongoing Events" : "My Events"}
                        </span>
                        {loadingMyEventsCount ? (
                          <span className="px-1.5 py-0.5 bg-gray-200 text-gray-400 text-xs font-semibold animate-pulse">
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
                        className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors ml-1"
                      />
                    </button>
                    <Link
                      to="/events/create"
                      className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium text-sm shadow-sm"
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
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 text-sm shadow-sm transition-all"
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
                      className={`px-3 py-2 text-xs font-semibold transition-colors ${timeFilter === "all"
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
                      <div className="animate-pulse space-y-4">
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
              <PageSkeleton />
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
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow-sm hover:shadow-md"
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
