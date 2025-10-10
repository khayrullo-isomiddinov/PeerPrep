import EventCard from "./EventCard"

export default function EventList({ events, onChanged }) {
  if (events.length === 0) {
    return (
      <div className="surface p-8 text-center">
        <div className="text-lg font-semibold">No events yet</div>
        <div className="mt-1 text-sm text-muted">Create one to get started!</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {events.map(ev => (
        <EventCard key={ev.id} event={ev} onChanged={onChanged} />
      ))}
    </div>
  )
}
