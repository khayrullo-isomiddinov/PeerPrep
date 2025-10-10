import { useEffect, useState } from "react"
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
    setEvents(prev => prev.map(e => e.id === updated.id ? updated : e))
  }

  return (
    <div className="space-y-20">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-700 dark:via-purple-800 dark:to-pink-800 py-16 px-6 text-center shadow-xl">
        <div data-parallax="0.10" className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-blue-300/40 blur-3xl dark:bg-blue-500/20 animate-float" style={{ animationDuration: "8s" }} />
        <div data-parallax="0.22" className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-cyan-300/40 blur-3xl dark:bg-cyan-600/20 animate-float" style={{ animationDuration: "8s" }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.6)]">Discover and Plan <span className="text-yellow-200">Events</span></h1>
          <p className="mt-4 text-lg text-white/95 leading-relaxed">From workshops to study marathons, find the perfect event or create your own.</p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6">
        <h2 className="text-2xl font-semibold mb-6">Create an Event</h2>
        {isAuthenticated ? <CreateEventForm onCreated={onCreated} /> : <div className="rounded-xl border border-slate-300/60 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 text-slate-700 dark:text-slate-200">Login to create and join events</div>}
      </section>

      <section className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Upcoming Events</h2>
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
      </section>
    </div>
  )
}
