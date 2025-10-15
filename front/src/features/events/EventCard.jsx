// src/features/events/EventCard.jsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../../components/Button"
import { deleteEvent, getAttendees, joinEvent, leaveEvent, updateEvent } from "../../utils/api"
import { useAuth } from "../auth/AuthContext"

export default function EventCard({ event, onChanged }) {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const currentId = user ? Number(user.id ?? user?.user?.id) : null
  const creatorId = event.created_by != null ? Number(event.created_by) : null
  const mine = currentId != null && creatorId === currentId

  const [count, setCount] = useState(0)
  const [joined, setJoined] = useState(mine)
  const [busyJoin, setBusyJoin] = useState(false)
  const [busyLeave, setBusyLeave] = useState(false)
  const [busyDelete, setBusyDelete] = useState(false)
  const [busySave, setBusySave] = useState(false)
  const [editing, setEditing] = useState(false)
  const [err, setErr] = useState("")

  const [title, setTitle] = useState(event.title)
  const [startsAt, setStartsAt] = useState(new Date(event.starts_at).toISOString().slice(0, 16))
  const [location, setLocation] = useState(event.location)
  const [capacity, setCapacity] = useState(event.capacity)
  const [description, setDescription] = useState(event.description || "")

  async function loadAttendees() {
    try {
      const ids = await getAttendees(event.id)
      const safeIds = Array.isArray(ids) ? ids : []
      setCount(safeIds.length)
      if (!mine && currentId != null) {
        setJoined(safeIds.includes(currentId))
      }
    } catch {
      setCount(0)
    }
  }

  useEffect(() => {
    setJoined(mine)
    setTitle(event.title)
    setStartsAt(new Date(event.starts_at).toISOString().slice(0, 16))
    setLocation(event.location)
    setCapacity(event.capacity)
    setDescription(event.description || "")
    loadAttendees()
  }, [event.id, mine])

  const full = count >= event.capacity

  async function onJoin() {
    setErr("")
    setBusyJoin(true)
    try {
      await joinEvent(event.id)
      setJoined(true)
      setCount(c => c + 1)
      onChanged?.()
    } catch (e) {
      setErr(e?.response?.data?.detail || "Join failed")
    } finally {
      setBusyJoin(false)
    }
  }

  async function onLeave() {
    setErr("")
    setBusyLeave(true)
    try {
      await leaveEvent(event.id)
      setJoined(false)
      setCount(c => Math.max(0, c - 1))
      onChanged?.()
    } catch (e) {
      setErr(e?.response?.data?.detail || "Leave failed")
    } finally {
      setBusyLeave(false)
    }
  }

  async function onDelete() {
    setErr("")
    setBusyDelete(true)
    try {
      await deleteEvent(event.id)
      onChanged?.()
    } catch (e) {
      setErr(e?.response?.data?.detail || "Delete failed")
    } finally {
      setBusyDelete(false)
    }
  }

  async function onSave() {
    setErr("")
    setBusySave(true)
    try {
      const patch = {
        title,
        starts_at: new Date(startsAt).toISOString(),
        location,
        capacity: Number(capacity),
        description,
      }
      const updated = await updateEvent(event.id, patch)
      setEditing(false)
      onChanged?.(updated)
    } catch (e) {
      setErr(e?.response?.data?.detail || "Update failed")
    } finally {
      setBusySave(false)
    }
  }

  function onCancel() {
    setEditing(false)
    setTitle(event.title)
    setStartsAt(new Date(event.starts_at).toISOString().slice(0, 16))
    setLocation(event.location)
    setCapacity(event.capacity)
    setDescription(event.description || "")
  }

  return (
    <div className="premium-card inset-pad premium-hover">
      {!editing ? (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold">{event.title}</h3>
              <span className="badge">{event.kind}</span>
              {mine && <span className="badge">Owner</span>}
              {full && <span className="badge">Full</span>}
            </div>
            <p className="text-muted">{new Date(event.starts_at).toLocaleString()} · {event.location}</p>
            {event.description && <p className="premium-text">{event.description}</p>}
            <p className="text-muted">Capacity {count}/{event.capacity}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!mine && !joined && !full && (
              isAuthenticated ? (
                <Button className="btn" disabled={busyJoin} onClick={onJoin}>{busyJoin ? "..." : "Join"}</Button>
              ) : (
                <Button className="btn-secondary" onClick={() => navigate("/login")}>Login to join</Button>
              )
            )}
            {!mine && joined && isAuthenticated && (
              <Button className="btn-secondary" disabled={busyLeave} onClick={onLeave}>{busyLeave ? "..." : "Leave"}</Button>
            )}
            {mine && <Button className="btn-secondary" onClick={() => setEditing(true)}>Edit</Button>}
            {mine && <Button className="btn-secondary" disabled={busyDelete} onClick={onDelete}>{busyDelete ? "..." : "Delete"}</Button>}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} disabled={busySave} />
          <input className="input" type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} disabled={busySave} />
          <input className="input" value={location} onChange={e => setLocation(e.target.value)} disabled={busySave} />
          <input className="input" type="number" min="1" value={capacity} onChange={e => setCapacity(e.target.value)} disabled={busySave} />
          <textarea className="textarea" value={description} onChange={e => setDescription(e.target.value)} disabled={busySave} />
          <div className="flex gap-2 justify-end">
            <Button className="btn" disabled={busySave} onClick={onSave}>{busySave ? "Saving..." : "Save"}</Button>
            <Button className="btn-secondary" disabled={busySave} onClick={onCancel}>Cancel</Button>
          </div>
        </div>
      )}
      {err && <div className="mt-3 text-sm premium-text-error">{err}</div>}
    </div>
  )
}
