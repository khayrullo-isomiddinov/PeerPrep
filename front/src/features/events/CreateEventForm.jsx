import { useState } from "react"
import Button from "../../components/Button"
import Card from "../../components/Card"
import { createEvent } from "../../utils/api"

export default function CreateEventForm({ onCreated }) {
  const [title, setTitle] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [location, setLocation] = useState("")
  const [capacity, setCapacity] = useState(8)
  const [description, setDescription] = useState("")
  const [kind, setKind] = useState("one_off")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const payload = {
        title,
        starts_at: new Date(startsAt).toISOString(),
        location,
        capacity: Number(capacity),
        description,
        group_id: null,
        kind
      }
      const evt = await createEvent(payload)
      setTitle("")
      setStartsAt("")
      setLocation("")
      setCapacity(8)
      setDescription("")
      setKind("one_off")
      onCreated?.(evt)
    } catch {
      setError("Failed to create event")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-lg font-semibold">Create Event</h2>
        <input className="w-full rounded-lg border p-2 dark:bg-slate-900" placeholder="Event title" value={title} onChange={e=>setTitle(e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input className="w-full rounded-lg border p-2 dark:bg-slate-900" type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} />
          <input className="w-full rounded-lg border p-2 dark:bg-slate-900" placeholder="Location" value={location} onChange={e=>setLocation(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input className="w-full rounded-lg border p-2 dark:bg-slate-900" type="number" min="1" placeholder="Capacity" value={capacity} onChange={e=>setCapacity(e.target.value)} />
          <select className="w-full rounded-lg border p-2 dark:bg-slate-900" value={kind} onChange={e=>setKind(e.target.value)}>
            <option value="one_off">One-off</option>
            <option value="group">Group</option>
          </select>
        </div>
        <textarea className="w-full rounded-lg border p-2 dark:bg-slate-900" placeholder="Description" value={description} onChange={e=>setDescription(e.target.value)} />
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <Button type="submit" disabled={loading}>{loading ? "..." : "Save Event"}</Button>
      </form>
    </Card>
  )
}
