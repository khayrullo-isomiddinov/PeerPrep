import { useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { useNavigate, Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { 
  faCalendarAlt, faMapMarkerAlt, faUsers, faClock, 
  faEdit, faTrash, faUserPlus, faUserMinus, faCheck, faStar,
  faGraduationCap, faBook, faMicroscope, faCode,
  faMusic, faPalette, faDumbbell, faHeartbeat, faChevronRight, faImage, faUpload, faTimes
} from "@fortawesome/free-solid-svg-icons"
import Button from "../../components/Button"
import { deleteEvent, getAttendees, joinEvent, leaveEvent, updateEvent, generateCoverImage } from "../../utils/api"
import { useAuth } from "../auth/AuthContext"

export default function EventCard({ event, onChanged, onDelete }) {
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [err, setErr] = useState("")

  const [title, setTitle] = useState(event.title)
  const [startsAt, setStartsAt] = useState(new Date(event.starts_at).toISOString().slice(0, 16))
  const [location, setLocation] = useState(event.location)
  const [capacity, setCapacity] = useState(event.capacity)
  const [description, setDescription] = useState(event.description || "")
  const [coverImageFile, setCoverImageFile] = useState(null)
  const [coverImagePreview, setCoverImagePreview] = useState(null)
  const [coverMode, setCoverMode] = useState("upload")
  const [aiPrompt, setAiPrompt] = useState("")
  const [generatingCover, setGeneratingCover] = useState(false)
  const fileInputRef = useRef(null)

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
    setCoverImageFile(null)
    setCoverImagePreview(null)
    setAiPrompt("")
    setCoverMode("upload")
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
    } catch (e) {
      setErr(e?.response?.data?.detail || "Leave failed")
    } finally {
      setBusyLeave(false)
    }
  }

  function handleDeleteClick() {
    setShowDeleteConfirm(true)
  }

  async function handleDeleteConfirm() {
    setShowDeleteConfirm(false)
    setErr("")
    setBusyDelete(true)
    try {
      await deleteEvent(event.id)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (onDelete) {
              onDelete(event.id)
            } else {
              onChanged?.()
            }
          }, 350)
        })
      })
    } catch (e) {
      setErr(e?.response?.data?.detail || "Delete failed")
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

      // If a new cover image was selected, convert it to base64
      if (coverImageFile) {
        const reader = new FileReader()
        await new Promise((resolve, reject) => {
          reader.onload = () => {
            patch.cover_image_url = reader.result
            resolve()
          }
          reader.onerror = reject
          reader.readAsDataURL(coverImageFile)
        })
      }

      const updated = await updateEvent(event.id, patch)
      setEditing(false)
      setCoverImageFile(null)
      setCoverImagePreview(null)
      setAiPrompt("")
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
    setCoverImageFile(null)
    setCoverImagePreview(null)
    setAiPrompt("")
    setCoverMode("upload")
  }

  function handleCoverImageSelect(e) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type.startsWith('image/')) {
        setCoverImageFile(file)
        setCoverImagePreview(URL.createObjectURL(file))
      }
    }
  }

  async function handleGenerateCoverImage() {
    if (!aiPrompt.trim()) {
      setErr("Please enter a prompt to generate an image")
      return
    }

    setGeneratingCover(true)
    setErr("")
    try {
      const imageUrl = await generateCoverImage(aiPrompt.trim())
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const file = new File([blob], "ai-generated-cover.png", { type: "image/png" })
      setCoverImageFile(file)
      setCoverImagePreview(URL.createObjectURL(file))
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to generate image. Please try again.")
    } finally {
      setGeneratingCover(false)
    }
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
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200/60 overflow-hidden premium-hover hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 backdrop-blur-sm">
      {!editing ? (
        <>
          {}
          <div className="h-52 relative overflow-hidden group">
            {event.cover_image_url ? (
              <img 
                src={event.cover_image_url} 
                alt={event.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            ) : (
              <div className="h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 group-hover:from-blue-600 group-hover:via-purple-600 group-hover:to-pink-600 transition-all duration-500" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute top-4 right-4">
              <button className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                <FontAwesomeIcon icon={faStar} className="w-4 h-4" />
              </button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
              <h3 className="text-xl font-bold text-white mb-1 drop-shadow-lg">{event.title}</h3>
              <p className="text-pink-200 text-sm drop-shadow-md">From Free</p>
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
          <div className="p-6 bg-white/95 backdrop-blur-sm">
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
              {event.kind === "group" && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                  Group Event
                </span>
              )}
            </div>

            {}
            <div className="mb-4">
              <Link
                to={`/events/${event.id}`}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors text-sm"
              >
                <span>View Full Details</span>
                <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3" />
              </Link>
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
                    onClick={handleDeleteClick}
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
          
          {/* Cover Image Section */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Cover Image</label>
            
            {/* Mode Toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCoverMode("upload")}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  coverMode === "upload"
                    ? "bg-pink-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                disabled={busySave}
              >
                Upload
              </button>
              <button
                type="button"
                onClick={() => setCoverMode("generate")}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  coverMode === "generate"
                    ? "bg-pink-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                disabled={busySave}
              >
                Generate with AI
              </button>
            </div>

            {/* Current Cover Image Preview */}
            {!coverImagePreview && event.cover_image_url && (
              <div className="relative">
                <img
                  src={event.cover_image_url}
                  alt="Current cover"
                  className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                />
                <p className="text-xs text-gray-500 mt-1">Current cover image</p>
              </div>
            )}

            {/* Upload Mode */}
            {coverMode === "upload" && (
              <div className="space-y-2">
                {coverImagePreview ? (
                  <div className="space-y-2">
                    <img
                      src={coverImagePreview}
                      alt="New cover preview"
                      className="w-full h-32 object-cover rounded-lg border-2 border-pink-300"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCoverImageFile(null)
                          setCoverImagePreview(null)
                          if (fileInputRef.current) fileInputRef.current.click()
                        }}
                        className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                        disabled={busySave}
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCoverImageFile(null)
                          setCoverImagePreview(null)
                        }}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                        disabled={busySave}
                      >
                        <FontAwesomeIcon icon={faTimes} className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="block border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-pink-400 transition-colors">
                    <FontAwesomeIcon icon={faUpload} className="w-6 h-6 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Click to upload new cover image</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverImageSelect}
                      className="hidden"
                      disabled={busySave}
                    />
                  </label>
                )}
              </div>
            )}

            {/* Generate Mode */}
            {coverMode === "generate" && (
              <div className="space-y-2">
                <textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="Describe the cover image you want (e.g., A modern study group meeting in a library)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm text-gray-900 bg-white"
                  rows={2}
                  disabled={busySave || generatingCover}
                />
                <button
                  type="button"
                  onClick={handleGenerateCoverImage}
                  disabled={busySave || generatingCover || !aiPrompt.trim()}
                  className="w-full px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {generatingCover ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faImage} className="w-4 h-4" />
                      Generate Image
                    </>
                  )}
                </button>
                {coverImagePreview && (
                  <div className="mt-2">
                    <img
                      src={coverImagePreview}
                      alt="Generated cover preview"
                      className="w-full h-32 object-cover rounded-lg border-2 border-pink-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCoverImageFile(null)
                        setCoverImagePreview(null)
                        setAiPrompt("")
                      }}
                      className="mt-2 w-full px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                      disabled={busySave}
                    >
                      Remove Generated Image
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <input 
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 form-input text-gray-900 bg-white" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            disabled={busySave}
            placeholder="Event title"
          />
          <input 
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 form-input text-gray-900 bg-white" 
            type="datetime-local" 
            value={startsAt} 
            onChange={e => setStartsAt(e.target.value)} 
            disabled={busySave} 
          />
          <input 
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 form-input text-gray-900 bg-white" 
            value={location} 
            onChange={e => setLocation(e.target.value)} 
            disabled={busySave}
            placeholder="Location"
          />
          <input 
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 form-input text-gray-900 bg-white" 
            type="number" 
            min="1" 
            value={capacity} 
            onChange={e => setCapacity(e.target.value)} 
            disabled={busySave}
            placeholder="Capacity"
          />
          <textarea 
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 form-input text-gray-900 bg-white" 
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

      {showDeleteConfirm && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-out"
          style={{ 
            animation: 'fadeIn 0.3s ease-out',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            position: 'fixed',
            width: '100vw',
            height: '100vh',
            minHeight: '100vh'
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
            style={{ 
              animation: 'slideUpFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: 'translateY(0)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">Delete Event?</h3>
                <p className="text-gray-600 mt-1">Are you sure you want to delete <span className="font-semibold">"{event.title}"</span>?</p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                <span className="font-semibold">Warning:</span> This action cannot be undone. All event data and attendee information will be permanently deleted.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-red-500 hover:bg-red-600 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
              >
                Delete Event
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUpFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}
