import EventCard from "./EventCard"
import { Skeleton } from "../../components/ui/Feedback"

export function EventGrid({ children }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
}

export function EventGridSkeleton({ count = 6 }) {
  return (
    <EventGrid>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-line bg-surface">
          <Skeleton className="aspect-[16/8] w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="mt-4 h-1.5 w-full" />
          </div>
        </div>
      ))}
    </EventGrid>
  )
}

export default function EventList({ events }) {
  return (
    <EventGrid>
      {events.map((event) => <EventCard key={event.id} event={event} />)}
    </EventGrid>
  )
}
