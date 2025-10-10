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
  const [fieldErrors, setFieldErrors] = useState({})
  const [successMsg, setSuccessMsg] = useState("")

  function validate() {
    const errs = {}
    if (!title.trim()) errs.title = "Title is required"
    if (!location.trim()) errs.location = "Location is required"
    if (!startsAt) {
      errs.startsAt = "Start date/time is required"
    } else {
      const dt = new Date(startsAt)
      if (Number.isNaN(dt.getTime())) errs.startsAt = "Invalid date/time"
      else if (dt.getTime() < Date.now() - 60_000) errs.startsAt = "Start must be in the future"
    }
    const capNum = Number(capacity)
    if (!Number.isFinite(capNum) || capNum < 1) errs.capacity = "Capacity must be at least 1"
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setSuccessMsg("")
    const errs = validate()
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return
    setLoading(true)
    try {
      const payload = {
        title: title.trim(),
        starts_at: new Date(startsAt).toISOString(),
        location: location.trim(),
        capacity: Number(capacity),
        description: description?.trim() || null,
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
      setFieldErrors({})
      setSuccessMsg("Event created!")
      onCreated?.(evt)
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to create event")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create Event</h2>
          {successMsg && <span className="text-sm text-emerald-400">{successMsg}</span>}
        </div>

        <div className="field-row">
          <label htmlFor="title" className="label">Title</label>
          <input
            id="title"
            className={`input ${fieldErrors.title ? "outline outline-1 outline-red-500/60" : ""}`}
            placeholder="Event title"
            value={title}
            onChange={e=>setTitle(e.target.value)}
            aria-invalid={!!fieldErrors.title}
          />
          {fieldErrors.title && <p className="mt-1 text-xs text-red-500">{fieldErrors.title}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="field-row">
            <label htmlFor="starts_at" className="label">Start date & time</label>
            <input
              id="starts_at"
              className={`input ${fieldErrors.startsAt ? "outline outline-1 outline-red-500/60" : ""}`}
              type="datetime-local"
              value={startsAt}
              onChange={e=>setStartsAt(e.target.value)}
              aria-invalid={!!fieldErrors.startsAt}
            />
            {fieldErrors.startsAt && <p className="mt-1 text-xs text-red-500">{fieldErrors.startsAt}</p>}
          </div>
          <div className="field-row">
            <label htmlFor="location" className="label">Location</label>
            <input
              id="location"
              className={`input ${fieldErrors.location ? "outline outline-1 outline-red-500/60" : ""}`}
              placeholder="e.g. Library Room 3B"
              value={location}
              onChange={e=>setLocation(e.target.value)}
              aria-invalid={!!fieldErrors.location}
            />
            {fieldErrors.location && <p className="mt-1 text-xs text-red-500">{fieldErrors.location}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="field-row">
            <label htmlFor="capacity" className="label">Capacity</label>
            <input
              id="capacity"
              className={`input ${fieldErrors.capacity ? "outline outline-1 outline-red-500/60" : ""}`}
              type="number"
              min="1"
              placeholder="Capacity"
              value={capacity}
              onChange={e=>setCapacity(e.target.value)}
              aria-invalid={!!fieldErrors.capacity}
            />
            {fieldErrors.capacity && <p className="mt-1 text-xs text-red-500">{fieldErrors.capacity}</p>}
          </div>
          <div className="field-row">
            <label htmlFor="kind" className="label">Type</label>
            <select
              id="kind"
              className="input"
              value={kind}
              onChange={e=>setKind(e.target.value)}
            >
              <option value="one_off">One-off</option>
              <option value="group">Group</option>
            </select>
          </div>
        </div>

        <div className="field-row">
          <label htmlFor="description" className="label">Description</label>
          <textarea
            id="description"
            className="textarea"
            placeholder="What is this event about?"
            value={description}
            onChange={e=>setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {error && <div className="text-red-500 text-sm">{error}</div>}

        <div className="flex items-center justify-end gap-3">
          <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Event"}</Button>
        </div>
      </form>
    </Card>
  )
}
