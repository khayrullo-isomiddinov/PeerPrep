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
      else if (dt.getTime() < Date.now() - 60000) errs.startsAt = "Start must be in the future"
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
    <Card variant="surface">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <span className="badge">New</span>
            <h2 className="text-xl font-extrabold premium-heading">Create Event</h2>
          </div>
          {successMsg && <span className="text-sm premium-text-success">{successMsg}</span>}
        </div>

        {error && (
          <div className="premium-card inset-pad">
            <div className="text-sm premium-text-error">{error}</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="field-row">
            <label htmlFor="title" className="label">Title</label>
            <input
              id="title"
              className={`input ${fieldErrors.title ? "ring-soft" : ""}`}
              placeholder="Event title"
              value={title}
              onChange={e=>setTitle(e.target.value)}
              aria-invalid={!!fieldErrors.title}
            />
            <div className="flex items-center justify-between text-sm text-muted">
              <span>Name it clearly</span>
              <span>{title.length}/100</span>
            </div>
            {fieldErrors.title && <p className="mt-1 text-sm premium-text-error">{fieldErrors.title}</p>}
          </div>

          <div className="field-row">
            <label htmlFor="kind" className="label">Type</label>
            <div className="inline-flex premium-glass rounded-pill p-1">
              <button
                type="button"
                onClick={()=>setKind("one_off")}
                className={`pill px-3 py-1.5 text-sm font-semibold ${kind==="one_off" ? "premium-text-primary" : "text-muted"}`}
              >
                One-off
              </button>
              <button
                type="button"
                onClick={()=>setKind("group")}
                className={`pill px-3 py-1.5 text-sm font-semibold ${kind==="group" ? "premium-text-primary" : "text-muted"}`}
              >
                Group
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="field-row">
            <label htmlFor="starts_at" className="label">Start date & time</label>
            <input
              id="starts_at"
              className={`input ${fieldErrors.startsAt ? "ring-soft" : ""}`}
              type="datetime-local"
              value={startsAt}
              onChange={e=>setStartsAt(e.target.value)}
              aria-invalid={!!fieldErrors.startsAt}
            />
            {fieldErrors.startsAt && <p className="mt-1 text-sm premium-text-error">{fieldErrors.startsAt}</p>}
          </div>
          <div className="field-row">
            <label htmlFor="location" className="label">Location</label>
            <input
              id="location"
              className={`input ${fieldErrors.location ? "ring-soft" : ""}`}
              placeholder="e.g. Library Room 3B"
              value={location}
              onChange={e=>setLocation(e.target.value)}
              aria-invalid={!!fieldErrors.location}
            />
            {fieldErrors.location && <p className="mt-1 text-sm premium-text-error">{fieldErrors.location}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="field-row">
            <label htmlFor="capacity" className="label">Capacity</label>
            <input
              id="capacity"
              className={`input ${fieldErrors.capacity ? "ring-soft" : ""}`}
              type="number"
              min="1"
              placeholder="Capacity"
              value={capacity}
              onChange={e=>setCapacity(e.target.value)}
              aria-invalid={!!fieldErrors.capacity}
            />
            {fieldErrors.capacity && <p className="mt-1 text-sm premium-text-error">{fieldErrors.capacity}</p>}
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
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="submit" loading={loading} className="min-w-36">Create Event</Button>
        </div>
      </form>
    </Card>
  )
}
