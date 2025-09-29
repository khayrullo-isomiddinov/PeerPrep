import Button from "../../components/Button"
import Card from "../../components/Card"

export default function EventCard({ event, onDelete }) {
  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{event.title}</h3>
            {event.tag && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                {event.tag}
              </span>
            )}
          </div>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            {new Date(event.date + "T" + (event.time || "00:00")).toLocaleString(
              undefined,
              {
                dateStyle: "medium",
                timeStyle: event.time ? "short" : undefined,
              }
            )}
            {event.location ? ` · ${event.location}` : ""}
          </p>
          {event.description && (
            <p className="mt-2 text-slate-700 dark:text-slate-200">
              {event.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">Share</Button>
          <Button variant="secondary" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
    </Card>
  )
}
