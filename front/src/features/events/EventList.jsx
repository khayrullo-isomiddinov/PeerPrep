import EventCard from "./EventCard"

export default function EventList({ events, setEvents }) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-slate-500 dark:text-slate-400">
        No events yet. Create one to get started!
      </div>
    )
  }

  function remove(id) {
    setEvents(events.filter(x => x.id !== id))
  }

  return (
    <div className="space-y-4">
      {events.map(ev => (
        <EventCard
          key={ev.id}
          event={ev}
          onDelete={() => remove(ev.id)}
        />
      ))}
    </div>
  )
}
