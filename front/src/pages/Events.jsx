import { useEffect, useState, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { 
  faSearch, faFilter, faCalendarAlt, faMapMarkerAlt, 
  faUsers, faClock, faFire, faStar, faArrowTrendUp,
  faGraduationCap, faBook, faMicroscope, faCode,
  faMusic, faPalette, faDumbbell, faHeartbeat
} from "@fortawesome/free-solid-svg-icons"
import EventList from "../features/events/EventList"
import { listEvents } from "../utils/api"
import { useAuth } from "../features/auth/AuthContext"

const CATEGORIES = [
  { id: "all", name: "All Events", icon: faCalendarAlt, color: "text-gray-600" },
  { id: "mathematics", name: "Mathematics", icon: faGraduationCap, color: "text-blue-600" },
  { id: "science", name: "Science", icon: faMicroscope, color: "text-green-600" },
  { id: "technology", name: "Technology", icon: faCode, color: "text-purple-600" },
  { id: "literature", name: "Literature", icon: faBook, color: "text-orange-600" },
  { id: "arts", name: "Arts", icon: faPalette, color: "text-pink-600" },
  { id: "music", name: "Music", icon: faMusic, color: "text-indigo-600" },
  { id: "sports", name: "Sports", icon: faDumbbell, color: "text-red-600" },
  { id: "health", name: "Health", icon: faHeartbeat, color: "text-emerald-600" }
]

const TIME_FILTERS = [
  { id: "all", name: "All Time" },
  { id: "today", name: "Today" },
  { id: "tomorrow", name: "Tomorrow" },
  { id: "this_week", name: "This Week" },
  { id: "this_month", name: "This Month" }
]

export default function Events() {
  const { isAuthenticated } = useAuth()
  const [events, setEvents] = useState([])
  const [params] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedTimeFilter, setSelectedTimeFilter] = useState("all")
  const [sortBy, setSortBy] = useState("date")
  const [showFilters, setShowFilters] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const q = params.get('q') || undefined
      const location = params.get('location') || undefined
      console.log('Loading events with params:', { q, location })
      const data = await listEvents({ q, location })
      console.log('Events loaded:', data)
      setEvents(data)
    } catch (error) {
      console.error("Failed to load events:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    setSearchQuery(params.get('q') || "")
  }, [params])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page became visible, refreshing events...')
        load()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const filteredAndSortedEvents = useMemo(() => {
    let filtered = events

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.location.toLowerCase().includes(query)
      )
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(event => {
        const text = (event.title + " " + (event.description || "")).toLowerCase()
        return text.includes(selectedCategory)
      })
    }

    if (selectedTimeFilter !== "all") {
      const now = new Date()
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.starts_at)
        switch (selectedTimeFilter) {
          case "today":
            return eventDate.toDateString() === now.toDateString()
          case "tomorrow":
            const tomorrow = new Date(now)
            tomorrow.setDate(tomorrow.getDate() + 1)
            return eventDate.toDateString() === tomorrow.toDateString()
          case "this_week":
            const weekFromNow = new Date(now)
            weekFromNow.setDate(weekFromNow.getDate() + 7)
            return eventDate >= now && eventDate <= weekFromNow
          case "this_month":
            const monthFromNow = new Date(now)
            monthFromNow.setMonth(monthFromNow.getMonth() + 1)
            return eventDate >= now && eventDate <= monthFromNow
          default:
            return true
        }
      })
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(a.starts_at) - new Date(b.starts_at)
        case "popularity":
          return (b.attendees || 0) - (a.attendees || 0)
        case "capacity":
          return b.capacity - a.capacity
        default:
          return 0
      }
    })

    return filtered
  }, [events, searchQuery, selectedCategory, selectedTimeFilter, sortBy])

  const trendingEvents = useMemo(() => {
    return events
      .filter(event => new Date(event.starts_at) > new Date())
      .sort((a, b) => (b.attendees || 0) - (a.attendees || 0))
      .slice(0, 3)
  }, [events])

  function onChanged(updated) {
    if (!updated) {
      load()
      return
    }
    setEvents(prev => prev.map(e => (e.id === updated.id ? updated : e)))
  }

  return (
    <div className="min-h-screen tap-safe premium-scrollbar bg-white route-transition">
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
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button onClick={() => setShowFilters(!showFilters)} className="filter-btn">
              <FontAwesomeIcon icon={faFilter} className="mr-2" />
              Filters
            </button>
          </div>
        </div>
      </section>

      {}
      {showFilters && (
        <section className="container-page section">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="space-y-6 premium-fade-in">
              {}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {CATEGORIES.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        selectedCategory === category.id
                          ? 'border-pink-500 bg-pink-50 text-pink-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <FontAwesomeIcon 
                        icon={category.icon} 
                        className={`w-5 h-5 mb-2 ${category.color}`} 
                      />
                      <div className="text-sm font-medium">{category.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">When</h3>
                <div className="flex flex-wrap gap-2">
                  {TIME_FILTERS.map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => setSelectedTimeFilter(filter.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        selectedTimeFilter === filter.id
                          ? 'bg-pink-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {filter.name}
                    </button>
                  ))}
                </div>
          </div>

              {}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sort by</h3>
                <div className="flex gap-2">
                  {[
                    { id: "date", name: "Date" },
                    { id: "popularity", name: "Popularity" },
                    { id: "capacity", name: "Capacity" }
                  ].map(option => (
                    <button
                      key={option.id}
                      onClick={() => setSortBy(option.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        sortBy === option.id
                          ? 'bg-pink-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

       {}
       <section className="container-page section">
         <div className="space-y-8">
           <div className="flex items-center justify-between">
             <h2 className="text-3xl font-bold text-gray-900">New Study Events</h2>
             <div className="flex items-center gap-4">
               <button
                 onClick={load}
                 className="text-gray-500 hover:text-gray-700 font-medium flex items-center gap-2"
               >
                 <FontAwesomeIcon icon={faArrowTrendUp} className="w-4 h-4" />
                 Refresh
               </button>
               <Link to="/events" className="text-pink-500 hover:text-pink-600 font-semibold">
                 View more →
               </Link>
             </div>
           </div>

           {}
           <div className="flex flex-wrap gap-2">
             {CATEGORIES.map(category => (
               <button
                 key={category.id}
                 onClick={() => setSelectedCategory(category.id)}
                 className={`px-4 py-2 rounded-full font-medium transition-all ${
                   selectedCategory === category.id
                     ? 'bg-pink-500 text-white'
                     : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                 }`}
               >
                 {category.name}
               </button>
             ))}
           </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 premium-loading">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAndSortedEvents.length > 0 ? (
            <EventList events={filteredAndSortedEvents} onChanged={onChanged} />
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FontAwesomeIcon icon={faCalendarAlt} className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No events found</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {searchQuery || selectedCategory !== "all" || selectedTimeFilter !== "all"
                  ? "Try adjusting your search or filters to find more events."
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
      </section>
    </div>
  )
}
