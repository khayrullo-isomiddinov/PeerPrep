import { useEffect, useState } from "react"
import CreateEventForm from "../features/events/CreateEventForm"
import EventList from "../features/events/EventList"
import { api } from "../utils/api"

export default function Events() {
  const [events, setEvents] = useState([])

  useEffect(() => {
    api.get("/events").then(r => setEvents(r.data)).catch(() => setEvents([]))
  }, [])

  async function addEvent(newEvent) {
    const { data } = await api.post("/events", newEvent)
    setEvents([data, ...events])
  }

  async function removeEvent(id) {
    await api.delete(`/events/${id}`)
    setEvents(events.filter(e => e.id !== id))
  }

  return (
    <div className="space-y-20">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 dark:from-blue-800 dark:via-cyan-900 dark:to-teal-900 animate-gradient py-16 px-6 text-center shadow-xl" style={{ animationDuration: "20s" }}>
        <div data-parallax="0.10" className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-blue-300/40 blur-3xl dark:bg-blue-500/20 animate-float" style={{ animationDuration: "8s" }} />
        <div data-parallax="0.22" className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-cyan-300/40 blur-3xl dark:bg-cyan-600/20 animate-float" style={{ animationDuration: "8s" }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.6)]">Discover and Plan <span className="text-yellow-200">Events</span></h1>
          <p className="mt-4 text-lg text-white/90 leading-relaxed">From workshops to study marathons, find the perfect event or create your own.</p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6">
        <h2 className="text-2xl font-semibold mb-6">Create an Event</h2>
        <CreateEventForm addEvent={addEvent} />
      </section>

      <section className="max-w-7xl mx-auto px-6">
        <h2 className="text-2xl font-semibold mb-6">Upcoming Events</h2>
        <EventList events={events} setEvents={(xs)=>setEvents(xs)} />
      </section>
    </div>
  )
}
