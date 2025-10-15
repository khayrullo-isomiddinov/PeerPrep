// src/pages/Events.jsx
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import CreateEventForm from "../features/events/CreateEventForm"
import EventList from "../features/events/EventList"
import { listEvents } from "../utils/api"
import { useAuth } from "../features/auth/AuthContext"
import PillTabs from "../components/PillTabs"

export default function Events() {
  const { isAuthenticated } = useAuth()
  const [events, setEvents] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [kind, setKind] = useState("all")

  async function load() {
    const params = {}
    if (kind !== "all") params.kind = kind
    const data = await listEvents(params)
    setEvents(data)
  }

  useEffect(() => {
    load()
  }, [refreshKey, kind])

  function onCreated() {
    setRefreshKey(k => k + 1)
  }

  function onChanged(updated) {
    if (!updated) {
      load()
      return
    }
    setEvents(prev => prev.map(e => (e.id === updated.id ? updated : e)))
  }

  return (
    <div className="min-h-screen tap-safe premium-scrollbar">
      <div className="nav-spacer" />
      <section className="container-page section">
        <div className="hero-accent blur-aura premium-fade-in">
          <div className="flex flex-col items-center text-center gap-4">
            <h1 className="premium-heading text-4xl sm:text-5xl tracking-tight">Discover and Plan Events</h1>
            <p className="text-muted max-w-2xl">From workshops to study marathons, find the perfect event or create your own.</p>
            <div className="flex items-center gap-3">
              <span className="badge">Live</span>
              <span className="badge">Workshops</span>
              <span className="badge">Study Sessions</span>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page section space-y-10">
        <div className="surface inset-pad premium-scale-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Create an Event</h2>
          </div>
          {isAuthenticated ? (
            <CreateEventForm onCreated={onCreated} />
          ) : (
            <div className="premium-card text-center">
              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-semibold mb-2">Login to create and join events</h3>
                <p className="text-muted mb-6">Building something? Host it. Looking for something? Join it.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/login" className="btn text-center">Log In</Link>
                  <Link to="/register" className="btn-secondary text-center">Sign Up</Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="surface inset-pad">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold">Upcoming Events</h2>
            <PillTabs
              tabs={[
                { label: "All", value: "all" },
                { label: "One-off", value: "one_off" },
                { label: "Group", value: "group" },
              ]}
              value={kind}
              onChange={setKind}
            />
          </div>
          <EventList events={events} onChanged={onChanged} />
        </div>
      </section>
    </div>
  )
}
