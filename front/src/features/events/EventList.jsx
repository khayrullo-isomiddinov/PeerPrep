// src/features/events/EventList.jsx
import EventCard from "./EventCard"

export default function EventList({ events, onChanged }) {
  if (!events || events.length === 0) {
    return (
      <div className="premium-card text-center">
        <div className="text-lg font-semibold">No events yet</div>
        <div className="mt-1 text-sm text-muted">Create one to get started</div>
      </div>
    )
  }

  return (
    <div className="grid-auto">
      {events.map(ev => (
        <EventCard key={ev.id} event={ev} onChanged={onChanged} />
      ))}
    </div>
  )
}
