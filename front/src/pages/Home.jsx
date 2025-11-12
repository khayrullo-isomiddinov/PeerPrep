import { Link, useNavigate } from "react-router-dom"
import { useEffect, useRef, useState, useMemo } from "react"
import { searchLocations, autocompleteEvents, autocompleteGroups, listEvents } from "../utils/api"

export default function Home() {
  const navigate = useNavigate()
  const [type, setType] = useState("events") 
  const [query, setQuery] = useState("")
  const [location, setLocation] = useState("")
  const [locOptions, setLocOptions] = useState([])
  const [eventOptions, setEventOptions] = useState([])
  const [groupOptions, setGroupOptions] = useState([])
  const [showLocMenu, setShowLocMenu] = useState(false)
  const [showQueryMenu, setShowQueryMenu] = useState(false)
  const [allEvents, setAllEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [userCity, setUserCity] = useState("NYC")
  const [detectingCity, setDetectingCity] = useState(true)
  const locDebounce = useRef(null)
  const queryDebounce = useRef(null)

  useEffect(() => {
    if (locDebounce.current) clearTimeout(locDebounce.current)
    locDebounce.current = setTimeout(async () => {
      if (!location || location.length < 2) { setLocOptions([]); return }
      try {
        const data = await searchLocations(location)
        setLocOptions(data)
      } catch {
        setLocOptions([])
      }
    }, 200)
    return () => { if (locDebounce.current) clearTimeout(locDebounce.current) }
  }, [location])

  useEffect(() => {
    if (queryDebounce.current) clearTimeout(queryDebounce.current)
    queryDebounce.current = setTimeout(async () => {
      if (!query || query.length < 2) { 
        setEventOptions([])
        setGroupOptions([])
        return 
      }
      try {
        if (type === "events") {
          const data = await autocompleteEvents(query)
          setEventOptions(data)
          setGroupOptions([])
        } else {
          const data = await autocompleteGroups(query)
          setGroupOptions(data)
          setEventOptions([])
        }
      } catch {
        setEventOptions([])
        setGroupOptions([])
      }
    }, 300)
    return () => { if (queryDebounce.current) clearTimeout(queryDebounce.current) }
  }, [query, type])

  function onSearch() {
    if (type === "events") {
      const params = new URLSearchParams()
      if (query.trim()) params.set("q", query.trim())
      if (location.trim()) params.set("location", location.trim())
      navigate(`/events?${params.toString()}`)
    } else {
      const params = new URLSearchParams()
      if (query.trim()) params.set("q", query.trim())
      navigate(`/groups?${params.toString()}`)
    }
  }

  // Detect user's city
  useEffect(() => {
    async function detectCity() {
      try {
        setDetectingCity(true)
        
        // Try browser geolocation first
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                // Use reverse geocoding to get city
                const response = await fetch(
                  `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
                )
                const data = await response.json()
                if (data.city) {
                  setUserCity(data.city)
                } else if (data.locality) {
                  setUserCity(data.locality)
                }
              } catch (error) {
                console.error("Geocoding error:", error)
                // Fallback to IP-based detection
                detectCityByIP()
              } finally {
                setDetectingCity(false)
              }
            },
            () => {
              // Geolocation denied or failed, use IP-based detection
              detectCityByIP()
            },
            { timeout: 5000 }
          )
        } else {
          // No geolocation support, use IP-based detection
          detectCityByIP()
        }
      } catch (error) {
        console.error("City detection error:", error)
        setDetectingCity(false)
      }
    }

    async function detectCityByIP() {
      try {
        const response = await fetch('https://ipapi.co/json/')
        const data = await response.json()
        if (data.city) {
          setUserCity(data.city)
        } else if (data.region) {
          setUserCity(data.region)
        }
      } catch (error) {
        console.error("IP geolocation error:", error)
        // Keep default NYC
      } finally {
        setDetectingCity(false)
      }
    }

    detectCity()
  }, [])

  useEffect(() => {
    async function loadEvents() {
      try {
        setLoadingEvents(true)
        const events = await listEvents({ limit: 100 })
        setAllEvents(events || [])
      } catch (error) {
        console.error("Failed to load events:", error)
        setAllEvents([])
      } finally {
        setLoadingEvents(false)
      }
    }
    loadEvents()
  }, [])

  const localEvents = useMemo(() => {
    const now = new Date()
    if (!userCity || userCity === "NYC") {
      // Fallback to NYC matching for backward compatibility
      return allEvents
        .filter(e => {
          const eventDate = new Date(e.starts_at)
          return eventDate > now && 
                 (e.location?.toLowerCase().includes("new york") || 
                  e.location?.toLowerCase().includes("nyc") ||
                  e.location?.toLowerCase().includes("ny"))
        })
        .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
        .slice(0, 3)
    }
    
    // Filter by detected city
    const cityLower = userCity.toLowerCase()
    return allEvents
      .filter(e => {
        const eventDate = new Date(e.starts_at)
        if (eventDate <= now) return false
        
        const locationLower = e.location?.toLowerCase() || ""
        // Check if location contains the city name
        return locationLower.includes(cityLower) ||
               locationLower.includes(cityLower.split(' ')[0]) // Handle multi-word cities
      })
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
      .slice(0, 3)
  }, [allEvents, userCity])

  const upcoming24h = useMemo(() => {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setHours(tomorrow.getHours() + 24)
    return allEvents
      .filter(e => {
        const eventDate = new Date(e.starts_at)
        return eventDate > now && eventDate <= tomorrow
      })
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
      .slice(0, 2)
  }, [allEvents])

  const highlightsThisWeek = useMemo(() => {
    const now = new Date()
    const nextWeek = new Date(now)
    nextWeek.setDate(nextWeek.getDate() + 7)
    return allEvents
      .filter(e => {
        const eventDate = new Date(e.starts_at)
        return eventDate > now && eventDate <= nextWeek
      })
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
      .slice(0, 1)[0] || null
  }, [allEvents])

  const moreEvents = useMemo(() => {
    const now = new Date()
    const shownIds = new Set([
      ...localEvents.map(e => e.id),
      ...upcoming24h.map(e => e.id),
      ...(highlightsThisWeek ? [highlightsThisWeek.id] : [])
    ])
    return allEvents
      .filter(e => {
        const eventDate = new Date(e.starts_at)
        return eventDate > now && !shownIds.has(e.id)
      })
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
      .slice(0, 3)
  }, [allEvents, localEvents, upcoming24h, highlightsThisWeek])

  function formatEventDate(dateString) {
    const date = new Date(dateString)
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()} | ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  function getEventImage(event) {
    const seed = event.title?.toLowerCase().replace(/\s+/g, '-') || 'event'
    return `https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop&seed=${seed}`
  }

  return (
    <div className="min-h-screen tap-safe premium-scrollbar flex flex-col home-light route-transition">
      <section className="home-hero premium-fade-in">
        <div className="home-hero-bg" />
        <div className="home-hero-inner reveal-up">
          <h1 className="home-hero-title">
            <span>Your Wonderful</span>
            <span className="accent">study circle</span>
          </h1> 
        </div>
        <div className="search-wrap reveal-up" style={{animationDelay:'.06s'}}>
          <div className="home-search premium-scale-in">
            <div className="field" style={{position:'relative'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" className="flex-shrink-0"><path fill="#ec4899" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" stroke="#ec4899" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <input
                value={query}
                onChange={e => { setQuery(e.target.value); setShowQueryMenu(true) }}
                onFocus={() => setShowQueryMenu(true)}
                onBlur={() => setTimeout(() => setShowQueryMenu(false), 150)}
                placeholder={type === 'events' ? "Search events..." : "Search groups..."}
                className="home-search-input"
              />
              {showQueryMenu && ((type === 'events' && eventOptions.length > 0) || (type === 'groups' && groupOptions.length > 0)) && (
                <div className="search-autocomplete">
                  {type === 'events' ? eventOptions.map((opt, idx) => (
                    <button key={idx} onMouseDown={() => { setQuery(opt.title); setShowQueryMenu(false) }}>
                      <div className="font-medium text-gray-900">{opt.title}</div>
                      {opt.location && <div className="text-sm text-gray-500">{opt.location}</div>}
                    </button>
                  )) : groupOptions.map((opt, idx) => (
                    <button key={idx} onMouseDown={() => { setQuery(opt.name); setShowQueryMenu(false) }}>
                      <div className="font-medium text-gray-900">{opt.name}</div>
                      {opt.field && <div className="text-sm text-gray-500">{opt.field}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="divider" />
            <div className="field" style={{position:'relative'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" className="flex-shrink-0"><path fill="#ec4899" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
              <input
                value={location}
                onChange={e => { setLocation(e.target.value); setShowLocMenu(true) }}
                onFocus={() => setShowLocMenu(true)}
                onBlur={() => setTimeout(() => setShowLocMenu(false), 150)}
                placeholder={type === 'events' ? "Location" : "Location (events only)"}
                disabled={type !== 'events'}
                className="home-search-input"
              />
              {showLocMenu && locOptions.length > 0 && (
                <div className="search-autocomplete">
                  {locOptions.map((opt, idx) => (
                    <button key={idx} onMouseDown={() => { setLocation(opt.full); setShowLocMenu(false) }}>
                      <div className="font-medium text-gray-900">{opt.name}</div>
                      <div className="text-sm text-gray-500">{opt.country}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="divider" />
            <div className="field field-select">
              <select value={type} onChange={e => setType(e.target.value)} className="home-search-select">
                <option value="events">Events</option>
                <option value="groups">Groups</option>
              </select>
            </div>
            <button className="btn-pink square" onClick={onSearch}>Search</button>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-inner reveal-up" style={{animationDelay:'.12s'}}>
          <div className="home-section-head">
            <h2 className="home-title">New events in <span className="accent">{detectingCity ? "your city" : userCity}</span></h2>
            <Link to={`/events?location=${encodeURIComponent(userCity)}`} className="btn-ghost-pink pill">View more</Link>
          </div>

          {loadingEvents || detectingCity ? (
            <div className="home-card-grid">
              {[...Array(3)].map((_, i) => (
                <article key={i} className="event-card premium-loading">
                  <div className="h-48 bg-gray-200 animate-pulse rounded-t-lg" />
                  <div className="event-meta p-4">
                    <div className="h-6 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </div>
                </article>
              ))}
            </div>
          ) : localEvents.length > 0 ? (
            <div className="home-card-grid">
              {localEvents.map((event) => (
                <Link key={event.id} to={`/events`} className="event-card premium-hover">
                  <img 
                    src={getEventImage(event)} 
                    alt={event.title}
                    loading="lazy"
                    decoding="async"
                    style={{ willChange: 'transform' }}
                  />
                  <div className="event-meta">
                    <h3>{event.title}</h3>
                    <div className="row">
                      <span className="muted">{formatEventDate(event.starts_at)}</span>
                      <span className="free">Free event</span>
                    </div>
                    <div className="row muted">{event.location}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No upcoming events in {userCity} at the moment.</p>
              <Link to="/events/create" className="text-pink-500 hover:text-pink-600 mt-2 inline-block">
                Create the first one!
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-inner reveal-up">
          <div className="home-section-head">
            <h2 className="home-title">Upcoming <span className="accent">in 24h</span></h2>
            <Link to="/events" className="btn-ghost-pink pill">View more</Link>
          </div>
          {loadingEvents ? (
            <div className="upcoming-grid">
              {[...Array(2)].map((_, i) => (
                <article key={i} className="upcoming-card premium-loading">
                  <div className="h-48 bg-gray-200 animate-pulse rounded-t-lg" />
                  <div className="event-meta p-4">
                    <div className="h-6 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </div>
                </article>
              ))}
            </div>
          ) : upcoming24h.length > 0 ? (
            <div className="upcoming-grid">
              {upcoming24h.map((event) => (
                <Link key={event.id} to={`/events`} className="upcoming-card premium-hover">
                  <img 
                    src={getEventImage(event)} 
                    alt={event.title}
                    loading="lazy"
                    decoding="async"
                    style={{ willChange: 'transform' }}
                  />
                  <div className="event-meta">
                    <h3>{event.title}</h3>
                    <div className="row">
                      <span className="muted">{formatEventDate(event.starts_at)}</span>
                      <span className="free">Free event</span>
                    </div>
                    <div className="row muted">{event.location}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No events happening in the next 24 hours.</p>
            </div>
          )}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-inner reveal-up">
          <div className="home-section-head">
            <h2 className="home-title">Highlights <span className="accent">this week</span></h2>
            <Link to="/events" className="btn-ghost-pink pill">View more</Link>
          </div>
          {loadingEvents ? (
            <div className="highlight-banner premium-loading" role="region" aria-label="Highlights">
              <div className="highlight-img bg-gray-200 animate-pulse" />
              <div className="highlight-gradient" />
              <div className="highlight-card">
                <div className="h-6 bg-gray-200 rounded animate-pulse mb-4" />
                <div className="h-8 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ) : highlightsThisWeek ? (
            <div className="highlight-banner" role="region" aria-label="Highlights">
              <img 
                className="highlight-img" 
                src={getEventImage(highlightsThisWeek)} 
                alt={highlightsThisWeek.title}
                loading="lazy"
                decoding="async"
                style={{ willChange: 'transform' }}
              />
              <div className="highlight-gradient" />
              <div className="highlight-card">
                <div className="badge">Free event</div>
                <h3 className="highlight-title">{highlightsThisWeek.title}</h3>
                <div className="muted text-sm">{formatEventDate(highlightsThisWeek.starts_at)}</div>
                <div className="muted text-sm">{highlightsThisWeek.location}</div>
                <div className="mt-3">
                  <Link to="/events" className="btn-pink square">View Event</Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <p>No highlights this week. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-inner reveal-up">
          <div className="home-section-head">
            <h2 className="home-title">More events</h2>
            <Link to="/events" className="btn-ghost-pink pill">View more</Link>
          </div>
          {loadingEvents ? (
            <div className="home-card-grid">
              {[...Array(3)].map((_, i) => (
                <article key={i} className="event-card premium-loading">
                  <div className="h-48 bg-gray-200 animate-pulse rounded-t-lg" />
                  <div className="event-meta p-4">
                    <div className="h-6 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </div>
                </article>
              ))}
            </div>
          ) : moreEvents.length > 0 ? (
            <div className="home-card-grid">
              {moreEvents.map((event) => (
                <Link key={event.id} to={`/events`} className="event-card premium-hover">
                  <img 
                    src={getEventImage(event)} 
                    alt={event.title}
                    loading="lazy"
                    decoding="async"
                    style={{ willChange: 'transform' }}
                  />
                  <div className="event-meta">
                    <h3>{event.title}</h3>
                    <div className="row">
                      <span className="muted">{formatEventDate(event.starts_at)}</span>
                      <span className="free">Free event</span>
                    </div>
                    <div className="row muted">{event.location}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No upcoming events at the moment.</p>
              <Link to="/events/create" className="text-pink-500 hover:text-pink-600 mt-2 inline-block">
                Create the first one!
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
