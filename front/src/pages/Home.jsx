import { Link, useNavigate } from "react-router-dom"
import { useEffect, useRef, useState, useMemo } from "react"
import { searchLocations, autocompleteEvents } from "../utils/api"
import { useAuth } from "../features/auth/AuthContext"
import { useEvents } from "../hooks/useEvents"

export default function Home() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const [query, setQuery] = useState("")
  const [location, setLocation] = useState("")
  const [locOptions, setLocOptions] = useState([])
  const [eventOptions, setEventOptions] = useState([])
  const [showLocMenu, setShowLocMenu] = useState(false)
  const [showQueryMenu, setShowQueryMenu] = useState(false)

  const [userCity, setUserCity] = useState("NYC")
  const [detectingCity, setDetectingCity] = useState(true)

  const locDebounce = useRef(null)
  const queryDebounce = useRef(null)

  useEffect(() => {
    if (locDebounce.current) clearTimeout(locDebounce.current)
    locDebounce.current = setTimeout(async () => {
      if (!location || location.length < 2) {
        setLocOptions([])
        return
      }
      try {
        const data = await searchLocations(location)
        setLocOptions(data)
      } catch {
        setLocOptions([])
      }
    }, 200)
    return () => locDebounce.current && clearTimeout(locDebounce.current)
  }, [location])

  useEffect(() => {
    if (queryDebounce.current) clearTimeout(queryDebounce.current)
    queryDebounce.current = setTimeout(async () => {
      if (!query || query.length < 2) {
        setEventOptions([])
        return
      }
      try {
        const data = await autocompleteEvents(query)
        setEventOptions(data)
      } catch {
        setEventOptions([])
      }
    }, 300)
    return () => queryDebounce.current && clearTimeout(queryDebounce.current)
  }, [query])

  function onSearch() {
    const params = new URLSearchParams()
    if (query.trim()) params.set("q", query.trim())
    if (location.trim()) params.set("location", location.trim())
    navigate(`/events?${params.toString()}`)
  }

  useEffect(() => {
    async function detectCity() {
      try {
        setDetectingCity(true)

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                const response = await fetch(
                  `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
                )
                const data = await response.json()
                setUserCity(data.city || data.locality || "NYC")
              } catch {
                detectCityByIP()
              } finally {
                setDetectingCity(false)
              }
            },
            detectCityByIP,
            { timeout: 5000 }
          )
        } else {
          detectCityByIP()
        }
      } catch {
        setDetectingCity(false)
      }
    }

    async function detectCityByIP() {
      try {
        const response = await fetch("https://ipapi.co/json/")
        const data = await response.json()
        setUserCity(data.city || data.region || "NYC")
      } catch {}
      finally {
        setDetectingCity(false)
      }
    }

    detectCity()
  }, [])

  // Use React Query for events - cached automatically
  const { data: allEvents = [], isLoading: loadingEvents } = useEvents({ limit: 100 })

  const parseUTCDate = (dateString) => {
    if (!dateString) return null
    if (dateString.includes('Z') || dateString.includes('+') || dateString.match(/-\d{2}:\d{2}$/)) {
      return new Date(dateString)
    }
    return new Date(dateString + 'Z')
  }

  const localEvents = useMemo(() => {
    const now = new Date()
    if (!userCity || userCity === "NYC") {
      return allEvents
        .filter(e => {
          const eventDate = parseUTCDate(e.starts_at)
          if (!eventDate) return false
          return (
            eventDate > now &&
            (e.location?.toLowerCase().includes("new york") ||
              e.location?.toLowerCase().includes("nyc") ||
              e.location?.toLowerCase().includes("ny"))
          )
        })
        .sort((a, b) => {
          const dateA = parseUTCDate(a.starts_at)
          const dateB = parseUTCDate(b.starts_at)
          if (!dateA || !dateB) return 0
          return dateA - dateB
        })
        .slice(0, 3)
    }

    const cityLower = userCity.toLowerCase()
    return allEvents
      .filter(e => {
        const eventDate = parseUTCDate(e.starts_at)
        if (!eventDate) return false
        return (
          eventDate > now &&
          (e.location?.toLowerCase().includes(cityLower) ||
            e.location?.toLowerCase().includes(cityLower.split(" ")[0]))
        )
      })
      .sort((a, b) => {
        const dateA = parseUTCDate(a.starts_at)
        const dateB = parseUTCDate(b.starts_at)
        if (!dateA || !dateB) return 0
        return dateA - dateB
      })
      .slice(0, 3)
  }, [allEvents, userCity])

  const upcoming24h = useMemo(() => {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setHours(tomorrow.getHours() + 24)

    return allEvents
      .filter(e => {
        const eventDate = parseUTCDate(e.starts_at)
        if (!eventDate) return false
        return eventDate > now && eventDate <= tomorrow
      })
      .sort((a, b) => {
        const dateA = parseUTCDate(a.starts_at)
        const dateB = parseUTCDate(b.starts_at)
        if (!dateA || !dateB) return 0
        return dateA - dateB
      })
      .slice(0, 2)
  }, [allEvents])

  const moreEvents = useMemo(() => {
    const now = new Date()
    const shown = new Set([...localEvents.map(e => e.id), ...upcoming24h.map(e => e.id)])

    return allEvents
      .filter(e => {
        const eventDate = parseUTCDate(e.starts_at)
        if (!eventDate) return false
        return eventDate > now && !shown.has(e.id)
      })
      .sort((a, b) => {
        const dateA = parseUTCDate(a.starts_at)
        const dateB = parseUTCDate(b.starts_at)
        if (!dateA || !dateB) return 0
        return dateA - dateB
      })
      .slice(0, 3)
  }, [allEvents, localEvents, upcoming24h])

  function formatEventDate(dateString) {
    const date = parseUTCDate(dateString)
    if (!date || isNaN(date.getTime())) return "Invalid date"
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()} | ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
  }

  function getEventImage(event) {
    if (event.cover_image_url) return event.cover_image_url
    const seed = event.title?.toLowerCase().replace(/\s+/g, "-") || "event"
    return `https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop&seed=${seed}`
  }

  return (
    <div className="min-h-screen tap-safe premium-scrollbar flex flex-col home-light route-transition">
      <section className="home-hero">
        <div className="home-hero-bg" />
        <div className="home-hero-inner">
          <h1 className="home-hero-title">
            <span>Your Wonderful</span>
            <span className="accent">study circle</span>
          </h1>
        </div>

        <div className="search-wrap">
          <div className="home-search">
            <div className="field" style={{ position: "relative" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" className="flex-shrink-0">
                <path fill="#ec4899" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" stroke="#ec4899" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>

              <input
                value={query}
                onChange={e => { setQuery(e.target.value); setShowQueryMenu(true) }}
                onFocus={() => setShowQueryMenu(true)}
                onBlur={() => setTimeout(() => setShowQueryMenu(false), 150)}
                placeholder="Search events..."
                className="home-search-input"
              />

              {showQueryMenu && eventOptions.length > 0 && (
                <div className="search-autocomplete">
                  {eventOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      onMouseDown={() => {
                        setQuery(opt.title)
                        setShowQueryMenu(false)
                      }}
                    >
                      <div className="font-medium text-gray-900">{opt.title}</div>
                      {opt.location && <div className="text-sm text-gray-500">{opt.location}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="divider" />

            <div className="field" style={{ position: "relative" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" className="flex-shrink-0">
                <path fill="#ec4899" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
              </svg>

              <input
                value={location}
                onChange={e => { setLocation(e.target.value); setShowLocMenu(true) }}
                onFocus={() => setShowLocMenu(true)}
                onBlur={() => setTimeout(() => setShowLocMenu(false), 150)}
                placeholder="Location"
                className="home-search-input"
              />

              {showLocMenu && locOptions.length > 0 && (
                <div className="search-autocomplete">
                  {locOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      onMouseDown={() => {
                        setLocation(opt.full)
                        setShowLocMenu(false)
                      }}
                    >
                      <div className="font-medium text-gray-900">{opt.name}</div>
                      <div className="text-sm text-gray-500">{opt.country}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="divider" />
            <button className="btn-pink square" onClick={onSearch}>Search</button>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-inner">
          <div className="home-section-head">
            <h2 className="home-title">New events in <span className="accent">{detectingCity ? "your city" : userCity}</span></h2>
            <Link to={`/events?location=${encodeURIComponent(userCity)}`} className="btn-ghost-pink pill">View more</Link>
          </div>

          {loadingEvents || detectingCity ? (
            <div className="home-card-grid">
              {[...Array(3)].map((_, i) => (
                <article key={i} className="event-card">
                  <div className="h-48 bg-gray-200 rounded-t-lg" />
                    <div className="event-meta p-4">
                    <div className="h-6 bg-gray-200 rounded mb-2" />
                    <div className="h-4 bg-gray-200 rounded mb-2" />
                    <div className="h-4 bg-gray-200 rounded" />
                  </div>
                </article>
              ))}
            </div>
          ) : localEvents.length > 0 ? (
            <div className="home-card-grid">
              {localEvents.map((event) => (
                <Link key={event.id} to={`/events/${event.id}`} className="event-card">
                  <img src={getEventImage(event)} alt={event.title} loading="lazy" decoding="async" style={{ willChange: "transform" }} />
                  <div className="event-meta">
                    <h3>{event.title}</h3>
                    <div className="row"><span className="muted">{formatEventDate(event.starts_at)}</span></div>
                    <div className="row muted">{event.location}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No upcoming events in {userCity} at the moment.</p>
              <Link to="/events/create" className="text-pink-500 hover:text-pink-600 mt-2 inline-block">Create the first one!</Link>
            </div>
          )}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-inner">
          <div className="home-section-head">
            <h2 className="home-title">Upcoming <span className="accent">in 24h</span></h2>
            <Link to="/events" className="btn-ghost-pink pill">View more</Link>
          </div>

          {loadingEvents ? (
            <div className="upcoming-grid">
              {[...Array(2)].map((_, i) => (
                <article key={i} className="upcoming-card">
                  <div className="h-48 bg-gray-200 rounded-t-lg" />
                    <div className="event-meta p-4">
                    <div className="h-6 bg-gray-200 rounded mb-2" />
                    <div className="h-4 bg-gray-200 rounded mb-2" />
                    <div className="h-4 bg-gray-200 rounded" />
                  </div>
                </article>
              ))}
            </div>
          ) : upcoming24h.length > 0 ? (
            <div className="upcoming-grid">
              {upcoming24h.map((event) => (
                <Link key={event.id} to={`/events/${event.id}`} className="upcoming-card">
                  <img src={getEventImage(event)} alt={event.title} loading="lazy" decoding="async" style={{ willChange: "transform" }} />
                  <div className="event-meta">
                    <h3>{event.title}</h3>
                    <div className="row"><span className="muted">{formatEventDate(event.starts_at)}</span></div>
                    <div className="row muted">{event.location}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500"><p>No events happening in the next 24 hours.</p></div>
          )}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-inner">
          <div className="home-section-head">
            <h2 className="home-title">More events</h2>
            <Link to="/events" className="btn-ghost-pink pill">View more</Link>
          </div>

          {loadingEvents ? (
            <div className="home-card-grid">
              {[...Array(3)].map((_, i) => (
                <article key={i} className="event-card">
                  <div className="h-48 bg-gray-200 rounded-t-lg" />
                    <div className="event-meta p-4">
                    <div className="h-6 bg-gray-200 rounded mb-2" />
                    <div className="h-4 bg-gray-200 rounded mb-2" />
                    <div className="h-4 bg-gray-200 rounded" />
                  </div>
                </article>
              ))}
            </div>
          ) : moreEvents.length > 0 ? (
            <div className="home-card-grid">
              {moreEvents.map((event) => (
                <Link key={event.id} to={`/events/${event.id}`} className="event-card">
                  <img src={getEventImage(event)} alt={event.title} loading="lazy" decoding="async" style={{ willChange: "transform" }} />
                  <div className="event-meta">
                    <h3>{event.title}</h3>
                    <div className="row"><span className="muted">{formatEventDate(event.starts_at)}</span></div>
                    <div className="row muted">{event.location}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No upcoming events at the moment.</p>
              <Link to="/events/create" className="text-pink-500 hover:text-pink-600 mt-2 inline-block">Create the first one!</Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
