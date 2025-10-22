// src/features/events/EventCard.jsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { 
  faCalendarAlt, faMapMarkerAlt, faUsers, faClock, 
  faEdit, faTrash, faUserPlus, faUserMinus, faCheck, faStar,
  faGraduationCap, faBook, faMicroscope, faCode,
  faMusic, faPalette, faDumbbell, faHeartbeat
} from "@fortawesome/free-solid-svg-icons"
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
      // Don't trigger full page reload - just update local state
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
      // Don't trigger full page reload - just update local state
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

  const getCategoryIcon = (title, description) => {
    const text = (title + " " + (description || "")).toLowerCase()
    if (text.includes("math") || text.includes("calculus") || text.includes("algebra")) return faGraduationCap
    if (text.includes("science") || text.includes("biology") || text.includes("chemistry") || text.includes("physics")) return faMicroscope
    if (text.includes("tech") || text.includes("programming") || text.includes("coding") || text.includes("computer")) return faCode
    if (text.includes("literature") || text.includes("english") || text.includes("writing") || text.includes("book")) return faBook
    if (text.includes("art") || text.includes("design") || text.includes("creative")) return faPalette
    if (text.includes("music") || text.includes("sound") || text.includes("audio")) return faMusic
    if (text.includes("sport") || text.includes("fitness") || text.includes("exercise")) return faDumbbell
    if (text.includes("health") || text.includes("medical") || text.includes("medicine")) return faHeartbeat
    return faGraduationCap
  }

  const getCategoryColor = (title, description) => {
    const text = (title + " " + (description || "")).toLowerCase()
    if (text.includes("math") || text.includes("calculus") || text.includes("algebra")) return "text-blue-600"
    if (text.includes("science") || text.includes("biology") || text.includes("chemistry") || text.includes("physics")) return "text-green-600"
    if (text.includes("tech") || text.includes("programming") || text.includes("coding") || text.includes("computer")) return "text-purple-600"
    if (text.includes("literature") || text.includes("english") || text.includes("writing") || text.includes("book")) return "text-orange-600"
    if (text.includes("art") || text.includes("design") || text.includes("creative")) return "text-pink-600"
    if (text.includes("music") || text.includes("sound") || text.includes("audio")) return "text-indigo-600"
    if (text.includes("sport") || text.includes("fitness") || text.includes("exercise")) return "text-red-600"
    if (text.includes("health") || text.includes("medical") || text.includes("medicine")) return "text-emerald-600"
    return "text-gray-600"
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Tomorrow"
    if (diffDays < 7) return `In ${diffDays} days`
    return date.toLocaleDateString()
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden premium-hover">
      {!editing ? (
        <>
          {}
          <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 relative">
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute top-4 right-4">
              <button className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                <FontAwesomeIcon icon={faStar} className="w-4 h-4" />
              </button>
            </div>
            <div className="absolute bottom-4 left-4">
              <h3 className="text-xl font-bold text-white mb-1">{event.title}</h3>
              <p className="text-pink-200 text-sm">From Free</p>
            </div>
            {mine && (
              <div className="absolute top-4 left-4">
                <span className="px-2 py-1 bg-blue-500 text-white rounded text-xs font-medium">
                  Owner
                </span>
              </div>
            )}
            {full && (
              <div className="absolute top-4 left-4">
                <span className="px-2 py-1 bg-red-500 text-white rounded text-xs font-medium">
                  Full
                </span>
              </div>
            )}
          </div>
          
          {}
          <div className="p-6">
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4" />
                <span>{formatDate(event.starts_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faClock} className="w-4 h-4" />
                <span>{formatTime(event.starts_at)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <FontAwesomeIcon icon={faMapMarkerAlt} className="w-4 h-4" />
              <span className="truncate">{event.location}</span>
            </div>
            
            {event.description && (
              <p className="text-gray-700 mb-4 line-clamp-2 leading-relaxed text-sm">
                {event.description}
              </p>
            )}

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <FontAwesomeIcon icon={faUsers} className="w-4 h-4" />
                <span>{count}/{event.capacity} participants</span>
              </div>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                {event.kind}
              </span>
            </div>

            {}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {!mine && !joined && !full && (
                  isAuthenticated ? (
                    <button
                      onClick={onJoin}
                      disabled={busyJoin}
                      className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FontAwesomeIcon icon={faUserPlus} className="w-4 h-4" />
                      <span>{busyJoin ? "Joining..." : "Join Event"}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate("/login")}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      <FontAwesomeIcon icon={faUserPlus} className="w-4 h-4" />
                      <span>Login to Join</span>
                    </button>
                  )
                )}
                {!mine && joined && isAuthenticated && (
                  <button
                    onClick={onLeave}
                    disabled={busyLeave}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FontAwesomeIcon icon={faUserMinus} className="w-4 h-4" />
                    <span>{busyLeave ? "Leaving..." : "Leave"}</span>
                  </button>
                )}
              </div>

              {mine && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit Event"
                  >
                    <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onDelete}
                    disabled={busyDelete}
                    className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete Event"
                  >
                    <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {joined && (
              <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
                <span className="text-sm font-medium">You're attending this event</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Event</h3>
          <input 
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 form-input" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            disabled={busySave}
            placeholder="Event title"
          />
          <input 
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 form-input" 
            type="datetime-local" 
            value={startsAt} 
            onChange={e => setStartsAt(e.target.value)} 
            disabled={busySave} 
          />
          <input 
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 form-input" 
            value={location} 
            onChange={e => setLocation(e.target.value)} 
            disabled={busySave}
            placeholder="Location"
          />
          <input 
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 form-input" 
            type="number" 
            min="1" 
            value={capacity} 
            onChange={e => setCapacity(e.target.value)} 
            disabled={busySave}
            placeholder="Capacity"
          />
          <textarea 
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 form-input" 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            disabled={busySave}
            placeholder="Event description"
            rows={3}
          />
          <div className="flex gap-3 justify-end">
            <button 
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50" 
              disabled={busySave} 
              onClick={onCancel}
            >
              Cancel
            </button>
            <button 
              className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium disabled:opacity-50" 
              disabled={busySave} 
              onClick={onSave}
            >
              {busySave ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
      {err && (
        <div className="px-6 pb-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">{err}</p>
          </div>
        </div>
      )}
    </div>
  )
}
