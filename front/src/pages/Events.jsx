import { useEffect, useState, useMemo, useCallback } from "react"
import { useSearchParams, useLocation } from "react-router-dom"
import { Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { 
  faCalendarAlt, faArrowsRotate, faSearch, faChevronDown, faChevronUp
} from "@fortawesome/free-solid-svg-icons"
import EventList from "../features/events/EventList"
import { listEvents, getMyEvents } from "../utils/api"
import { useAuth } from "../features/auth/AuthContext"
import { getCachedEvents, setCachedEvents } from "../utils/dataCache"


export default function Events() {
  const { isAuthenticated } = useAuth()
  const [params] = useSearchParams()
  const location = useLocation()
  
  const currentParams = useMemo(() => ({
    q: params.get('q') || undefined,
    location: params.get('location') || undefined
  }), [params])
  
  const cachedEvents = getCachedEvents(currentParams)
  const [events, setEvents] = useState(cachedEvents || [])
  const [myEvents, setMyEvents] = useState([])
  const [loading, setLoading] = useState(!cachedEvents)
  const [loadingMyEvents, setLoadingMyEvents] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showMyEvents, setShowMyEvents] = useState(false)

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
    }
    try {
      const q = params.get('q') || undefined
      const location = params.get('location') || undefined
      console.log('Loading events with params:', { q, location })
      const data = await listEvents({ q, location })
      console.log('Events loaded:', data)
      setEvents(data)
      setCachedEvents(data, { q, location })
    } catch (error) {
      console.error("Failed to load events:", error)
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [params])

  const loadMyEvents = useCallback(async () => {
    if (!isAuthenticated) {
      setMyEvents([])
      return
    }
    setLoadingMyEvents(true)
    try {
      const data = await getMyEvents()
      setMyEvents(data || [])
    } catch (error) {
      console.error("Failed to load my events:", error)
      setMyEvents([])
    } finally {
      setLoadingMyEvents(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    const cached = getCachedEvents(currentParams)
    if (location.state?.newEvent) {
      const newEvent = location.state.newEvent
      setEvents(prevEvents => {
        const existingEvents = cached || prevEvents
        const filteredEvents = existingEvents.filter(e => e.id !== newEvent.id)
        const updatedEvents = [newEvent, ...filteredEvents]
        setCachedEvents(updatedEvents, { q: params.get('q') || undefined, location: params.get('location') || undefined })
        return updatedEvents
      })
      setLoading(false)
      load(false)
      // Refresh my events if the section is open
      if (showMyEvents) {
        loadMyEvents()
      }
      window.history.replaceState({}, document.title)
    } else if (cached) {
      setEvents(cached)
      setLoading(false)
    } else {
      load()
    }
    setSearchQuery(params.get('q') || "")
    // Don't auto-load my events - only load when user clicks the button
  }, [load, params, currentParams, location.state])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && events.length > 0) {
        console.log('Page became visible, refreshing events in background...')
        load(false)
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [events.length, load])


  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) {
      return events
    }
    const query = searchQuery.toLowerCase()
    return events.filter(event => 
      event.title.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.location.toLowerCase().includes(query)
    )
  }, [events, searchQuery])

  const trendingEvents = useMemo(() => {
    return events
      .filter(event => new Date(event.starts_at) > new Date())
      .sort((a, b) => (b.attendees || 0) - (a.attendees || 0))
      .slice(0, 3)
  }, [events])

  function onChanged(updated) {
    if (!updated) {
      setTimeout(() => {
        load()
        loadMyEvents()
      }, 400)
      return
    }
    const updatedEvents = events.map(e => (e.id === updated.id ? updated : e))
    setEvents(updatedEvents)
    const q = params.get('q') || undefined
    const location = params.get('location') || undefined
    setCachedEvents(updatedEvents, { q, location })
    // Also update my events if it's in there
    setMyEvents(prev => prev.map(e => (e.id === updated.id ? updated : e)))
  }

  function handleDelete(eventId) {
    const updatedEvents = events.filter(e => e.id !== eventId)
    setEvents(updatedEvents)
    const q = params.get('q') || undefined
    const location = params.get('location') || undefined
    setCachedEvents(updatedEvents, { q, location })
    // Also remove from my events if it's in there
    setMyEvents(prev => prev.filter(e => e.id !== eventId))
  }

  return (
    <div className="min-h-screen tap-safe premium-scrollbar bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50/30 route-transition">
      <div className="nav-spacer" />
      
      {}
      <section className="events-hero premium-fade-in">
        <div className="events-hero-bg" />
        <div className="events-hero-inner">
          <h1 className="events-title">
            <span>Discover Unforgettable Experience at</span>
            <span className="accent">Spectacular Events</span>
          </h1>
          <div className="events-search">
            <FontAwesomeIcon icon={faSearch} className="icon" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

       {}
       <section className="container-page section">
         <div className="space-y-12">
           {/* My Events Section */}
           {isAuthenticated && (
             <div className="space-y-6">
               <button
                 onClick={() => {
                   if (!showMyEvents) {
                     loadMyEvents()
                   }
                   setShowMyEvents(!showMyEvents)
                 }}
                 className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 rounded-xl border border-pink-200 transition-all duration-200 group"
               >
                 <div className="flex items-center gap-3">
                   <FontAwesomeIcon icon={faCalendarAlt} className="w-5 h-5 text-pink-600" />
                   <h2 className="text-2xl font-bold text-gray-900">My Events</h2>
                   {myEvents.length > 0 && (
                     <span className="px-2 py-1 bg-pink-500 text-white text-sm font-medium rounded-full">
                       {myEvents.length}
                     </span>
                   )}
                 </div>
                 <div className="flex items-center gap-3">
                   {showMyEvents && (
                     <button
                       onClick={(e) => {
                         e.stopPropagation()
                         loadMyEvents()
                         load(false)
                       }}
                       className="touch-target text-gray-500 hover:text-gray-700 active:text-gray-900 font-medium flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/50 active:bg-white/70 transition-colors"
                     >
                       <FontAwesomeIcon icon={faArrowsRotate} className="w-4 h-4" />
                       <span className="hidden sm:inline">Refresh</span>
                     </button>
                   )}
                   <FontAwesomeIcon 
                     icon={showMyEvents ? faChevronUp : faChevronDown} 
                     className="w-5 h-5 text-gray-600 group-hover:text-gray-900 transition-colors" 
                   />
                 </div>
               </button>

               {showMyEvents && (
                 <>
                   {loadingMyEvents ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {[...Array(3)].map((_, i) => (
                         <div key={i} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/60 p-6 premium-loading">
                           <div className="animate-pulse space-y-4">
                             <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                             <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                             <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                           </div>
                         </div>
                       ))}
                     </div>
                   ) : myEvents.length > 0 ? (
                     <EventList events={myEvents} onChanged={onChanged} onDelete={handleDelete} />
                   ) : (
                     <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200">
                       <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                         <FontAwesomeIcon icon={faCalendarAlt} className="w-8 h-8 text-gray-400" />
                       </div>
                       <h3 className="text-lg font-semibold text-gray-900 mb-2">No events yet</h3>
                       <p className="text-gray-600 text-sm">Join or create events to see them here</p>
                     </div>
                   )}
                 </>
               )}
             </div>
           )}

           {/* All Events Section */}
           <div className="space-y-6">
             <div className="flex items-center justify-between">
               <h2 className="text-3xl font-bold text-gray-900">All Events</h2>
               <div className="flex items-center gap-4">
                 <button
                   onClick={() => {
                     load()
                     if (isAuthenticated) loadMyEvents()
                   }}
                   className="touch-target text-gray-500 hover:text-gray-700 active:text-gray-900 font-medium flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                 >
                   <FontAwesomeIcon icon={faArrowsRotate} className="w-4 h-4" />
                   <span className="hidden sm:inline">Refresh</span>
                 </button>
               </div>
             </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/60 p-6 premium-loading">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEvents.length > 0 ? (
            <EventList events={filteredEvents} onChanged={onChanged} onDelete={handleDelete} />
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FontAwesomeIcon icon={faCalendarAlt} className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No events found</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {searchQuery
                  ? "Try adjusting your search to find more events."
                  : "Be the first to create an amazing study group event!"
                }
              </p>
              {isAuthenticated && (
                <Link 
                  to="/events/create"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-colors font-medium"
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
    </div>
  )
}
